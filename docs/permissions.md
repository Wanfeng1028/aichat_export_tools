# Permissions

## Default Permissions

- `storage`: save language, job history, and export history
- `downloads`: save exported artifacts
- `scripting`: inject the content script when needed
- `activeTab`: inspect the current user-selected tab

## Optional Permissions

- `tabs`: required for stable batch export across multiple conversations
- `notifications`: reserved for future completion notifications

## Optional Host Permissions

The extension requests host permissions on demand for supported AI websites instead of asking for broad access on install.

Current configured host targets:

- ChatGPT
- Claude
- Gemini
- Kimi
- DeepSeek
- Grok
- 豆包
- 千问
- 文心一言

## Policy

- do not request site access until the user triggers work on that site
- do not request tabs access until batch export needs it
- keep host permissions separate from core extension permissions
