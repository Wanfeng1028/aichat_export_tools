# AI Chat Exporter

Export chats from major AI websites to Markdown, PDF, DOCX, and ZIP locally.

## Overview

AI Chat Exporter is an open-source, local-first browser extension for exporting chat records from major AI websites. The first milestone focuses on a stable MVP for exporting the current ChatGPT conversation as Markdown.

## Current Status

Implemented in this repository:

- Manifest V3 extension skeleton
- React + TypeScript + Tailwind setup
- Popup, Dashboard, and Options pages
- Core data model and message bus
- ChatGPT MVP adapter for current-page export
- Markdown export pipeline
- Local download via the browser downloads API

Planned next:

- PDF and DOCX exporters
- Batch export and ZIP packaging
- History persistence with IndexedDB
- More site adapters

## Development

```bash
npm install
npm run dev
```

Build the extension:

```bash
npm run build
```

Then load the `dist` directory as an unpacked extension in Chrome/Edge.

## Project Structure

```text
src/
├─ adapters/
├─ background/
├─ content/
├─ core/
├─ exporters/
├─ storage/
├─ ui/
└─ utils/
```

## Privacy

- No self-hosted backend
- No telemetry by default
- Export processing happens in the browser

## License

MIT
