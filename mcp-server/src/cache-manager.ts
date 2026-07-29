import fs from 'fs';
import path from 'path';
import os from 'os';
import https from 'https';
import { fileURLToPath } from 'url';
import { RegistryData } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUNDLED_PATH = path.join(__dirname, 'bundled-registry.json');
const CACHE_DIR = path.join(os.homedir(), '.cache', 'awesome-mcp-dev-stack-selector');
const CACHE_FILE = path.join(CACHE_DIR, 'registry.json');
const ETAG_FILE = path.join(CACHE_DIR, 'etag.txt');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 Hours

const REMOTE_REGISTRY_URL = 'https://raw.githubusercontent.com/awesome-mcp-dev-stack-selector/main/dist/registry.json';

export class CacheManager {
  private activeRegistry: RegistryData;

  constructor() {
    // 1. Initialize immediately using Tier 2 or Tier 1
    this.activeRegistry = this.loadLocalSnapshot();
    
    // 2. Fire-and-forget non-blocking Tier 3 async update
    this.syncInBackground().catch(() => {
      // Ignore background sync errors in offline scenarios
    });
  }

  public getRegistry(): RegistryData {
    return this.activeRegistry;
  }

  private loadLocalSnapshot(): RegistryData {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const stats = fs.statSync(CACHE_FILE);
        const age = Date.now() - stats.mtimeMs;
        if (age < CACHE_TTL_MS) {
          const content = fs.readFileSync(CACHE_FILE, 'utf8');
          return JSON.parse(content) as RegistryData;
        }
      }
    } catch {
      // Fallback to Tier 1 on cache read error
    }

    // Default to Tier 1 Bundled Snapshot
    try {
      if (fs.existsSync(BUNDLED_PATH)) {
        const content = fs.readFileSync(BUNDLED_PATH, 'utf8');
        return JSON.parse(content) as RegistryData;
      }
    } catch {
      // Fallback empty registry if snapshot not yet compiled
    }

    return {
      meta: { version: '2.0.0', total_apps: 0, last_updated: new Date().toISOString() },
      apps: []
    };
  }

  private async syncInBackground(): Promise<void> {
    return new Promise((resolve) => {
      try {
        let storedEtag = '';
        if (fs.existsSync(ETAG_FILE)) {
          storedEtag = fs.readFileSync(ETAG_FILE, 'utf8').trim();
        }

        const req = https.request(REMOTE_REGISTRY_URL, { method: 'HEAD', timeout: 3000 }, (res) => {
          const newEtag = (res.headers.etag || res.headers['last-modified'] || '') as string;

          if (res.statusCode === 200 && newEtag && newEtag === storedEtag) {
            resolve();
            return;
          }

          https.get(REMOTE_REGISTRY_URL, { timeout: 5000 }, (fetchRes) => {
            if (fetchRes.statusCode !== 200) {
              resolve();
              return;
            }

            let body = '';
            fetchRes.on('data', (chunk) => body += chunk);
            fetchRes.on('end', () => {
              try {
                const parsed = JSON.parse(body) as RegistryData;
                if (parsed.apps && Array.isArray(parsed.apps)) {
                  if (!fs.existsSync(CACHE_DIR)) {
                    fs.mkdirSync(CACHE_DIR, { recursive: true });
                  }
                  fs.writeFileSync(CACHE_FILE, body, 'utf8');
                  if (newEtag) {
                    fs.writeFileSync(ETAG_FILE, newEtag, 'utf8');
                  }
                  this.activeRegistry = parsed;
                }
              } catch {
                // Ignore parse errors from network response
              }
              resolve();
            });
          }).on('error', () => resolve());
        });

        req.on('error', () => resolve());
        req.on('timeout', () => {
          req.destroy();
          resolve();
        });
        req.end();
      } catch {
        resolve();
      }
    });
  }
}
