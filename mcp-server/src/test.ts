import assert from 'assert';
import { CacheManager } from './cache-manager.js';
import { SearchEngine } from './search-engine.js';

async function runTests() {
  console.log('🧪 Starting MCP Server Unit & Capability Integration Tests...\n');

  // Test 1: CacheManager
  const cacheManager = new CacheManager();
  const registry = cacheManager.getRegistry();
  assert(registry.apps.length > 0, 'Registry should load initial app entries');
  console.log(`✅ Test 1 Passed: CacheManager loaded ${registry.apps.length} app entries.`);

  // Test 2: SearchEngine keyword & replacement target search
  const searchEngine = new SearchEngine();
  
  // Search for "postman" alternative
  const postmanResults = searchEngine.search(registry.apps, { query: 'postman' });
  assert(postmanResults.length > 0, 'Should find alternatives replacing Postman');
  assert(postmanResults.some(r => r.app.id === 'bruno'), 'Bruno should be recommended for Postman query');
  console.log(`✅ Test 2 Passed: Search query "postman" correctly returned Bruno.`);

  // Test 3: SearchEngine capability filtering
  const offlineResults = searchEngine.search(registry.apps, { capability: 'local-llm' });
  assert(offlineResults.length > 0, 'Should find local-llm capability apps');
  assert(offlineResults.some(r => r.app.id === 'ollama'), 'Ollama should have local-llm capability');
  console.log(`✅ Test 3 Passed: Capability filter "local-llm" correctly matched Ollama.`);

  // Test 4: SearchEngine category & platform filtering
  const macDevTools = searchEngine.search(registry.apps, { category: 'developer-tools', platform: 'macOS' });
  assert(macDevTools.length >= 3, 'Should find developer tools on macOS');
  console.log(`✅ Test 4 Passed: Category "developer-tools" on "macOS" returned ${macDevTools.length} entries.`);

  // Test 5: Verify App Details Entity Lookup
  const brunoApp = registry.apps.find(a => a.id === 'bruno');
  assert(brunoApp !== undefined, 'Bruno entry must exist');
  assert.strictEqual(brunoApp.license_spdx, 'MIT');
  assert.strictEqual(brunoApp.security?.verified_publisher, true);
  console.log(`✅ Test 5 Passed: App entity lookup and schema properties verified.`);

  console.log('\n🎉 All 5 MCP Server integration test cases PASSED successfully!');
}

runTests().catch((err) => {
  console.error('❌ Test execution failed:', err);
  process.exit(1);
});
