import assert from 'assert';
import { SearchEngine } from './search-engine.js';
import { AppEntry } from './types.js';

const mockApps: AppEntry[] = [
  {
    id: 'bruno',
    name: 'Bruno',
    tagline: 'Fast offline API client',
    description: 'Postman alternative',
    website: 'https://usebruno.com',
    license_spdx: 'MIT',
    category: 'developer-tools',
    tags: ['api', 'postman-alternative'],
    capabilities: ['offline-editing', 'git-versioning'],
    platforms: ['macOS', 'Windows', 'Linux'],
    pricing: { model: 'free_open_source', has_paid_tier: false },
    privacy: { telemetry: false, offline_usable: true, cloud_sync_required: false },
    installation: { macOS: 'brew install bruno' },
    replaces: [{ target: 'postman', migration_ease: 'seamless' }]
  },
  {
    id: 'ollama',
    name: 'Ollama',
    tagline: 'Get up and running with Llama 3',
    description: 'Run large language models locally',
    website: 'https://ollama.com',
    license_spdx: 'MIT',
    category: 'ai-tools',
    tags: ['ai', 'llm'],
    capabilities: ['local-llm', 'cli-first'],
    platforms: ['macOS', 'Linux'],
    pricing: { model: 'free_open_source', has_paid_tier: false },
    privacy: { telemetry: false, offline_usable: true, cloud_sync_required: false },
    installation: { macOS: 'brew install ollama' }
  }
];

export function runSearchEngineTests() {
  const engine = new SearchEngine();

  // Test 1: Query matching
  const res1 = engine.search(mockApps, { query: 'postman' });
  assert.strictEqual(res1.length, 1);
  assert.strictEqual(res1[0].app.id, 'bruno');

  // Test 2: Platform filter
  const res2 = engine.search(mockApps, { platform: 'Windows' });
  assert.strictEqual(res2.length, 1);
  assert.strictEqual(res2[0].app.id, 'bruno');

  // Test 3: Capability filter
  const res3 = engine.search(mockApps, { capability: 'local-llm' });
  assert.strictEqual(res3.length, 1);
  assert.strictEqual(res3[0].app.id, 'ollama');

  console.log('✅ SearchEngine module tests passed!');
}
