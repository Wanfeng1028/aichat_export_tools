import type { ChatAttachment, ChatConversation, ChatMessage, ConversationSummary, MessageRole } from '../../core/types';
import { sanitizePlainText } from '../../utils/sanitize';

type ChatGptApiMessage = {
  id?: string;
  author?: { role?: string | null };
  create_time?: number | string | null;
  content?: {
    content_type?: string | null;
    parts?: unknown[];
    text?: string;
  } | null;
  metadata?: Record<string, unknown> | null;
};

type ChatGptApiMappingNode = {
  id: string;
  parent?: string | null;
  children?: string[];
  message?: ChatGptApiMessage | null;
};

type ChatGptApiConversationResponse = {
  id?: string;
  title?: string | null;
  current_node?: string | null;
  mapping?: Record<string, ChatGptApiMappingNode>;
};

type ChatGptApiConversationListItem = {
  id?: string;
  title?: string | null;
  update_time?: number | string | null;
};

type ChatGptApiConversationListResponse = {
  items?: ChatGptApiConversationListItem[];
  conversations?: ChatGptApiConversationListItem[];
  total?: number;
  total_count?: number;
};

function normalizeRole(role: string | null | undefined): MessageRole {
  if (role === 'assistant' || role === 'system' || role === 'tool') {
    return role;
  }

  return 'user';
}

function toIsoTimestamp(value: number | string | null | undefined): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const millis = value > 1e12 ? value : value * 1000;
    return new Date(millis).toISOString();
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }
  }

  return undefined;
}

function extractTextParts(value: unknown): string[] {
  if (typeof value === 'string') {
    const text = sanitizePlainText(value);
    return text ? [text] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(extractTextParts);
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return [
      ...extractTextParts(record.text),
      ...extractTextParts(record.parts),
      ...extractTextParts(record.content),
      ...extractTextParts(record.value)
    ];
  }

  return [];
}

function extractAttachments(message: ChatGptApiMessage | null | undefined): ChatAttachment[] {
  const metadata = message?.metadata;
  if (!metadata || typeof metadata !== 'object') {
    return [];
  }

  const candidates = [
    (metadata as Record<string, unknown>).attachments,
    (metadata as Record<string, unknown>).files
  ];

  return candidates.flatMap((candidate) => {
    if (!Array.isArray(candidate)) {
      return [];
    }

    return candidate.flatMap((item) => {
      if (!item || typeof item !== 'object') {
        return [];
      }

      const record = item as Record<string, unknown>;
      const name = sanitizePlainText(String(record.name ?? record.filename ?? ''));
      if (!name) {
        return [];
      }

      const type = typeof record.mime_type === 'string'
        ? record.mime_type
        : typeof record.content_type === 'string'
          ? record.content_type
          : undefined;
      const url = typeof record.url === 'string'
        ? record.url
        : typeof record.download_url === 'string'
          ? record.download_url
          : undefined;
      const size = typeof record.size_bytes === 'number'
        ? record.size_bytes
        : typeof record.size === 'number'
          ? record.size
          : undefined;

      return [{ name, type, url, size }];
    });
  });
}

function extractMessageText(message: ChatGptApiMessage | null | undefined): string {
  if (!message?.content) {
    return '';
  }

  const content = message.content;
  const parts = extractTextParts(content.parts);
  if (parts.length > 0) {
    return sanitizePlainText(parts.join('\n\n'));
  }

  if (typeof content.text === 'string') {
    return sanitizePlainText(content.text);
  }

  return '';
}

