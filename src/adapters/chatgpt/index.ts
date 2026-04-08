import { BaseAdapter } from '../shared/base';
import type { AdapterStatus, ChatConversation } from '../../core/types';
import { parseChatGptConversation } from './parser';
import { chatGptSelectors } from './selectors';

export class ChatGptAdapter extends BaseAdapter {
  readonly site = 'chatgpt' as const;

  async getStatus(): Promise<AdapterStatus> {
    const hasComposer = Boolean(document.querySelector(chatGptSelectors.composer));
    const hasConversation = Boolean(document.querySelector(chatGptSelectors.conversationTurns));

    return {
      site: this.site,
      supported: globalThis.location.hostname.includes('chatgpt.com'),
      loggedIn: hasComposer || hasConversation,
      canExportCurrentConversation: hasConversation,
      message: hasConversation ? 'Ready to export the current conversation.' : 'Open a ChatGPT conversation page first.'
    };
  }

  async exportCurrentConversation(): Promise<ChatConversation> {
    const conversation = parseChatGptConversation();
    this.ensure(conversation.messages.length > 0, 'No conversation messages were found on the current page.');
    return conversation;
  }
}

export function createChatGptAdapter(): ChatGptAdapter {
  return new ChatGptAdapter();
}
