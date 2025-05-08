import { CacheDecorator, MemoryCache } from '../../src/decorators/CacheDecorator';
import { HTTPMethod } from '../../src/types';
import { MockNetworkRequestable } from '../../src/mocks/MockNetworkRequestable';
import { MockCache } from '../../src/mocks/MockCache';
import { generateCacheKey } from '../../src/core/NetworkRequestable';

describe('CacheDecorator', () => {
  let mockNetworkRequestable: MockNetworkRequestable;
  let mockCache: MockCache;
  let cacheDecorator: CacheDecorator;
  
  beforeEach(() => {
    mockNetworkRequestable = new MockNetworkRequestable();
    mockCache = new MockCache();
    cacheDecorator = new CacheDecorator(mockNetworkRequestable, mockCache);
  });
  
  it('should cache GET requests and return cached responses', async () => {
    // Setup
    const endpoint = '/users/1';
    const mockResponse = { id: 1, name: 'Test User' };
    const cacheKey = generateCacheKey(endpoint, HTTPMethod.GET);
    
    // Configure mock
    mockNetworkRequestable.mockResponse(endpoint, HTTPMethod.GET, mockResponse);
    
    // First request - should hit the network
    const result1 = await cacheDecorator.request(endpoint, HTTPMethod.GET);
    
    // Second request - should hit the cache
    const result2 = await cacheDecorator.request(endpoint, HTTPMethod.GET);
    
    // Verify
    expect(result1).toEqual(mockResponse);
    expect(result2).toEqual(mockResponse);
    
    // Verify network was only called once
    const requestHistory = mockNetworkRequestable.getRequestHistory();
    expect(requestHistory.length).toBe(1);
    
    // Verify cache operations
    expect(mockCache.getSetHistory().length).toBe(1);
    expect(mockCache.getSetHistory()[0].key).toBe(cacheKey);
    expect(mockCache.getSetHistory()[0].value).toEqual(mockResponse);
    
    expect(mockCache.getGetHistory().length).toBe(2); // One for first request (miss), one for second (hit)
    expect(mockCache.getGetHistory()[1]).toBe(cacheKey);
  });
  
  it('should not cache non-GET requests by default', async () => {
    // Setup
    const endpoint = '/users';
    const requestBody = { name: 'New User' };
    const mockResponse = { id: 123, name: 'New User' };
    
    // Configure mock
    mockNetworkRequestable.mockResponse(endpoint, HTTPMethod.POST, mockResponse, requestBody);
    
    // First request
    const result1 = await cacheDecorator.request(endpoint, HTTPMethod.POST, requestBody);
    
    // Second request
    const result2 = await cacheDecorator.request(endpoint, HTTPMethod.POST, requestBody);
    
    // Verify
    expect(result1).toEqual(mockResponse);
    expect(result2).toEqual(mockResponse);
    
    // Verify network was called twice
    const requestHistory = mockNetworkRequestable.getRequestHistory();
    expect(requestHistory.length).toBe(2);
    
    // Verify cache was not used
    expect(mockCache.getSetHistory().length).toBe(0);
  });
  
  it('should cache specified HTTP methods when configured', async () => {
    // Setup with POST caching enabled
    const cacheMethods = [HTTPMethod.GET, HTTPMethod.POST];
    const customCacheDecorator = new CacheDecorator(
      mockNetworkRequestable,
      mockCache,
      null,
      cacheMethods
    );
    
    const endpoint = '/users';
    const requestBody = { name: 'New User' };
    const mockResponse = { id: 123, name: 'New User' };
    const cacheKey = generateCacheKey(endpoint, HTTPMethod.POST, requestBody);
    
    // Configure mock
    mockNetworkRequestable.mockResponse(endpoint, HTTPMethod.POST, mockResponse, requestBody);
    
    // First request
    const result1 = await customCacheDecorator.request(endpoint, HTTPMethod.POST, requestBody);
    
    // Second request
    const result2 = await customCacheDecorator.request(endpoint, HTTPMethod.POST, requestBody);
    
    // Verify
    expect(result1).toEqual(mockResponse);
    expect(result2).toEqual(mockResponse);
    
    // Verify network was called only once
    const requestHistory = mockNetworkRequestable.getRequestHistory();
    expect(requestHistory.length).toBe(1);
    
    // Verify cache was used
    expect(mockCache.getSetHistory().length).toBe(1);
    expect(mockCache.getSetHistory()[0].key).toBe(cacheKey);
  });
  
  it('should respect TTL when provided', async () => {
    // Mock Date.now for consistent testing
    const originalDateNow = Date.now;
    let currentTime = 1000;
    Date.now = jest.fn(() => currentTime);
    
    try {
      // Setup with 5 second TTL
      const ttl = 5000;
      const ttlCacheDecorator = new CacheDecorator(
        mockNetworkRequestable,
        new MemoryCache(), // Use real MemoryCache to test TTL
        ttl
      );
      
      const endpoint = '/users/1';
      const mockResponse = { id: 1, name: 'Test User' };
      
      // Configure mock
      mockNetworkRequestable.mockResponse(endpoint, HTTPMethod.GET, mockResponse);
      
      // First request - should hit the network
      const result1 = await ttlCacheDecorator.request(endpoint, HTTPMethod.GET);
      
      // Second request within TTL - should hit the cache
      const result2 = await ttlCacheDecorator.request(endpoint, HTTPMethod.GET);
      
      // Advance time beyond TTL
      currentTime += ttl + 1000;
      
      // Third request after TTL expired - should hit the network again
      const result3 = await ttlCacheDecorator.request(endpoint, HTTPMethod.GET);
      
      // Verify
      expect(result1).toEqual(mockResponse);
      expect(result2).toEqual(mockResponse);
      expect(result3).toEqual(mockResponse);
      
      // Verify network was called twice (first request and after TTL expired)
      const requestHistory = mockNetworkRequestable.getRequestHistory();
      expect(requestHistory.length).toBe(2);
    } finally {
      // Restore original Date.now
      Date.now = originalDateNow;
    }
  });
  
  it('should clear the entire cache', async () => {
    // Setup
    const endpoint1 = '/users/1';
    const endpoint2 = '/users/2';
    const mockResponse1 = { id: 1, name: 'User 1' };
    const mockResponse2 = { id: 2, name: 'User 2' };
    
    // Configure mocks
    mockNetworkRequestable.mockResponse(endpoint1, HTTPMethod.GET, mockResponse1);
    mockNetworkRequestable.mockResponse(endpoint2, HTTPMethod.GET, mockResponse2);
    
    // Make initial requests to populate cache
    await cacheDecorator.request(endpoint1, HTTPMethod.GET);
    await cacheDecorator.request(endpoint2, HTTPMethod.GET);
    
    // Clear cache
    cacheDecorator.clearCache();
    
    // Make requests again
    await cacheDecorator.request(endpoint1, HTTPMethod.GET);
    await cacheDecorator.request(endpoint2, HTTPMethod.GET);
    
    // Verify network was called 4 times (2 initial + 2 after clearing)
    const requestHistory = mockNetworkRequestable.getRequestHistory();
    expect(requestHistory.length).toBe(4);
    
    // Verify cache was cleared
    expect(mockCache.getClearCount()).toBe(1);
  });
  
  it('should invalidate specific cache entries', async () => {
    // Setup
    const endpoint1 = '/users/1';
    const endpoint2 = '/users/2';
    const mockResponse1 = { id: 1, name: 'User 1' };
    const mockResponse2 = { id: 2, name: 'User 2' };
    
    // Configure mocks
    mockNetworkRequestable.mockResponse(endpoint1, HTTPMethod.GET, mockResponse1);
    mockNetworkRequestable.mockResponse(endpoint2, HTTPMethod.GET, mockResponse2);
    
    // Make initial requests to populate cache
    await cacheDecorator.request(endpoint1, HTTPMethod.GET);
    await cacheDecorator.request(endpoint2, HTTPMethod.GET);
    
    // Invalidate specific cache entry
    cacheDecorator.invalidateCache(endpoint1, HTTPMethod.GET);
    
    // Make requests again
    await cacheDecorator.request(endpoint1, HTTPMethod.GET);
    await cacheDecorator.request(endpoint2, HTTPMethod.GET);
    
    // Verify network was called 3 times (2 initial + 1 after invalidating endpoint1)
    const requestHistory = mockNetworkRequestable.getRequestHistory();
    expect(requestHistory.length).toBe(3);
    
    // Verify specific cache entry was removed
    const cacheKey1 = generateCacheKey(endpoint1, HTTPMethod.GET);
    expect(mockCache.getRemoveHistory()).toContain(cacheKey1);
  });
  
  it('should use the provided cache implementation', async () => {
    // Setup with custom cache
    const customCache = new MockCache();
    const customCacheDecorator = new CacheDecorator(
      mockNetworkRequestable,
      customCache
    );
    
    const endpoint = '/users/1';
    const mockResponse = { id: 1, name: 'Test User' };
    
    // Configure mock
    mockNetworkRequestable.mockResponse(endpoint, HTTPMethod.GET, mockResponse);
    
    // Make request
    await customCacheDecorator.request(endpoint, HTTPMethod.GET);
    
    // Verify custom cache was used
    expect(customCache.getSetHistory().length).toBe(1);
  });
  
  it('should generate correct cache keys with body', async () => {
    // Setup
    const endpoint = '/search';
    const body1 = { query: 'test1' };
    const body2 = { query: 'test2' };
    const mockResponse1 = { results: ['result1'] };
    const mockResponse2 = { results: ['result2'] };
    
    // Configure mocks
    mockNetworkRequestable.mockResponse(endpoint, HTTPMethod.GET, mockResponse1, body1);
    mockNetworkRequestable.mockResponse(endpoint, HTTPMethod.GET, mockResponse2, body2);
    
    // Make requests with different bodies
    const result1 = await cacheDecorator.request(endpoint, HTTPMethod.GET, body1);
    const result2 = await cacheDecorator.request(endpoint, HTTPMethod.GET, body2);
    
    // Make the same requests again
    const result1Again = await cacheDecorator.request(endpoint, HTTPMethod.GET, body1);
    const result2Again = await cacheDecorator.request(endpoint, HTTPMethod.GET, body2);
    
    // Verify
    expect(result1).toEqual(mockResponse1);
    expect(result2).toEqual(mockResponse2);
    expect(result1Again).toEqual(mockResponse1);
    expect(result2Again).toEqual(mockResponse2);
    
    // Verify network was called only twice (once for each unique body)
    const requestHistory = mockNetworkRequestable.getRequestHistory();
    expect(requestHistory.length).toBe(2);
    
    // Verify cache keys are different for different bodies
    const cacheKeys = mockCache.getSetHistory().map(item => item.key);
    expect(cacheKeys.length).toBe(2);
    expect(cacheKeys[0]).not.toBe(cacheKeys[1]);
  });
});
