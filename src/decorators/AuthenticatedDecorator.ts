import { HTTPMethod, NetworkError } from '../types';
import { NetworkRequestable } from '../core/NetworkRequestable';

/**
 * Decorator that adds authentication to requests
 */
export class AuthenticatedDecorator implements NetworkRequestable {
  private wrapped: NetworkRequestable;
  private tokenProvider: () => string | null | undefined;
  private needsAuth: (endpoint: string) => boolean;
  private headerName: string;

  /**
   * Create a new AuthenticatedDecorator
   * @param wrapped The NetworkRequestable to wrap
   * @param tokenProvider Function that provides the authentication token
   * @param needsAuth Function that determines if an endpoint needs authentication
   * @param headerName The header name to use for the token (default: 'Authorization')
   */
  constructor(
    wrapped: NetworkRequestable,
    tokenProvider: () => string | null | undefined,
    needsAuth: (endpoint: string) => boolean,
    headerName: string = 'Authorization'
  ) {
    this.wrapped = wrapped;
    this.tokenProvider = tokenProvider;
    this.needsAuth = needsAuth;
    this.headerName = headerName;
  }

  /**
   * Make an authenticated network request
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
    // Check if the endpoint needs authentication
    if (this.needsAuth(endpoint)) {
      // Get the token
      const token = this.tokenProvider();
      
      // If no token is available, throw an error
      if (!token) {
        throw NetworkError.unauthorized();
      }
      
      // Add the token to the headers
      const authHeaders = {
        ...headers,
        [this.headerName]: token.startsWith('Bearer ') ? token : `Bearer ${token}`
      };
      
      // Make the request with the authentication header
      return this.wrapped.request(endpoint, method, body, responseType, authHeaders);
    }
    
    // If authentication is not needed, just pass through
    return this.wrapped.request(endpoint, method, body, responseType, headers);
  }
}

/**
 * Extension function to add authentication to a NetworkRequestable
 * @param networkRequestable The NetworkRequestable to extend
 * @param tokenProvider Function that provides the authentication token
 * @param needsAuth Function that determines if an endpoint needs authentication
 * @param headerName The header name to use for the token (default: 'Authorization')
 * @returns A new NetworkRequestable with authentication
 */
export function authenticated(
  networkRequestable: NetworkRequestable,
  tokenProvider: () => string | null | undefined,
  needsAuth: (endpoint: string) => boolean,
  headerName: string = 'Authorization'
): NetworkRequestable {
  return new AuthenticatedDecorator(networkRequestable, tokenProvider, needsAuth, headerName);
}
