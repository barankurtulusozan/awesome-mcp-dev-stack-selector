import { CacheManager } from './cache-manager.js';

export function registerPrompts(server: any, cacheManager: CacheManager) {
  // Prompt 1: Audit project dependencies for FOSS alternatives
  server.prompt(
    'audit_project_dependencies_for_foss',
    {
      project_type: { type: 'string', description: 'Type of project (e.g. Node.js, Python, Docker, Fullstack Web)' }
    },
    (args: any) => {
      const registry = cacheManager.getRegistry();
      const FOSS_REPLACEMENTS = registry.apps
        .filter(a => a.replaces && a.replaces.length > 0)
        .map(a => `- **${a.name}** (${a.license_spdx}) replaces: ${a.replaces?.map(r => r.target).join(', ')}`)
        .join('\n');

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please audit the project configuration files in the current workspace for ${args.project_type || 'this project'}.

Identify any proprietary services, paid API dependencies, or closed-source tools (e.g., Postman, Docker Desktop, Firebase, OpenAI API) and suggest suitable open-source replacements from the dev stack registry below:

Available FOSS Replacements:
${FOSS_REPLACEMENTS}

For each replacement found:
1. Explain the cost and privacy benefits.
2. Provide the recommended installation command.
3. Assess migration complexity and import compatibility.`
            }
          }
        ]
      };
    }
  );

  // Prompt 2: Recommend an open-source stack
  server.prompt(
    'recommend_open_source_stack',
    {
      use_case: { type: 'string', description: 'Describe the application or stack you want to build (e.g. offline-first AI chat app, REST API with real-time auth)' }
    },
    (args: any) => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `I want to build an application for the following use case: "${args.use_case}".

Please use the \`search_free_apps\` tool to query the dev-stack registry and assemble a recommended 100% open-source software stack covering:
1. Developer IDE / Editor
2. Local AI / LLM runtime (if applicable)
3. Backend / Database / BaaS
4. API Client & Testing Tools

Explain why each tool was selected, list SPDX licenses, and provide one-line installation commands.`
            }
          }
        ]
      };
    }
  );
}
