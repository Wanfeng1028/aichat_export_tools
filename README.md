# AI Chat Exporter

Export chats from major AI websites to Markdown, PDF, DOCX, and ZIP locally.

## Overview

AI Chat Exporter is an open-source, local-first browser extension for exporting chat records from major AI websites. The current implementation focuses on a usable ChatGPT export workflow with local history and job tracking.

## Current Status

Implemented in this repository:

- Manifest V3 extension skeleton
- React + TypeScript + Tailwind setup
- Popup, Dashboard, and Options pages
- Core data model and background message bus
- ChatGPT MVP adapter for current-page export
- Markdown, PDF, DOCX, and ZIP bundle export pipeline
- Local download via the browser downloads API
- IndexedDB-backed export history and job records

Planned next:

- Conversation list scanning and true multi-conversation batch export
- History filtering and retry actions
- More site adapters

## Development

```bash
npm install
npm run build
```

Then load the `dist` directory as an unpacked extension in Chrome/Edge.

## Privacy

- No self-hosted backend
- No telemetry by default
- Export processing happens in the browser

## License

MIT
