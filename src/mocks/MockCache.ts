import { Cache } from '../decorators/CacheDecorator';

/**
 * Mock implementation of Cache for testing
 */
export class MockCache implements Cache {
  private cache: Map<string, any> = new Map();
  private getHistory: string[] = [];
  private setHistory: Array<{ key: string; value: any; ttl?: number }> = [];
  private removeHistory: string[] = [];
  private clearHistory: number = 0;

  /**
   * Get a value from the cache
   * @param key The cache key
   * @returns The cached value or null if not found
   */
  get<T>(key: string): T | null {
    this.getHistory.push(key);
    return (this.cache.get(key) as T) || null;
  }

  /**
   * Set a value in the cache
   * @param key The cache key
   * @param value The value to cache
   * @param ttl Optional time-to-live in milliseconds
   */
  set<T>(key: string, value: T, ttl?: number): void {
    this.cache.set(key, value);
    this.setHistory.push({ key, value, ttl });
  }

  /**
   * Remove a value from the cache
   * @param key The cache key
   */
  remove(key: string): void {
    this.cache.delete(key);
    this.removeHistory.push(key);
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
    this.clearHistory++;
  }

  /**
   * Get the history of get operations
   */
  getGetHistory(): string[] {
    return [...this.getHistory];
  }

  /**
   * Get the history of set operations
   */
  getSetHistory(): Array<{ key: string; value: any; ttl?: number }> {
    return [...this.setHistory];
  }

  /**
   * Get the history of remove operations
   */
  getRemoveHistory(): string[] {
    return [...this.removeHistory];
  }

  /**
   * Get the number of times clear was called
   */
  getClearCount(): number {
    return this.clearHistory;
  }

  /**
   * Reset the history
   */
  resetHistory(): void {
    this.getHistory = [];
    this.setHistory = [];
    this.removeHistory = [];
    this.clearHistory = 0;
  }
}
