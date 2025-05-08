// Import NetworkError for proper error handling
const { NetworkError } = require('./src/types');

// Mock fetch globally
global.fetch = jest.fn();

// Mock setTimeout and clearTimeout
global.setTimeout = jest.fn((callback, ms) => {
  callback();
  return 123; // Return a number as expected by setTimeout
});

global.clearTimeout = jest.fn();

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  (global.fetch).mockReset();
});

// Silence React Native warnings in tests
jest.mock('react-native/Libraries/LogBox/LogBox', () => ({
  ignoreLogs: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Helper function to create mock responses
global.createMockResponse = (status, data, headers = {}) => {
  const response = {
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get: jest.fn(name => {
        if (name.toLowerCase() === 'content-type') {
          return 'application/json';
        }
        return headers[name];
      }),
      ...headers
    },
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data))
  };
  
  // For error responses, make fetch throw the appropriate NetworkError
  if (!response.ok) {
    if (status === 401) {
      global.fetch.mockRejectedValueOnce = () => {
        return global.fetch.mockImplementationOnce(() => {
          throw NetworkError.unauthorized();
        });
      };
    } else {
      global.fetch.mockRejectedValueOnce = () => {
        return global.fetch.mockImplementationOnce(() => {
          throw NetworkError.httpError(status);
        });
      };
    }
  }
  
  return response;
};
