const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { globSync } = require('glob');

const APPS_DIR = path.join(__dirname, '..', 'apps');
const AUDIT_STATE_FILE = path.join(__dirname, '..', 'audit-state.json');

const CONSECUTIVE_FAIL_THRESHOLD = 3; // 3 strikes before marking degraded

async function checkUrl(urlStr) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(urlStr);
      const client = parsed.protocol === 'https:' ? https : http;

      const req = client.request(urlStr, { method: 'HEAD', timeout: 5000 }, (res) => {
        if (res.statusCode && res.statusCode < 400) {
          resolve({ ok: true, status: res.statusCode });
        } else {
          resolve({ ok: false, status: res.statusCode || 500 });
        }
      });

      req.on('error', (err) => resolve({ ok: false, error: err.message }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, error: 'Timeout' });
      });
      req.end();
    } catch (e) {
      resolve({ ok: false, error: e.message });
    }
  });
}

async function runAudit() {
  console.log('🌙 Starting Nightly Health Audit with 3-Strike Circuit Breaker...');

  let state = {};
  if (fs.existsSync(AUDIT_STATE_FILE)) {
    try {
      state = JSON.parse(fs.readFileSync(AUDIT_STATE_FILE, 'utf8'));
    } catch {}
  }

  const files = globSync('**/*.json', { cwd: APPS_DIR, absolute: true });
  let checkedCount = 0;
  let degradedCount = 0;

  for (const filePath of files) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const appId = data.id;

    if (!state[appId]) {
      state[appId] = { consecutive_fails: 0, last_check: null, status: 'healthy' };
    }

    console.log(`Checking [${appId}] -> ${data.website}`);
    const websiteRes = await checkUrl(data.website);
    let repoRes = { ok: true };
    if (data.repository) {
      repoRes = await checkUrl(data.repository);
    }

    checkedCount++;

    if (websiteRes.ok && repoRes.ok) {
      state[appId].consecutive_fails = 0;
      state[appId].status = 'healthy';
      data.health_status = 'healthy';
    } else {
      state[appId].consecutive_fails += 1;
      console.warn(`⚠️ [${appId}] Check failed (Strike ${state[appId].consecutive_fails}/${CONSECUTIVE_FAIL_THRESHOLD})`);

      if (state[appId].consecutive_fails >= CONSECUTIVE_FAIL_THRESHOLD) {
        state[appId].status = 'degraded';
        data.health_status = 'degraded';
        degradedCount++;
        console.error(`🚨 [${appId}] Marked DEGRADED after 3 consecutive failures.`);
      }
    }

    state[appId].last_check = new Date().toISOString();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  }

  fs.writeFileSync(AUDIT_STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
  console.log(`\n✅ Audit complete. Checked ${checkedCount} apps. Degraded: ${degradedCount}`);
}

runAudit();
