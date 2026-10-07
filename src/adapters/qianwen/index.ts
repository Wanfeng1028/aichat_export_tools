import { BaseAdapter } from '../shared/base';
import type { AdapterStatus, ChatConversation, ChatMessage, ConversationSummary, MessageRole } from '../../core/types';

const SIDEBAR_SELECTOR = '[class*="pe-sidebar"], aside, [class*="sidebar"]';
const CONVERSATION_ITEM_SELECTOR = '[class*="group"][class*="relative"][class*="cursor-pointer"]';
const MESSAGE_SELECTOR = '[class*="message"], [class*="chat-message"], [data-testid*="message"], article';
// 按优先级逐个尝试，querySelector 返回的是文档序第一个匹配，选择器书写顺序不决定优先级
const MAIN_SELECTOR_PRIORITY = ['main', '[role="main"]', '[class*="chat-container"]', '[class*="conversation"]'];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

  return doc.title.replace(/\s*[-|·—–]\s*(?:通义千问|千问|Qwen|Tongyi)\s*$/i, '').trim() || '千问对话';
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

function hashOf(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(index) | 0;
  }
  return Math.abs(hash).toString(36);
}

function buildConversationSummaries(): ConversationSummary[] {
  const items = collectConversationItems();
  const currentId = getConversationIdFromUrl();
  const summaries: ConversationSummary[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const title = textFromNode(item);
    if (!title || title.length < 2) continue;

    // id/url 必须来自条目自身的链接，不能用「当前页 URL + 序号」伪造——
    // 否则批量导出会反复打开同一个会话，历史记录主键也会错乱
    const anchor = item.querySelector('a[href]');
    let id = '';
    let url = '';
    if (anchor instanceof HTMLAnchorElement && anchor.href && !anchor.href.startsWith('javascript:')) {
      try {
        const parsed = new URL(anchor.href);
        const match = parsed.pathname.match(/\/chat\/([^/?#]+)/);
        id = match ? match[1] : `qianwen-${hashOf(`${parsed.pathname}${parsed.search}`)}`;
        url = parsed.toString();
      } catch {
        id = '';
      }
    }
    if (!id) {
      id = `qianwen-${hashOf(title)}`;
    }

    if (seen.has(id)) continue;
    seen.add(id);

    summaries.push({
      id,
      site: 'qianwen',
      title,
      url,
      isActive: id === currentId
    });
  }

  return summaries;
}

// [class*="message"] 会同时命中 message-list 等祖先容器和真正的消息节点：
// 仅当被包含候选几乎占满外层文本时才视为重复容器，避免把整段会话当成第一条消息
function isRedundantMessageContainer(element: Element, others: Element[]): boolean {
  const text = textFromNode(element);
  if (!text) return true;
  const containedLength = others
    .filter((other) => other !== element && element.contains(other))
    .reduce((total, other) => total + textFromNode(other).length, 0);
  return containedLength >= text.length * 0.6;
}

function collectMessageElements(root: Element): Element[] {
  const candidates = Array.from(root.querySelectorAll(MESSAGE_SELECTOR));
  return candidates.filter((element) => !isRedundantMessageContainer(element, candidates));
}

function attrsMatchToken(attrs: string, token: string): boolean {
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(token)}([^a-z0-9]|$)`, 'i').test(attrs);
}

function resolveMessageRole(element: Element, index: number): MessageRole {
  const attrs = [
    element.getAttribute('data-testid'),
    element.getAttribute('data-message-author-role'),
    element.getAttribute('aria-label'),
    element.getAttribute('class')
  ].filter(Boolean).join(' ').toLowerCase();

  if (['user', 'human'].some((token) => attrsMatchToken(attrs, token))) return 'user';
  if (['assistant', 'bot', 'qwen'].some((token) => attrsMatchToken(attrs, token))) return 'assistant';
  if (attrsMatchToken(attrs, 'system')) return 'system';

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
  if (!doc) return null;
  for (const selector of MAIN_SELECTOR_PRIORITY) {
    const candidate = doc.querySelector(selector);
    if (candidate) return candidate;
  }
  return doc.body;
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
