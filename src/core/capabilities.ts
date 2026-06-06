import type { SupportedSite } from './types';

export interface SiteCapability {
  site: SupportedSite;
  currentConversation: boolean;
  listScan: boolean;
  workspace: boolean;
  batchExport: boolean;
}

export const siteCapabilities: SiteCapability[] = [
  {
    site: 'chatgpt',
    currentConversation: true,
    listScan: true,
    workspace: false,
    batchExport: true
  }
];
