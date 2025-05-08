import { HTTPMethod, NetworkError, NetworkErrorType } from '../types';
import { NetworkRequestable } from '../core/NetworkRequestable';

/**
 * Create a promise that resolves after the specified delay
 * @param ms Delay in milliseconds
 * @returns Promise that resolves after the delay
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Retry strategy options
 */
export interface RetryOptions {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableErrors: NetworkErrorType[];
}

/**
 * Default retry options
 */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelay: 300,
  maxDelay: 3000,
  backoffFactor: 2,
  retryableErrors: [
    NetworkErrorType.NETWORK_FAILURE,
    NetworkErrorType.TIMEOUT,
    NetworkErrorType.HTTP_ERROR
  ]
};

/**
 * Decorator that adds retry functionality to requests
 */
export class RetryDecorator implements NetworkRequestable {
  private wrapped: NetworkRequestable;
  private options: RetryOptions;

  /**
   * Create a new RetryDecorator
   * @param wrapped The NetworkRequestable to wrap
   * @param options Retry options
   */
  constructor(
    wrapped: NetworkRequestable,
    options: Partial<RetryOptions> = {}
  ) {
    this.wrapped = wrapped;
    this.options = { ...DEFAULT_RETRY_OPTIONS, ...options };
  }

  /**
   * Make a network request with retry functionality
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
    let lastError: NetworkError | null = null;
    let attempt = 0;
    let waitTime = this.options.initialDelay;

    while (attempt < this.options.maxAttempts) {
      try {
        // Make the request
        return await this.wrapped.request<T>(endpoint, method, body, responseType, headers);
      } catch (error) {
        // Only retry if it's a NetworkError
        if (!(error instanceof NetworkError)) {
          throw error;
        }

        lastError = error;
        
        // Check if this error type is retryable
        if (!this.options.retryableErrors.includes(error.type)) {
          throw error;
        }
        
        // If it's an HTTP error, check if it's a 5xx error (server error)
        if (error.type === NetworkErrorType.HTTP_ERROR && error.statusCode && error.statusCode < 500) {
          throw error;
        }

        // If this was the last attempt, throw the error
        if (attempt + 1 >= this.options.maxAttempts) {
          throw error;
        }

        // Wait before retrying
        await delay(waitTime);
        
        // Increase the delay for the next attempt (with exponential backoff)
        waitTime = Math.min(waitTime * this.options.backoffFactor, this.options.maxDelay);
        attempt++;
      }
    }

    // This should never happen, but TypeScript requires it
    throw lastError || new NetworkError(NetworkErrorType.CUSTOM, 'Unknown error during retry');
  }
}

/**
 * Extension function to add retry functionality to a NetworkRequestable
 * @param networkRequestable The NetworkRequestable to extend
 * @param options Retry options
 * @returns A new NetworkRequestable with retry functionality
 */
export function retry(
  networkRequestable: NetworkRequestable,
  options: Partial<RetryOptions> = {}
): NetworkRequestable {
  return new RetryDecorator(networkRequestable, options);
}
