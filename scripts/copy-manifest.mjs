import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const manifest = {
  manifest_version: 3,
  name: 'AI Chat Exporter',
  short_name: 'AI Exporter',
  version: '0.1.0',
  description: 'Export chats from major AI websites to Markdown locally.',
  action: {
    default_title: 'AI Chat Exporter',
    default_popup: 'src/ui/popup/index.html'
  },
  background: {
    service_worker: 'src/background/service-worker.js',
    type: 'module'
  },
  permissions: ['storage', 'downloads', 'scripting', 'activeTab'],
  optional_permissions: ['tabs', 'notifications'],
  optional_host_permissions: [
    'https://chatgpt.com/*',
    'https://claude.ai/*',
    'https://gemini.google.com/*',
    'https://kimi.moonshot.cn/*',
    'https://chat.deepseek.com/*',
    'https://grok.com/*',
    'https://x.com/i/grok*'
  ],
  host_permissions: [],
  content_scripts: [
    {
      matches: ['https://chatgpt.com/*'],
      js: ['src/content/index.js'],
      run_at: 'document_idle'
    }
  ],
  web_accessible_resources: [
    {
      resources: ['src/content/bridge.js', 'assets/*'],
      matches: ['<all_urls>']
    }
  ],
  options_page: 'src/ui/options/index.html',
  browser_specific_settings: {
    gecko: {
      id: 'ai-chat-exporter@example.com',
      strict_min_version: '121.0'
    }
  }
};

const outputPath = resolve('dist/manifest.json');

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
