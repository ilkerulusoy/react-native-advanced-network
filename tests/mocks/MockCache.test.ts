import { MockCache } from '../../src/mocks/MockCache';

describe('MockCache', () => {
  let mockCache: MockCache;
  
  beforeEach(() => {
    mockCache = new MockCache();
  });
  
  it('should store and retrieve values', () => {
    // Setup
    const key = 'test-key';
    const value = { id: 1, name: 'Test Value' };
    
    // Set value
    mockCache.set(key, value);
    
    // Get value
    const retrievedValue = mockCache.get(key);
    
    // Verify
    expect(retrievedValue).toEqual(value);
    
    // Verify history
    expect(mockCache.getSetHistory().length).toBe(1);
    expect(mockCache.getSetHistory()[0].key).toBe(key);
    expect(mockCache.getSetHistory()[0].value).toEqual(value);
    
    expect(mockCache.getGetHistory().length).toBe(1);
    expect(mockCache.getGetHistory()[0]).toBe(key);
  });
  
  it('should return null for non-existent keys', () => {
    // Get non-existent value
    const value = mockCache.get('non-existent');
    
    // Verify
    expect(value).toBeNull();
    
    // Verify history
    expect(mockCache.getGetHistory().length).toBe(1);
    expect(mockCache.getGetHistory()[0]).toBe('non-existent');
  });
  
  it('should remove values', () => {
    // Setup
    const key = 'test-key';
    const value = { id: 1, name: 'Test Value' };
    
    // Set value
    mockCache.set(key, value);
    
    // Verify it was set
    expect(mockCache.get(key)).toEqual(value);
    
    // Remove value
    mockCache.remove(key);
    
    // Verify it was removed
    expect(mockCache.get(key)).toBeNull();
    
    // Verify history
    expect(mockCache.getRemoveHistory().length).toBe(1);
    expect(mockCache.getRemoveHistory()[0]).toBe(key);
  });
  
  it('should clear all values', () => {
    // Setup
    mockCache.set('key1', 'value1');
    mockCache.set('key2', 'value2');
    
    // Verify values were set
    expect(mockCache.get('key1')).toBe('value1');
    expect(mockCache.get('key2')).toBe('value2');
    
    // Clear cache
    mockCache.clear();
    
    // Verify values were cleared
    expect(mockCache.get('key1')).toBeNull();
    expect(mockCache.get('key2')).toBeNull();
    
    // Verify history
    expect(mockCache.getClearCount()).toBe(1);
  });
  
  it('should track TTL in history', () => {
    // Setup
    const key = 'test-key';
    const value = 'test-value';
    const ttl = 60000;
    
    // Set value with TTL
    mockCache.set(key, value, ttl);
    
    // Verify history
    expect(mockCache.getSetHistory().length).toBe(1);
    expect(mockCache.getSetHistory()[0].key).toBe(key);
    expect(mockCache.getSetHistory()[0].value).toBe(value);
    expect(mockCache.getSetHistory()[0].ttl).toBe(ttl);
  });
  
  it('should reset history', () => {
    // Setup
    mockCache.set('key1', 'value1');
    mockCache.get('key1');
    mockCache.remove('key1');
    mockCache.clear();
    
    // Verify history before reset
    expect(mockCache.getSetHistory().length).toBe(1);
    expect(mockCache.getGetHistory().length).toBe(1);
    expect(mockCache.getRemoveHistory().length).toBe(1);
    expect(mockCache.getClearCount()).toBe(1);
    
    // Reset history
    mockCache.resetHistory();
    
    // Verify history after reset
    expect(mockCache.getSetHistory().length).toBe(0);
    expect(mockCache.getGetHistory().length).toBe(0);
    expect(mockCache.getRemoveHistory().length).toBe(0);
    expect(mockCache.getClearCount()).toBe(0);
  });
});
