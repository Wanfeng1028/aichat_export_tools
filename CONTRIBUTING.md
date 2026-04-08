# Contributing

## Scope

This project is a browser extension for exporting AI chat data locally. Contributions should preserve:

- local-first processing
- minimal permissions
- adapter isolation per site
- normalized conversation data before export

## Development Flow

1. Create a branch from the latest main branch.
2. Make focused changes.
3. Run `npm test`.
4. Run `npm run build`.
5. Open a pull request with validation notes.

## Adapter Rules

- Keep selectors and parsing logic inside one site adapter directory.
- Do not mix selectors from multiple sites in the same file.
- Return normalized `ChatConversation` and `ConversationSummary` objects.
- Prefer resilient selectors and clear fallback errors.

## Documentation Rules

- Update `README.md` when a user-facing capability changes.
- Update `docs/` when architecture, permissions, or roadmap assumptions change.
- Call out unsupported or partial site support explicitly.

## Testing

- Add or update unit tests for shared utilities and exporters when behavior changes.
- Keep tests deterministic and local. Do not depend on live website access.

## Pull Requests

- Explain the user-visible change.
- List build and test commands you ran.
- Note follow-up work if the implementation is intentionally partial.
