import { AuthenticatedDecorator } from '../../src/decorators/AuthenticatedDecorator';
import { HTTPMethod, NetworkError, NetworkErrorType } from '../../src/types';
import { MockNetworkRequestable } from '../../src/mocks/MockNetworkRequestable';

describe('AuthenticatedDecorator', () => {
  let mockNetworkRequestable: MockNetworkRequestable;
  let authenticatedDecorator: AuthenticatedDecorator;
  let tokenProvider: jest.Mock;
  let needsAuth: jest.Mock;
  
  beforeEach(() => {
    mockNetworkRequestable = new MockNetworkRequestable();
    tokenProvider = jest.fn();
    needsAuth = jest.fn();
    
    authenticatedDecorator = new AuthenticatedDecorator(
      mockNetworkRequestable,
      tokenProvider,
      needsAuth
    );
  });
  
  it('should pass through requests that do not need authentication', async () => {
    // Setup
    const endpoint = '/public/data';
    const mockResponse = { data: 'public data' };
    
    // Configure mocks
    needsAuth.mockReturnValue(false);
    mockNetworkRequestable.mockResponse(endpoint, HTTPMethod.GET, mockResponse);
    
    // Execute
    const result = await authenticatedDecorator.request(endpoint, HTTPMethod.GET);
    
    // Verify
    expect(needsAuth).toHaveBeenCalledWith(endpoint);
    expect(tokenProvider).not.toHaveBeenCalled();
    expect(result).toEqual(mockResponse);
    
    // Verify the request was passed through without modification
    const requestHistory = mockNetworkRequestable.getRequestHistory();
    expect(requestHistory.length).toBe(1);
    expect(requestHistory[0].endpoint).toBe(endpoint);
    expect(requestHistory[0].method).toBe(HTTPMethod.GET);
    expect(requestHistory[0].headers).toEqual({});
  });
  
  it('should add authentication header for requests that need authentication', async () => {
    // Setup
    const endpoint = '/secure/data';
    const token = 'test-token-123';
    const mockResponse = { data: 'secure data' };
    
    // Configure mocks
    needsAuth.mockReturnValue(true);
    tokenProvider.mockReturnValue(token);
    mockNetworkRequestable.mockResponse(endpoint, HTTPMethod.GET, mockResponse);
    
    // Execute
    const result = await authenticatedDecorator.request(endpoint, HTTPMethod.GET);
    
    // Verify
    expect(needsAuth).toHaveBeenCalledWith(endpoint);
    expect(tokenProvider).toHaveBeenCalled();
    expect(result).toEqual(mockResponse);
    
    // Verify the auth header was added
    const requestHistory = mockNetworkRequestable.getRequestHistory();
    expect(requestHistory.length).toBe(1);
    expect(requestHistory[0].endpoint).toBe(endpoint);
    expect(requestHistory[0].method).toBe(HTTPMethod.GET);
    expect(requestHistory[0].headers).toEqual({
      'Authorization': `Bearer ${token}`
    });
  });
  
  it('should add token as-is if it already starts with Bearer', async () => {
    // Setup
    const endpoint = '/secure/data';
    const token = 'Bearer test-token-123';
    const mockResponse = { data: 'secure data' };
    
    // Configure mocks
    needsAuth.mockReturnValue(true);
    tokenProvider.mockReturnValue(token);
    mockNetworkRequestable.mockResponse(endpoint, HTTPMethod.GET, mockResponse);
    
    // Execute
    const result = await authenticatedDecorator.request(endpoint, HTTPMethod.GET);
    
    // Verify the auth header was added without duplicating 'Bearer'
    const requestHistory = mockNetworkRequestable.getRequestHistory();
    expect(requestHistory[0].headers).toEqual({
      'Authorization': token
    });
  });
  
  it('should use custom header name when provided', async () => {
    // Setup
    const endpoint = '/secure/data';
    const token = 'test-token-123';
    const customHeaderName = 'X-Custom-Auth';
    const mockResponse = { data: 'secure data' };
    
    // Create decorator with custom header name
    const customDecorator = new AuthenticatedDecorator(
      mockNetworkRequestable,
      tokenProvider,
      needsAuth,
      customHeaderName
    );
    
    // Configure mocks
    needsAuth.mockReturnValue(true);
    tokenProvider.mockReturnValue(token);
    mockNetworkRequestable.mockResponse(endpoint, HTTPMethod.GET, mockResponse);
    
    // Execute
    const result = await customDecorator.request(endpoint, HTTPMethod.GET);
    
    // Verify the custom auth header was added
    const requestHistory = mockNetworkRequestable.getRequestHistory();
    expect(requestHistory[0].headers).toEqual({
      [customHeaderName]: `Bearer ${token}`
    });
  });
  
  it('should throw unauthorized error if token is not available', async () => {
    // Setup
    const endpoint = '/secure/data';
    
    // Configure mocks
    needsAuth.mockReturnValue(true);
    tokenProvider.mockReturnValue(null);
    
    // Execute and verify
    await expect(
      authenticatedDecorator.request(endpoint, HTTPMethod.GET)
    ).rejects.toThrow(NetworkError);
    
    try {
      await authenticatedDecorator.request(endpoint, HTTPMethod.GET);
    } catch (error) {
      expect(error).toBeInstanceOf(NetworkError);
      expect((error as NetworkError).type).toBe(NetworkErrorType.UNAUTHORIZED);
    }
    
    // Verify no request was made to the wrapped client
    const requestHistory = mockNetworkRequestable.getRequestHistory();
    expect(requestHistory.length).toBe(0);
  });
  
  it('should preserve existing headers when adding authentication', async () => {
    // Setup
    const endpoint = '/secure/data';
    const token = 'test-token-123';
    const existingHeaders = {
      'Content-Type': 'application/json',
      'X-Custom-Header': 'Custom Value'
    };
    const mockResponse = { data: 'secure data' };
    
    // Configure mocks
    needsAuth.mockReturnValue(true);
    tokenProvider.mockReturnValue(token);
    mockNetworkRequestable.mockResponse(endpoint, HTTPMethod.GET, mockResponse);
    
    // Execute
    const result = await authenticatedDecorator.request(
      endpoint,
      HTTPMethod.GET,
      undefined,
      undefined,
      existingHeaders
    );
    
    // Verify headers were merged correctly
    const requestHistory = mockNetworkRequestable.getRequestHistory();
    expect(requestHistory[0].headers).toEqual({
      ...existingHeaders,
      'Authorization': `Bearer ${token}`
    });
  });
  
  it('should pass through body and responseType', async () => {
    // Setup
    const endpoint = '/secure/data';
    const token = 'test-token-123';
    const body = { name: 'Test', value: 123 };
    const mockResponse = { id: 1, ...body };
    
    // Mock responseType
    class TestResponse {}
    
    // Configure mocks
    needsAuth.mockReturnValue(true);
    tokenProvider.mockReturnValue(token);
    mockNetworkRequestable.mockResponse(endpoint, HTTPMethod.POST, mockResponse, body);
    
    // Execute
    const result = await authenticatedDecorator.request(
      endpoint,
      HTTPMethod.POST,
      body,
      TestResponse
    );
    
    // Verify body and responseType were passed through
    const requestHistory = mockNetworkRequestable.getRequestHistory();
    expect(requestHistory[0].body).toEqual(body);
    // We can't directly check responseType was passed through in the mock,
    // but we can verify the result was returned correctly
    expect(result).toEqual(mockResponse);
  });
});
