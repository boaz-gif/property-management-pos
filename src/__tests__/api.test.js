const buildAxiosMock = () => {
  const apiFn = jest.fn((config) => Promise.resolve({ retried: true, config }));
  apiFn.defaults = { headers: { common: {} } };
  apiFn.interceptors = {
    request: { use: jest.fn() },
    response: { use: jest.fn() }
  };
  apiFn.get = jest.fn(() => Promise.resolve({ ok: true }));
  apiFn.post = jest.fn(() => Promise.resolve({ ok: true }));
  apiFn.put = jest.fn(() => Promise.resolve({ ok: true }));
  apiFn.delete = jest.fn(() => Promise.resolve({ ok: true }));

  const axios = {
    create: jest.fn(() => apiFn),
    post: jest.fn()
  };

  return { axios, apiFn };
};

describe('api', () => {
  beforeEach(() => {
    jest.resetModules();
    localStorage.clear();
    delete window.__PERF_HTTP__;
  });

  test('request interceptor adds auth token, trace headers, and perf metadata', async () => {
    const { axios, apiFn } = buildAxiosMock();
    jest.doMock('axios', () => axios);
    jest.doMock('../services/requestTrace', () => ({
      ensureTraceHeaders: jest.fn((h) => ({ ...h, 'X-Trace-Id': 't1' })),
      isPerfDiagnosticsEnabled: jest.fn(() => true)
    }));

    const apiModule = require('../services/api');

    const requestInterceptor = apiFn.interceptors.request.use.mock.calls[0][0];

    localStorage.setItem('token', 'tok');
    const config = { url: '/properties', headers: {} };
    const next = await Promise.resolve(requestInterceptor(config));

    expect(next.headers.Authorization).toBe('Bearer tok');
    expect(next.headers['X-Trace-Id']).toBe('t1');
    expect(next.__perf.startTime).toBeDefined();
    expect(typeof next.__perf.startTime).toBe('number');
    expect(apiModule.default).toBe(apiFn);
  });

  test('rate-limit gate rejects non-auth requests during backoff and bypasses auth endpoints', async () => {
    const { axios, apiFn } = buildAxiosMock();
    jest.doMock('axios', () => axios);
    jest.doMock('../services/requestTrace', () => ({
      ensureTraceHeaders: jest.fn((h) => ({ ...h, 'X-Trace-Id': 't1' })),
      isPerfDiagnosticsEnabled: jest.fn(() => false)
    }));

    require('../services/api');
    const requestInterceptor = apiFn.interceptors.request.use.mock.calls[0][0];
    const responseErrorInterceptor = apiFn.interceptors.response.use.mock.calls[0][1];

    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(Date, 'now').mockReturnValue(1000);


    const error = new Error('Rate Limited');
    error.config = { url: '/tenants', headers: {} };
    error.response = { status: 429, headers: { 'retry-after': '10' }, data: {} };

    await expect(
      responseErrorInterceptor(error)
    ).rejects.toBeInstanceOf(Error);

    await expect(
      requestInterceptor({ url: '/tenants', headers: {} })
    ).rejects.toMatchObject({ isRateLimitGate: true });

    const result = await Promise.resolve(requestInterceptor({ url: '/auth/login', headers: {} }));
    expect(result).toEqual(expect.objectContaining({ url: '/auth/login' }));

    warn.mockRestore();
  });

  test('response success logs perf metrics when enabled', async () => {
    const { axios, apiFn } = buildAxiosMock();
    jest.doMock('axios', () => axios);
    jest.doMock('../services/requestTrace', () => ({
      ensureTraceHeaders: jest.fn((h) => ({ ...h, 'X-Trace-Id': 't1' })),
      isPerfDiagnosticsEnabled: jest.fn(() => true)
    }));

    require('../services/api');
    const responseSuccessInterceptor = apiFn.interceptors.response.use.mock.calls[0][0];

    const res = await responseSuccessInterceptor({
      status: 200,
      config: {
        method: 'get',
        url: '/x',
        headers: { 'X-Trace-Id': 't1' },
        __perf: { startTime: 1 }
      }
    });

    expect(res.status).toBe(200);
    expect(window.__PERF_HTTP__).toHaveLength(1);
    expect(window.__PERF_HTTP__[0]).toMatchObject({ ok: true, status: 200, traceId: 't1' });
  });

  test('401 refresh flow retries requests and resolves queued requests', async () => {
    const { axios, apiFn } = buildAxiosMock();
    jest.doMock('axios', () => axios);
    jest.doMock('../services/requestTrace', () => ({
      ensureTraceHeaders: jest.fn((h) => ({ ...h, 'X-Trace-Id': 't1' })),
      isPerfDiagnosticsEnabled: jest.fn(() => false)
    }));

    require('../services/api');
    const responseErrorInterceptor = apiFn.interceptors.response.use.mock.calls[0][1];

    localStorage.setItem('token', 'old');

    let resolveRefresh;
    const refreshPromise = new Promise((resolve) => {
      resolveRefresh = resolve;
    });
    axios.post.mockReturnValue(refreshPromise);

    const original1 = { url: '/tenants', headers: {}, method: 'get' };
    const original2 = { url: '/properties', headers: {}, method: 'get' };

    const p1 = responseErrorInterceptor({ config: original1, response: { status: 401, data: {} } });
    const p2 = responseErrorInterceptor({ config: original2, response: { status: 401, data: {} } });

    resolveRefresh({ data: { data: { token: 'new' } } });

    const r1 = await p1;
    const r2 = await p2;

    expect(localStorage.getItem('token')).toBe('new');
    expect(apiFn.defaults.headers.common.Authorization).toBe('Bearer new');
    expect(apiFn).toHaveBeenCalledTimes(2);
    expect(r1).toMatchObject({ retried: true });
    expect(r2).toMatchObject({ retried: true });
  });

  test('401 refresh failure clears auth and redirects', async () => {
    const { axios, apiFn } = buildAxiosMock();
    jest.doMock('axios', () => axios);
    jest.doMock('../services/requestTrace', () => ({
      ensureTraceHeaders: jest.fn((h) => ({ ...h, 'X-Trace-Id': 't1' })),
      isPerfDiagnosticsEnabled: jest.fn(() => false)
    }));

    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true
    });

    require('../services/api');
    const responseErrorInterceptor = apiFn.interceptors.response.use.mock.calls[0][1];

    localStorage.setItem('token', 'old');
    localStorage.setItem('user', JSON.stringify({ id: 1 }));

    axios.post.mockResolvedValue({ data: {} });


    const error = new Error('Unauthorized');
    error.config = { url: '/x', headers: {}, method: 'get' };
    error.response = { status: 401, data: {} };

    await expect(
      responseErrorInterceptor(error)
    ).rejects.toBeInstanceOf(Error);

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(window.location.href).toContain('/login?reason=session_expired');
  });

  test('401 token revoked clears auth and redirects', async () => {
    const { axios, apiFn } = buildAxiosMock();
    jest.doMock('axios', () => axios);
    jest.doMock('../services/requestTrace', () => ({
      ensureTraceHeaders: jest.fn((h) => ({ ...h, 'X-Trace-Id': 't1' })),
      isPerfDiagnosticsEnabled: jest.fn(() => false)
    }));

    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true
    });

    require('../services/api');
    const responseErrorInterceptor = apiFn.interceptors.response.use.mock.calls[0][1];

    localStorage.setItem('token', 'old');
    localStorage.setItem('user', JSON.stringify({ id: 1 }));


    const error = new Error('Token Revoked');
    error.config = { url: '/x', headers: {}, method: 'get' };
    error.response = { status: 401, data: { code: 'TOKEN_REVOKED' } };

    await expect(
      responseErrorInterceptor(error)
    ).rejects.toBeInstanceOf(Error);

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(window.location.href).toContain('/login?reason=session_expired');
  });

  test('response error logs perf metrics when enabled', async () => {
    const { axios, apiFn } = buildAxiosMock();
    jest.doMock('axios', () => axios);
    jest.doMock('../services/requestTrace', () => ({
      ensureTraceHeaders: jest.fn((h) => ({ ...h, 'X-Trace-Id': 't1' })),
      isPerfDiagnosticsEnabled: jest.fn(() => true)
    }));

    require('../services/api');
    const responseErrorInterceptor = apiFn.interceptors.response.use.mock.calls[0][1];


    const error = new Error('Server Error');
    error.config = { url: '/x', method: 'get', headers: { 'X-Trace-Id': 't1' }, __perf: { startTime: 1 } };
    error.response = { status: 500, data: {} };

    await expect(
      responseErrorInterceptor(error)
    ).rejects.toBeInstanceOf(Error);

    expect(window.__PERF_HTTP__).toHaveLength(1);
    expect(window.__PERF_HTTP__[0]).toMatchObject({ ok: false, status: 500, traceId: 't1' });
  });

  test('exports API methods that call axios instance', async () => {
    const { axios, apiFn } = buildAxiosMock();
    jest.doMock('axios', () => axios);
    jest.doMock('../services/requestTrace', () => ({
      ensureTraceHeaders: jest.fn((h) => ({ ...h, 'X-Trace-Id': 't1' })),
      isPerfDiagnosticsEnabled: jest.fn(() => false)
    }));

    const {
      authAPI,
      tenantAPI,
      propertyAPI,
      maintenanceAPI,
      paymentAPI,
      documentAPI,
      conversationAPI,
      dashboardWidgetAPI
    } = require('../services/api');

    authAPI.login({ a: 1 });
    authAPI.register({ a: 1 });
    authAPI.logout();
    authAPI.getProfile();
    authAPI.changePassword({ a: 1 });
    authAPI.getUsers();
    authAPI.getUserById('1');
    authAPI.updateUser('1', {});
    authAPI.deleteUser('1');
    authAPI.archiveUser('1');
    authAPI.restoreUser('1');
    authAPI.permanentDeleteUser('1');
    authAPI.getArchivedUsers();
    authAPI.getAllUsersWithArchived();

    tenantAPI.getTenants();
    tenantAPI.getTenantById('1');
    tenantAPI.createTenant({});
    tenantAPI.updateTenant('1', {});
    tenantAPI.deleteTenant('1');
    tenantAPI.getTenantStats();
    tenantAPI.archiveTenant('1');
    tenantAPI.restoreTenant('1');
    tenantAPI.permanentDeleteTenant('1');
    tenantAPI.getArchivedTenants();
    tenantAPI.getAllTenantsWithArchived();

    propertyAPI.getProperties();
    propertyAPI.getPropertyById('1');
    propertyAPI.createProperty({});
    propertyAPI.updateProperty('1', {});
    propertyAPI.deleteProperty('1');
    propertyAPI.getPropertyStats();
    propertyAPI.searchProperties('q');
    propertyAPI.archiveProperty('1');
    propertyAPI.restoreProperty('1');
    propertyAPI.permanentDeleteProperty('1');
    propertyAPI.getArchivedProperties();
    propertyAPI.getAllPropertiesWithArchived();

    maintenanceAPI.getRequests();
    maintenanceAPI.getRequestById('1');
    maintenanceAPI.createRequest({});
    maintenanceAPI.updateRequest('1', {});
    maintenanceAPI.archiveRequest('1');
    maintenanceAPI.restoreRequest('1');
    maintenanceAPI.permanentDeleteRequest('1');
    maintenanceAPI.getArchivedRequests();

    paymentAPI.getPayments();
    paymentAPI.getPaymentById('1');
    paymentAPI.createPayment({});
    paymentAPI.updatePaymentStatus('1', 'x');
    paymentAPI.getPaymentStats();
    paymentAPI.archivePayment('1');
    paymentAPI.restorePayment('1');
    paymentAPI.permanentDeletePayment('1');
    paymentAPI.getArchivedPayments();

    documentAPI.getDocuments();
    documentAPI.getDocumentById('1');
    documentAPI.uploadDocument(new FormData());
    documentAPI.downloadDocument('1');
    documentAPI.deleteDocument('1');
    documentAPI.archiveDocument('1');
    documentAPI.restoreDocument('1');
    documentAPI.permanentDeleteDocument('1');
    documentAPI.getArchivedDocuments();

    conversationAPI.listConversations();
    conversationAPI.createConversation({});
    conversationAPI.ensureCommunity();
    conversationAPI.ensureAdminDm();
    conversationAPI.getConversation('1');
    conversationAPI.listMessages('1');
    conversationAPI.sendMessage('1', {});
    conversationAPI.markRead('1', {});
    conversationAPI.addParticipant('1', {});
    conversationAPI.removeParticipant('1', '2');

    dashboardWidgetAPI.getWidgets();
    dashboardWidgetAPI.updateOrder([]);

    expect(apiFn.post).toHaveBeenCalled();
    expect(apiFn.get).toHaveBeenCalled();
  });
});

