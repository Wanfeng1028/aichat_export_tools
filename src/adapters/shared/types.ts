import type { AdapterStatus, ChatConversation } from '../../core/types';

export interface SiteAdapter {
  readonly site: AdapterStatus['site'];
  getStatus(): Promise<AdapterStatus>;
  exportCurrentConversation(): Promise<ChatConversation>;
}
