import type { SupportedSite } from '../core/types';

const permissionOrigins: Record<SupportedSite, string[]> = {
  chatgpt: ['https://chatgpt.com/*'],
  claude: ['https://claude.ai/*'],
  gemini: ['https://gemini.google.com/*'],
  kimi: ['https://kimi.moonshot.cn/*'],
  deepseek: ['https://chat.deepseek.com/*'],
  grok: ['https://grok.com/*', 'https://x.com/i/grok*'],
  doubao: ['https://www.doubao.com/*', 'https://doubao.com/*'],
  qianwen: ['https://tongyi.aliyun.com/*', 'https://qianwen.aliyun.com/*'],
  yiyan: ['https://yiyan.baidu.com/*', 'https://wenxin.baidu.com/*']
};

export function detectSupportedSiteFromUrl(url?: string | null): SupportedSite | null {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname;
    if (hostname.includes('chatgpt.com')) return 'chatgpt';
    if (hostname.includes('claude.ai')) return 'claude';
    if (hostname.includes('gemini.google.com')) return 'gemini';
    if (hostname.includes('kimi.moonshot.cn')) return 'kimi';
    if (hostname.includes('chat.deepseek.com')) return 'deepseek';
    if (hostname.includes('grok.com') || hostname.includes('x.com')) return 'grok';
    if (hostname.includes('doubao.com')) return 'doubao';
    if (hostname.includes('tongyi.aliyun.com') || hostname.includes('qianwen.aliyun.com')) return 'qianwen';
    if (hostname.includes('yiyan.baidu.com') || hostname.includes('wenxin.baidu.com')) return 'yiyan';
    return null;
  } catch {
    return null;
  }
}

export function getOriginsForSite(site: SupportedSite): string[] {
  return permissionOrigins[site];
}

export async function hasSitePermissionForUrl(url?: string | null): Promise<{ granted: boolean; site: SupportedSite | null }> {
  const site = detectSupportedSiteFromUrl(url);
  if (!site) return { granted: false, site: null };
  const granted = await chrome.permissions.contains({ origins: permissionOrigins[site] });
  return { granted, site };
}

export async function requestSitePermission(site: SupportedSite): Promise<boolean> {
  return chrome.permissions.request({ origins: permissionOrigins[site] });
}

export async function requestSitePermissionForUrl(url?: string | null): Promise<{ granted: boolean; site: SupportedSite | null }> {
  const site = detectSupportedSiteFromUrl(url);
  if (!site) return { granted: false, site: null };
  const granted = await requestSitePermission(site);
  return { granted, site };
}

export async function hasTabsPermission(): Promise<boolean> {
  return chrome.permissions.contains({ permissions: ['tabs'] });
}

export async function requestTabsPermission(): Promise<boolean> {
  return chrome.permissions.request({ permissions: ['tabs'] });
}
