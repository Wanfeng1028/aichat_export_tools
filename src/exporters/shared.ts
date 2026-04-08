import type { ChatConversation } from '../core/types';

export interface ExportSection {
  heading: string;
  body: string;
}

export function buildConversationSections(conversation: ChatConversation): ExportSection[] {
  return conversation.messages.map((message) => ({
    heading: message.role.toUpperCase(),
    body: message.text.trim() || '[Empty message]'
  }));
}

export function buildConversationSummary(conversation: ChatConversation): string[] {
  return [
    `Title: ${conversation.title}`,
    `Site: ${conversation.site}`,
    `URL: ${conversation.url}`,
    `Exported At: ${conversation.exportedAt}`,
    `Messages: ${conversation.messages.length}`
  ];
}
