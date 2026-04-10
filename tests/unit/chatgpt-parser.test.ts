/* @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseConversationFromApi, parseConversationListFromApi } from '../../src/adapters/chatgpt/api';
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
});
