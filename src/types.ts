/**
 * HTTP methods supported by the library
 */
export enum HTTPMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS'
}

/**
 * Network error types
 */
export enum NetworkErrorType {
  INVALID_URL = 'INVALID_URL',
  NO_DATA = 'NO_DATA',
  DECODING_ERROR = 'DECODING_ERROR',
  HTTP_ERROR = 'HTTP_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  CUSTOM = 'CUSTOM',
  TIMEOUT = 'TIMEOUT',
  NETWORK_FAILURE = 'NETWORK_FAILURE'
}

/**
 * Network error class
 */
export class NetworkError extends Error {
  type: NetworkErrorType;
  statusCode?: number;
  
  constructor(type: NetworkErrorType, message: string, statusCode?: number) {
    super(message);
    this.name = 'NetworkError';
    this.type = type;
    this.statusCode = statusCode;
  }
  
  static invalidURL(url: string): NetworkError {
    return new NetworkError(NetworkErrorType.INVALID_URL, `Invalid URL: ${url}`);
  }
  
  static noData(): NetworkError {
    return new NetworkError(NetworkErrorType.NO_DATA, 'No data received');
  }
  
  static decodingError(message: string): NetworkError {
    return new NetworkError(NetworkErrorType.DECODING_ERROR, `Decoding error: ${message}`);
  }
  
  static httpError(statusCode: number): NetworkError {
    return new NetworkError(NetworkErrorType.HTTP_ERROR, `HTTP error: ${statusCode}`, statusCode);
  }
  
  static unauthorized(): NetworkError {
    return new NetworkError(NetworkErrorType.UNAUTHORIZED, 'Unauthorized', 401);
  }
  
  static custom(message: string): NetworkError {
    return new NetworkError(NetworkErrorType.CUSTOM, message);
  }
  
  static timeout(): NetworkError {
    return new NetworkError(NetworkErrorType.TIMEOUT, 'Request timed out');
  }
  
  static networkFailure(message: string): NetworkError {
    return new NetworkError(NetworkErrorType.NETWORK_FAILURE, `Network failure: ${message}`);
  }
}
