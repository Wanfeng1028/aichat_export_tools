import { BaseAdapter } from '../shared/base';
import type { AdapterStatus, ChatConversation, ConversationSummary } from '../../core/types';
import { fetchConversationFromApi, fetchConversationListFromApi } from './api';
import { parseChatGptConversation, scanChatGptConversationList } from './parser';
import { chatGptSelectors } from './selectors';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasConversationPath(pathname: string): boolean {
  return /\/(c|g|share)\//.test(pathname);
}

function getConversationPathId(pathname: string): string | null {
  const match = pathname.match(/\/(c|g|share)\/([^/?#]+)/);
  return match?.[2] ?? null;
}

export class ChatGptAdapter extends BaseAdapter {
  readonly site = 'chatgpt' as const;

  async getStatus(): Promise<AdapterStatus> {
    const hasComposer = Boolean(document.querySelector(chatGptSelectors.composer));
    const hasConversation = Boolean(document.querySelector(chatGptSelectors.conversationTurns));
    const hasMainContent = Boolean(document.querySelector(chatGptSelectors.main)?.textContent?.trim());
    const hasSidebar = Boolean(document.querySelector(chatGptSelectors.sidebarLinks));
    const onConversationPage = hasConversationPath(globalThis.location.pathname);

    return {
      site: this.site,
      supported: globalThis.location.hostname.includes('chatgpt.com'),
      loggedIn: hasComposer || hasConversation || hasSidebar || hasMainContent || onConversationPage,
      canExportCurrentConversation: hasConversation || hasMainContent || onConversationPage,
      message: hasConversation || hasMainContent || onConversationPage
        ? 'Ready to export the current conversation.'
        : hasSidebar
          ? 'Conversation list detected. Open a conversation or use batch export from the dashboard.'
          : 'Open ChatGPT and load your conversation list first.'
    };
  }

  async exportCurrentConversation(): Promise<ChatConversation> {
    const conversationId = getConversationPathId(globalThis.location.pathname);
    if (conversationId) {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const conversation = await fetchConversationFromApi(conversationId);
          if (conversation && conversation.messages.length > 0) {
            return conversation;
          }
        } catch {
          // Fall back to DOM extraction below.
        }
        await delay(400 + attempt * 200);
      }
    }

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
    const activeConversationId = getConversationPathId(globalThis.location.pathname);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const conversations = await fetchConversationListFromApi(activeConversationId);
        if (conversations.length > 0) {
          return conversations;
        }
      } catch {
        // Fall back to DOM extraction below.
      }
      await delay(300 + attempt * 200);
    }

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
