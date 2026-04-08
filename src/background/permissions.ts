import type { SupportedSite } from '../core/types';

const permissionOrigins: Record<SupportedSite, string[]> = {
  chatgpt: ['https://chatgpt.com/*'],
  claude: ['https://claude.ai/*'],
  gemini: ['https://gemini.google.com/*'],
  kimi: ['https://kimi.moonshot.cn/*'],
  deepseek: ['https://chat.deepseek.com/*'],
  grok: ['https://grok.com/*', 'https://x.com/i/grok*']
};

export async function requestSitePermission(site: SupportedSite): Promise<boolean> {
  return chrome.permissions.request({ origins: permissionOrigins[site] });
}
