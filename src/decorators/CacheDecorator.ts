import { HTTPMethod } from '../types';
import { NetworkRequestable, generateCacheKey } from '../core/NetworkRequestable';

/**
 * Interface for cache implementations
 */
export interface Cache {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttl?: number): void;
  remove(key: string): void;
  clear(): void;
}

/**
 * In-memory cache implementation
 */
export class MemoryCache implements Cache {
  private cache: Map<string, { value: any; expiry: number | null }>;

  constructor() {
    this.cache = new Map();
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    // Check if the item has expired
    if (item.expiry !== null && Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value as T;
  }

  set<T>(key: string, value: T, ttl?: number): void {
    const expiry = ttl ? Date.now() + ttl : null;
    this.cache.set(key, { value, expiry });
  }

  remove(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * Decorator that adds caching to requests
 */
export class CacheDecorator implements NetworkRequestable {
  private wrapped: NetworkRequestable;
  private cache: Cache;
  private ttl: number | null;
  private cacheMethods: HTTPMethod[];

  /**
   * Create a new CacheDecorator
   * @param wrapped The NetworkRequestable to wrap
   * @param cache The cache implementation to use
   * @param ttl Time-to-live in milliseconds (null for no expiry)
   * @param cacheMethods HTTP methods to cache (default: GET only)
   */
  constructor(
    wrapped: NetworkRequestable,
    cache: Cache = new MemoryCache(),
    ttl: number | null = null,
    cacheMethods: HTTPMethod[] = [HTTPMethod.GET]
  ) {
    this.wrapped = wrapped;
    this.cache = cache;
    this.ttl = ttl;
    this.cacheMethods = cacheMethods;
  }

  /**
   * Make a cached network request
   * @param endpoint The API endpoint
   * @param method The HTTP method
   * @param body Optional request body
   * @param responseType The expected response type
   * @param headers Optional request headers
   * @returns A promise that resolves to the response data
   */
  async request<T>(
    endpoint: string,
    method: HTTPMethod,
    body?: Record<string, any>,
    responseType?: new () => T,
    headers: Record<string, string> = {}
  ): Promise<T> {
    // Only cache methods specified in cacheMethods
    if (this.cacheMethods.includes(method)) {
      const cacheKey = generateCacheKey(endpoint, method, body);
      
      // Try to get from cache
      const cachedResponse = this.cache.get<T>(cacheKey);
      if (cachedResponse !== null) {
        return cachedResponse;
      }
      
      // If not in cache, make the request
      const response = await this.wrapped.request<T>(endpoint, method, body, responseType, headers);
      
      // Cache the response
      this.cache.set(cacheKey, response, this.ttl ?? undefined);
      
      return response;
    }
    
    // If not a cacheable method, just pass through
    return this.wrapped.request<T>(endpoint, method, body, responseType, headers);
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Remove a specific item from the cache
   * @param endpoint The API endpoint
   * @param method The HTTP method
   * @param body Optional request body
   */
  invalidateCache(
    endpoint: string,
    method: HTTPMethod,
    body?: Record<string, any>
  ): void {
    const cacheKey = generateCacheKey(endpoint, method, body);
    this.cache.remove(cacheKey);
  }
}

/**
 * Extension function to add caching to a NetworkRequestable
 * @param networkRequestable The NetworkRequestable to extend
 * @param cache The cache implementation to use
 * @param ttl Time-to-live in milliseconds (null for no expiry)
 * @param cacheMethods HTTP methods to cache (default: GET only)
 * @returns A new NetworkRequestable with caching
 */
export function cached(
  networkRequestable: NetworkRequestable,
  cache: Cache = new MemoryCache(),
  ttl: number | null = null,
  cacheMethods: HTTPMethod[] = [HTTPMethod.GET]
): CacheDecorator {
  return new CacheDecorator(networkRequestable, cache, ttl, cacheMethods);
}
