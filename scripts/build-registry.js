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

  // 3. Generate detailed README.md
  const readmeContent = generateMarkdownReadme(apps);
  fs.writeFileSync(README_PATH, readmeContent, 'utf8');
  console.log(`📄 Detailed README.md & GitHub Pages bundle created in dist/ successfully!`);
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

## 🚀 Executive Summary & Value Proposition

Traditional "Awesome" markdown lists on GitHub are **static text documents**: they suffer from dead links, unverified command lines, lack of machine readability, and zero contextual utility inside modern AI coding workflows.

\`awesome-mcp-dev-stack-selector\` bridges crowd-sourced community curation with AI developer tooling by providing an **interactive Model Context Protocol (MCP) server** and **live catalog web application**.

### 🌟 Key Value Highlights

* ⚡ **0ms Zero-Latency Cold Start**: Starts instantly in **0ms** using a Tier-1 NPM package bundled snapshot, backed by local disk caching and non-blocking background ETag sync.
* 🤖 **AI-Agent Context Native**: Allows **Antigravity, Cursor, Claude Desktop, VS Code, and Windsurf** to query tools, read resources, and execute workflow prompts directly inside agent loops.
* 🛡️ **Supply-Chain Command Sanitization**: All community PRs undergo strict Regex validation in CI to eliminate malicious shell command injection risks (\`brew install\`, \`winget install\`).
* 🔍 **BM25 & Capability Search**: In-memory relevance engine capable of matching natural language query intents like *"offline vector editor capable of SVG export"*.
* 🔄 **FOSS Commercial Replacement Mapping**: Instant mapping from proprietary commercial software (Postman, Notion, Photoshop, Docker Desktop, Firebase) to verified open-source alternatives.

---

## 🌐 Live Web Application & Catalog

Experience the interactive web app hosted on GitHub Pages: **[awesome-mcp-dev-stack-selector.github.io](https://awesome-mcp-dev-stack-selector.github.io)**

* 🔍 **Live Real-time Filtering**: Filter by category, operating system (\`macOS\`, \`Windows\`, \`Linux\`), capabilities, and 100% offline usability.
* 🔄 **Interactive Commercial Replacement Finder**: Instant search for proprietary software replacements.
* ⚡ **MCP Tool Execution Playground**: Interactive browser simulator for testing MCP stdio tool payloads in real-time!

---

## ⚡ Agent Setup & Configuration

Add the MCP server to your AI coding environment zero-install using \`npx\`:

### 1. Antigravity & Claude Desktop

Add to \`claude_desktop_config.json\` or Antigravity MCP Settings:

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

### 2. Cursor IDE

Go to **Settings ➔ Features ➔ MCP** and add a new MCP Server:
* **Name**: \`dev-stack-selector\`
* **Type**: \`command\`
* **Command**: \`npx -y @awesome-mcp-dev-stack-selector/mcp-server\`

### 3. VS Code / Windsurf

Add to your workspace \`.mcp.json\`:

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

## 🛠️ Complete MCP Interface Specification

\`awesome-mcp-dev-stack-selector\` implements the full **Model Context Protocol (MCP)** specification across Tools, Resources, and Prompts:

\`\`\`mermaid
sequenceDiagram
    autonumber
    actor Agent as AI Coding Agent (Antigravity / Cursor)
    participant MCP as MCP Server (@awesome-mcp-dev-stack-selector)
    participant Cache as 3-Tier Hybrid Cache
    participant Engine as BM25 Search Engine

    Agent->>MCP: Call tool find_foss_alternative(paid_software: "postman")
    MCP->>Cache: Get active registry snapshot
    Cache-->>MCP: Returns 9 validated app entries
    MCP->>Engine: Match replacement targets for "postman"
    Engine-->>MCP: Match found: Bruno (Score 10.0, Seamless migration)
    MCP-->>Agent: Returns relevance-scored JSON card with brew/winget install commands
\`\`\`

### 1. MCP Tools Surface (Executable Functions)

#### 🔹 \`search_free_apps\`
Search free/FOSS software using natural language keywords, category, platform, or capability flags.
* **Parameters**:
  * \`query\` *(string, optional)*: Keyword, app name, or capability (e.g. \`offline-editing\`, \`local-llm\`).
  * \`platform\` *(string, optional)*: \`macOS\` | \`Windows\` | \`Linux\`
  * \`category\` *(string, optional)*: \`developer-tools\` | \`ai-tools\` | \`container-infra\` | \`design-media\` | \`productivity\`
  * \`capability\` *(string, optional)*: Specific capability requirement (e.g. \`git-versioning\`).
  * \`offline_only\` *(boolean, optional)*: Filter for apps usable 100% offline.

* **Example Payload**:
\`\`\`json
{
  "total_found": 1,
  "apps": [
    {
      "id": "bruno",
      "name": "Bruno",
      "tagline": "Fast, offline-first, Git-friendly open-source API client",
      "license": "MIT",
      "website": "https://www.usebruno.com",
      "capabilities": ["offline-editing", "git-versioning", "scripting"],
      "replaces": ["postman", "insomnia"],
      "installation": { "macOS": "brew install bruno", "Windows": "winget install Bruno.Bruno" },
      "security_verified": true,
      "relevance_score": "10.00"
    }
  ]
}
\`\`\`

#### 🔹 \`get_app_details\`
Retrieve complete metadata, license status, self-hosting configurations, and migration notes for a specific app ID.
* **Parameters**:
  * \`app_id\` *(string, required)*: Unique identifier of the app (e.g. \`bruno\`, \`vscodium\`, \`ollama\`, \`podman\`).

#### 🔹 \`find_foss_alternative\`
Locate FOSS/free replacements for commercial proprietary software with migration difficulty and import capability assessment.
* **Parameters**:
  * \`paid_software\` *(string, required)*: Name of commercial software to replace (e.g. \`postman\`, \`vscode\`, \`photoshop\`, \`docker-desktop\`, \`firebase\`).

---

### 2. MCP Resources Surface (Read-only Context Loading)

AI Agents can read structured dataset resources directly into context without invoking tool steps:

* **\`devstack://registry\`**: Returns the complete aggregated application registry JSON.
* **\`devstack://categories\`**: Returns structured taxonomy breakdown with entry counts per category.
* **\`devstack://app/{id}\`**: Direct entity URI lookup for individual apps (e.g. \`devstack://app/bruno\`).

---

### 3. MCP Prompts Surface (Reusable Agent Workflows)

* **\`audit_project_dependencies_for_foss\`**:
  Scans workspace configuration files (\`package.json\`, \`docker-compose.yml\`) and prompts the AI agent to audit proprietary dependencies and suggest open-source replacements.
* **\`recommend_open_source_stack\`**:
  Prompts the AI agent to query the registry and recommend a 100% open-source software stack tailored to specific application requirements.

---

## ⚙️ Architecture & 3-Tier Offline Cache

\`\`\`mermaid
flowchart TD
    subgraph GitHub Curation
        A[apps/**/*.json - Community JSON Files] --> B[GitHub Action: validate-pr.yml]
        C[schema/app.schema.json v2] --> B
        B -->|Passes Regex Audit| D[GitHub Action: build-registry-and-readme.yml]
        D --> E[dist/registry.json]
    end

    subgraph Distribution & CDN
        E --> F[GitHub Pages CDN / Raw Content]
    end

    subgraph MCP Server Execution
        subgraph Hybrid Cache Manager
            G1[Tier 1: Bundled NPM Snapshot - 0ms]
            G2[Tier 2: ~/.cache/awesome-mcp-dev-stack-selector/registry.json]
            G3[Tier 3: Non-Blocking Background ETag Sync]
            F -.->|Async Update| G3
            G3 -.-> G2
            G1 -->|Fallback| G2
        end

        G2 --> H[In-Memory BM25 Search Engine]
        H --> I[npx @awesome-mcp-dev-stack-selector/mcp-server Stdio]
    end

    subgraph Client Environments
        I --> J[AI Agents: Antigravity / Cursor / Claude / VS Code]
    end
\`\`\`

### 3-Tier Caching Rationale
1. **Tier 1 (Bundled Snapshot)**: Ships compiled inside the NPM package so the MCP server initializes in **0ms** even with zero internet connectivity.
2. **Tier 2 (Disk Cache)**: Caches fetched registry datasets in \`~/.cache/awesome-mcp-dev-stack-selector/registry.json\` with a 24-hour TTL.
3. **Tier 3 (Background Sync)**: Issues non-blocking HTTP HEAD requests to GitHub Pages to check for dataset ETag changes without delaying tool execution.

---

## 📚 Apps Directory (${apps.length} Verified Entries)
${categorySections}
---

## 🛡️ Supply-Chain Safety & CI Governance

Community pull requests submitting new apps in \`apps/**/*.json\` must adhere to strict security guardrails:

* **Schema Validation**: Verified against JSON Schema draft 2020-12 using Ajv.
* **Safe Installation Command Regex**: Package manager installation strings are strictly validated against approved patterns (\`brew install [a-z0-9-]+\`, \`winget install [A-Za-z0-9\\.-]+\`, \`snap install [a-z0-9-]+\`).
* **Forbidden Operators**: Shell chaining operators (\`&&\`, \`;\`, \`||\`, backticks, subshells) are strictly forbidden to protect developer environments against Remote Code Execution (RCE).
* **3-Strike Circuit Breaker Audit**: Nightly health checks require 3 consecutive failures over 48 hours before marking an app \`degraded\`, preventing false positives.

---

## 🤝 Contributing an App

We welcome community pull requests!
1. Add a JSON file in \`apps/<category>/<app-id>.json\` following [\`schema/app.schema.json\`](schema/app.schema.json).
2. Test locally using:
   \`\`\`bash
   npm run test
   \`\`\`
3. Open a Pull Request — GitHub Actions will run automated schema, security, and integration audits.

---

## 📄 License

MIT © 2026 Awesome MCP Dev Stack Selector Maintainers
`;
}

build();
