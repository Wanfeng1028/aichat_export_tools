# Adapters

## Adapter Contract

Each site adapter should implement:

- site detection
- status inspection
- current conversation export
- conversation list scanning when available

## Current Adapter State

### ChatGPT

Implemented:

- current page status detection
- current conversation parsing
- sidebar conversation list scanning

Known limitations:

- selectors may need updates when the site UI changes
- workspace-specific behavior is not separated yet
- attachment metadata is reserved in the model but not populated

## Planned Adapters

- Claude
- Gemini
- Kimi
- DeepSeek
- Grok
- 豆包
- 千问
- 文心一言

## Implementation Rules

- keep selectors in a site-local `selectors.ts`
- keep extraction logic in a site-local `parser.ts`
- avoid cross-site selector reuse unless it is genuinely generic
- surface actionable errors instead of silent failures
