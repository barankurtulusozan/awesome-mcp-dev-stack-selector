const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

const ROOT_DIR = path.join(__dirname, '..');
const APPS_DIR = path.join(ROOT_DIR, 'apps');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const MCP_SRC_BUNDLED_PATH = path.join(ROOT_DIR, 'mcp-server', 'src', 'bundled-registry.json');
const MCP_DIST_BUNDLED_PATH = path.join(ROOT_DIR, 'mcp-server', 'dist', 'bundled-registry.json');
const README_PATH = path.join(ROOT_DIR, 'README.md');

function copyFolderRecursiveSync(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
  const files = fs.readdirSync(source);
  for (const file of files) {
    const curSource = path.join(source, file);
    const curTarget = path.join(target, file);
    if (fs.lstatSync(curSource).isDirectory()) {
      copyFolderRecursiveSync(curSource, curTarget);
    } else {
      fs.copyFileSync(curSource, curTarget);
    }
  }
}

function build() {
  console.log('🛠️ Compiling registry and building GitHub Pages web app site in dist/...');

  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }

  const mcpSrcDir = path.dirname(MCP_SRC_BUNDLED_PATH);
  if (!fs.existsSync(mcpSrcDir)) {
    fs.mkdirSync(mcpSrcDir, { recursive: true });
  }

  const mcpDistDir = path.dirname(MCP_DIST_BUNDLED_PATH);
  if (!fs.existsSync(mcpDistDir)) {
    fs.mkdirSync(mcpDistDir, { recursive: true });
  }

  const files = globSync('**/*.json', { cwd: APPS_DIR, absolute: true });
  const apps = [];

  for (const filePath of files) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    apps.push(data);
  }

  apps.sort((a, b) => a.id.localeCompare(b.id));

  const registry = {
    $schema: "https://raw.githubusercontent.com/awesome-mcp-dev-stack-selector/main/schema/app.schema.json",
    meta: {
      version: "2.0.0",
      total_apps: apps.length,
      last_updated: new Date().toISOString(),
      generator: "awesome-mcp-dev-stack-selector build-script"
    },
    apps
  };

  const registryJson = JSON.stringify(registry, null, 2);

  // 1. Write registry.json inside root dist, mcp-server/src, and mcp-server/dist
  const distRegistryDir = path.join(DIST_DIR, 'dist');
  if (!fs.existsSync(distRegistryDir)) {
    fs.mkdirSync(distRegistryDir, { recursive: true });
  }
  fs.writeFileSync(path.join(DIST_DIR, 'registry.json'), registryJson, 'utf8');
  fs.writeFileSync(path.join(distRegistryDir, 'registry.json'), registryJson, 'utf8');
  fs.writeFileSync(MCP_SRC_BUNDLED_PATH, registryJson, 'utf8');
  fs.writeFileSync(MCP_DIST_BUNDLED_PATH, registryJson, 'utf8');

  // 2. Copy web application static files to dist/ for GitHub Pages
  const webFiles = ['index.html', 'styles.css', 'app.js'];
  for (const wf of webFiles) {
    const srcPath = path.join(ROOT_DIR, wf);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, path.join(DIST_DIR, wf));
    }
  }

  const assetsDir = path.join(ROOT_DIR, 'assets');
  if (fs.existsSync(assetsDir)) {
    copyFolderRecursiveSync(assetsDir, path.join(DIST_DIR, 'assets'));
  }

  // 3. Generate README.md
  const readmeContent = generateMarkdownReadme(apps);
  fs.writeFileSync(README_PATH, readmeContent, 'utf8');
  console.log(`📄 Dynamic README.md & GitHub Pages bundle created in dist/ successfully!`);
}

