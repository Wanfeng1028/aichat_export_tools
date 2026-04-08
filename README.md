# AI Chat Exporter

Export chats from major AI websites to Markdown, PDF, DOCX, and ZIP locally.

## Overview

AI Chat Exporter is an open-source, local-first browser extension for exporting conversations from AI websites without sending chat content to a third-party backend.

The current repository ships a production-ready ChatGPT workflow with:

- current-conversation export
- sidebar conversation scanning
- batch export to one archive
- Markdown, PDF, DOCX, and ZIP output
- IndexedDB-backed job and download history
- popup, dashboard, and options pages

Other adapters already have permission and UI placeholders so the project can expand without reworking the extension architecture.

## Suggested GitHub Description

Open-source, local-first browser extension for exporting AI chats to Markdown, PDF, DOCX, and ZIP with a ChatGPT workflow available today.

## Features

- Local-first export pipeline with no self-hosted backend
- Manifest V3 browser extension scaffold
- ChatGPT current-conversation extraction
- ChatGPT sidebar conversation scanning
- Single export and batch export flows
- Markdown, PDF, DOCX, and ZIP exporters
- IndexedDB-backed job tracking and export history
- On-demand host permissions per supported site
- Bilingual UI for Chinese and English

## Supported Sites

Implemented now:

- ChatGPT

Reserved in UI and permissions, adapter implementation pending:

- Claude
- Gemini
- Kimi
- DeepSeek
- Grok
- 豆包
- 千问
- 文心一言

## Architecture

```text
Browser Extension
├─ Popup / Dashboard / Options UI
├─ Background Service Worker
├─ Content Script Bridge
├─ Site Adapters
├─ Exporters (Markdown / PDF / DOCX / ZIP)
└─ IndexedDB Storage
```

Core directories:

- `src/adapters/`: site-specific extraction logic
- `src/background/`: runtime orchestration, permissions, downloads
- `src/content/`: message bridge running in supported pages
- `src/exporters/`: file generation
- `src/storage/`: Dexie-backed persistence
- `src/ui/`: popup, dashboard, and options pages
- `src/core/`: shared types, filename rules, and common helpers

## Privacy

- No chat content is uploaded to a project backend
- No telemetry is enabled by default
- Files are generated in the browser and downloaded locally
- Site access is requested only when the user triggers export on that site

## Development

### Requirements

- Node.js 20+
- npm 10+ or a compatible package manager

### Install

```bash
npm install
```

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Load the extension

Chrome / Edge:

1. Open `chrome://extensions/`
2. Enable Developer Mode
3. Click `Load unpacked`
4. Select the `dist` directory

Firefox Developer Edition:

1. Open `about:debugging`
2. Choose `This Firefox`
3. Click `Load Temporary Add-on`
4. Select `dist/manifest.json`

## Roadmap

### v0.1

- [x] Extension scaffold
- [x] Popup, dashboard, and options pages
- [x] ChatGPT current conversation export
- [x] Markdown, PDF, DOCX, and ZIP exporters
- [x] Batch export archive
- [x] Export history and job tracking

### v0.2

- [ ] Additional site adapters
- [ ] Workspace-aware exports
- [ ] Filename template settings
- [ ] Richer export preview

### v0.3

- [ ] Firefox packaging helpers
- [ ] Release automation
- [ ] Community adapter contribution workflow

## Documentation

- [PRD](./docs/prd.md)
- [Architecture](./docs/architecture.md)
- [Adapter Guide](./docs/adapters.md)
- [Permissions](./docs/permissions.md)
- [Roadmap](./docs/roadmap.md)
- [Contributing](./CONTRIBUTING.md)

## License

MIT
