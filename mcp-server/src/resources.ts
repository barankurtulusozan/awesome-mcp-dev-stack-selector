import { CacheManager } from './cache-manager.js';

export function registerResources(server: any, cacheManager: CacheManager) {
  // Resource 1: Complete registry
  server.resource(
    'registry-dataset',
    'devstack://registry',
    async (uri: any) => {
      const registry = cacheManager.getRegistry();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(registry, null, 2)
          }
        ]
      };
    }
  );

  // Resource 2: Category taxonomy & app counts
  server.resource(
    'categories-taxonomy',
    'devstack://categories',
    async (uri: any) => {
      const registry = cacheManager.getRegistry();
      const catMap: Record<string, { count: number; apps: string[] }> = {};

      for (const app of registry.apps) {
        if (!catMap[app.category]) {
          catMap[app.category] = { count: 0, apps: [] };
        }
        catMap[app.category].count++;
        catMap[app.category].apps.push(app.id);
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({ categories: catMap }, null, 2)
          }
        ]
      };
    }
  );

  // Resource 3: Direct app entity lookup by URI
  server.resource(
    'app-entity',
    'devstack://app/{id}',
    async (uri: any, params: { id: string }) => {
      const registry = cacheManager.getRegistry();
      const app = registry.apps.find(a => a.id.toLowerCase() === params.id.toLowerCase());

      if (!app) {
        throw new Error(`App entity "${params.id}" not found`);
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(app, null, 2)
          }
        ]
      };
    }
  );
}
