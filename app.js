// Client-side App Logic for GitHub Pages
let registryData = { apps: [] };
let selectedMcpMethod = 'search_free_apps';

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  try {
    const res = await fetch('dist/registry.json');
    if (res.ok) {
      registryData = await res.json();
    } else {
      registryData = getFallbackRegistry();
    }
  } catch (e) {
    registryData = getFallbackRegistry();
  }

  // Update total stat
  const totalApps = registryData.apps?.length || 0;
  const statElem = document.getElementById('stat-total-apps');
  if (statElem) statElem.textContent = totalApps;

  renderCatalog();
  renderStackPicker();
  setupEventListeners();
  renderFossFinder('postman');
  renderMcpForm('search_free_apps');
}

function setupEventListeners() {
  const searchInput = document.getElementById('search-input');
  const clearBtn = document.getElementById('clear-search');
  const categoryFilter = document.getElementById('category-filter');
  const platformFilter = document.getElementById('platform-filter');
  const offlineFilter = document.getElementById('offline-filter');

  const onFilterChange = () => {
    if (searchInput.value.trim() !== '') {
      clearBtn.classList.remove('hidden');
    } else {
      clearBtn.classList.add('hidden');
    }
    renderCatalog();
  };

  searchInput.addEventListener('input', onFilterChange);
  categoryFilter.addEventListener('change', onFilterChange);
  platformFilter.addEventListener('change', onFilterChange);
  offlineFilter.addEventListener('change', onFilterChange);

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearBtn.classList.add('hidden');
    renderCatalog();
  });

  // Finder listeners
  const finderInput = document.getElementById('finder-input');
  const btnRunFinder = document.getElementById('btn-run-finder');

  const runFinder = () => {
    renderFossFinder(finderInput.value.trim());
  };

  btnRunFinder.addEventListener('click', runFinder);
  finderInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') runFinder();
  });

  // MCP Simulator tabs
  const mcpTabs = document.querySelectorAll('.mcp-tab');
  mcpTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      mcpTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      selectedMcpMethod = tab.dataset.method;
      renderMcpForm(selectedMcpMethod);
    });
  });

  document.getElementById('btn-execute-mcp').addEventListener('click', () => {
    executeMcpSimulation();
  });

  // Config copy
  document.getElementById('btn-copy-config').addEventListener('click', () => {
    const code = document.getElementById('cfg-code').textContent;
    navigator.clipboard.writeText(code).then(() => {
      const btn = document.getElementById('btn-copy-config');
      const originalText = btn.textContent;
      btn.textContent = '✅ Copied to Clipboard!';
      setTimeout(() => btn.textContent = originalText, 2000);
    });
  });
}

