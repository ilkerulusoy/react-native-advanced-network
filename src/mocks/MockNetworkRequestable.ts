import { HTTPMethod } from '../types';
import { NetworkRequestable } from '../core/NetworkRequestable';

/**
 * Mock implementation of NetworkRequestable for testing
 */
export class MockNetworkRequestable implements NetworkRequestable {
  private mockResponses: Map<string, any> = new Map();
  private mockErrors: Map<string, Error> = new Map();
  private mockSequences: Map<string, Array<{ success: boolean; response?: any; error?: Error }>> = new Map();
  private requestHistory: Array<{
    endpoint: string;
    method: HTTPMethod;
    body?: Record<string, any>;
    headers?: Record<string, string>;
  }> = [];

  /**
   * Mock a successful response for a specific request
   * @param endpoint The API endpoint
   * @param method The HTTP method
   * @param response The response to return
   * @param body Optional request body to match
   */
  mockResponse<T>(
    endpoint: string,
    method: HTTPMethod,
    response: T,
    body?: Record<string, any>
  ): void {
    const key = this.generateKey(endpoint, method, body);
    this.mockResponses.set(key, response);
  }

  /**
   * Mock an error for a specific request
   * @param endpoint The API endpoint
   * @param method The HTTP method
   * @param error The error to throw
   * @param body Optional request body to match
   */
  mockError(
    endpoint: string,
    method: HTTPMethod,
    error: Error,
    body?: Record<string, any>
  ): void {
    const key = this.generateKey(endpoint, method, body);
    this.mockErrors.set(key, error);
  }

  /**
   * Mock a sequence of responses/errors for a specific request
   * @param endpoint The API endpoint
   * @param method The HTTP method
   * @param sequence Array of responses/errors to return in sequence
   * @param body Optional request body to match
   */
  mockResponseSequence(
    endpoint: string,
    method: HTTPMethod,
    sequence: Array<{ success: boolean; response?: any; error?: Error }>,
    body?: Record<string, any>
  ): void {
    const key = this.generateKey(endpoint, method, body);
    this.mockSequences.set(key, [...sequence]);
  }

  /**
   * Reset all mocks and request history
   */
  reset(): void {
    this.mockResponses.clear();
    this.mockErrors.clear();
    this.mockSequences.clear();
    this.requestHistory = [];
  }

  /**
   * Get the request history
   */
  getRequestHistory(): Array<{
    endpoint: string;
    method: HTTPMethod;
    body?: Record<string, any>;
    headers?: Record<string, string>;
  }> {
    return [...this.requestHistory];
  }

  /**
   * Make a mock network request
   * @param endpoint The API endpoint
   * @param method The HTTP method
   * @param body Optional request body
   * @param responseType The expected response type
   * @param headers Optional request headers
   * @returns A promise that resolves to the response data
   */
  async request<T>(endpoint: string, method: HTTPMethod, body?: any, responseType?: new () => T, headers?: Record<string, string>): Promise<T> {
    // Record request in history
    this.requestHistory.push({
      endpoint,
      method,
      body,
      headers: headers || {}
    });

    const key = this.generateKey(endpoint, method, body);

    // Check if there's a sequence for this request
    if (this.mockSequences.has(key)) {
      const sequence = this.mockSequences.get(key);
      if (sequence && sequence.length > 0) {
        const nextItem = sequence.shift();
        if (nextItem) {
          if (nextItem.success) {
            return nextItem.response;
          } else {
            throw nextItem.error;
          }
        }
      }
    }

    // Check if there's a mocked error for this request
    if (this.mockErrors.has(key)) {
      throw this.mockErrors.get(key);
    }

    // Check if there's a mocked response for this request
    if (this.mockResponses.has(key)) {
      return this.mockResponses.get(key);
    }

    // If no mock is found, throw an error
    throw new Error(`No mock found for ${method} ${endpoint}`);
  }

  /**
   * Generate a key for the mock maps
   */
  private generateKey(
    endpoint: string,
    method: HTTPMethod,
    body?: Record<string, any>
  ): string {
    return `${method}:${endpoint}:${body ? JSON.stringify(body) : ''}`;
  }
}
