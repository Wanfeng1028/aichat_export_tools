import type { ChatConversation, ChatMessage, MessageRole } from '../../core/types';
import { sanitizePlainText } from '../../utils/sanitize';
import { chatGptSelectors } from './selectors';

function normalizeRole(role: string | null): MessageRole {
  if (role === 'assistant' || role === 'system' || role === 'tool') {
    return role;
  }

  return 'user';
}

function buildMessage(node: Element, index: number): ChatMessage {
  const role = normalizeRole(node.getAttribute('data-message-author-role'));
  const html = node.innerHTML;
  const text = sanitizePlainText(node.textContent ?? '');

  return {
    id: `msg-${index + 1}`,
    role,
    text,
    html,
    attachments: []
  };
}

export function parseChatGptConversation(documentRef: Document = document): ChatConversation {
  const title =
    sanitizePlainText(documentRef.querySelector(chatGptSelectors.title)?.textContent ?? '') ||
    sanitizePlainText(documentRef.title.replace(/\s*[-|].*$/, '')) ||
    'ChatGPT Conversation';

  const messageNodes = Array.from(documentRef.querySelectorAll(chatGptSelectors.conversationTurns));
  const messages = messageNodes.map(buildMessage).filter((message) => message.text.length > 0 || Boolean(message.html));
  const conversationId = globalThis.location.pathname.split('/').filter(Boolean).pop() ?? `chatgpt-${Date.now()}`;

  return {
    id: conversationId,
    site: 'chatgpt',
    title,
    url: globalThis.location.href,
    exportedAt: new Date().toISOString(),
    messages
  };
}
