jest.mock('../services/requestTrace', () => ({
  isPerfDiagnosticsEnabled: jest.fn()
}));

jest.mock('web-vitals', () => ({
  __esModule: true,
  getCLS: jest.fn((cb) => cb({ name: 'CLS', value: 1 })),
  getFID: jest.fn((cb) => cb({ name: 'FID', value: 2 })),
  getFCP: jest.fn((cb) => cb({ name: 'FCP', value: 3 })),
  getLCP: jest.fn((cb) => cb({ name: 'LCP', value: 4 })),
  getTTFB: jest.fn((cb) => cb({ name: 'TTFB', value: 5 }))
}));

jest.mock('../utils/perfMarkers', () => ({
  getActionSummary: jest.fn(() => ({ count: 0 }))
}));

import { isPerfDiagnosticsEnabled } from '../services/requestTrace';
import reportWebVitals from '../reportWebVitals';

describe('reportWebVitals', () => {
  beforeEach(() => {
    delete window.__PERF_WEB_VITALS__;
    isPerfDiagnosticsEnabled.mockReset();
  });

  test('does nothing when diagnostics disabled', async () => {
    isPerfDiagnosticsEnabled.mockReturnValue(false);
    const onPerfEntry = jest.fn();

    reportWebVitals(onPerfEntry);
    await Promise.resolve();

    expect(onPerfEntry).not.toHaveBeenCalled();
    expect(window.__PERF_WEB_VITALS__).toBeUndefined();
  });

  test('reports metrics to callback and window sink when enabled', async () => {
    isPerfDiagnosticsEnabled.mockReturnValue(true);
    const onPerfEntry = jest.fn();

    reportWebVitals(onPerfEntry);
    
    // Wait for dynamic import and promise resolution
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(onPerfEntry).toHaveBeenCalledTimes(5);
    expect(window.__PERF_WEB_VITALS__).toHaveLength(5);
    expect(window.__PERF_WEB_VITALS__[0]).toEqual({ name: 'CLS', value: 1 });
  });
});