function resolveCurrentPath(mapping: Record<string, ChatGptApiMappingNode>, currentNodeId?: string | null): string[] {
  if (currentNodeId && mapping[currentNodeId]) {
    const path: string[] = [];
    let cursor: string | null | undefined = currentNodeId;
    const visited = new Set<string>();

    while (cursor && mapping[cursor] && !visited.has(cursor)) {
      path.push(cursor);
      visited.add(cursor);
      cursor = mapping[cursor].parent;
    }

    return path.reverse();
  }

  return Object.values(mapping)
    .filter((node) => node.message)
    .sort((left, right) => {
      const leftTime = Number(left.message?.create_time ?? 0);
      const rightTime = Number(right.message?.create_time ?? 0);
      return leftTime - rightTime;
    })
    .map((node) => node.id);
}

export function parseConversationFromApi(data: ChatGptApiConversationResponse, fallbackUrl: string): ChatConversation | null {
  const conversationId = data.id;
  const mapping = data.mapping;
  if (!conversationId || !mapping) {
    return null;
  }

  const messages: ChatMessage[] = [];
  for (const nodeId of resolveCurrentPath(mapping, data.current_node)) {
    const node = mapping[nodeId];
    const message = node?.message;
    if (!message) {
      continue;
    }

    const text = extractMessageText(message);
    const attachments = extractAttachments(message);
    if (!text && attachments.length === 0) {
      continue;
    }

    messages.push({
      id: message.id ?? nodeId,
      role: normalizeRole(message.author?.role),
      text,
      createdAt: toIsoTimestamp(message.create_time),
      attachments
    });
  }

  if (messages.length === 0) {
    return null;
  }

  return {
    id: conversationId,
    site: 'chatgpt',
    title: sanitizePlainText(data.title ?? '') || 'ChatGPT Conversation',
    url: fallbackUrl,
    exportedAt: new Date().toISOString(),
    messages
  };
}

export function parseConversationListFromApi(items: ChatGptApiConversationListItem[], origin: string, activeConversationId?: string | null): ConversationSummary[] {
  const seen = new Set<string>();
  const results: ConversationSummary[] = [];

  for (const item of items) {
    const id = sanitizePlainText(item.id ?? '');
    if (!id || seen.has(id)) {
      continue;
    }

    seen.add(id);
    results.push({
      id,
      site: 'chatgpt',
      title: sanitizePlainText(item.title ?? '') || `Conversation ${results.length + 1}`,
      url: new URL(`/c/${id}`, origin).toString(),
      updatedAt: toIsoTimestamp(item.update_time),
      isActive: activeConversationId === id
    });
  }

  return results;
}

async function fetchJson<T>(path: string, query?: Record<string, string | number>): Promise<T> {
  const url = new URL(path, globalThis.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    credentials: 'include',
    headers: {
      accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`ChatGPT API request failed with ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

export async function fetchConversationFromApi(conversationId: string): Promise<ChatConversation | null> {
  const data = await fetchJson<ChatGptApiConversationResponse>(`/backend-api/conversation/${conversationId}`);
  return parseConversationFromApi(data, globalThis.location.href);
}

export async function fetchConversationListFromApi(activeConversationId?: string | null): Promise<ConversationSummary[]> {
  const pageSize = 100;
  const maxPages = 50;
  const items: ChatGptApiConversationListItem[] = [];
  let expectedTotal: number | null = null;

  for (let page = 0; page < maxPages; page += 1) {
    const data = await fetchJson<ChatGptApiConversationListResponse | ChatGptApiConversationListItem[]>(
      '/backend-api/conversations',
      { offset: page * pageSize, limit: pageSize, order: 'updated' }
    );
    const pageItems = Array.isArray(data) ? data : data.items ?? data.conversations ?? [];
    const total = Array.isArray(data) ? null : data.total ?? data.total_count ?? null;
    if (typeof total === 'number' && Number.isFinite(total)) {
      expectedTotal = total;
    }

    if (pageItems.length === 0) {
      break;
    }

    items.push(...pageItems);
    if (expectedTotal !== null && items.length >= expectedTotal) {
      break;
    }

    if (pageItems.length < pageSize && expectedTotal === null) {
      break;
    }
  }

  return parseConversationListFromApi(items, globalThis.location.origin, activeConversationId);
}
