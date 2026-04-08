import type { AdapterStatus, ChatConversation, ConversationSummary } from '../../core/types';

export interface SiteAdapter {
  readonly site: AdapterStatus['site'];
  getStatus(): Promise<AdapterStatus>;
  exportCurrentConversation(): Promise<ChatConversation>;
  scanConversationList(): Promise<ConversationSummary[]>;
}
