/* @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createQianwenAdapter } from '../../src/adapters/qianwen';

describe('QianwenAdapter', () => {
  const originalUrl = window.location.href;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    window.history.replaceState({}, '', originalUrl);
    document.body.innerHTML = '';
  });

  it('does not emit the conversation container as the first message', async () => {
    window.history.replaceState({}, '', '/chat/abc123');
    document.body.innerHTML = `
      <main>
        <div class="message-list">
          <div class="message-item">User asks about the weather today in detail.</div>
          <div class="message-item">Assistant answers with the full weather forecast details here.</div>
        </div>
      </main>
    `;

    const adapter = createQianwenAdapter();
    const conversation = await adapter.exportCurrentConversation();

    expect(conversation.messages).toHaveLength(2);
    expect(conversation.messages[0].text).toBe('User asks about the weather today in detail.');
    expect(conversation.messages[0].role).toBe('user');
    expect(conversation.messages[1].role).toBe('assistant');
  });

  it('derives conversation ids and urls from sidebar anchors', async () => {
    window.history.replaceState({}, '', '/chat/current-id');
    document.body.innerHTML = `
      <div class="pe-sidebar">
        <div class="group relative cursor-pointer"><a href="/chat/conv-a">Weather chat</a></div>
        <div class="group relative cursor-pointer"><a href="/chat/conv-b">Code chat</a></div>
      </div>
    `;

    const adapter = createQianwenAdapter();
    const conversations = await adapter.scanConversationList();

    expect(conversations.map((item) => item.id)).toEqual(['conv-a', 'conv-b']);
    expect(conversations.map((item) => item.url)).toEqual([
      'http://localhost:3000/chat/conv-a',
      'http://localhost:3000/chat/conv-b'
    ]);
    expect(conversations.map((item) => item.isActive)).toEqual([false, false]);
  });
});