function generateMarkdownReadme(apps) {
  const categories = {};
  for (const app of apps) {
    if (!categories[app.category]) {
      categories[app.category] = [];
    }
    categories[app.category].push(app);
  }

  const categoryTitles = {
    'developer-tools': '🛠️ Developer Tools & IDEs',
    'ai-tools': '🤖 Local AI & LLM Tools',
    'container-infra': '🐳 Container & Infrastructure',
    'design-media': '🎨 Design & Media Production',
    'productivity': '📝 Knowledge & Productivity'
  };

  let categorySections = '';

  for (const [catKey, catName] of Object.entries(categoryTitles)) {
    const catApps = categories[catKey] || [];
    if (catApps.length === 0) continue;

    categorySections += `\n### ${catName}\n\n`;
    categorySections += `| App | License | Tagline | Capabilities | Replaces | One-Line Install |\n`;
    categorySections += `| --- | --- | --- | --- | --- | --- |\n`;

    for (const app of catApps) {
      const nameLink = `[**${app.name}**](${app.website})`;
      const license = `\`${app.license_spdx}\``;
      const tagline = app.tagline;
      const caps = (app.capabilities || []).slice(0, 3).map(c => `\`${c}\``).join(' ');
      const replaces = (app.replaces || []).map(r => `~${r.target}~`).join(', ') || '—';
      const macInstall = app.installation?.macOS ? `\`${app.installation.macOS}\`` : (app.installation?.Windows ? `\`${app.installation.Windows}\`` : '—');

      categorySections += `| ${nameLink} | ${license} | ${tagline} | ${caps} | ${replaces} | ${macInstall} |\n`;
    }
  }

  return `<p align="center">
  <img src="assets/hero.png" alt="Awesome MCP Dev Stack Selector Hero" width="850">
</p>

<h1 align="center">awesome-mcp-dev-stack-selector</h1>

<p align="center">
  <b>Machine-Readable Free & Open-Source Software (FOSS) Registry & Zero-Latency MCP Server for AI Coding Agents</b>
</p>

<p align="center">
  <a href="https://awesome-mcp-dev-stack-selector.github.io"><img src="https://img.shields.io/badge/Live--Web--App-GitHub--Pages-06b6d4.svg" alt="GitHub Pages Site"></a>
  <a href="https://github.com/awesome-mcp-dev-stack-selector/awesome-mcp-dev-stack-selector/actions"><img src="https://github.com/awesome-mcp-dev-stack-selector/awesome-mcp-dev-stack-selector/actions/workflows/validate-pr.yml/badge.svg" alt="Build & Validate"></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-Protocol--v1.0-6b4fbb.svg" alt="MCP Protocol v1.0"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
  <a href="#-apps-directory-${apps.length}-verified-entries"><img src="https://img.shields.io/badge/FOSS--Apps-${apps.length}-brightgreen.svg" alt="Apps Count"></a>
</p>

---

## 🌐 Live Web Application & Catalog

Visit the interactive GitHub Pages site: **[awesome-mcp-dev-stack-selector.github.io](https://awesome-mcp-dev-stack-selector.github.io)**
* 🔍 **Live Search & Filter**: Instant filtering by platform, capabilities, and categories.
* 🔄 **Commercial Alternative Finder**: Type any paid tool (e.g. Postman, Notion, Photoshop) to view FOSS recommendations.
* ⚡ **MCP Tool Execution Playground**: Interactively simulate MCP tool stdio payloads directly in the browser!

---

## ⚡ Quickstart: Add MCP Server to your AI Agent

Run the server zero-install directly using \`npx\`:

\`\`\`json
{
  "mcpServers": {
    "dev-stack-selector": {
      "command": "npx",
      "args": ["-y", "@awesome-mcp-dev-stack-selector/mcp-server"]
    }
  }
}
\`\`\`

---

## 🛠️ MCP Surfaces & AI Tool Showcase

\`\`\`mermaid
sequenceDiagram
    autonumber
    actor User as Developer / Agent
    participant MCP as MCP Server (@awesome-mcp-dev-stack-selector)
    participant Cache as 3-Tier Cache Manager
    participant Search as BM25 Search Engine

    User->>MCP: Call tool find_foss_alternative (paid_software: "postman")
    MCP->>Cache: Fetch active registry snapshot
    Cache-->>MCP: Returns 9 validated app records
    MCP->>Search: Query replacement targets for "postman"
    Search-->>MCP: Matched app: Bruno (score: 10.0, seamless import)
    MCP-->>User: Returns relevance-scored JSON with install commands
\`\`\`

### Available MCP Tools

* **\`search_free_apps\`**: Search free/FOSS software by query, capability (\`offline-editing\`, \`local-llm\`), platform, or category.
* **\`get_app_details\`**: Get full metadata, license status, and install commands for any app ID (e.g., \`bruno\`, \`vscodium\`, \`ollama\`).
* **\`find_foss_alternative\`**: Locate FOSS replacements for proprietary commercial software (e.g. Postman, Notion, Photoshop, Docker Desktop).

---

## 📚 Apps Directory (${apps.length} Verified Entries)
${categorySections}
---

## 🤝 Contributing an App

We welcome community pull requests!
1. Add your JSON file in \`apps/<category>/<app-id>.json\` adhering to [\`schema/app.schema.json\`](schema/app.schema.json).
2. Run \`npm run test\` to validate locally.
3. Open a Pull Request — GitHub Actions will validate and compile automatically!

---

## 📄 License

MIT © 2026 Awesome MCP Dev Stack Selector Maintainers
`;
}

build();
