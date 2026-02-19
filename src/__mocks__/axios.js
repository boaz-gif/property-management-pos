const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() }
  }
};

const axios = {
  create: jest.fn(() => mockAxiosInstance),
  ...mockAxiosInstance
};

export default axios;
export { mockAxiosInstance };

