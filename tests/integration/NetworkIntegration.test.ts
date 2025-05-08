import { 
  BaseNetworkRequestable,
  authenticated,
  cached,
  retry,
  fallback,
  HTTPMethod,
  NetworkError,
  NetworkErrorType,
  MockNetworkRequestable,
  MockCache
} from '../../src';

// Use the global createMockResponse function defined in jest.setup.js
declare global {
  function createMockResponse(status: number, body: any, headers?: Record<string, string>): Response;
}

describe('Network Integration Tests', () => {
  // Mock global fetch for these tests
  beforeEach(() => {
    (global.fetch as jest.Mock).mockReset();
  });

  it('should chain multiple decorators correctly', async () => {
    // Setup
    const baseURL = 'https://api.example.com';
    const endpoint = '/users/1';
    const mockResponse = { id: 1, name: 'Test User' };
    
    // Mock fetch response
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      createMockResponse(200, mockResponse)
    );
    
    // Create a client with multiple decorators
    const tokenProvider = jest.fn().mockReturnValue('test-token');
    const needsAuth = jest.fn().mockReturnValue(true);
    
    const networkClient = authenticated(
      cached(
        retry(
          new BaseNetworkRequestable(baseURL)
        )
      ),
      tokenProvider,
      needsAuth
    );
    
    // Make request
    const result = await networkClient.request(endpoint, HTTPMethod.GET);
    
    // Verify
    expect(result).toEqual(mockResponse);
    expect(tokenProvider).toHaveBeenCalled();
    expect(needsAuth).toHaveBeenCalledWith(endpoint);
    
    // Verify fetch was called with correct parameters
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/users/1',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-token'
        })
      })
    );
    
    // Make the same request again (should use cache)
    const cachedResult = await networkClient.request(endpoint, HTTPMethod.GET);
    
    // Verify
    expect(cachedResult).toEqual(mockResponse);
    
    // Verify fetch was only called once (second request used cache)
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should use fallback when primary fails', async () => {
    // Setup using mocks instead of actual fetch
    const primaryMock = new MockNetworkRequestable();
    const fallbackMock = new MockNetworkRequestable();
    const endpoint = '/users/1';
    const mockResponse = { id: 1, name: 'Test User' };
    
    // Configure mocks
    primaryMock.mockError(endpoint, HTTPMethod.GET, NetworkError.networkFailure('Primary failed'));
    fallbackMock.mockResponse(endpoint, HTTPMethod.GET, mockResponse);
    
    // Create a client with fallback
    const networkClient = fallback(
      primaryMock,
      () => fallbackMock
    );
    
    // Make request
    const result = await networkClient.request(endpoint, HTTPMethod.GET);
    
    // Verify
    expect(result).toEqual(mockResponse);
    
    // Verify both clients were called
    expect(primaryMock.getRequestHistory().length).toBe(1);
    expect(fallbackMock.getRequestHistory().length).toBe(1);
    
    // Verify the requests were made to the correct endpoint
    expect(primaryMock.getRequestHistory()[0].endpoint).toBe(endpoint);
    expect(fallbackMock.getRequestHistory()[0].endpoint).toBe(endpoint);
  });

  it('should retry before using fallback', async () => {
    // Setup using mocks instead of actual fetch
    const primaryMock = new MockNetworkRequestable();
    const fallbackMock = new MockNetworkRequestable();
    const endpoint = '/users/1';
    const mockResponse = { id: 1, name: 'Fallback User' };
    const networkError = NetworkError.networkFailure('Network failure');
    
    // Configure mocks
    primaryMock.mockError(endpoint, HTTPMethod.GET, networkError);
    fallbackMock.mockResponse(endpoint, HTTPMethod.GET, mockResponse);
    
    // Create a client with retry and fallback
    const networkClient = fallback(
      retry(primaryMock),
      () => fallbackMock
    );
    
    // Make request
    const result = await networkClient.request(endpoint, HTTPMethod.GET);
    
    // Verify
    expect(result).toEqual(mockResponse);
    
    // Verify primary was called multiple times (default 3 retries) and fallback once
    expect(primaryMock.getRequestHistory().length).toBe(3); // Default retry count
    expect(fallbackMock.getRequestHistory().length).toBe(1);
    
    // Verify the requests were made to the correct endpoint
    expect(primaryMock.getRequestHistory()[0].endpoint).toBe(endpoint);
    expect(fallbackMock.getRequestHistory()[0].endpoint).toBe(endpoint);
  });

  it('should use cache before retrying or using fallback', async () => {
    // Setup
    const primaryURL = 'https://api.example.com';
    const fallbackURL = 'https://fallback.example.com';
    const endpoint = '/users/1';
    const mockResponse = { id: 1, name: 'Test User' };
    
    // Mock fetch to succeed once then fail
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(createMockResponse(200, mockResponse)) // First call succeeds
      .mockRejectedValue(new Error('Network failure')); // Subsequent calls fail
    
    // Create a client with cache, retry, and fallback
    const mockCache = new MockCache();
    const networkClient = cached(
      fallback(
        retry(
          new BaseNetworkRequestable(primaryURL),
          { maxAttempts: 3 }
        ),
        () => new BaseNetworkRequestable(fallbackURL)
      ),
      mockCache
    );
    
    // First request - should succeed and be cached
    const result1 = await networkClient.request(endpoint, HTTPMethod.GET);
    
    // Second request - should use cache and not hit network
    const result2 = await networkClient.request(endpoint, HTTPMethod.GET);
    
    // Verify
    expect(result1).toEqual(mockResponse);
    expect(result2).toEqual(mockResponse);
    
    // Verify fetch was only called once
    expect(global.fetch).toHaveBeenCalledTimes(1);
    
    // Verify cache was used
    expect(mockCache.getSetHistory().length).toBe(1);
    expect(mockCache.getGetHistory().length).toBe(2);
  });

  it('should combine multiple decorators', async () => {
    // Create mock network clients
    const mockClient = new MockNetworkRequestable();
    
    // Setup test data
    const endpoint = '/api/data';
    const mockResponse = { id: 1, name: 'Test Result' };
    
    // Configure mock to return success
    mockClient.mockResponse(endpoint, HTTPMethod.GET, mockResponse);
    
    // Create a client with multiple decorators
    const networkClient = cached(
      retry(
        mockClient,
        { maxAttempts: 2 }
      ),
      new MockCache()
    );
    
    // Make the request
    const result = await networkClient.request(endpoint, HTTPMethod.GET);
    
    // Verify the result
    expect(result).toEqual(mockResponse);
    
    // Verify the mock was called
    const requestHistory = mockClient.getRequestHistory();
    expect(requestHistory.length).toBe(1);
    expect(requestHistory[0].endpoint).toBe(endpoint);
    expect(requestHistory[0].method).toBe(HTTPMethod.GET);
  });
});
