import { HTTPMethod, NetworkError } from '../types';
import { NetworkRequestable, RequestOptions } from './NetworkRequestable';

/**
 * The fundamental implementation of NetworkRequestable
 */
export class BaseNetworkRequestable implements NetworkRequestable {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private timeoutMs: number;

  /**
   * Create a new BaseNetworkRequestable
   * @param baseURL The base URL for all requests
   * @param defaultHeaders Default headers to include in all requests
   * @param timeoutMs Request timeout in milliseconds (default: 30000)
   */
  constructor(
    baseURL: string,
    defaultHeaders: Record<string, string> = {},
    timeoutMs: number = 30000
  ) {
    // Ensure baseURL doesn't end with a slash
    this.baseURL = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...defaultHeaders
    };
    this.timeoutMs = timeoutMs;
  }

  /**
   * Make a network request
   * @param endpoint The API endpoint
   * @param method The HTTP method
   * @param body Optional request body
   * @param responseType The expected response type (not used in JS/TS implementation but kept for API consistency)
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
    // Ensure endpoint starts with a slash
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseURL}${normalizedEndpoint}`;
    
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);
      
      // Create request options
      const options: RequestInit = {
        method,
        headers: { ...this.defaultHeaders, ...headers },
        signal: controller.signal as AbortSignal
      };
      
      // Add body if provided
      if (body && (method !== HTTPMethod.GET && method !== HTTPMethod.HEAD)) {
        options.body = JSON.stringify(body);
      }
      
      // Make the request
      const response = await fetch(url, options);
      
      // Clear timeout
      clearTimeout(timeoutId);
      
      // Handle HTTP errors
      if (!response.ok) {
        if (response.status === 401) {
          throw NetworkError.unauthorized();
        }
        throw NetworkError.httpError(response.status);
      }
      
      // Parse response
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        return data as T;
      } else {
        const text = await response.text();
        if (!text) {
          throw NetworkError.noData();
        }
        
        // Try to parse as JSON anyway if we expected a JSON response
        try {
          return JSON.parse(text) as T;
        } catch (e) {
          // Return text as is if it's not JSON
          return text as unknown as T;
        }
      }
    } catch (error) {
      // Handle aborted requests (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        throw NetworkError.timeout();
      }
      
      // Re-throw NetworkError instances
      if (error instanceof NetworkError) {
        throw error;
      }
      
      // Handle other errors
      throw NetworkError.custom((error as Error).message);
    }
  }
}
