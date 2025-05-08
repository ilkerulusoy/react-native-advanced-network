// Mock global fetch
global.fetch = jest.fn();

// Mock setTimeout
global.setTimeout = jest.fn((callback, ms) => {
  callback();
  return 123 as any; // Return a number as expected by the setTimeout signature
});

// Mock clearTimeout
global.clearTimeout = jest.fn();

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  (global.fetch as jest.Mock).mockReset();
});

// Helper to create a mock Response
export const createMockResponse = (
  status: number, 
  body: any, 
  headers: Record<string, string> = { 'content-type': 'application/json' }
): Response => {
  const mockResponse: Partial<Response> = {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) => headers[name.toLowerCase()],
    } as any,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
  };
  
  return mockResponse as Response;
};
