import type { SiteCapability } from '../../core/capabilities';

export const chatGptCapabilities: SiteCapability = {
  site: 'chatgpt',
  currentConversation: true,
  listScan: false,
  workspace: false,
  batchExport: false
};
