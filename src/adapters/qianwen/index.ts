import { BaseAdapter } from '../shared/base';
import type { AdapterStatus, ChatConversation, ChatMessage, ConversationSummary, MessageRole } from '../../core/types';

const SIDEBAR_SELECTOR = '[class*="pe-sidebar"], aside, [class*="sidebar"]';
const CONVERSATION_ITEM_SELECTOR = '[class*="group"][class*="relative"][class*="cursor-pointer"]';
const MESSAGE_SELECTOR = '[class*="message"], [class*="chat-message"], [data-testid*="message"], article';
const MAIN_SELECTOR = 'main, [role="main"], [class*="chat-container"], [class*="conversation"]';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function textFromNode(node: Element | null | undefined): string {
  if (!node) return '';
  return (node.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function getDocument(): Document | null {
  try {
    return typeof document !== 'undefined' ? document : null;
  } catch {
    return null;
  }
}

function getConversationIdFromUrl(): string {
  try {
    const match = (globalThis.location?.pathname ?? '').match(/\/chat\/([^/?#]+)/);
    return match ? match[1] : `qianwen-${Date.now()}`;
  } catch {
    return `qianwen-${Date.now()}`;
  }
}

function getConversationTitle(): string {
  const doc = getDocument();
  if (!doc) return '千问对话';

  const h1 = doc.querySelector('h1');
  if (h1 && textFromNode(h1)) return textFromNode(h1);

  const mainTitle = doc.querySelector('main h2, [role="main"] h2');
  if (mainTitle && textFromNode(mainTitle)) return textFromNode(mainTitle);

  return doc.title.replace(/\s*[-|·].*$/, '').trim() || '千问对话';
}

function findSidebar(): Element | null {
  const doc = getDocument();
  return doc ? doc.querySelector(SIDEBAR_SELECTOR) : null;
}

function collectConversationItems(): Element[] {
  const sidebar = findSidebar();
  if (!sidebar) return [];

  const items = Array.from(sidebar.querySelectorAll(CONVERSATION_ITEM_SELECTOR));
  return items.filter(item => textFromNode(item).length >= 2);
}

function buildConversationSummaries(): ConversationSummary[] {
  const items = collectConversationItems();
  const currentId = getConversationIdFromUrl();
  const summaries: ConversationSummary[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const title = textFromNode(item);
    if (!title || title.length < 2) continue;

    const dedupeKey = title.slice(0, 100);
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const id = `qianwen-${summaries.length + 1}`;
    summaries.push({
      id,
      site: 'qianwen',
      title,
      url: globalThis.location?.href ?? '',
      isActive: false
    });
  }

  return summaries;
}

function collectMessageElements(root: Element): Element[] {
  const selectors = MESSAGE_SELECTOR.split(',').map(s => s.trim()).join(', ');
  const candidates = Array.from(root.querySelectorAll(selectors))
    .filter(el => textFromNode(el).length >= 4);
  
  const unique: Element[] = [];
  const seen = new Set<string>();
  
  for (const el of candidates) {
    const text = textFromNode(el).slice(0, 200);
    if (seen.has(text)) continue;
    seen.add(text);
    unique.push(el);
  }
  
  return unique;
}

function resolveMessageRole(element: Element, index: number): MessageRole {
  const attrs = [
    element.getAttribute('data-testid'),
    element.getAttribute('data-message-author-role'),
    element.getAttribute('aria-label'),
    element.getAttribute('class')
  ].join(' ').toLowerCase();

  if (attrs.includes('user') || attrs.includes('human')) return 'user';
  if (attrs.includes('assistant') || attrs.includes('bot') || attrs.includes('qwen')) return 'assistant';
  if (attrs.includes('system')) return 'system';
  
  return index % 2 === 0 ? 'user' : 'assistant';
}

function buildMessages(root: Element): ChatMessage[] {
  const elements = collectMessageElements(root);
  if (elements.length === 0) return [];

  return elements.map((el, index) => ({
    id: el.getAttribute('data-message-id') || `msg-${index + 1}`,
    role: resolveMessageRole(el, index),
    text: textFromNode(el),
    html: el instanceof HTMLElement ? el.innerHTML : undefined
  })).filter(msg => msg.text.length > 0);
}

function selectConversationRoot(): Element | null {
  const doc = getDocument();
  return doc ? (doc.querySelector(MAIN_SELECTOR) || doc.body) : null;
}

export class QianwenAdapter extends BaseAdapter {
  readonly site = 'qianwen' as const;

  async getStatus(): Promise<AdapterStatus> {
    const root = selectConversationRoot();
    const hasMessages = root ? buildMessages(root).length > 0 : false;
    const hasSidebar = Boolean(findSidebar());

    return {
      site: 'qianwen',
      supported: true,
      loggedIn: hasMessages || hasSidebar,
      canExportCurrentConversation: hasMessages,
      message: hasMessages
        ? 'Ready to export the current 千问 conversation.'
        : 'Open a 千问 conversation first.'
    };
  }

  async exportCurrentConversation(): Promise<ChatConversation> {
    let root = selectConversationRoot();
    let messages = root ? buildMessages(root) : [];

    for (let attempt = 0; attempt < 4 && messages.length === 0; attempt += 1) {
      await delay(400 + attempt * 200);
      root = selectConversationRoot();
      messages = root ? buildMessages(root) : [];
    }

    this.ensure(root, 'No readable 千问 conversation container was found on the page.');
    this.ensure(messages.length > 0, 'No readable 千问 messages were found on the current page.');

    return {
      id: getConversationIdFromUrl(),
      site: 'qianwen',
      title: getConversationTitle(),
      url: globalThis.location?.href ?? '',
      exportedAt: new Date().toISOString(),
      messages
    };
  }

  async scanConversationList(): Promise<ConversationSummary[]> {
    let conversations = buildConversationSummaries();
    
    for (let attempt = 0; attempt < 4 && conversations.length === 0; attempt += 1) {
      await delay(350 + attempt * 250);
      conversations = buildConversationSummaries();
    }

    this.ensure(
      conversations.length > 0,
      'No 千问 conversation links were found. Open or expand the conversation history sidebar and try again.'
    );
    return conversations;
  }
}

export function createQianwenAdapter(): QianwenAdapter {
  return new QianwenAdapter();
}
