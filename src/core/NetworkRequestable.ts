import { HTTPMethod, NetworkError } from '../types';

// Use a type import for AbortSignal to avoid declaration conflicts
type AbortSignalPolyfill = {
  readonly aborted: boolean;
  readonly reason?: any;
  addEventListener(type: 'abort', listener: () => void): void;
  removeEventListener(type: 'abort', listener: () => void): void;
};

/**
 * The base protocol for all network requests
 */
export interface NetworkRequestable {
  /**
   * Make a network request
   * @param endpoint The API endpoint
   * @param method The HTTP method
   * @param body Optional request body
   * @param responseType The expected response type
   * @param headers Optional request headers
   * @returns A promise that resolves to the response data
   */
  request<T>(
    endpoint: string,
    method: HTTPMethod,
    body?: Record<string, any>,
    responseType?: new () => T,
    headers?: Record<string, string>
  ): Promise<T>;
}

/**
 * Request options interface
 */
export interface RequestOptions {
  method: HTTPMethod;
  headers: Record<string, string>;
  body?: string;
  signal?: AbortSignalPolyfill;
}

/**
 * Generate a cache key for a request
 */
export function generateCacheKey(
  endpoint: string,
  method: HTTPMethod,
  body?: Record<string, any>
): string {
  return `${method}:${endpoint}:${body ? JSON.stringify(body) : ''}`;
}
