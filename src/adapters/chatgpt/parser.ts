import type { ChatConversation, ChatMessage, ConversationSummary, MessageRole } from '../../core/types';
import { sanitizePlainText } from '../../utils/sanitize';
import { chatGptSelectors } from './selectors';

function normalizeRole(role: string | null): MessageRole {
  if (role === 'assistant' || role === 'system' || role === 'tool') {
    return role;
  }

  return 'user';
}

function normalizeHtml(html: string): string {
  return html.replace(/\u0000/g, '').trim();
}

function isChatGptConversationPath(pathname: string = globalThis.location.pathname): boolean {
  return /^\/c\/[^/]+/.test(pathname);
}

function inferRole(node: Element, index: number): MessageRole {
  const directRole = node.getAttribute('data-message-author-role');
  if (directRole) {
    return normalizeRole(directRole);
  }

  const nestedRoleNode = node.querySelector('[data-message-author-role]');
  if (nestedRoleNode) {
    return normalizeRole(nestedRoleNode.getAttribute('data-message-author-role'));
  }

  const dataTestId = `${node.getAttribute('data-testid') ?? ''} ${String(node.className ?? '')}`.toLowerCase();
  if (dataTestId.includes('assistant')) return 'assistant';
  if (dataTestId.includes('user')) return 'user';

  const ariaLabel = sanitizePlainText(node.getAttribute('aria-label') ?? '').toLowerCase();
  if (ariaLabel.includes('assistant') || ariaLabel.includes('chatgpt')) return 'assistant';
  if (ariaLabel.includes('user') || ariaLabel.includes('you')) return 'user';

  const avatarAlt = sanitizePlainText(node.querySelector('img')?.getAttribute('alt') ?? '').toLowerCase();
  if (avatarAlt.includes('assistant') || avatarAlt.includes('chatgpt')) return 'assistant';
  if (avatarAlt.includes('user') || avatarAlt.includes('you')) return 'user';

  return index % 2 === 0 ? 'user' : 'assistant';
}

function extractMessageContent(node: Element): { text: string; html: string } {
  const candidates = [
    node.querySelector('[data-testid="conversation-turn-content"]'),
    node.querySelector('[data-testid*="conversation-turn-content"]'),
    node.querySelector('[data-testid*="message-content"]'),
    node.querySelector('[data-message-author-role]'),
    node.querySelector('[class*="markdown"]'),
    node.querySelector('.markdown'),
    node.querySelector('article'),
    node
  ].filter(Boolean) as Element[];

  for (const candidate of candidates) {
    const text = sanitizePlainText(candidate.textContent ?? '');
    const html = normalizeHtml(candidate.innerHTML);
    if (text || html) {
      return { text, html };
    }
  }

  return { text: '', html: '' };
}

function buildMessage(node: Element, index: number): ChatMessage {
  const role = inferRole(node, index);
  const { text, html } = extractMessageContent(node);

  return {
    id: node.getAttribute('data-message-id') ?? `msg-${index + 1}`,
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

function selectLeafNodes(nodes: Element[], main: Element | null): Element[] {
  const inMain = main ? nodes.filter((node) => main.contains(node)) : nodes;
  return inMain.filter((node, index) => !inMain.some((candidate, candidateIndex) => candidateIndex !== index && node.contains(candidate)));
}

function hasMeaningfulMessageContent(node: Element): boolean {
  const text = sanitizePlainText(node.textContent ?? '');
  if (text.length >= 8) {
    return true;
  }

  return Boolean(node.querySelector('[class*="markdown"], .markdown, code, pre, p, li'));
}

function extractStructuredMessages(documentRef: Document): ChatMessage[] {
  const main = documentRef.querySelector(chatGptSelectors.main);
  const rawNodes = Array.from(documentRef.querySelectorAll(chatGptSelectors.conversationTurns));
  const candidateNodes = selectLeafNodes(rawNodes, main).filter(hasMeaningfulMessageContent);
  return candidateNodes.map(buildMessage).filter((message) => message.text.length > 0 || Boolean(message.html));
}

function createSnapshotMessage(documentRef: Document): ChatMessage[] {
  const root = documentRef.querySelector(chatGptSelectors.main) ?? documentRef.body;
  if (!root) {
    return [];
  }

  const clone = root.cloneNode(true) as HTMLElement;
  for (const selector of ['nav', 'aside', 'form', 'textarea', 'button', 'header', 'footer', 'script', 'style', '[role="dialog"]', '[aria-live]', '[data-testid*="composer"]']) {
    clone.querySelectorAll(selector).forEach((node) => node.remove());
  }

  const html = normalizeHtml(clone.innerHTML);
  const text = sanitizePlainText(clone.textContent ?? '');
  if (!text && !html) {
    return [];
  }

  return [
    {
      id: 'snapshot-1',
      role: 'assistant',
      text,
      html,
      attachments: []
    }
  ];
}

function buildCurrentConversationSummary(documentRef: Document): ConversationSummary | null {
  if (!isChatGptConversationPath()) {
    return null;
  }

  const id = globalThis.location.pathname.split('/').filter(Boolean).pop() ?? '';
  if (!id) {
    return null;
  }

  const title =
    sanitizePlainText(documentRef.querySelector(chatGptSelectors.title)?.textContent ?? '') ||
    sanitizePlainText(documentRef.title.replace(/\s*[-|].*$/, '')) ||
    'ChatGPT Conversation';

  return {
    id,
    site: 'chatgpt',
    title,
    url: globalThis.location.href,
    isActive: true
  };
}

export function scanChatGptConversationList(documentRef: Document = document): ConversationSummary[] {
  const anchors = Array.from(documentRef.querySelectorAll<HTMLAnchorElement>(chatGptSelectors.sidebarLinks));
  const seen = new Set<string>();
  const items: ConversationSummary[] = [];

  for (const anchor of anchors) {
    const url = normalizeConversationUrl(anchor.href);
    const id = url.split('/').filter(Boolean).pop() ?? url;

    if (!id || seen.has(id) || !url.includes('/c/')) {
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

  const currentConversation = buildCurrentConversationSummary(documentRef);
  if (currentConversation && !seen.has(currentConversation.id)) {
    items.unshift(currentConversation);
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

  const structuredMessages = extractStructuredMessages(documentRef);
  const messages = structuredMessages.length > 0 ? structuredMessages : createSnapshotMessage(documentRef);

  return {
    id: currentId,
    site: 'chatgpt',
    title,
    url: globalThis.location.href,
    exportedAt: new Date().toISOString(),
    messages
  };
}

export { isChatGptConversationPath };
