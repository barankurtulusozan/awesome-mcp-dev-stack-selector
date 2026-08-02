import { describe, it, expect } from 'vitest';
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

describe('SearchEngine Unit Tests', () => {
  const engine = new SearchEngine();

  it('should find alternatives matching keyword search', () => {
    const results = engine.search(mockApps, { query: 'postman' });
    expect(results).toHaveLength(1);
    expect(results[0].app.id).toBe('bruno');
  });

  it('should filter apps by platform', () => {
    const results = engine.search(mockApps, { platform: 'Windows' });
    expect(results).toHaveLength(1);
    expect(results[0].app.id).toBe('bruno');
  });

  it('should filter apps by capability', () => {
    const results = engine.search(mockApps, { capability: 'local-llm' });
    expect(results).toHaveLength(1);
    expect(results[0].app.id).toBe('ollama');
  });
});
