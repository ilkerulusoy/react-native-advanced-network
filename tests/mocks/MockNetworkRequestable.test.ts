import { MockNetworkRequestable } from "../../src/mocks/MockNetworkRequestable";
import { HTTPMethod, NetworkError, NetworkErrorType } from "../../src/types";

describe("MockNetworkRequestable", () => {
  let mockNetworkRequestable: MockNetworkRequestable;

  beforeEach(() => {
    mockNetworkRequestable = new MockNetworkRequestable();
  });

  it("should return mocked responses", async () => {
    // Setup
    const endpoint = "/users/1";
    const mockResponse = { id: 1, name: "Test User" };

    // Configure mock
    mockNetworkRequestable.mockResponse(endpoint, HTTPMethod.GET, mockResponse);

    // Make request
    const result = await mockNetworkRequestable.request(
      endpoint,
      HTTPMethod.GET
    );

    // Verify
    expect(result).toEqual(mockResponse);
  });

  it("should throw mocked errors", async () => {
    // Setup
    const endpoint = "/users/1";
    const mockError = new NetworkError(NetworkErrorType.CUSTOM, "Test error");

    // Configure mock
    mockNetworkRequestable.mockError(endpoint, HTTPMethod.GET, mockError);

    // Make request and expect error
    await expect(
      mockNetworkRequestable.request(endpoint, HTTPMethod.GET)
    ).rejects.toThrow(mockError);
  });

  it("should record request history", async () => {
    // Setup
    const endpoint1 = "/users/1";
    const endpoint2 = "/users/2";
    const mockResponse1 = { id: 1, name: "User 1" };
    const mockResponse2 = { id: 2, name: "User 2" };

    // Configure mocks
    mockNetworkRequestable.mockResponse(
      endpoint1,
      HTTPMethod.GET,
      mockResponse1
    );
    mockNetworkRequestable.mockResponse(
      endpoint2,
      HTTPMethod.GET,
      mockResponse2
    );

    // Make requests
    await mockNetworkRequestable.request(endpoint1, HTTPMethod.GET);
    await mockNetworkRequestable.request(
      endpoint2,
      HTTPMethod.GET,
      undefined,
      undefined,
      { "X-Custom-Header": "Value" }
    );

    // Verify history
    const history = mockNetworkRequestable.getRequestHistory();
    expect(history.length).toBe(2);

    expect(history[0].endpoint).toBe(endpoint1);
    expect(history[0].method).toBe(HTTPMethod.GET);
    expect(history[0].headers).toEqual({});

    expect(history[1].endpoint).toBe(endpoint2);
    expect(history[1].method).toBe(HTTPMethod.GET);
    expect(history[1].headers).toEqual({ "X-Custom-Header": "Value" });
  });

  it("should match requests with bodies", async () => {
    // Setup
    const endpoint = "/users";
    const body1 = { name: "User 1" };
    const body2 = { name: "User 2" };
    const mockResponse1 = { id: 1, ...body1 };
    const mockResponse2 = { id: 2, ...body2 };

    // Configure mocks with different bodies
    mockNetworkRequestable.mockResponse(
      endpoint,
      HTTPMethod.POST,
      mockResponse1,
      body1
    );
    mockNetworkRequestable.mockResponse(
      endpoint,
      HTTPMethod.POST,
      mockResponse2,
      body2
    );

    // Make requests with different bodies
    const result1 = await mockNetworkRequestable.request(
      endpoint,
      HTTPMethod.POST,
      body1
    );
    const result2 = await mockNetworkRequestable.request(
      endpoint,
      HTTPMethod.POST,
      body2
    );

    // Verify
    expect(result1).toEqual(mockResponse1);
    expect(result2).toEqual(mockResponse2);
  });

  it("should throw error when no mock is found", async () => {
    // Make request without configuring mock
    await expect(
      mockNetworkRequestable.request("/users/1", HTTPMethod.GET)
    ).rejects.toThrow("No mock found for GET /users/1");
  });

  it("should reset mocks and history", async () => {
    // Setup
    const endpoint = "/users/1";
    const mockResponse = { id: 1, name: "Test User" };

    // Configure mock
    mockNetworkRequestable.mockResponse(endpoint, HTTPMethod.GET, mockResponse);

    // Make request
    await mockNetworkRequestable.request(endpoint, HTTPMethod.GET);

    // Verify history before reset
    expect(mockNetworkRequestable.getRequestHistory().length).toBe(1);

    // Reset
    mockNetworkRequestable.reset();

    // Verify history after reset
    expect(mockNetworkRequestable.getRequestHistory().length).toBe(0);

    // Verify mocks were cleared
    await expect(
      mockNetworkRequestable.request(endpoint, HTTPMethod.GET)
    ).rejects.toThrow("No mock found for GET /users/1");
  });
});
