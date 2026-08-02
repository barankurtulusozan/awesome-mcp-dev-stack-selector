import { CacheManager } from './cache-manager.js';
import { SearchEngine } from './search-engine.js';

export function registerTools(server: any, cacheManager: CacheManager, searchEngine: SearchEngine) {
  // 1. Tool: search_free_apps
  server.tool(
    'search_free_apps',
    {
      query: { type: 'string', description: 'Search keywords, app name, or natural language capability query' },
      platform: { type: 'string', description: 'Optional platform filter: macOS | Windows | Linux' },
      category: { type: 'string', description: 'Optional category filter (e.g., developer-tools, ai-tools, container-infra)' },
      capability: { type: 'string', description: 'Optional capability requirement (e.g., offline-editing, git-versioning, local-llm)' },
      offline_only: { type: 'boolean', description: 'Require offline usability without mandatory cloud accounts' }
    },
    async (args: any) => {
      const registry = cacheManager.getRegistry();
      const results = searchEngine.search(registry.apps, {
        query: args.query,
        platform: args.platform,
        category: args.category,
        capability: args.capability,
        offlineOnly: args.offline_only,
        limit: 10
      });

      const formatted = results.map(item => ({
        id: item.app.id,
        name: item.app.name,
        tagline: item.app.tagline,
        license: item.app.license_spdx,
        website: item.app.website,
        capabilities: item.app.capabilities,
        replaces: item.app.replaces?.map(r => r.target) || [],
        installation: item.app.installation,
        security_verified: item.app.security?.verified_publisher ?? false,
        relevance_score: item.score.toFixed(2),
        match_reasons: item.match_reasons
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ total_found: formatted.length, apps: formatted }, null, 2)
          }
        ]
      };
    }
  );

  // 2. Tool: get_app_details
  server.tool(
    'get_app_details',
    {
      app_id: { type: 'string', description: 'Unique identifier of the application (e.g., bruno, vscodium, ollama)' }
    },
    async (args: any) => {
      const registry = cacheManager.getRegistry();
      const app = registry.apps.find(a => a.id.toLowerCase() === args.app_id.toLowerCase());

      if (!app) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Application with ID "${args.app_id}" was not found in the registry.`
            }
          ]
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(app, null, 2)
          }
        ]
      };
    }
  );

  // 3. Tool: find_foss_alternative
  server.tool(
    'find_foss_alternative',
    {
      paid_software: { type: 'string', description: 'Name of commercial/proprietary software to replace (e.g., postman, vscode, photoshop, docker-desktop, firebase)' }
    },
    async (args: any) => {
      const registry = cacheManager.getRegistry();
      const targetQuery = args.paid_software.toLowerCase().trim();

      const matches = registry.apps.filter(app => 
        app.replaces?.some(r => r.target.toLowerCase() === targetQuery || r.target.toLowerCase().includes(targetQuery))
      );

      const alternatives = matches.map(app => {
        const repInfo = app.replaces?.find(r => r.target.toLowerCase() === targetQuery || r.target.toLowerCase().includes(targetQuery));
        return {
          id: app.id,
          name: app.name,
          tagline: app.tagline,
          license: app.license_spdx,
          website: app.website,
          repository: app.repository,
          migration_ease: repInfo?.migration_ease,
          import_supported: repInfo?.import_supported,
          migration_notes: repInfo?.notes,
          installation: app.installation,
          security_verified: app.security?.verified_publisher ?? false
        };
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              target_software: args.paid_software,
              alternatives_count: alternatives.length,
              alternatives
            }, null, 2)
          }
        ]
      };
    }
  );

  // 4. Tool: compare_apps
  server.tool(
    'compare_apps',
    {
      app_id_1: { type: 'string', description: 'First app ID to compare (e.g., bruno)' },
      app_id_2: { type: 'string', description: 'Second app ID to compare (e.g., hoppscotch)' }
    },
    async (args: any) => {
      const registry = cacheManager.getRegistry();
      const app1 = registry.apps.find(a => a.id.toLowerCase() === args.app_id_1.toLowerCase());
      const app2 = registry.apps.find(a => a.id.toLowerCase() === args.app_id_2.toLowerCase());

      if (!app1 || !app2) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `One or both specified applications ("${args.app_id_1}", "${args.app_id_2}") were not found in the registry.`
            }
          ]
        };
      }

      const commonCapabilities = app1.capabilities.filter(c => app2.capabilities.includes(c));
      const app1UniqueCaps = app1.capabilities.filter(c => !app2.capabilities.includes(c));
      const app2UniqueCaps = app2.capabilities.filter(c => !app1.capabilities.includes(c));

      const comparison = {
        app_1: {
          id: app1.id,
          name: app1.name,
          license: app1.license_spdx,
          category: app1.category,
          pricing: app1.pricing,
          offline_usable: app1.privacy?.offline_usable,
          self_hosting: app1.self_hosting?.supported,
          unique_capabilities: app1UniqueCaps
        },
        app_2: {
          id: app2.id,
          name: app2.name,
          license: app2.license_spdx,
          category: app2.category,
          pricing: app2.pricing,
          offline_usable: app2.privacy?.offline_usable,
          self_hosting: app2.self_hosting?.supported,
          unique_capabilities: app2UniqueCaps
        },
        shared_capabilities: commonCapabilities
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(comparison, null, 2)
          }
        ]
      };
    }
  );

  // 5. Tool: audit_manifest
  server.tool(
    'audit_manifest',
    {
      manifest_content: { type: 'string', description: 'Raw content of configuration file (e.g. package.json, docker-compose.yml, requirements.txt)' },
      manifest_type: { type: 'string', description: 'Optional manifest type indicator (e.g. package.json, docker-compose, env)' }
    },
    async (args: any) => {
      const registry = cacheManager.getRegistry();
      const content = args.manifest_content.toLowerCase();
      const detectedReplacements: any[] = [];

      for (const app of registry.apps) {
        if (!app.replaces) continue;
        for (const rep of app.replaces) {
          const target = rep.target.toLowerCase();
          if (content.includes(target)) {
            detectedReplacements.push({
              detected_target: target,
              recommended_foss_app: app.name,
              app_id: app.id,
              license: app.license_spdx,
              migration_ease: rep.migration_ease,
              import_supported: rep.import_supported,
              installation: app.installation
            });
          }
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              manifest_type: args.manifest_type || 'auto-detected',
              total_audited_targets: detectedReplacements.length,
              recommendations: detectedReplacements
            }, null, 2)
          }
        ]
      };
    }
  );
}
