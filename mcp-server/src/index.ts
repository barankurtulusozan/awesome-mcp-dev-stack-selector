#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CacheManager } from './cache-manager.js';
import { SearchEngine } from './search-engine.js';
import { registerTools } from './tools.js';
import { registerResources } from './resources.js';
import { registerPrompts } from './prompts.js';

async function main() {
  const cacheManager = new CacheManager();
  const searchEngine = new SearchEngine();

  const server = new McpServer({
    name: 'awesome-mcp-dev-stack-selector',
    version: '2.0.0'
  });

  registerTools(server, cacheManager, searchEngine);
  registerResources(server, cacheManager);
  registerPrompts(server, cacheManager);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Fatal MCP Server error:', error);
  process.exit(1);
});
