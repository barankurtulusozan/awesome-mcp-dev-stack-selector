import fs from 'fs';
import path from 'path';
import os from 'os';
import https from 'https';
import { fileURLToPath } from 'url';
import { RegistryData } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Candidate fallback paths for compiled/bundled registry
const BUNDLED_PATHS = [
  path.join(__dirname, 'bundled-registry.json'), // dist/bundled-registry.json
  path.join(__dirname, '..', 'src', 'bundled-registry.json'), // src/bundled-registry.json
  path.join(__dirname, '..', '..', 'dist', 'registry.json') // root dist/registry.json
];

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
    // 1. Tier 2: Check local user disk cache
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const stats = fs.statSync(CACHE_FILE);
        const age = Date.now() - stats.mtimeMs;
        if (age < CACHE_TTL_MS) {
          const content = fs.readFileSync(CACHE_FILE, 'utf8');
          const parsed = JSON.parse(content) as RegistryData;
          if (parsed.apps && parsed.apps.length > 0) {
            return parsed;
          }
        }
      }
    } catch {
      // Fallback to Tier 1 on cache read error
    }

    // 2. Tier 1: Check bundled snapshots across dist, src, and workspace dist
    for (const bPath of BUNDLED_PATHS) {
      try {
        if (fs.existsSync(bPath)) {
          const content = fs.readFileSync(bPath, 'utf8');
          const parsed = JSON.parse(content) as RegistryData;
          if (parsed.apps && parsed.apps.length > 0) {
            return parsed;
          }
        }
      } catch {
        // Continue to next candidate path
      }
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

        const req = https.request(REMOTE_REGISTRY_URL, { method: 'HEAD', timeout: 2000 }, (res) => {
          const newEtag = (res.headers.etag || res.headers['last-modified'] || '') as string;
          res.destroy();

          if (res.statusCode === 200 && newEtag && newEtag === storedEtag) {
            resolve();
            return;
          }

          const fetchReq = https.get(REMOTE_REGISTRY_URL, { timeout: 3000 }, (fetchRes) => {
            if (fetchRes.statusCode !== 200) {
              fetchRes.destroy();
              resolve();
              return;
            }

            let body = '';
            fetchRes.on('data', (chunk) => body += chunk);
            fetchRes.on('end', () => {
              fetchRes.destroy();
              try {
                const parsed = JSON.parse(body) as RegistryData;
                if (parsed.apps && Array.isArray(parsed.apps) && parsed.apps.length > 0) {
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
            fetchRes.on('error', () => {
              fetchRes.destroy();
              resolve();
            });
          });

          fetchReq.on('error', () => {
            fetchReq.destroy();
            resolve();
          });
          fetchReq.on('timeout', () => {
            fetchReq.destroy();
            resolve();
          });
        });

        req.on('error', () => {
          req.destroy();
          resolve();
        });
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
