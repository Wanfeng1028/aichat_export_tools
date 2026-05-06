/* @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createGenericSiteAdapter } from '../../src/adapters/generic';

function setDocumentUrl(url: string) {
  window.history.replaceState({}, '', url);
}

function setDocumentMarkup(markup: string, title = 'AI Chat') {
  document.body.innerHTML = markup;
  document.title = title;
}

describe('GenericDomAdapter', () => {
  const originalUrl = window.location.href;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    window.history.replaceState({}, '', originalUrl);
    document.body.innerHTML = '';
    document.title = 'AI Chat';
  });

  it('scans same-origin Claude conversation links and filters navigation links', async () => {
    setDocumentUrl('/chat/current');
    setDocumentMarkup(`
      <aside aria-label="Conversation history">
        <a href="/new">New chat</a>
        <a href="/settings">Settings</a>
        <a href="/chat/current">Current plan</a>
        <a href="/chat/next">Next research pass</a>
        <a href="https://example.com/chat/external">External</a>
      </aside>
    `);

    const adapter = createGenericSiteAdapter('claude');
    const conversations = await adapter?.scanConversationList();

    expect(conversations).toEqual([
      {
        id: 'current',
        site: 'claude',
        title: 'Current plan',
        url: 'http://localhost:3000/chat/current',
        isActive: true
      },
      {
        id: 'next',
        site: 'claude',
        title: 'Next research pass',
        url: 'http://localhost:3000/chat/next',
        isActive: false
      }
    ]);
  });

  it('dedupes repeated Gemini links by full path and preserves distinct conversations', async () => {
    setDocumentUrl('/app/abc');
    setDocumentMarkup(`
      <nav>
        <a href="/app/abc">Active Gemini chat</a>
        <a href="/app/abc">Active Gemini chat duplicate</a>
        <a href="/app/def">Second Gemini chat</a>
        <a href="/mystuff">My stuff</a>
        <a href="/gems">Gems</a>
      </nav>
    `);

    const adapter = createGenericSiteAdapter('gemini');
    const conversations = await adapter?.scanConversationList();

    expect(conversations?.map((item) => item.id)).toEqual(['abc', 'def']);
    expect(conversations?.map((item) => item.title)).toEqual(['Active Gemini chat', 'Second Gemini chat']);
    expect(conversations?.map((item) => item.isActive)).toEqual([true, false]);
  });
});
