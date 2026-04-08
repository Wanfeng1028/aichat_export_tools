import type { ChatConversation, ChatMessage, ConversationSummary, MessageRole } from '../../core/types';
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

function normalizeConversationUrl(href: string): string {
  try {
    return new URL(href, globalThis.location.origin).toString();
  } catch {
    return href;
  }
}

export function scanChatGptConversationList(documentRef: Document = document): ConversationSummary[] {
  const anchors = Array.from(documentRef.querySelectorAll<HTMLAnchorElement>(chatGptSelectors.sidebarLinks));
  const seen = new Set<string>();
  const items: ConversationSummary[] = [];

  for (const anchor of anchors) {
    const url = normalizeConversationUrl(anchor.href);
    const id = url.split('/').filter(Boolean).pop() ?? url;

    if (!id || seen.has(id)) {
      continue;
    }

    const title =
      sanitizePlainText(anchor.textContent ?? '') ||
      sanitizePlainText(anchor.getAttribute('aria-label') ?? '') ||
      `Conversation ${items.length + 1}`;

    seen.add(id);
    items.push({
      id,
      site: 'chatgpt',
      title,
      url,
      isActive: globalThis.location.href.includes(id)
    });
  }

  return items;
}

export function parseChatGptConversation(documentRef: Document = document): ChatConversation {
  const scannedList = scanChatGptConversationList(documentRef);
  const currentId = globalThis.location.pathname.split('/').filter(Boolean).pop() ?? `chatgpt-${Date.now()}`;
  const activeSummary = scannedList.find((item) => item.id === currentId || item.isActive);
  const title =
    activeSummary?.title ||
    sanitizePlainText(documentRef.querySelector(chatGptSelectors.title)?.textContent ?? '') ||
    sanitizePlainText(documentRef.title.replace(/\s*[-|].*$/, '')) ||
    'ChatGPT Conversation';

  const messageNodes = Array.from(documentRef.querySelectorAll(chatGptSelectors.conversationTurns));
  const messages = messageNodes.map(buildMessage).filter((message) => message.text.length > 0 || Boolean(message.html));

  return {
    id: currentId,
    site: 'chatgpt',
    title,
    url: globalThis.location.href,
    exportedAt: new Date().toISOString(),
    messages
  };
}
