# AI Chat Exporter

Export chats from major AI websites to Markdown, PDF, DOCX, and ZIP locally.

## Overview

AI Chat Exporter is an open-source, local-first browser extension for exporting chat records from major AI websites. The current build is centered on a practical ChatGPT workflow with current-conversation export, sidebar scanning, batch export, job tracking, and a polished dashboard.

## Current Status

Implemented in this repository:

- Manifest V3 browser extension scaffold
- React + TypeScript + Tailwind UI
- Popup, Dashboard, and Options pages
- ChatGPT current-conversation extraction
- ChatGPT sidebar conversation scanning
- Markdown, PDF, DOCX, and ZIP bundle exporters
- Batch export that packs selected conversations into one archive
- IndexedDB-backed export history and job records
- Dynamic exporter loading to keep the main service worker lean

## Development

```bash
npm install
npm run build
```

Load the `dist` directory as an unpacked extension in Chrome or Edge.

## Privacy

- No self-hosted backend
- No telemetry by default
- Export processing happens in the browser

## License

MIT
