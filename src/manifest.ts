export const manifest = {
  manifest_version: 3,
  name: 'AI Chat Exporter',
  short_name: 'AI Exporter',
  version: '0.1.0',
  description: 'Export chats from major AI websites to Markdown locally.',
  icons: {
    '16': 'icons/icon-16.png',
    '32': 'icons/icon-32.png',
    '48': 'icons/icon-48.png',
    '128': 'icons/icon-128.png'
  },
  action: {
    default_title: 'AI Chat Exporter'
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
    'https://x.com/i/grok*',
    'https://www.doubao.com/*',
    'https://doubao.com/*',
    'https://tongyi.aliyun.com/*',
    'https://qianwen.aliyun.com/*',
    'https://yiyan.baidu.com/*',
    'https://wenxin.baidu.com/*'
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
      resources: ['src/content/bridge.js', 'src/ui/popup/index.html', 'assets/*', 'logo.png'],
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
} as const;
