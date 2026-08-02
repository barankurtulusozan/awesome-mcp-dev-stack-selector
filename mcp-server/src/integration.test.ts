import { describe, it, expect } from 'vitest';
import { CacheManager } from './cache-manager.js';
import { SearchEngine } from './search-engine.js';

describe('MCP Server Integration Scenarios', () => {
  const cacheManager = new CacheManager();
  const searchEngine = new SearchEngine();
  const registry = cacheManager.getRegistry();

  it('should load non-empty registry entries', () => {
    expect(registry.apps.length).toBeGreaterThan(0);
  });

  it('should return Bruno when searching for postman alternative', () => {
    const postmanResults = searchEngine.search(registry.apps, { query: 'postman' });
    expect(postmanResults.length).toBeGreaterThan(0);
    expect(postmanResults.some((r) => r.app.id === 'bruno')).toBe(true);
  });

  it('should filter apps by local-llm capability', () => {
    const offlineResults = searchEngine.search(registry.apps, { capability: 'local-llm' });
    expect(offlineResults.length).toBeGreaterThan(0);
    expect(offlineResults.some((r) => r.app.id === 'ollama')).toBe(true);
  });

  it('should filter developer tools on macOS', () => {
    const macDevTools = searchEngine.search(registry.apps, { category: 'developer-tools', platform: 'macOS' });
    expect(macDevTools.length).toBeGreaterThanOrEqual(3);
  });

  it('should retrieve app details with correct schema properties', () => {
    const brunoApp = registry.apps.find((a) => a.id === 'bruno');
    expect(brunoApp).toBeDefined();
    expect(brunoApp?.license_spdx).toBe('MIT');
    expect(brunoApp?.security?.verified_publisher).toBe(true);
  });

  it('should perform side-by-side app capability comparison', () => {
    const brunoApp = registry.apps.find((a) => a.id === 'bruno');
    const hoppscotchApp = registry.apps.find((a) => a.id === 'hoppscotch');
    expect(brunoApp).toBeDefined();
    expect(hoppscotchApp).toBeDefined();
    if (brunoApp && hoppscotchApp) {
      const sharedCaps = brunoApp.capabilities.filter((c) => hoppscotchApp.capabilities.includes(c));
      expect(sharedCaps.length).toBeGreaterThan(0);
    }
  });

  it('should detect FOSS replacements during manifest audit', () => {
    const sampleManifest = `
      dependencies:
        firebase: "^9.0.0"
        redis: "^4.0.0"
        postman: "^1.0.0"
    `;
    const auditMatches: string[] = [];
    for (const app of registry.apps) {
      if (!app.replaces) continue;
      for (const rep of app.replaces) {
        if (sampleManifest.toLowerCase().includes(rep.target.toLowerCase())) {
          auditMatches.push(app.name);
        }
      }
    }
    expect(auditMatches.length).toBeGreaterThanOrEqual(3);
  });
});
