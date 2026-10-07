import type { SupportedSite } from '../core/types';

const permissionOrigins: Record<SupportedSite, string[]> = {
  chatgpt: ['https://chatgpt.com/*'],
  claude: ['https://claude.ai/*'],
  gemini: ['https://gemini.google.com/*'],
  kimi: ['https://kimi.moonshot.cn/*', 'https://kimi.com/*', 'https://www.kimi.com/*'],
  deepseek: ['https://chat.deepseek.com/*'],
  grok: ['https://grok.com/*', 'https://x.com/i/grok*'],
  doubao: ['https://www.doubao.com/*', 'https://doubao.com/*'],
  qianwen: ['https://tongyi.aliyun.com/*', 'https://qianwen.aliyun.com/*', 'https://tongyi.com/*', 'https://www.tongyi.com/*', 'https://qwen.ai/*', 'https://www.qwen.ai/*', 'https://qianwen.com/*', 'https://www.qianwen.com/*'],
  yiyan: ['https://yiyan.baidu.com/*', 'https://wenxin.baidu.com/*']
};

// 站点识别必须按主机名精确匹配（含子域）。用 includes 会把 netflix.com（含 "x.com"）、
// notchatgpt.com 这类无关站点误判成受支持站点，进而弹出错误站点的授权框
const siteHosts: Record<SupportedSite, string[]> = {
  chatgpt: ['chatgpt.com'],
  claude: ['claude.ai'],
  gemini: ['gemini.google.com'],
  kimi: ['kimi.moonshot.cn', 'kimi.com'],
  deepseek: ['chat.deepseek.com'],
  grok: ['grok.com', 'x.com'],
  doubao: ['doubao.com'],
  qianwen: ['tongyi.aliyun.com', 'qianwen.aliyun.com', 'tongyi.com', 'qwen.ai', 'qianwen.com'],
  yiyan: ['yiyan.baidu.com', 'wenxin.baidu.com']
};

function hostnameMatchesSite(hostname: string, hosts: string[]): boolean {
  return hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}

export function detectSupportedSiteFromUrl(url?: string | null): SupportedSite | null {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    for (const [site, hosts] of Object.entries(siteHosts) as Array<[SupportedSite, string[]]>) {
      if (hostnameMatchesSite(hostname, hosts)) return site;
    }
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

export async function requestPermissionsForUrl(
  url: string | null | undefined,
  options: { tabs?: boolean } = {}
): Promise<{ granted: boolean; site: SupportedSite | null }> {
  const site = detectSupportedSiteFromUrl(url);
  if (!site) return { granted: false, site: null };

  const request: chrome.permissions.Permissions = {
    origins: permissionOrigins[site]
  };

  if (options.tabs) {
    request.permissions = ['tabs'];
  }

  const granted = await chrome.permissions.request(request);
  return { granted, site };
}

export async function hasTabsPermission(): Promise<boolean> {
  return chrome.permissions.contains({ permissions: ['tabs'] });
}

export async function requestTabsPermission(): Promise<boolean> {
  return chrome.permissions.request({ permissions: ['tabs'] });
}
