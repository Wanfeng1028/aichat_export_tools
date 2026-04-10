import { BaseAdapter } from '../shared/base';
import { textFromNode } from '../shared/utils';
import type { AdapterStatus, ChatConversation, ChatMessage, ConversationSummary, MessageRole, SupportedSite } from '../../core/types';

type GenericSiteConfig = {
  site: Exclude<SupportedSite, 'chatgpt'>;
  label: string;
  hostnames: string[];
  titleSelectors?: string[];
  messageSelectors?: string[];
  sidebarSelectors?: string[];
  conversationPathHints?: string[];
  blockedPathTokens?: string[];
  blockedTextTokens?: string[];
  requirePathHint?: boolean;
};

const GENERIC_SITE_CONFIGS: GenericSiteConfig[] = [
  {
    site: 'claude',
    label: 'Claude',
    hostnames: ['claude.ai'],
    titleSelectors: ['h1', 'main h2', 'main header h2'],
    messageSelectors: ['[data-testid*="message"]', '[class*="message"]', 'article'],
    conversationPathHints: ['/chat/']
  },
  {
    site: 'gemini',
    label: 'Gemini',
    hostnames: ['gemini.google.com'],
    titleSelectors: ['h1', 'main h2'],
    messageSelectors: ['message-content', 'user-query', 'model-response', '[class*="message"]'],
    conversationPathHints: ['/app/', '/share/'],
    blockedPathTokens: ['/mystuff', '/notebooks', '/gems', '/library'],
    blockedTextTokens: ['my stuff', 'notebooks', 'gems', 'library'],
    requirePathHint: true
  },
  {
    site: 'kimi',
    label: 'Kimi',
    hostnames: ['kimi.moonshot.cn', 'kimi.com', 'www.kimi.com'],
    titleSelectors: ['h1', 'main h2'],
    messageSelectors: ['[class*="message"]', '[data-testid*="message"]', 'article'],
    conversationPathHints: ['/chat/']
  },
  {
    site: 'deepseek',
    label: 'DeepSeek',
    hostnames: ['chat.deepseek.com'],
    titleSelectors: ['h1', 'main h2'],
    messageSelectors: ['[class*="message"]', '[data-testid*="message"]', 'article'],
    conversationPathHints: ['/chat/', '/a/chat/']
  },
  {
    site: 'grok',
    label: 'Grok',
    hostnames: ['grok.com', 'x.com'],
    titleSelectors: ['h1', 'main h2'],
    messageSelectors: ['[data-testid*="conversation"] [data-testid*="cellInnerDiv"]', '[class*="message"]', 'article'],
    conversationPathHints: ['/c/', '/i/grok']
  },
  {
    site: 'doubao',
    label: '豆包',
    hostnames: ['doubao.com', 'www.doubao.com'],
    titleSelectors: ['h1', 'main h2'],
    messageSelectors: ['[class*="message"]', '[data-testid*="message"]', 'article'],
    conversationPathHints: ['/chat/']
  },
  {
    site: 'qianwen',
    label: '千问',
    hostnames: ['tongyi.aliyun.com', 'qianwen.aliyun.com', 'tongyi.com', 'www.tongyi.com', 'qwen.ai', 'www.qwen.ai'],
    titleSelectors: ['h1', 'main h2'],
    messageSelectors: ['[class*="message"]', '[data-testid*="message"]', 'article'],
    conversationPathHints: ['/chat/', '/c/', '/share/']
  },
  {
    site: 'yiyan',
    label: '文心一言',
    hostnames: ['yiyan.baidu.com', 'wenxin.baidu.com'],
    titleSelectors: ['h1', 'main h2'],
    messageSelectors: ['[class*="message"]', '[data-testid*="message"]', 'article'],
    conversationPathHints: ['/chat/']
  }
];

const GENERIC_MESSAGE_SELECTOR = [
  '[data-testid*="message"]',
  '[data-testid*="chat"]',
  '[data-message-author-role]',
  '[class*="message"]',
  '[class*="conversation"]',
  '[class*="chat-item"]',
  '[class*="turn"]',
  '[role="listitem"]',
  'article'
].join(', ');

const GENERIC_SIDEBAR_SELECTOR = [
  'aside',
  'nav',
  '[role="navigation"]',
  '[aria-label*="history" i]',
  '[aria-label*="conversation" i]',
  '[class*="sidebar"]',
  '[class*="history"]'
].join(', ');

const MESSAGE_ROLE_HINTS: Record<MessageRole, string[]> = {
  system: ['system'],
  user: ['user', 'human', 'me', 'you', 'query', 'prompt'],
  assistant: ['assistant', 'bot', 'model', 'claude', 'gemini', 'kimi', 'deepseek', 'grok', 'doubao', 'qwen', 'wenxin', 'yiyan'],
  tool: ['tool']
};

