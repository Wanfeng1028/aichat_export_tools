import { BaseAdapter } from '../shared/base';
import type { AdapterStatus, ChatConversation, ConversationSummary } from '../../core/types';
import { parseChatGptConversation, scanChatGptConversationList } from './parser';
import { chatGptSelectors } from './selectors';

export class ChatGptAdapter extends BaseAdapter {
  readonly site = 'chatgpt' as const;

  async getStatus(): Promise<AdapterStatus> {
    const hasComposer = Boolean(document.querySelector(chatGptSelectors.composer));
    const hasConversation = Boolean(document.querySelector(chatGptSelectors.conversationTurns));
    const hasSidebar = Boolean(document.querySelector(chatGptSelectors.sidebarLinks));

    return {
      site: this.site,
      supported: globalThis.location.hostname.includes('chatgpt.com'),
      loggedIn: hasComposer || hasConversation || hasSidebar,
      canExportCurrentConversation: hasConversation,
      message: hasConversation
        ? 'Ready to export the current conversation.'
        : hasSidebar
          ? 'Conversation list detected. Open a conversation or use batch export from the dashboard.'
          : 'Open ChatGPT and load your conversation list first.'
    };
  }

  async exportCurrentConversation(): Promise<ChatConversation> {
    const conversation = parseChatGptConversation();
    this.ensure(conversation.messages.length > 0, 'No conversation messages were found on the current page.');
    return conversation;
  }

  async scanConversationList(): Promise<ConversationSummary[]> {
    const conversations = scanChatGptConversationList();
    this.ensure(conversations.length > 0, 'No conversation links were found. Expand the ChatGPT sidebar and try again.');
    return conversations;
  }
}

export function createChatGptAdapter(): ChatGptAdapter {
  return new ChatGptAdapter();
}
