## 📋 Application / Registry Pull Request

### Proposed Changes
- [ ] Add new FOSS application entry
- [ ] Update existing application metadata
- [ ] Bug fix / MCP server enhancement

### App Metadata Checklist (for new/updated apps)
- [ ] `id` is unique, kebab-case, and matches filename.
- [ ] `license_spdx` is a valid SPDX license identifier.
- [ ] Installation strings match safe package manager command regexes (no shell operators `&&`, `;`, `||`).
- [ ] Verified offline privacy and self-hosting metadata.

### Verification
- [ ] Ran `npm run validate` locally (0 errors).
- [ ] Ran `npm test` locally (all integration tests passed).
