import { BaseAdapter } from '../shared/base';
import type { AdapterStatus, ChatConversation, ConversationSummary } from '../../core/types';
import { parseChatGptConversation, scanChatGptConversationList } from './parser';
import { chatGptSelectors } from './selectors';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
    let lastConversation: ChatConversation | null = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const conversation = parseChatGptConversation();
      lastConversation = conversation;
      if (conversation.messages.length > 0) {
        return conversation;
      }
      await delay(600);
    }

    this.ensure(lastConversation && lastConversation.messages.length > 0, 'No conversation messages were found on the current page.');
    return lastConversation;
  }

  async scanConversationList(): Promise<ConversationSummary[]> {
    let conversations = scanChatGptConversationList();
    for (let attempt = 0; attempt < 3 && conversations.length === 0; attempt += 1) {
      await delay(500);
      conversations = scanChatGptConversationList();
    }
    this.ensure(conversations.length > 0, 'No conversation links were found. Expand the ChatGPT sidebar and try again.');
    return conversations;
  }
}

export function createChatGptAdapter(): ChatGptAdapter {
  return new ChatGptAdapter();
}
