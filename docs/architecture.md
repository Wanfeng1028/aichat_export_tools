# Architecture

MVP architecture follows the PRD layering:

- `background/`: extension runtime orchestration and downloads
- `content/`: page inspection and extraction bridge
- `adapters/`: site-specific parsing logic
- `exporters/`: conversion from normalized conversation data to files
- `storage/`: IndexedDB-backed history
- `ui/`: popup, dashboard, and options pages
