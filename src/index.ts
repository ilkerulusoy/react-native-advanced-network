import { BaseNetworkRequestable } from "./core/BaseNetworkRequestable";

// Export types
export { HTTPMethod, NetworkError, NetworkErrorType } from "./types";

// Export core components
export {
  NetworkRequestable,
  RequestOptions,
  generateCacheKey,
} from "./core/NetworkRequestable";
export { BaseNetworkRequestable } from "./core/BaseNetworkRequestable";

// Export decorators
export {
  AuthenticatedDecorator,
  authenticated,
} from "./decorators/AuthenticatedDecorator";

export {
  Cache,
  MemoryCache,
  CacheDecorator,
  cached,
} from "./decorators/CacheDecorator";

export {
  RetryOptions,
  DEFAULT_RETRY_OPTIONS,
  RetryDecorator,
  retry,
} from "./decorators/RetryDecorator";

export {
  FallbackOptions,
  DEFAULT_FALLBACK_OPTIONS,
  FallbackDecorator,
  fallback,
} from "./decorators/FallbackDecorator";

// Export mocks for testing
export { MockNetworkRequestable } from "./mocks/MockNetworkRequestable";
export { MockCache } from "./mocks/MockCache";

/**
 * Create a network client with the specified decorators
 * @param baseURL The base URL for all requests
 * @param defaultHeaders Default headers to include in all requests
 * @param timeoutMs Request timeout in milliseconds
 * @returns A NetworkRequestable instance
 */
export function createNetworkClient(
  baseURL: string,
  defaultHeaders: Record<string, string> = {},
  timeoutMs: number = 30000
): BaseNetworkRequestable {
  return new BaseNetworkRequestable(baseURL, defaultHeaders, timeoutMs);
}
