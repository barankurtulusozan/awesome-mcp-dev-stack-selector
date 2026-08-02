# Contributing to awesome-mcp-dev-stack-selector

Thank you for contributing to **awesome-mcp-dev-stack-selector**! This project provides a machine-readable community registry and Model Context Protocol (MCP) server for free & open-source developer tools.

---

## 🚀 Quick Start for Contributors

1. **Fork & Clone** the repository:
   ```bash
   git clone https://github.com/awesome-mcp-dev-stack-selector/awesome-mcp-dev-stack-selector.git
   cd awesome-mcp-dev-stack-selector
   npm install
   ```

2. **Run Validation**:
   ```bash
   npm run validate
   ```

3. **Run Build & Test**:
   ```bash
   npm test
   ```

---

## 📝 Adding a New Application

Each application is defined as a schema v2 compliant JSON file under `apps/<category>/<app-id>.json`.

### 1. Schema Requirements (`schema/app.schema.json`)
Every app entry MUST contain the following required properties:

```json
{
  "$schema": "https://raw.githubusercontent.com/awesome-mcp-dev-stack-selector/main/schema/app.schema.json",
  "id": "app-id-kebab-case",
  "name": "Application Name",
  "tagline": "Short one-line tagline (5-150 chars)",
  "description": "Comprehensive description of functionality and architecture (10-1000 chars)",
  "website": "https://official-website.com",
  "repository": "https://github.com/org/repo",
  "license_spdx": "MIT",
  "category": "developer-tools",
  "tags": ["api-client", "postman-alternative"],
  "capabilities": ["offline-editing", "git-versioning"],
  "platforms": ["macOS", "Windows", "Linux"],
  "pricing": {
    "model": "free_open_source",
    "has_paid_tier": false
  },
  "privacy": {
    "telemetry": false,
    "offline_usable": true,
    "cloud_sync_required": false
  },
  "self_hosting": {
    "supported": true,
    "docker_compose": true
  },
  "installation": {
    "macOS": "brew install app-name",
    "Windows": "winget install Publisher.App",
    "Linux": "snap install app-name"
  },
  "replaces": [
    {
      "target": "commercial-app-id",
      "migration_ease": "seamless",
      "import_supported": true,
      "notes": "Seamless import of existing workspace data"
    }
  ],
  "security": {
    "verified_publisher": true,
    "last_audit_date": "2026-08-01"
  },
  "health_status": "healthy"
}
```

### 2. Approved Categories
* `developer-tools`
* `ai-tools`
* `container-infra`
* `design-media`
* `productivity`
* `security-networking`
* `database-analytics`
* `database-backend`

---

## 🔒 Supply-Chain Security & Command Sanitization Rules

To protect developers and AI agents executing package installations:
1. **Forbidden Operators**: Commands MUST NOT contain shell chaining operators (`&&`, `;`, `||`, backticks, `$()`).
2. **Sanitized Installation Patterns**:
   - **macOS**: `brew install <package>`, `brew install --cask <package>`, `docker run <image>`
   - **Windows**: `winget install <package>`, `docker run <image>`
   - **Linux**: `snap install <package>`, `apt install -y <package>`, `apt-get install <package>`, `dnf install -y <package>`, `curl -sSf <url> | sh`, `npm install -g <package>`

---

## ✅ Pull Request Submission Checklist

Before submitting your PR, ensure:
- [ ] `npm run validate` passes with zero schema or command safety errors.
- [ ] `npm test` builds registry and passes all integration tests.
- [ ] `id` and `repository` URL are unique across the entire repository.
- [ ] License is an official SPDX identifier (e.g. `MIT`, `Apache-2.0`, `AGPL-3.0`, `MPL-2.0`).
