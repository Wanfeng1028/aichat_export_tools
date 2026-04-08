import type { ChatConversation, ChatMessage, ConversationSummary, MessageRole } from '../../core/types';
import { sanitizePlainText } from '../../utils/sanitize';
import { chatGptSelectors } from './selectors';

const messageContentSelectors = [
  '[data-testid="conversation-turn-content"]',
  '[data-testid*="conversation-turn-content"]',
  '[data-testid*="message-content"]',
  '[data-testid="user-message"]',
  '[data-testid="assistant-message"]',
  '[data-message-author-role]',
  '[class*="markdown"]',
  '.markdown',
  '[data-message-id] .whitespace-pre-wrap',
  '[data-message-id] .prose',
  '[role="article"]',
  'article'
].join(', ');

const removableUiSelectors = [
  'nav',
  'aside',
  'form',
  'textarea',
  'button',
  'footer',
  '[role="dialog"]',
  '[role="navigation"]',
  '[aria-live]',
  '[data-testid*="composer"]',
  '[data-testid*="sidebar"]',
  '[data-testid*="history"]'
];

function normalizeRole(role: string | null): MessageRole {
  if (role === 'assistant' || role === 'system' || role === 'tool') {
    return role;
  }

  return 'user';
}

function normalizeHtml(html: string): string {
  return html.replace(/\u0000/g, '').trim();
}

function getConversationPathId(pathname: string): string | null {
  const match = pathname.match(/\/(c|g|share)\/([^/?#]+)/);
  return match?.[2] ?? null;
}

function getConversationRoot(documentRef: Document): Element | null {
  const candidates = Array.from(documentRef.querySelectorAll(chatGptSelectors.main));

  for (const candidate of candidates) {
    if (sanitizePlainText(candidate.textContent ?? '')) {
      return candidate;
    }
  }

  return documentRef.body;
}

function isLikelyUiContainer(node: Element): boolean {
  const label = `${node.getAttribute('data-testid') ?? ''} ${node.className ?? ''} ${node.getAttribute('aria-label') ?? ''}`.toLowerCase();
  return label.includes('composer') || label.includes('sidebar') || label.includes('history') || label.includes('toolbar');
}

function isLikelyMessageNode(node: Element): boolean {
  if (isLikelyUiContainer(node)) {
    return false;
  }

  if (node.hasAttribute('data-message-author-role') || node.hasAttribute('data-message-id')) {
    return true;
  }

  const data = `${node.getAttribute('data-testid') ?? ''} ${node.className ?? ''} ${node.getAttribute('aria-label') ?? ''}`.toLowerCase();
  if (data.includes('conversation-turn') || data.includes('assistant-message') || data.includes('user-message')) {
    return true;
  }

  if (data.includes('assistant') || data.includes('chatgpt') || data.includes('user') || data.includes('you')) {
    return sanitizePlainText(node.textContent ?? '').length > 0;
  }

  return false;
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

  const dataTestId = `${node.getAttribute('data-testid') ?? ''} ${node.className ?? ''}`.toLowerCase();
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
  const candidates = [node.querySelector(messageContentSelectors), node].filter(Boolean) as Element[];

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

function uniqueTopLevelNodes(nodes: Element[], main: Element | null): Element[] {
  const filtered = main ? nodes.filter((node) => main.contains(node)) : nodes;
  return filtered.filter(
    (node, index) =>
      isLikelyMessageNode(node) &&
      !filtered.some((candidate, candidateIndex) => candidateIndex !== index && candidate.contains(node) && isLikelyMessageNode(candidate))
  );
}

function extractStructuredMessages(documentRef: Document): ChatMessage[] {
  const main = getConversationRoot(documentRef);
  const rawNodes = Array.from(main?.querySelectorAll(chatGptSelectors.conversationTurns) ?? documentRef.querySelectorAll(chatGptSelectors.conversationTurns));
  const uniqueNodes = uniqueTopLevelNodes(rawNodes, main);
  return uniqueNodes.map(buildMessage).filter((message) => message.text.length > 0 || Boolean(message.html));
}

function createSnapshotMessage(documentRef: Document): ChatMessage[] {
  const main = getConversationRoot(documentRef);
  if (!main) {
    return [];
  }

  const clone = main.cloneNode(true) as HTMLElement;
  for (const selector of removableUiSelectors) {
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

export function scanChatGptConversationList(documentRef: Document = document): ConversationSummary[] {
  const anchors = Array.from(documentRef.querySelectorAll<HTMLAnchorElement>(chatGptSelectors.sidebarLinks));
  const seen = new Set<string>();
  const items: ConversationSummary[] = [];

  for (const anchor of anchors) {
    const url = normalizeConversationUrl(anchor.href);
    const id = url.split('/').filter(Boolean).pop() ?? url;

    if (!id || seen.has(id) || (!url.includes('/c/') && !url.includes('/g/'))) {
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

  if (items.length === 0) {
    const currentId = getConversationPathId(globalThis.location.pathname);
    if (currentId) {
      const fallbackTitle =
        sanitizePlainText(documentRef.querySelector(chatGptSelectors.title)?.textContent ?? '') ||
        sanitizePlainText(documentRef.title.replace(/\s*[-|].*$/, '')) ||
        'Current ChatGPT Conversation';

      items.push({
        id: currentId,
        site: 'chatgpt',
        title: fallbackTitle,
        url: globalThis.location.href,
        isActive: true
      });
    }
  }

  return items;
}

export function parseChatGptConversation(documentRef: Document = document): ChatConversation {
  const scannedList = scanChatGptConversationList(documentRef);
  const currentId = getConversationPathId(globalThis.location.pathname) ?? `chatgpt-${Date.now()}`;
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
