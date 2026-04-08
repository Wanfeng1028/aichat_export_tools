# Architecture

## Extension Layers

- `src/ui/`: popup, dashboard, and options pages rendered with React
- `src/background/`: service worker, download pipeline, runtime message handling, permission helpers
- `src/content/`: content script bridge that runs site adapters inside supported pages
- `src/adapters/`: site-specific detection, scanning, and parsing
- `src/exporters/`: conversion from normalized conversation data into file artifacts
- `src/storage/`: Dexie-backed persistence for jobs and export history
- `src/core/`: shared types, filename generation, and common helpers

## Runtime Flow

1. UI sends a runtime request to the service worker.
2. The background layer ensures permission and injects the content script when needed.
3. The content script routes the request to the active site adapter.
4. The adapter returns normalized conversation data.
5. The exporter generates a `Blob` artifact.
6. The background layer downloads the file and records job/history state.

## Data Model

The core normalized model is `ChatConversation`:

- conversation metadata: site, id, title, URL, export time
- ordered messages with normalized roles
- optional attachment metadata

That model is reused by every exporter so site-specific logic stays isolated from output formatting.

## Current Constraints

- only ChatGPT extraction is implemented today
- non-ChatGPT sites intentionally expose placeholders in the UI
- batch export depends on opening individual conversations in background tabs