function renderCatalog() {
  const grid = document.getElementById('apps-grid');
  const query = document.getElementById('search-input').value.toLowerCase().trim();
  const category = document.getElementById('category-filter').value;
  const platform = document.getElementById('platform-filter').value;
  const offlineOnly = document.getElementById('offline-filter').checked;

  let filtered = registryData.apps || [];

  if (category !== 'all') {
    filtered = filtered.filter(a => a.category === category);
  }

  if (platform !== 'all') {
    filtered = filtered.filter(a => a.platforms.includes(platform));
  }

  if (offlineOnly) {
    filtered = filtered.filter(a => a.privacy?.offline_usable === true);
  }

  if (query) {
    filtered = filtered.filter(a => {
      const nameMatch = a.name.toLowerCase().includes(query);
      const tagMatch = a.tags.some(t => t.toLowerCase().includes(query));
      const capMatch = a.capabilities.some(c => c.toLowerCase().includes(query));
      const repMatch = a.replaces?.some(r => r.target.toLowerCase().includes(query));
      const descMatch = a.description.toLowerCase().includes(query);
      return nameMatch || tagMatch || capMatch || repMatch || descMatch;
    });
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
        <h3>No matching FOSS applications found</h3>
        <p>Try refining your search terms or clearing category filters.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(app => {
    const capsHtml = (app.capabilities || []).slice(0, 4)
      .map(c => `<span class="cap-pill">${c}</span>`).join('');

    const replacesText = (app.replaces || []).map(r => r.target).join(', ') || 'N/A';
    const installCmd = app.installation?.macOS || app.installation?.Windows || app.installation?.Linux || 'N/A';

    return `
      <div class="app-card">
        <div class="app-card-header">
          <a href="${app.website}" target="_blank" class="app-title">${app.name}</a>
          <span class="app-badge-license">${app.license_spdx}</span>
        </div>
        <p class="app-tagline">${app.tagline}</p>
        
        <div class="app-capabilities">
          ${capsHtml}
        </div>

        ${app.replaces && app.replaces.length > 0 ? `
          <div class="app-replaces-box">
            <span class="app-replaces-label">Replaces:</span> ${replacesText}
          </div>
        ` : ''}

        <div class="app-install-box">
          <span class="cmd-text" id="cmd-${app.id}">${installCmd}</span>
          <button class="btn-copy-cmd" onclick="copyCommand('${app.id}', '${installCmd.replace(/'/g, "\\'")}')" title="Copy Command">📋</button>
        </div>
      </div>
    `;
  }).join('');
}

function copyCommand(id, cmd) {
  navigator.clipboard.writeText(cmd).then(() => {
    const span = document.getElementById(`cmd-${id}`);
    const orig = span.textContent;
    span.textContent = 'Copied!';
    setTimeout(() => span.textContent = orig, 1500);
  });
}

function renderFossFinder(targetQuery) {
  const container = document.getElementById('finder-results');
  if (!targetQuery) {
    container.innerHTML = '<p style="color: var(--text-muted);">Type a commercial software name above to view FOSS recommendations.</p>';
    return;
  }

  const query = targetQuery.toLowerCase();
  const matches = (registryData.apps || []).filter(app =>
    app.replaces?.some(r => r.target.toLowerCase() === query || r.target.toLowerCase().includes(query))
  );

  if (matches.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 20px; text-align: center; color: var(--text-muted);">
        <p>No direct replacement entry registered for "${targetQuery}" yet.</p>
        <p><a href="https://github.com/awesome-mcp-dev-stack-selector/awesome-mcp-dev-stack-selector" target="_blank" style="color: var(--accent-cyan);">Submit a PR</a> to add this replacement!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = matches.map(app => {
    const repInfo = app.replaces?.find(r => r.target.toLowerCase() === query || r.target.toLowerCase().includes(query));
    return `
      <div class="app-card" style="margin: 0;">
        <div class="app-card-header">
          <a href="${app.website}" target="_blank" class="app-title">${app.name}</a>
          <span class="app-badge-license">${app.license_spdx}</span>
        </div>
        <p class="app-tagline">${app.tagline}</p>
        <div class="app-replaces-box" style="border-left: 3px solid var(--accent-green);">
          <div><strong>Migration Ease:</strong> ${repInfo?.migration_ease || 'seamless'}</div>
          <div><strong>Import Compatibility:</strong> ${repInfo?.import_supported ? '✅ Supported' : 'Manual'}</div>
          ${repInfo?.notes ? `<div style="margin-top: 4px; color: var(--text-muted); font-size: 0.8rem;">${repInfo.notes}</div>` : ''}
        </div>
        <div class="app-install-box">
          <span class="cmd-text">${app.installation?.macOS || app.installation?.Windows || 'N/A'}</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderMcpForm(method) {
  const form = document.getElementById('mcp-params-form');

  if (method === 'search_free_apps') {
    form.innerHTML = `
      <div class="param-input-group">
        <label>query (string)</label>
        <input type="text" id="mcp-p-query" value="offline-editing">
      </div>
      <div class="param-input-group">
        <label>platform (macOS | Windows | Linux)</label>
        <input type="text" id="mcp-p-platform" value="macOS">
      </div>
    `;
  } else if (method === 'find_foss_alternative') {
    form.innerHTML = `
      <div class="param-input-group">
        <label>paid_software (string)</label>
        <input type="text" id="mcp-p-paid" value="postman">
      </div>
    `;
  } else if (method === 'get_app_details') {
  } else if (method === 'compare_apps') {
    form.innerHTML = `
      <div class="param-input-group">
        <label>app_id_1 (string)</label>
        <input type="text" id="mcp-p-app1" value="bruno">
      </div>
      <div class="param-input-group">
        <label>app_id_2 (string)</label>
        <input type="text" id="mcp-p-app2" value="hoppscotch">
      </div>
    `;
  } else if (method === 'audit_manifest') {
    form.innerHTML = `
      <div class="param-input-group">
        <label>manifest_content (string)</label>
        <textarea id="mcp-p-manifest" rows="3" style="width:100%; background:var(--bg-dark); color:#fff; border:1px solid var(--border-color); border-radius:6px; padding:8px;">dependencies:\n  postman: "^2.0.0"\n  firebase: "^9.0.0"\n  redis: "^4.0.0"</textarea>
      </div>
    `;
  } else if (method === 'get_app_details') {
    form.innerHTML = `
      <div class="param-input-group">
        <label>app_id (string)</label>
        <input type="text" id="mcp-p-appid" value="bruno">
      </div>
    `;
  } else if (method === 'resource_registry') {
    form.innerHTML = `
      <div style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted); padding: 8px 0;">
        URI: devstack://registry
      </div>
    `;
  }
}

function executeMcpSimulation() {
  const output = document.getElementById('mcp-output');
  let resultObj = {};

  if (selectedMcpMethod === 'search_free_apps') {
    const q = document.getElementById('mcp-p-query')?.value.toLowerCase() || '';
    const p = document.getElementById('mcp-p-platform')?.value || '';
    
    let matches = registryData.apps || [];
    if (q) {
      matches = matches.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.capabilities.some(c => c.toLowerCase().includes(q)) ||
        a.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    if (p) {
      matches = matches.filter(a => a.platforms.includes(p));
    }

    resultObj = {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            total_found: matches.length,
            apps: matches.map(m => ({
              id: m.id,
              name: m.name,
              license: m.license_spdx,
              capabilities: m.capabilities,
              installation: m.installation,
              security_verified: m.security?.verified_publisher ?? true
            }))
          }, null, 2)
        }
      ]
    };
  } else if (selectedMcpMethod === 'find_foss_alternative') {
    const paid = document.getElementById('mcp-p-paid')?.value.toLowerCase() || '';
    const matches = (registryData.apps || []).filter(a => a.replaces?.some(r => r.target.toLowerCase() === paid || r.target.toLowerCase().includes(paid)));

    resultObj = {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            target_software: paid,
            alternatives_count: matches.length,
            alternatives: matches.map(m => ({
              id: m.id,
              name: m.name,
              license: m.license_spdx,
              installation: m.installation,
              security_verified: true
            }))
          }, null, 2)
        }
      ]
    };
  } else if (selectedMcpMethod === 'compare_apps') {
    const id1 = document.getElementById('mcp-p-app1')?.value.toLowerCase() || '';
    const id2 = document.getElementById('mcp-p-app2')?.value.toLowerCase() || '';
    const app1 = (registryData.apps || []).find(a => a.id === id1);
    const app2 = (registryData.apps || []).find(a => a.id === id2);

    if (app1 && app2) {
      const common = app1.capabilities.filter(c => app2.capabilities.includes(c));
      resultObj = {
        content: [{
          type: 'text',
          text: JSON.stringify({
            app_1: { id: app1.id, name: app1.name, license: app1.license_spdx, category: app1.category },
            app_2: { id: app2.id, name: app2.name, license: app2.license_spdx, category: app2.category },
            shared_capabilities: common
          }, null, 2)
        }]
      };
    } else {
      resultObj = { isError: true, text: 'One or both apps not found' };
    }
  } else if (selectedMcpMethod === 'audit_manifest') {
    const raw = document.getElementById('mcp-p-manifest')?.value.toLowerCase() || '';
    const recommendations = [];
    for (const app of (registryData.apps || [])) {
      if (!app.replaces) continue;
      for (const rep of app.replaces) {
        if (raw.includes(rep.target.toLowerCase())) {
          recommendations.push({
            detected_target: rep.target,
            recommended_foss_app: app.name,
            license: app.license_spdx,
            installation: app.installation
          });
        }
      }
    }
    resultObj = {
      content: [{
        type: 'text',
        text: JSON.stringify({ total_audited_targets: recommendations.length, recommendations }, null, 2)
      }]
    };
  } else if (selectedMcpMethod === 'get_app_details') {
    const id = document.getElementById('mcp-p-appid')?.value.toLowerCase() || '';
    const app = (registryData.apps || []).find(a => a.id === id);
    resultObj = app ? { content: [{ type: 'text', text: JSON.stringify(app, null, 2) }] } : { isError: true, text: 'Not found' };
  } else if (selectedMcpMethod === 'resource_registry') {
    resultObj = {
      contents: [
        {
          uri: 'devstack://registry',
          mimeType: 'application/json',
          text: JSON.stringify(registryData, null, 2)
        }
      ]
    };
  }

  output.textContent = JSON.stringify(resultObj, null, 2);
}

function renderStackPicker() {
  const picker = document.getElementById('stack-app-picker');
  if (!picker) return;

  picker.innerHTML = (registryData.apps || []).map(app => `
    <div class="stack-picker-item">
      <input type="checkbox" id="chk-app-${app.id}" value="${app.id}" checked>
      <label for="chk-app-${app.id}">
        <strong>${app.name}</strong> <span style="font-size:0.75rem; color:var(--text-muted);">(${app.category})</span>
      </label>
    </div>
  `).join('');

  document.getElementById('btn-generate-stack')?.addEventListener('click', generateStackScript);
  document.getElementById('btn-copy-stack')?.addEventListener('click', () => {
    const code = document.getElementById('stack-script-code').textContent;
    navigator.clipboard.writeText(code).then(() => {
      const btn = document.getElementById('btn-copy-stack');
      btn.textContent = '✅ Copied!';
      setTimeout(() => btn.textContent = '📋 Copy Script', 2000);
    });
  });
}

function generateStackScript() {
  const platform = document.getElementById('export-platform').value;
  const checkboxes = document.querySelectorAll('.stack-picker-item input[type="checkbox"]:checked');
  const selectedIds = Array.from(checkboxes).map(c => c.value);
  const selectedApps = (registryData.apps || []).filter(a => selectedIds.includes(a.id));

  const previewBox = document.getElementById('stack-script-preview');
  const previewTitle = document.getElementById('stack-preview-title');
  const previewCode = document.getElementById('stack-script-code');
  previewBox.classList.remove('hidden');

  if (platform === 'macOS') {
    previewTitle.textContent = 'install-stack.sh (macOS)';
    const cmds = selectedApps.map(a => a.installation?.macOS).filter(Boolean);
    previewCode.textContent = `#!/usr/bin/env bash\n# Automated 1-Click FOSS Dev Stack Installer (macOS)\necho "⚡ Installing selected FOSS dev stack..."\n\n${cmds.join('\n')}\n\necho "✅ Installation complete!"`;
  } else if (platform === 'Windows') {
    previewTitle.textContent = 'install-stack.ps1 (Windows)';
    const cmds = selectedApps.map(a => a.installation?.Windows).filter(Boolean);
    previewCode.textContent = `# Automated 1-Click FOSS Dev Stack Installer (Windows PowerShell)\nWrite-Host "⚡ Installing selected FOSS dev stack..." -ForegroundColor Green\n\n${cmds.join('\n')}\n\nWrite-Host "✅ Installation complete!" -ForegroundColor Green`;
  } else if (platform === 'Linux') {
    previewTitle.textContent = 'install-stack.sh (Linux)';
    const cmds = selectedApps.map(a => a.installation?.Linux).filter(Boolean);
    previewCode.textContent = `#!/usr/bin/env bash\n# Automated 1-Click FOSS Dev Stack Installer (Linux)\necho "⚡ Installing selected FOSS dev stack..."\n\n${cmds.join('\n')}\n\necho "✅ Installation complete!"`;
  } else if (platform === 'Docker') {
    previewTitle.textContent = 'docker-compose.yml';
    const dockerApps = selectedApps.filter(a => a.self_hosting?.supported);
    previewCode.textContent = `version: '3.8'\nservices:\n` + dockerApps.map(a => `  ${a.id}:\n    image: ${a.id}:latest\n    restart: unless-stopped`).join('\n\n');
  }
}

function openComparisonModal(appId1, appId2) {
  const modal = document.getElementById('comparison-modal');
  const modalBody = document.getElementById('modal-body');
  const app1 = (registryData.apps || []).find(a => a.id === appId1);
  const app2 = (registryData.apps || []).find(a => a.id === appId2);

  if (!app1 || !app2) return;

  modalBody.innerHTML = `
    <table class="comparison-table">
      <thead>
        <tr>
          <th>Attribute</th>
          <th>${app1.name}</th>
          <th>${app2.name}</th>
        </tr>
      </thead>
      <tbody>
        <tr><td><strong>Category</strong></td><td>${app1.category}</td><td>${app2.category}</td></tr>
        <tr><td><strong>License</strong></td><td>${app1.license_spdx}</td><td>${app2.license_spdx}</td></tr>
        <tr><td><strong>Offline Usable</strong></td><td>${app1.privacy?.offline_usable ? '✅ Yes' : '❌ No'}</td><td>${app2.privacy?.offline_usable ? '✅ Yes' : '❌ No'}</td></tr>
        <tr><td><strong>Self Hosting</strong></td><td>${app1.self_hosting?.supported ? '✅ Yes' : '❌ No'}</td><td>${app2.self_hosting?.supported ? '✅ Yes' : '❌ No'}</td></tr>
        <tr><td><strong>Capabilities</strong></td><td>${app1.capabilities.join(', ')}</td><td>${app2.capabilities.join(', ')}</td></tr>
        <tr><td><strong>Install (macOS)</strong></td><td><code>${app1.installation?.macOS || 'N/A'}</code></td><td><code>${app2.installation?.macOS || 'N/A'}</code></td></tr>
      </tbody>
    </table>
  `;

  modal.classList.remove('hidden');
  document.getElementById('close-modal')?.addEventListener('click', () => {
    modal.classList.add('hidden');
  });
}

function getFallbackRegistry() {
  return {
    meta: { version: "2.0.0", total_apps: 20 },
    apps: [
      {
        id: "bruno",
        name: "Bruno",
        tagline: "Fast, offline-first, Git-friendly open-source API client",
        description: "An open-source alternative to Postman and Insomnia.",
        website: "https://www.usebruno.com",
        license_spdx: "MIT",
        category: "developer-tools",
        tags: ["api-client", "postman-alternative"],
        capabilities: ["offline-editing", "git-versioning", "scripting"],
        platforms: ["macOS", "Windows", "Linux"],
        pricing: { model: "free_open_source", has_paid_tier: true },
        privacy: { telemetry: false, offline_usable: true, cloud_sync_required: false },
        installation: { macOS: "brew install bruno", Windows: "winget install Bruno.Bruno" },
        replaces: [{ target: "postman", migration_ease: "seamless", import_supported: true }]
      }
    ]
  };
}
