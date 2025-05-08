# React Native Advanced Network Library

A flexible and extensible React Native networking library built with the decorator pattern. This library provides a robust solution for handling HTTP requests with support for:

- 🔒 **Authentication** - Seamless authentication integration
- 💾 **Caching** - Efficient caching for improved performance
- 🔄 **Automatic retries** - Configurable retry logic for handling transient failures
- 🔀 **Fallback mechanisms** - Fallback support for robust error handling
- 🧪 **Highly testable** - Provided mocks for easy testing

Easily chainable decorators allow you to customize your network stack to fit your specific needs. Built with TypeScript and modern JavaScript, this library offers a modern, efficient approach to networking in React Native applications.

## Installation

```bash
npm install react-native-advanced-network
# or
yarn add react-native-advanced-network
```

## Core Components

### NetworkRequestable Interface

The base interface for all network requests.

```typescript
interface NetworkRequestable {
  request<T>(
    endpoint: string,
    method: HTTPMethod,
    body?: Record<string, any>,
    responseType?: new () => T,
    headers?: Record<string, string>
  ): Promise<T>;
}
```

### BaseNetworkRequestable

The fundamental implementation of NetworkRequestable.

## Decorators

### AuthenticatedDecorator

Adds authentication to requests.

```typescript
function authenticated(
  networkRequestable: NetworkRequestable,
  tokenProvider: () => string | null | undefined,
  needsAuth: (endpoint: string) => boolean,
  headerName: string = 'Authorization'
): NetworkRequestable
```

### CacheDecorator

Implements caching for requests.

```typescript
function cached(
  networkRequestable: NetworkRequestable,
  cache: Cache = new MemoryCache(),
  ttl: number | null = null,
  cacheMethods: HTTPMethod[] = [HTTPMethod.GET]
): CacheDecorator
```

### RetryDecorator

Adds retry functionality to requests.

```typescript
function retry(
  networkRequestable: NetworkRequestable,
  options: Partial<RetryOptions> = {}
): NetworkRequestable
```

### FallbackDecorator

Provides a fallback mechanism for failed requests.

```typescript
function fallback(
  networkRequestable: NetworkRequestable,
  fallbackProvider: () => NetworkRequestable,
  options: Partial<FallbackOptions> = {}
): NetworkRequestable
```

## Usage

Create a network requestable object with desired decorators:

```typescript
import { 
  createNetworkClient, 
  authenticated, 
  cached, 
  retry, 
  fallback, 
  HTTPMethod, 
  BaseNetworkRequestable 
} from 'react-native-advanced-network';

// Create a base client
const baseClient = createNetworkClient('https://api.example.com');

// Add decorators
const networkClient = baseClient
  .authenticated(
    () => AsyncStorage.getItem('authToken'), 
    (endpoint) => endpoint.includes('secure')
  )
  .cached()
  .retry({ maxAttempts: 3 })
  .fallback(() => createNetworkClient('https://fallback-api.example.com'));

// Make a request
const fetchData = async () => {
  try {
    const result = await networkClient.request(
      '/users',
      HTTPMethod.GET,
      null,
      null,
      { 'Accept-Language': 'en-US' }
    );
    
    console.log('Data:', result);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

## Testing

Use `MockNetworkRequestable` and `MockCache` for unit testing:

```typescript
import { MockNetworkRequestable, HTTPMethod } from 'react-native-advanced-network';

// Create a mock
const mockClient = new MockNetworkRequestable();

// Mock a response
mockClient.mockResponse('/users', HTTPMethod.GET, [{ id: 1, name: 'John' }]);

// Use in your tests
const result = await mockClient.request('/users', HTTPMethod.GET);
// result = [{ id: 1, name: 'John' }]
```

## Error Handling

The library uses a custom `NetworkError` class for error cases:

```typescript
enum NetworkErrorType {
  INVALID_URL = 'INVALID_URL',
  NO_DATA = 'NO_DATA',
  DECODING_ERROR = 'DECODING_ERROR',
  HTTP_ERROR = 'HTTP_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  CUSTOM = 'CUSTOM',
  TIMEOUT = 'TIMEOUT',
  NETWORK_FAILURE = 'NETWORK_FAILURE'
}
```

Handle these errors appropriately in your application code:

```typescript
try {
  const result = await networkClient.request('/users', HTTPMethod.GET);
  // Handle successful response
} catch (error) {
  if (error instanceof NetworkError) {
    switch (error.type) {
      case NetworkErrorType.UNAUTHORIZED:
        // Handle unauthorized error
        break;
      case NetworkErrorType.TIMEOUT:
        // Handle timeout error
        break;
      // Handle other error types
    }
  }
}
```

## License

MIT
