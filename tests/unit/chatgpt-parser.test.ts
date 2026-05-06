/* @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchConversationListFromApi, parseConversationFromApi, parseConversationListFromApi } from '../../src/adapters/chatgpt/api';
import { parseChatGptConversation, scanChatGptConversationList } from '../../src/adapters/chatgpt/parser';

function setDocumentMarkup(markup: string, title = 'ChatGPT') {
  document.body.innerHTML = markup;
  document.title = title;
}

describe('ChatGPT parser', () => {
  const originalPath = window.location.pathname;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    window.history.replaceState({}, '', originalPath || '/');
    document.body.innerHTML = '';
    document.title = 'ChatGPT';
    vi.restoreAllMocks();
  });

  it('extracts structured messages from the current conversation view', () => {
    window.history.replaceState({}, '', '/c/conv-123');
    setDocumentMarkup(`
      <main>
        <h1>Export test</h1>
        <article data-message-id="m1" data-message-author-role="user">
          <div data-testid="conversation-turn-content">hello</div>
        </article>
        <article data-message-id="m2" data-message-author-role="assistant">
          <div class="markdown"><p>hi there</p></div>
        </article>
      </main>
    `, 'Export test - ChatGPT');

    const conversation = parseChatGptConversation(document);

    expect(conversation.id).toBe('conv-123');
    expect(conversation.title).toBe('Export test');
    expect(conversation.messages).toHaveLength(2);
    expect(conversation.messages.map((message) => message.role)).toEqual(['user', 'assistant']);
    expect(conversation.messages.map((message) => message.text)).toEqual(['hello', 'hi there']);
  });

  it('extracts DOM attachments and keeps image-only messages', () => {
    window.history.replaceState({}, '', '/c/conv-attachments');
    setDocumentMarkup(`
      <main>
        <h1>Attachment export</h1>
        <article data-message-id="m1" data-message-author-role="user">
          <div data-testid="conversation-turn-content">
            <img src="/cdn/image.png" alt="diagram.png" />
            <a href="/backend-api/files/file-1" download="notes.pdf">notes.pdf</a>
          </div>
        </article>
      </main>
    `, 'Attachment export - ChatGPT');

    const conversation = parseChatGptConversation(document);

    expect(conversation.messages).toHaveLength(1);
    expect(conversation.messages[0].text).toBe('notes.pdf');
    expect(conversation.messages[0].attachments).toEqual([
      {
        name: 'diagram.png',
        type: 'image',
        url: 'http://localhost:3000/cdn/image.png'
      },
      {
        name: 'notes.pdf',
        type: 'application/pdf',
        url: 'http://localhost:3000/backend-api/files/file-1'
      }
    ]);
  });

  it('uses a system role for snapshot fallback messages', () => {
    window.history.replaceState({}, '', '/c/conv-snapshot');
    setDocumentMarkup(`
      <main>
        <h1>Snapshot fallback</h1>
        <div>Loose conversation text without structured turn markers.</div>
      </main>
    `, 'Snapshot fallback - ChatGPT');

    const conversation = parseChatGptConversation(document);

    expect(conversation.messages).toHaveLength(1);
    expect(conversation.messages[0].role).toBe('system');
    expect(conversation.messages[0].text).toContain('Loose conversation text');
  });

  it('splits snapshot fallback into multiple inferred messages when possible', () => {
    window.history.replaceState({}, '', '/c/conv-snapshot-blocks');
    setDocumentMarkup(`
      <main>
        <h1>Snapshot blocks</h1>
        <div>
          <div>First loose message.</div>
          <div>Second loose response.</div>
        </div>
      </main>
    `, 'Snapshot blocks - ChatGPT');

    const conversation = parseChatGptConversation(document);

    expect(conversation.messages).toHaveLength(2);
    expect(conversation.messages.map((message) => message.role)).toEqual(['user', 'assistant']);
    expect(conversation.messages.map((message) => message.text)).toEqual(['First loose message.', 'Second loose response.']);
  });

  it('uses role prefixes before alternating snapshot fallback roles', () => {
    window.history.replaceState({}, '', '/c/conv-snapshot-prefixes');
    setDocumentMarkup(`
      <main>
        <h1>Snapshot prefixes</h1>
        <div>
          <p>Assistant: First visible block is an answer.</p>
          <p>User: Follow-up question.</p>
        </div>
      </main>
    `, 'Snapshot prefixes - ChatGPT');

    const conversation = parseChatGptConversation(document);

    expect(conversation.messages.map((message) => message.role)).toEqual(['assistant', 'user']);
  });

  it('falls back to the current conversation when sidebar links are unavailable', () => {
    window.history.replaceState({}, '', '/c/conv-fallback');
    setDocumentMarkup(`
      <main>
        <h1>Fallback title</h1>
        <section>Loaded conversation</section>
      </main>
    `, 'Fallback title - ChatGPT');

    const conversations = scanChatGptConversationList(document);

    expect(conversations).toEqual([
      {
        id: 'conv-fallback',
        site: 'chatgpt',
        title: 'Fallback title',
        url: 'http://localhost:3000/c/conv-fallback',
        isActive: true
      }
    ]);
  });

  it('parses the current conversation from ChatGPT API data', () => {
    const conversation = parseConversationFromApi({
      id: 'conv-api',
      title: 'API export',
      current_node: 'assistant-1',
      mapping: {
        root: { id: 'root', children: ['user-1'] },
        'user-1': {
          id: 'user-1',
          parent: 'root',
          children: ['assistant-1'],
          message: {
            id: 'user-msg',
            author: { role: 'user' },
            create_time: 1710000000,
            content: { parts: ['Hello from API'] }
          }
        },
        'assistant-1': {
          id: 'assistant-1',
          parent: 'user-1',
          children: [],
          message: {
            id: 'assistant-msg',
            author: { role: 'assistant' },
            create_time: 1710000001,
            content: { parts: ['Reply from API'] },
            metadata: {
              attachments: [
                {
                  name: 'notes.txt',
                  mime_type: 'text/plain',
                  url: 'https://example.com/notes.txt',
                  size: 12
                }
              ]
            }
          }
        }
      }
    }, 'https://chatgpt.com/c/conv-api');

    expect(conversation).not.toBeNull();
    expect(conversation?.id).toBe('conv-api');
    expect(conversation?.messages.map((message) => message.role)).toEqual(['user', 'assistant']);
    expect(conversation?.messages.map((message) => message.text)).toEqual(['Hello from API', 'Reply from API']);
    expect(conversation?.messages[1].attachments).toEqual([
      {
        name: 'notes.txt',
        type: 'text/plain',
        url: 'https://example.com/notes.txt',
        size: 12
      }
    ]);
  });

  it('parses the conversation list from ChatGPT API data', () => {
    const conversations = parseConversationListFromApi([
      { id: 'conv-1', title: 'First', update_time: 1710000100 },
      { id: 'conv-2', title: 'Second', update_time: 1710000200 }
    ], 'https://chatgpt.com', 'conv-2');

    expect(conversations).toEqual([
      {
        id: 'conv-1',
        site: 'chatgpt',
        title: 'First',
        url: 'https://chatgpt.com/c/conv-1',
        updatedAt: new Date(1710000100 * 1000).toISOString(),
        isActive: false
      },
      {
        id: 'conv-2',
        site: 'chatgpt',
        title: 'Second',
        url: 'https://chatgpt.com/c/conv-2',
        updatedAt: new Date(1710000200 * 1000).toISOString(),
        isActive: true
      }
    ]);
  });

  it('fetches ChatGPT conversation list pages beyond the first 1000 items', async () => {
    const pageSize = 100;
    const total = 1005;
    const fetchMock = vi.fn(async (url: string | URL) => {
      const requestUrl = new URL(String(url));
      const offset = Number(requestUrl.searchParams.get('offset') ?? 0);
      const limit = Number(requestUrl.searchParams.get('limit') ?? pageSize);
      const count = Math.max(0, Math.min(limit, total - offset));
      const items = Array.from({ length: count }, (_item, index) => {
        const id = `conv-${offset + index + 1}`;
        return { id, title: `Conversation ${offset + index + 1}`, update_time: 1710000000 + offset + index };
      });

      return {
        ok: true,
        json: async () => ({ items, total })
      } as Response;
    });

    vi.stubGlobal('fetch', fetchMock);
    const conversations = await fetchConversationListFromApi('conv-1005');

    expect(conversations).toHaveLength(total);
    expect(conversations.at(-1)).toMatchObject({
      id: 'conv-1005',
      url: 'http://localhost:3000/c/conv-1005',
      isActive: true
    });
    expect(fetchMock).toHaveBeenCalledTimes(11);
  });
});
