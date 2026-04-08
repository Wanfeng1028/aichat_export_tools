export const chatGptSelectors = {
  main: 'main, [role="main"], #thread, [data-testid="conversation-view"]',
  title: 'h1, header h1, [data-testid="conversation-title"]',
  conversationTurns: [
    '[data-message-author-role]',
    'article[data-testid^="conversation-turn-"]',
    'article[data-testid*="conversation-turn"]',
    'div[data-testid^="conversation-turn-"]',
    'div[data-testid*="conversation-turn"]',
    'section[data-testid*="conversation-turn"]',
    '[data-testid="user-message"]',
    '[data-testid="assistant-message"]',
    '[data-testid*="conversation-turn"]',
    '[data-testid*="turn-content"]',
    '[data-testid*="message"]',
    'article[data-message-id]',
    'div[data-message-id]',
    'section[data-message-id]',
    '[data-message-id]',
    'main article',
    'main [role="article"]',
    'main section article',
    '[role="main"] article',
    '[role="main"] [role="article"]'
  ].join(', '),
  composer: 'textarea, div[contenteditable="true"]',
  sidebarLinks: [
    'nav a[href*="/c/"]',
    'aside a[href*="/c/"]',
    'a[href*="/c/"]',
    'nav a[href^="/g/"]',
    'aside a[href^="/g/"]',
    'a[href^="/g/"]'
  ].join(', ')
} as const;
