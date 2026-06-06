import type { SiteCapability } from '../../core/capabilities';

export const chatGptCapabilities: SiteCapability = {
  site: 'chatgpt',
  currentConversation: true,
  listScan: true,
  workspace: false,
  batchExport: true
};
