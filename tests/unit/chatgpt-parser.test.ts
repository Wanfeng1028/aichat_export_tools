/* @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseChatGptConversation, scanChatGptConversationList } from '../../src/adapters/chatgpt/parser';

function setDocumentMarkup(markup: string, title = 'ChatGPT') {
  document.body.innerHTML = markup;
  document.title = title;
}

describe('ChatGPT parser', () => {
  const originalPath = window.location.pathname + window.location.search + window.location.hash;

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
});
