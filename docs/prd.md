# PRD

## Product Summary

AI Chat Exporter is a local-first browser extension for exporting conversations from AI websites into durable file formats. The extension avoids a custom backend and performs extraction, transformation, and download in the browser.

## Target Users

- users who need offline archives of AI conversations
- developers and researchers who want Markdown-ready knowledge capture
- workspace users who need repeatable export flows

## Current Delivery Scope

Implemented:

- Manifest V3 extension shell
- ChatGPT status detection
- ChatGPT current conversation export
- ChatGPT sidebar conversation scan
- Markdown, PDF, DOCX, and ZIP exporters
- batch export archive generation
- export history and job persistence
- popup, dashboard, and options pages

Planned:

- more site adapters
- workspace-aware exports
- filename templates
- richer export preview and retry polish

## Non-Goals

- cloud sync
- bypassing authentication or platform controls
- server-side storage of chat content

## Success Criteria

- a supported conversation can be exported without leaving the browser
- batch export failures are isolated per conversation
- user-facing state is visible through progress, job history, and error feedback
