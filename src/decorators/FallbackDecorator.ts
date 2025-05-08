import { HTTPMethod, NetworkError, NetworkErrorType } from '../types';
import { NetworkRequestable } from '../core/NetworkRequestable';

/**
 * Fallback options
 */
export interface FallbackOptions {
  fallbackErrors: NetworkErrorType[];
}

/**
 * Default fallback options
 */
export const DEFAULT_FALLBACK_OPTIONS: FallbackOptions = {
  fallbackErrors: [
    NetworkErrorType.NETWORK_FAILURE,
    NetworkErrorType.TIMEOUT,
    NetworkErrorType.HTTP_ERROR
  ]
};

/**
 * Decorator that adds fallback functionality to requests
 */
export class FallbackDecorator implements NetworkRequestable {
  private primary: NetworkRequestable;
  private fallback: NetworkRequestable;
  private options: FallbackOptions;

  /**
   * Create a new FallbackDecorator
   * @param primary The primary NetworkRequestable
   * @param fallback The fallback NetworkRequestable
   * @param options Fallback options
   */
  constructor(
    primary: NetworkRequestable,
    fallback: NetworkRequestable,
    options: Partial<FallbackOptions> = {}
  ) {
    this.primary = primary;
    this.fallback = fallback;
    this.options = { ...DEFAULT_FALLBACK_OPTIONS, ...options };
  }

  /**
   * Make a network request with fallback functionality
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
    try {
      // Try the primary request
      return await this.primary.request<T>(endpoint, method, body, responseType, headers);
    } catch (error) {
      // Only use fallback if it's a NetworkError
      if (!(error instanceof NetworkError)) {
        throw error;
      }
      
      // Check if this error type should use fallback
      if (!this.options.fallbackErrors.includes(error.type)) {
        throw error;
      }
      
      // If it's an HTTP error, check if it's a 5xx error (server error)
      if (error.type === NetworkErrorType.HTTP_ERROR && error.statusCode && error.statusCode < 500) {
        throw error;
      }
      
      // Try the fallback
      return await this.fallback.request<T>(endpoint, method, body, responseType, headers);
    }
  }
}

/**
 * Extension function to add fallback functionality to a NetworkRequestable
 * @param networkRequestable The NetworkRequestable to extend
 * @param fallbackProvider Function that provides the fallback NetworkRequestable
 * @param options Fallback options
 * @returns A new NetworkRequestable with fallback functionality
 */
export function fallback(
  networkRequestable: NetworkRequestable,
  fallbackProvider: () => NetworkRequestable,
  options: Partial<FallbackOptions> = {}
): NetworkRequestable {
  return new FallbackDecorator(networkRequestable, fallbackProvider(), options);
}
