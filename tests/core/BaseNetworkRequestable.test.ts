import { BaseNetworkRequestable } from '../../src/core/BaseNetworkRequestable';
import { HTTPMethod, NetworkError, NetworkErrorType } from '../../src/types';

// Use the global createMockResponse function defined in jest.setup.js
declare global {
  function createMockResponse(status: number, body: any, headers?: Record<string, string>): Response;
}

describe('BaseNetworkRequestable', () => {
  const baseURL = 'https://api.example.com';
  let networkRequestable: BaseNetworkRequestable;

  beforeEach(() => {
    networkRequestable = new BaseNetworkRequestable(baseURL);
  });

  it('should make a successful GET request', async () => {
    // Mock data
    const mockData = { id: 1, name: 'Test User' };
    
    // Mock fetch response
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      createMockResponse(200, mockData)
    );
    
    // Make request
    const result = await networkRequestable.request('/users/1', HTTPMethod.GET);
    
    // Assertions
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/users/1',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        })
      })
    );
    expect(result).toEqual(mockData);
  });

  it('should make a successful POST request with body', async () => {
    // Mock data
    const requestBody = { name: 'New User', email: 'user@example.com' };
    const mockResponse = { id: 123, ...requestBody };
    
    // Mock fetch response
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      createMockResponse(201, mockResponse)
    );
    
    // Make request
    const result = await networkRequestable.request(
      '/users',
      HTTPMethod.POST,
      requestBody
    );
    
    // Assertions
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/users',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }),
        body: JSON.stringify(requestBody)
      })
    );
    expect(result).toEqual(mockResponse);
  });

  it('should handle non-JSON responses', async () => {
    // Mock text response
    const textResponse = 'Plain text response';
    
    // Mock fetch response
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      createMockResponse(200, textResponse, { 'content-type': 'text/plain' })
    );
    
    // Make request
    const result = await networkRequestable.request('/text', HTTPMethod.GET);
    
    // Assertions
    expect(result).toEqual(textResponse);
  });

  it('should throw NetworkError.httpError for non-2xx responses', async () => {
    // Mock error response
    (global.fetch as jest.Mock).mockImplementationOnce(() => {
      throw NetworkError.httpError(404);
    });
    
    // Make request and expect error
    try {
      await networkRequestable.request('/nonexistent', HTTPMethod.GET);
      fail('Expected an error to be thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(NetworkError);
      expect((error as NetworkError).type).toBe(NetworkErrorType.HTTP_ERROR);
      expect((error as NetworkError).statusCode).toBe(404);
    }
  });

  it('should throw NetworkError.unauthorized for 401 responses', async () => {
    // Mock error response
    (global.fetch as jest.Mock).mockImplementationOnce(() => {
      throw NetworkError.unauthorized();
    });
    
    // Make request and expect error
    try {
      await networkRequestable.request('/secure', HTTPMethod.GET);
      fail('Expected an error to be thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(NetworkError);
      expect((error as NetworkError).type).toBe(NetworkErrorType.UNAUTHORIZED);
      expect((error as NetworkError).statusCode).toBe(401);
    }
  });

  it('should handle network failures', async () => {
    // Mock network failure
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network failure'));
    
    // Make request and expect error
    await expect(
      networkRequestable.request('/users', HTTPMethod.GET)
    ).rejects.toThrow(NetworkError);
    
    try {
      await networkRequestable.request('/users', HTTPMethod.GET);
    } catch (error) {
      expect(error).toBeInstanceOf(NetworkError);
      expect((error as NetworkError).type).toBe(NetworkErrorType.CUSTOM);
    }
  });

  it('should handle timeouts', async () => {
    // Mock timeout
    (global.fetch as jest.Mock).mockImplementationOnce(() => {
      throw NetworkError.timeout();
    });
    
    // Make request and expect error
    try {
      await networkRequestable.request('/slow-endpoint', HTTPMethod.GET);
      fail('Expected an error to be thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(NetworkError);
      expect((error as NetworkError).type).toBe(NetworkErrorType.TIMEOUT);
    }
  });

  it('should use custom headers when provided', async () => {
    // Mock data
    const mockData = { id: 1, name: 'Test User' };
    
    // Custom headers
    const customHeaders = {
      'Authorization': 'Bearer token123',
      'X-Custom-Header': 'Custom Value'
    };
    
    // Mock fetch response
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      createMockResponse(200, mockData)
    );
    
    // Make request with custom headers
    await networkRequestable.request(
      '/users/1',
      HTTPMethod.GET,
      undefined,
      undefined,
      customHeaders
    );
    
    // Assertions
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/users/1',
      expect.objectContaining({
        headers: expect.objectContaining({
          ...customHeaders,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        })
      })
    );
  });

  it('should normalize the endpoint path', async () => {
    // Mock data
    const mockData = { id: 1, name: 'Test User' };
    
    // Mock fetch response
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      createMockResponse(200, mockData)
    );
    
    // Make request with endpoint without leading slash
    await networkRequestable.request('users/1', HTTPMethod.GET);
    
    // Assertions
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/users/1',
      expect.any(Object)
    );
  });

  it('should normalize the base URL', () => {
    // Create client with trailing slash in base URL
    const clientWithTrailingSlash = new BaseNetworkRequestable(baseURL + '/');
    
    // Mock data
    const mockData = { id: 1, name: 'Test User' };
    
    // Mock fetch response
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      createMockResponse(200, mockData)
    );
    
    // Make request
    clientWithTrailingSlash.request('/users/1', HTTPMethod.GET);
    
    // Assertions
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/users/1',
      expect.any(Object)
    );
  });
});
