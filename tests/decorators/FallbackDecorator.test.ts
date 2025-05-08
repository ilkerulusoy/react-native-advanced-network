import { FallbackDecorator, DEFAULT_FALLBACK_OPTIONS } from '../../src/decorators/FallbackDecorator';
import { HTTPMethod, NetworkError, NetworkErrorType } from '../../src/types';
import { MockNetworkRequestable } from '../../src/mocks/MockNetworkRequestable';

describe('FallbackDecorator', () => {
  let primaryMock: MockNetworkRequestable;
  let fallbackMock: MockNetworkRequestable;
  let fallbackDecorator: FallbackDecorator;
  
  beforeEach(() => {
    primaryMock = new MockNetworkRequestable();
    fallbackMock = new MockNetworkRequestable();
    fallbackDecorator = new FallbackDecorator(primaryMock, fallbackMock);
    
    // Reset mocks before each test
    primaryMock.reset();
    fallbackMock.reset();
  });
  
  it('should use primary client when it succeeds', async () => {
    // Setup
    const endpoint = '/users/1';
    const mockResponse = { id: 1, name: 'Test User' };
    
    // Configure primary mock to succeed
    primaryMock.mockResponse(endpoint, HTTPMethod.GET, mockResponse);
    
    // Configure fallback mock (should not be used)
    fallbackMock.mockResponse(endpoint, HTTPMethod.GET, { id: 1, name: 'Fallback User' });
    
    // Make request
    const result = await fallbackDecorator.request(endpoint, HTTPMethod.GET);
    
    // Verify
    expect(result).toEqual(mockResponse);
    
    // Verify primary was called but fallback was not
    expect(primaryMock.getRequestHistory().length).toBe(1);
    expect(fallbackMock.getRequestHistory().length).toBe(0);
  });
  
  it('should use fallback client when primary fails with network error', async () => {
    // Setup
    const endpoint = '/users/1';
    const primaryError = NetworkError.networkFailure('Connection failed');
    const fallbackResponse = { id: 1, name: 'Fallback User' };
    
    // Configure primary mock to fail
    primaryMock.mockError(endpoint, HTTPMethod.GET, primaryError);
    
    // Configure fallback mock to succeed
    fallbackMock.mockResponse(endpoint, HTTPMethod.GET, fallbackResponse);
    
    // Make request
    const result = await fallbackDecorator.request(endpoint, HTTPMethod.GET);
    
    // Verify
    expect(result).toEqual(fallbackResponse);
    
    // Verify both clients were called
    expect(primaryMock.getRequestHistory().length).toBe(1);
    expect(fallbackMock.getRequestHistory().length).toBe(1);
  });
  
  it('should use fallback client when primary fails with timeout', async () => {
    // Setup
    const endpoint = '/users/1';
    const primaryError = NetworkError.timeout();
    const fallbackResponse = { id: 1, name: 'Fallback User' };
    
    // Configure primary mock to fail
    primaryMock.mockError(endpoint, HTTPMethod.GET, primaryError);
    
    // Configure fallback mock to succeed
    fallbackMock.mockResponse(endpoint, HTTPMethod.GET, fallbackResponse);
    
    // Make request
    const result = await fallbackDecorator.request(endpoint, HTTPMethod.GET);
    
    // Verify
    expect(result).toEqual(fallbackResponse);
    
    // Verify both clients were called
    expect(primaryMock.getRequestHistory().length).toBe(1);
    expect(fallbackMock.getRequestHistory().length).toBe(1);
  });
  
  it('should use fallback client when primary fails with 5xx error', async () => {
    // Setup
    const endpoint = '/users/1';
    const primaryError = NetworkError.httpError(503);
    const fallbackResponse = { id: 1, name: 'Fallback User' };
    
    // Configure primary mock to fail
    primaryMock.mockError(endpoint, HTTPMethod.GET, primaryError);
    
    // Configure fallback mock to succeed
    fallbackMock.mockResponse(endpoint, HTTPMethod.GET, fallbackResponse);
    
    // Make request
    const result = await fallbackDecorator.request(endpoint, HTTPMethod.GET);
    
    // Verify
    expect(result).toEqual(fallbackResponse);
    
    // Verify both clients were called
    expect(primaryMock.getRequestHistory().length).toBe(1);
    expect(fallbackMock.getRequestHistory().length).toBe(1);
  });
  
  it('should not use fallback client for 4xx errors', async () => {
    // Setup
    const endpoint = '/users/1';
    const primaryError = NetworkError.httpError(404);
    const fallbackResponse = { id: 1, name: 'Fallback User' };
    
    // Configure primary mock to fail
    primaryMock.mockError(endpoint, HTTPMethod.GET, primaryError);
    
    // Configure fallback mock to succeed
    fallbackMock.mockResponse(endpoint, HTTPMethod.GET, fallbackResponse);
    
    // Make request and expect it to fail
    await expect(
      fallbackDecorator.request(endpoint, HTTPMethod.GET)
    ).rejects.toThrow(NetworkError);
    
    // Verify only primary was called
    expect(primaryMock.getRequestHistory().length).toBe(1);
    expect(fallbackMock.getRequestHistory().length).toBe(0);
  });
  
  it('should not use fallback client for unauthorized errors', async () => {
    // Setup
    const endpoint = '/users/1';
    const primaryError = NetworkError.unauthorized();
    const fallbackResponse = { id: 1, name: 'Fallback User' };
    
    // Configure primary mock to fail
    primaryMock.mockError(endpoint, HTTPMethod.GET, primaryError);
    
    // Configure fallback mock to succeed
    fallbackMock.mockResponse(endpoint, HTTPMethod.GET, fallbackResponse);
    
    // Make request and expect it to fail
    await expect(
      fallbackDecorator.request(endpoint, HTTPMethod.GET)
    ).rejects.toThrow(NetworkError);
    
    // Verify only primary was called
    expect(primaryMock.getRequestHistory().length).toBe(1);
    expect(fallbackMock.getRequestHistory().length).toBe(0);
  });
  
  it('should use fallback with custom fallbackErrors', async () => {
    // Setup
    const endpoint = '/users/1';
    const primaryError = NetworkError.unauthorized();
    const fallbackResponse = { id: 1, name: 'Fallback User' };
    const options = {
      fallbackErrors: [NetworkErrorType.UNAUTHORIZED]
    };
    
    // Create decorator with custom options
    const customFallbackDecorator = new FallbackDecorator(
      primaryMock,
      fallbackMock,
      options
    );
    
    // Configure primary mock to fail
    primaryMock.mockError(endpoint, HTTPMethod.GET, primaryError);
    
    // Configure fallback mock to succeed
    fallbackMock.mockResponse(endpoint, HTTPMethod.GET, fallbackResponse);
    
    // Make request
    const result = await customFallbackDecorator.request(endpoint, HTTPMethod.GET);
    
    // Verify
    expect(result).toEqual(fallbackResponse);
    
    // Verify both clients were called
    expect(primaryMock.getRequestHistory().length).toBe(1);
    expect(fallbackMock.getRequestHistory().length).toBe(1);
  });
  
  it('should throw error when both primary and fallback fail', async () => {
    // Setup
    const endpoint = '/users/1';
    const primaryError = NetworkError.networkFailure('Primary connection failed');
    const fallbackError = NetworkError.networkFailure('Fallback connection failed');
    
    // Reset mocks to ensure clean state
    primaryMock.reset();
    fallbackMock.reset();
    
    // Configure both mocks to fail
    primaryMock.mockError(endpoint, HTTPMethod.GET, primaryError);
    fallbackMock.mockError(endpoint, HTTPMethod.GET, fallbackError);
    
    // Make request and expect it to fail with the fallback error
    let caughtError: any;
    try {
      await fallbackDecorator.request(endpoint, HTTPMethod.GET);
    } catch (error) {
      caughtError = error;
    }
    
    // Verify the error is the fallback error
    expect(caughtError).toBeDefined();
    expect(caughtError.message).toBe(fallbackError.message);
    
    // Verify both clients were called exactly once
    const primaryHistory = primaryMock.getRequestHistory();
    const fallbackHistory = fallbackMock.getRequestHistory();
    
    expect(primaryHistory.length).toBe(1);
    expect(fallbackHistory.length).toBe(1);
  });
  
  it('should pass through body, responseType, and headers to both clients', async () => {
    // Setup
    const endpoint = '/users';
    const body = { name: 'Test User' };
    const headers = { 'X-Custom-Header': 'Custom Value' };
    const primaryError = NetworkError.networkFailure('Primary connection failed');
    const fallbackResponse = { id: 1, ...body };
    
    // Reset mocks to ensure clean state
    primaryMock.reset();
    fallbackMock.reset();
    
    // Mock responseType
    class TestResponse {}
    
    // Configure mocks
    primaryMock.mockError(endpoint, HTTPMethod.POST, primaryError, body);
    fallbackMock.mockResponse(endpoint, HTTPMethod.POST, fallbackResponse, body);
    
    // Make request
    const result = await fallbackDecorator.request(
      endpoint,
      HTTPMethod.POST,
      body,
      TestResponse,
      headers
    );
    
    // Verify
    expect(result).toEqual(fallbackResponse);
    
    // Verify primary request was made with correct parameters
    const primaryHistory = primaryMock.getRequestHistory();
    expect(primaryHistory.length).toBe(1);
    expect(primaryHistory[0].endpoint).toBe(endpoint);
    expect(primaryHistory[0].method).toBe(HTTPMethod.POST);
    expect(primaryHistory[0].body).toEqual(body);
    expect(primaryHistory[0].headers).toEqual(headers);
    
    // Verify fallback request was made with correct parameters
    const fallbackHistory = fallbackMock.getRequestHistory();
    expect(fallbackHistory.length).toBe(1);
    expect(fallbackHistory[0].endpoint).toBe(endpoint);
    expect(fallbackHistory[0].method).toBe(HTTPMethod.POST);
    expect(fallbackHistory[0].body).toEqual(body);
    expect(fallbackHistory[0].headers).toEqual(headers);
  });
  
  it('should handle non-NetworkError exceptions from primary', async () => {
    // Setup
    const endpoint = '/users/1';
    const customError = new Error('Custom error');
    const fallbackResponse = { id: 1, name: 'Fallback User' };
    
    // Configure primary mock to throw a non-NetworkError
    primaryMock.mockError(endpoint, HTTPMethod.GET, customError);
    
    // Configure fallback mock to succeed
    fallbackMock.mockResponse(endpoint, HTTPMethod.GET, fallbackResponse);
    
    // Make request and expect it to fail with the original error
    await expect(
      fallbackDecorator.request(endpoint, HTTPMethod.GET)
    ).rejects.toThrow(customError);
    
    // Verify only primary was called
    expect(primaryMock.getRequestHistory().length).toBe(1);
    expect(fallbackMock.getRequestHistory().length).toBe(0);
  });
});
