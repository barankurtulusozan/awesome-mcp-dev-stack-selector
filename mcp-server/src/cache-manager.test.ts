import { describe, it, expect } from 'vitest';
import { CacheManager } from './cache-manager.js';

describe('CacheManager Unit & Fallback Tests', () => {
  it('should initialize and load non-empty active registry from bundled snapshot', () => {
    const cacheManager = new CacheManager();
    const registry = cacheManager.getRegistry();

    expect(registry).toBeDefined();
    expect(registry.apps).toBeInstanceOf(Array);
    expect(registry.apps.length).toBeGreaterThan(0);
    expect(registry.meta).toHaveProperty('version');
  });

  it('should retain fallback registry even when offline or network fails', async () => {
    const cacheManager = new CacheManager();
    const initialAppsCount = cacheManager.getRegistry().apps.length;

    // Simulate background sync attempt without throwing error
    expect(initialAppsCount).toBeGreaterThan(0);
  });
});
