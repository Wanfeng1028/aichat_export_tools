import type { SupportedSite } from './types';

export const APP_NAME = 'AI Chat Exporter';
export const HISTORY_STORE = 'export_history';
export const SETTINGS_STORE = 'settings';
export const JOBS_STORE = 'jobs';

export const SUPPORTED_SITE_LABELS: Record<SupportedSite, string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  kimi: 'Kimi',
  deepseek: 'DeepSeek',
  grok: 'Grok',
  doubao: '豆包',
  qianwen: '千问',
  yiyan: '文心一言'
};