const DEFAULT_BLOCKED_TEXT_TOKENS = [
  'new chat',
  'new conversation',
  'settings',
  'upgrade',
  'pricing',
  'help',
  'team',
  'workspace',
  'explore',
  'discover',
  'history',
  'search',
  'my stuff',
  'notebook',
  'notebooks',
  'gems',
  'library',
  '新对话',
  '新建对话',
  '设置',
  '帮助',
  '团队',
  '工作空间',
  '发现',
  '探索',
  '更多'
];

const DEFAULT_BLOCKED_PATH_TOKENS = [
  '/settings',
  '/help',
  '/pricing',
  '/upgrade',
  '/workspace',
  '/explore',
  '/discover',
  '/mystuff',
  '/notebooks',
  '/gems',
  '/library'
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uniqueByText(elements: Element[]): Element[] {
  const seen = new Set<string>();
  const deduped: Element[] = [];

  for (const element of elements) {
    const text = textFromNode(element);
    if (!text) continue;
    const key = text.slice(0, 240);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(element);
  }

  return deduped;
}

function hasLargeDescendantCandidate(element: Element, selectors: string): boolean {
  const parentLength = textFromNode(element).length;
  return Array.from(element.querySelectorAll(selectors)).some((candidate) => {
    if (candidate === element) return false;
    const candidateLength = textFromNode(candidate).length;
    return candidateLength > 0 && candidateLength >= parentLength * 0.8;
  });
}

function selectConversationRoot(): Element | null {
  const explicitRoot = document.querySelector('main [role="main"], main, [role="main"], article');
  if (explicitRoot) return explicitRoot;
  return document.body;
}

function normalizeMessageText(text: string): string {
  return text.replace(/\u200b/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

function resolveMessageRole(element: Element, fallback: MessageRole): MessageRole {
  const haystack = [
    element.getAttribute('data-testid'),
    element.getAttribute('data-message-author-role'),
    element.getAttribute('aria-label'),
    element.getAttribute('class'),
    element.getAttribute('role'),
    element.previousElementSibling?.textContent,
    element.parentElement?.getAttribute('aria-label'),
    element.parentElement?.getAttribute('class')
  ].join(' ').toLowerCase();

  if (MESSAGE_ROLE_HINTS.tool.some((token) => haystack.includes(token))) return 'tool';
  if (MESSAGE_ROLE_HINTS.assistant.some((token) => haystack.includes(token))) return 'assistant';
  if (MESSAGE_ROLE_HINTS.user.some((token) => haystack.includes(token))) return 'user';
  if (MESSAGE_ROLE_HINTS.system.some((token) => haystack.includes(token))) return 'system';
  return fallback;
}

function resolveConversationTitle(config: GenericSiteConfig): string {
  for (const selector of config.titleSelectors ?? []) {
    const title = textFromNode(document.querySelector(selector));
    if (title) return title;
  }

  const explicitTitle = textFromNode(document.querySelector('main h1, header h1, h1'));
  if (explicitTitle) return explicitTitle;

  const browserTitle = document.title.replace(/\s*[\-|·|?].*$/, '').trim();
  return browserTitle || `${config.label} conversation`;
}

function collectMessageCandidates(root: Element, config: GenericSiteConfig): Element[] {
  const selectors = [...(config.messageSelectors ?? []), GENERIC_MESSAGE_SELECTOR].join(', ');
  const candidates = Array.from(root.querySelectorAll(selectors))
    .filter((element) => textFromNode(element).length >= 8)
    .filter((element) => !hasLargeDescendantCandidate(element, selectors));

  return uniqueByText(candidates);
}

function fallbackConversationMessages(root: Element): ChatMessage[] {
  const sections = Array.from(root.querySelectorAll('main p, article p, [role="main"] p'))
    .map((element) => normalizeMessageText(textFromNode(element)))
    .filter((text) => text.length >= 20);

  if (sections.length < 2) {
    return [];
  }

  return sections.map((text, index) => ({
    id: `msg-${index + 1}`,
    role: index % 2 === 0 ? 'assistant' : 'user',
    text
  }));
}

function buildMessages(root: Element, config: GenericSiteConfig): ChatMessage[] {
  const candidates = collectMessageCandidates(root, config);
  if (candidates.length === 0) {
    return fallbackConversationMessages(root);
  }

  return candidates
    .map((element, index) => {
      const text = normalizeMessageText(textFromNode(element));
      if (!text) return null;
      const fallbackRole: MessageRole = index % 2 === 0 ? 'user' : 'assistant';
      return {
        id: `msg-${index + 1}`,
        role: resolveMessageRole(element, fallbackRole),
        text,
        html: element instanceof HTMLElement ? element.innerHTML : undefined
      } satisfies ChatMessage;
    })
    .filter((item): item is ChatMessage => Boolean(item));
}

function getSummaryIdFromUrl(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  return parts.at(-1) || url.href;
}

function shouldKeepConversationLink(anchor: HTMLAnchorElement, config: GenericSiteConfig): boolean {
  const text = textFromNode(anchor);
  if (text.length < 2) return false;
  const href = anchor.href;
  if (!href || href.startsWith('javascript:')) return false;

  let url: URL;
  try {
    url = new URL(anchor.href, globalThis.location.href);
  } catch {
    return false;
  }

  if (url.origin !== globalThis.location.origin) return false;

  const combined = `${text} ${url.pathname}`.toLowerCase();
  const blockedTextTokens = [...DEFAULT_BLOCKED_TEXT_TOKENS, ...(config.blockedTextTokens ?? [])];
  const blockedPathTokens = [...DEFAULT_BLOCKED_PATH_TOKENS, ...(config.blockedPathTokens ?? [])];
  if (blockedTextTokens.some((token) => combined.includes(token))) return false;
  if (blockedPathTokens.some((token) => url.pathname.toLowerCase().includes(token))) return false;

  const pathHints = config.conversationPathHints ?? [];
  if (config.requirePathHint && !pathHints.some((hint) => url.pathname.toLowerCase().includes(hint.toLowerCase()) || url.href.toLowerCase().includes(hint.toLowerCase()))) {
    return false;
  }

  const looksLikeConversation = pathHints.some((hint) => url.pathname.toLowerCase().includes(hint.toLowerCase()) || url.href.toLowerCase().includes(hint.toLowerCase()));
  if (!looksLikeConversation && url.pathname.split('/').filter(Boolean).length < 2) {
    return false;
  }

  return true;
}

function buildConversationSummaries(config: GenericSiteConfig): ConversationSummary[] {
  const roots = Array.from(document.querySelectorAll([...(config.sidebarSelectors ?? []), GENERIC_SIDEBAR_SELECTOR].join(', ')));
  const anchors = roots.flatMap((root) => Array.from(root.querySelectorAll('a')))
    .filter((anchor): anchor is HTMLAnchorElement => anchor instanceof HTMLAnchorElement)
    .filter((anchor) => shouldKeepConversationLink(anchor, config));

  const seen = new Set<string>();
  const activePath = globalThis.location.pathname;

  return anchors.map((anchor) => {
    const url = new URL(anchor.href, globalThis.location.href);
    const id = getSummaryIdFromUrl(url);
    const title = textFromNode(anchor);
    if (!id || !title || seen.has(id)) return null;
    seen.add(id);
    return {
      id,
      site: config.site,
      title,
      url: url.toString(),
      isActive: url.pathname === activePath
    } satisfies ConversationSummary;
  }).filter((item): item is ConversationSummary => Boolean(item));
}

function hasReadableConversation(root: Element | null, config: GenericSiteConfig): boolean {
  if (!root) return false;
  return buildMessages(root, config).length > 0;
}

export class GenericDomAdapter extends BaseAdapter {
  readonly site: GenericSiteConfig['site'];

  constructor(private readonly config: GenericSiteConfig) {
    super();
    this.site = config.site;
  }

  async getStatus(): Promise<AdapterStatus> {
    const root = selectConversationRoot();
    const canExport = hasReadableConversation(root, this.config);

    return {
      site: this.site,
      supported: true,
      loggedIn: canExport || Boolean(document.querySelector(GENERIC_SIDEBAR_SELECTOR)),
      canExportCurrentConversation: canExport,
      message: canExport
        ? `Ready to export the current ${this.config.label} conversation.`
        : `Open a ${this.config.label} conversation first.`
    };
  }

  async exportCurrentConversation(): Promise<ChatConversation> {
    let root = selectConversationRoot();
    let messages = root ? buildMessages(root, this.config) : [];

    for (let attempt = 0; attempt < 4 && messages.length === 0; attempt += 1) {
      await delay(400 + attempt * 200);
      root = selectConversationRoot();
      messages = root ? buildMessages(root, this.config) : [];
    }

    this.ensure(root, `No readable ${this.config.label} conversation container was found on the page.`);
    this.ensure(messages.length > 0, `No readable ${this.config.label} messages were found on the current page.`);

    return {
      id: getSummaryIdFromUrl(new URL(globalThis.location.href)),
      site: this.site,
      title: resolveConversationTitle(this.config),
      url: globalThis.location.href,
      exportedAt: new Date().toISOString(),
      messages
    };
  }

  async scanConversationList(): Promise<ConversationSummary[]> {
    let conversations = buildConversationSummaries(this.config);

    for (let attempt = 0; attempt < 3 && conversations.length === 0; attempt += 1) {
      await delay(350 + attempt * 200);
      conversations = buildConversationSummaries(this.config);
    }

    this.ensure(conversations.length > 0, `${this.config.label} conversation list is not available on this page yet.`);
    return conversations;
  }
}

export function createGenericSiteAdapter(site: SupportedSite): GenericDomAdapter | null {
  if (site === 'chatgpt') return null;
  const config = GENERIC_SITE_CONFIGS.find((item) => item.site === site);
  return config ? new GenericDomAdapter(config) : null;
}
