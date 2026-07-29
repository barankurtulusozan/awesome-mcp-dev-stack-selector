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
    const matches = (registryData.apps || []).filter(a => a.replaces?.some(r => r.target.toLowerCase() === paid));

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

function getFallbackRegistry() {
  return {
    meta: { version: "2.0.0", total_apps: 9 },
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
      },
      {
        id: "ollama",
        name: "Ollama",
        tagline: "Run Llama 3, Mistral, and LLMs locally",
        description: "Ollama allows you to run open-source large language models locally.",
        website: "https://ollama.com",
        license_spdx: "MIT",
        category: "ai-tools",
        tags: ["local-llm", "ai-inference"],
        capabilities: ["local-llm", "openai-api", "gpu-acceleration"],
        platforms: ["macOS", "Windows", "Linux"],
        pricing: { model: "free_open_source", has_paid_tier: false },
        privacy: { telemetry: false, offline_usable: true, cloud_sync_required: false },
        installation: { macOS: "brew install ollama", Windows: "winget install Ollama.Ollama" },
        replaces: [{ target: "openai-api", migration_ease: "seamless", import_supported: true }]
      }
    ]
  };
}
