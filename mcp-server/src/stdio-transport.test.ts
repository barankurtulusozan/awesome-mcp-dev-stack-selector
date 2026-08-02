import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { CacheManager } from './cache-manager.js';
import { SearchEngine } from './search-engine.js';
import { registerTools } from './tools.js';
import { registerResources } from './resources.js';
import { registerPrompts } from './prompts.js';

describe('JSON-RPC MCP Protocol End-to-End Tests', () => {
  it('should initialize server and support tool, resource, and prompt requests', async () => {
    const cacheManager = new CacheManager();
    const searchEngine = new SearchEngine();

    const server = new McpServer({
      name: 'test-mcp-server',
      version: '2.0.0'
    });

    registerTools(server, cacheManager, searchEngine);
    registerResources(server, cacheManager);
    registerPrompts(server, cacheManager);

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    const client = new Client(
      { name: 'test-client', version: '1.0.0' },
      { capabilities: {} }
    );

    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport)
    ]);

    // 1. Test tools/list
    const toolsList = await client.listTools();
    const toolNames = toolsList.tools.map((t) => t.name);
    expect(toolNames).toContain('search_free_apps');
    expect(toolNames).toContain('get_app_details');
    expect(toolNames).toContain('compare_apps');
    expect(toolNames).toContain('audit_manifest');

    // 2. Test tools/call search_free_apps
    const searchRes = (await client.callTool({
      name: 'search_free_apps',
      arguments: { query: 'postman' }
    })) as { content: Array<{ type: string; text: string }> };
    expect(searchRes.content).toBeDefined();
    expect(searchRes.content[0].type).toBe('text');
    expect(searchRes.content[0].text).toContain('bruno');

    // 3. Test tools/call compare_apps
    const compareRes = (await client.callTool({
      name: 'compare_apps',
      arguments: { app_id_1: 'bruno', app_id_2: 'hoppscotch' }
    })) as { content: Array<{ type: string; text: string }> };
    expect(compareRes.content[0].text).toContain('shared_capabilities');

    // 4. Test resources/list
    const resourcesList = await client.listResources();
    expect(resourcesList.resources.length).toBeGreaterThan(0);

    // 5. Test prompts/list
    const promptsList = await client.listPrompts();
    const promptNames = promptsList.prompts.map((p) => p.name);
    expect(promptNames).toContain('compare_foss_tools');

    await client.close();
    await server.close();
  });
});
