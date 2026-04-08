import type { ChatConversation } from './types';

function sanitizeSegment(value: string): string {
  return value
    .replace(/[<>:"/\\|?*]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'untitled';
}

export function buildConversationFilename(conversation: ChatConversation, extension: string): string {
  const timestamp = conversation.exportedAt.replace(/[:]/g, '-');
  return `${sanitizeSegment(conversation.site)}__${sanitizeSegment(conversation.title)}__${timestamp}.${extension}`;
}
