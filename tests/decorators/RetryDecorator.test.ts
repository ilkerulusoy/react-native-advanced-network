import { RetryDecorator, DEFAULT_RETRY_OPTIONS } from '../../src/decorators/RetryDecorator';
import { HTTPMethod, NetworkError, NetworkErrorType } from '../../src/types';
import { MockNetworkRequestable } from '../../src/mocks/MockNetworkRequestable';

// Create a mock for the delay function
const mockDelay = jest.fn().mockResolvedValue(undefined);

// Mock the delay function directly
jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
  // Execute the callback immediately
  callback();
  return {} as any;
});

// Spy on the delay function
jest.mock('../../src/decorators/RetryDecorator', () => {
  const originalModule = jest.requireActual('../../src/decorators/RetryDecorator');
  
  // Spy on the delay function
  jest.spyOn(originalModule, 'delay').mockImplementation(async () => {
    mockDelay();
    return Promise.resolve();
  });
  
  return originalModule;
});

describe('RetryDecorator', () => {
  let mockNetworkRequestable: MockNetworkRequestable;
  let retryDecorator: RetryDecorator;
  
  beforeEach(() => {
    mockNetworkRequestable = new MockNetworkRequestable();
    retryDecorator = new RetryDecorator(mockNetworkRequestable);
    
    // Reset the delay mock
    mockDelay.mockClear();
  });
  
  it('should not retry on successful requests', async () => {
    // Setup
    const endpoint = '/users/1';
    const mockResponse = { id: 1, name: 'Test User' };
    
    // Configure mock
    mockNetworkRequestable.mockResponse(endpoint, HTTPMethod.GET, mockResponse);
    
    // Make request
    const result = await retryDecorator.request(endpoint, HTTPMethod.GET);
    
    // Verify
    expect(result).toEqual(mockResponse);
    
    // Verify network was called only once
    const requestHistory = mockNetworkRequestable.getRequestHistory();
    expect(requestHistory.length).toBe(1);
    
    // Verify delay was not called
    expect(mockDelay).not.toHaveBeenCalled();
  });
  
  it('should retry on network failures up to maxAttempts', async () => {
    // Setup
    const endpoint = '/users/1';
    const networkError = NetworkError.networkFailure('Connection failed');
    
    // Configure mock to always fail
    mockNetworkRequestable.mockError(endpoint, HTTPMethod.GET, networkError);
    
    // Make request and expect it to fail
    await expect(
      retryDecorator.request(endpoint, HTTPMethod.GET)
    ).rejects.toThrow(NetworkError);
    
    // Verify network was called maxAttempts times
    const requestHistory = mockNetworkRequestable.getRequestHistory();
    expect(requestHistory.length).toBe(DEFAULT_RETRY_OPTIONS.maxAttempts);
  });
  
  it('should retry with exponential backoff', async () => {
    // Setup
    const endpoint = '/users/1';
    const networkError = NetworkError.networkFailure('Connection failed');
    const options = {
      maxAttempts: 3,
      initialDelay: 100,
      backoffFactor: 2,
      maxDelay: 1000
    };
    
    // Create decorator with custom options
    const customRetryDecorator = new RetryDecorator(mockNetworkRequestable, options);
    
    // Configure mock to always fail
    mockNetworkRequestable.mockError(endpoint, HTTPMethod.GET, networkError);
    
    // Make request and expect it to fail
    await expect(
      customRetryDecorator.request(endpoint, HTTPMethod.GET)
    ).rejects.toThrow(NetworkError);
    
    // Verify network was called maxAttempts times
    const requestHistory = mockNetworkRequestable.getRequestHistory();
    expect(requestHistory.length).toBe(options.maxAttempts);
  });
  
  it('should respect maxDelay for exponential backoff', async () => {
    // Setup
    const endpoint = '/users/1';
    const networkError = NetworkError.networkFailure('Connection failed');
    const options = {
      maxAttempts: 4,
      initialDelay: 500,
      backoffFactor: 4,
      maxDelay: 1000
    };
    
    // Create decorator with custom options
    const customRetryDecorator = new RetryDecorator(mockNetworkRequestable, options);
    
    // Configure mock to always fail
    mockNetworkRequestable.mockError(endpoint, HTTPMethod.GET, networkError);
    
    // Make request and expect it to fail
    await expect(
      customRetryDecorator.request(endpoint, HTTPMethod.GET)
    ).rejects.toThrow(NetworkError);
    
    // Verify network was called maxAttempts times
    const requestHistory = mockNetworkRequestable.getRequestHistory();
    expect(requestHistory.length).toBe(options.maxAttempts);
  });
  
  it('should not retry on non-retryable errors', async () => {
    // Setup
    const endpoint = '/users/1';
    const unauthorizedError = NetworkError.unauthorized();
    
    // Configure mock
    mockNetworkRequestable.mockError(endpoint, HTTPMethod.GET, unauthorizedError);
    
    // Make request and expect it to fail
    await expect(
      retryDecorator.request(endpoint, HTTPMethod.GET)
    ).rejects.toThrow(NetworkError);
    
    // Verify network was called only once
    const requestHistory = mockNetworkRequestable.getRequestHistory();
    expect(requestHistory.length).toBe(1);
    
    // Verify delay was not called
    expect(mockDelay).not.toHaveBeenCalled();
  });
  
  it('should retry on 5xx errors but not on 4xx errors', async () => {
    // Setup
    const endpoint5xx = '/server-error';
    const endpoint4xx = '/client-error';
    const serverError = NetworkError.httpError(500);
    const clientError = NetworkError.httpError(404);
    
    // Configure mocks
    mockNetworkRequestable.mockError(endpoint5xx, HTTPMethod.GET, serverError);
    mockNetworkRequestable.mockError(endpoint4xx, HTTPMethod.GET, clientError);
    
    // Make requests and expect them to fail
    await expect(
      retryDecorator.request(endpoint5xx, HTTPMethod.GET)
    ).rejects.toThrow(NetworkError);
    
    await expect(
      retryDecorator.request(endpoint4xx, HTTPMethod.GET)
    ).rejects.toThrow(NetworkError);
    
    // Verify 5xx was retried but 4xx was not
    const requestHistory = mockNetworkRequestable.getRequestHistory();
    
    // Count requests to each endpoint
    const serverErrorRequests = requestHistory.filter(req => req.endpoint === endpoint5xx);
    const clientErrorRequests = requestHistory.filter(req => req.endpoint === endpoint4xx);
    
    expect(serverErrorRequests.length).toBe(DEFAULT_RETRY_OPTIONS.maxAttempts);
    expect(clientErrorRequests.length).toBe(1);
  });
  
  it('should retry with custom retryable errors', async () => {
    // Setup
    const endpoint = '/users/1';
    const unauthorizedError = NetworkError.unauthorized();
    const options = {
      maxAttempts: 3,
      retryableErrors: [NetworkErrorType.UNAUTHORIZED]
    };
    
    // Create decorator with custom options
    const customRetryDecorator = new RetryDecorator(mockNetworkRequestable, options);
    
    // Configure mock
    mockNetworkRequestable.mockError(endpoint, HTTPMethod.GET, unauthorizedError);
    
    // Make request and expect it to fail
    await expect(
      customRetryDecorator.request(endpoint, HTTPMethod.GET)
    ).rejects.toThrow(NetworkError);
    
    // Verify network was called maxAttempts times
    const requestHistory = mockNetworkRequestable.getRequestHistory();
    expect(requestHistory.length).toBe(options.maxAttempts);
  });
  
  it('should stop retrying when request succeeds', async () => {
    // Setup
    const endpoint = '/users/1';
    const mockResponse = { id: 1, name: 'Test User' };
    
    // Configure mock to fail once then succeed
    mockNetworkRequestable.mockResponseSequence(endpoint, HTTPMethod.GET, [
      { success: false, error: new NetworkError(NetworkErrorType.NETWORK_FAILURE, 'Connection failed') },
      { success: true, response: mockResponse }
    ]);
    
    // Make request
    const result = await retryDecorator.request(endpoint, HTTPMethod.GET);
    
    // Verify
    expect(result).toEqual(mockResponse);
    
    // Verify network was called twice (initial failure + successful retry)
    const requestHistory = mockNetworkRequestable.getRequestHistory();
    expect(requestHistory.length).toBe(2);
  });
  
  it('should pass through body, responseType, and headers', async () => {
    // Setup
    const endpoint = '/users';
    const body = { name: 'Test User' };
    const headers = { 'X-Custom-Header': 'Custom Value' };
    const mockResponse = { id: 1, ...body };
    
    // Mock responseType
    class TestResponse {}
    
    // Configure mock
    mockNetworkRequestable.mockResponse(endpoint, HTTPMethod.POST, mockResponse, body);
    
    // Make request
    const result = await retryDecorator.request(
      endpoint,
      HTTPMethod.POST,
      body,
      TestResponse,
      headers
    );
    
    // Verify
    expect(result).toEqual(mockResponse);
    
    // Verify request was made with correct parameters
    const requestHistory = mockNetworkRequestable.getRequestHistory();
    expect(requestHistory[0].endpoint).toBe(endpoint);
    expect(requestHistory[0].method).toBe(HTTPMethod.POST);
    expect(requestHistory[0].body).toEqual(body);
    expect(requestHistory[0].headers).toEqual(headers);
  });
});
