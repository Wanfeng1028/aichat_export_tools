import { BaseAdapter } from '../shared/base';
import type { AdapterStatus, ChatConversation, ConversationSummary } from '../../core/types';
import { isChatGptConversationPath, parseChatGptConversation, scanChatGptConversationList } from './parser';
import { chatGptSelectors } from './selectors';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class ChatGptAdapter extends BaseAdapter {
  readonly site = 'chatgpt' as const;

  async getStatus(): Promise<AdapterStatus> {
    const hasComposer = Boolean(document.querySelector(chatGptSelectors.composer));
    const hasConversation = Boolean(document.querySelector(chatGptSelectors.conversationTurns));
    const hasMainContent = Boolean(document.querySelector(chatGptSelectors.main)?.textContent?.trim());
    const hasSidebar = Boolean(document.querySelector(chatGptSelectors.sidebarLinks));
    const isConversationPage = isChatGptConversationPath();

    return {
      site: this.site,
      supported: globalThis.location.hostname.includes('chatgpt.com'),
      loggedIn: hasComposer || hasConversation || hasSidebar || hasMainContent,
      canExportCurrentConversation: isConversationPage && (hasConversation || hasMainContent),
      message: isConversationPage
        ? 'Ready to export the current conversation.'
        : hasSidebar
          ? 'Conversation list detected. Open a conversation or use batch export from the dashboard.'
          : 'Open a ChatGPT conversation page first.'
    };
  }

  async exportCurrentConversation(): Promise<ChatConversation> {
    this.ensure(isChatGptConversationPath(), 'The current page is not a ChatGPT conversation page. Open a /c/... conversation first.');

    let lastConversation: ChatConversation | null = null;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const conversation = parseChatGptConversation();
      lastConversation = conversation;
      if (conversation.messages.length > 0) {
        return conversation;
      }
      await delay(500 + attempt * 200);
    }

    this.ensure(lastConversation && lastConversation.messages.length > 0, 'No conversation messages were found on the current page.');
    return lastConversation;
  }

  async scanConversationList(): Promise<ConversationSummary[]> {
    let conversations = scanChatGptConversationList();
    for (let attempt = 0; attempt < 5 && conversations.length === 0; attempt += 1) {
      await delay(400 + attempt * 200);
      conversations = scanChatGptConversationList();
    }
    this.ensure(conversations.length > 0, 'No conversation links were found. Expand the ChatGPT sidebar and try again.');
    return conversations;
  }
}

export function createChatGptAdapter(): ChatGptAdapter {
  return new ChatGptAdapter();
}
