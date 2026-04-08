export const chatGptSelectors = {
  main: 'main',
  title: 'h1',
  conversationTurns: [
    '[data-message-author-role]',
    'article[data-testid^="conversation-turn-"]',
    'article[data-testid*="conversation-turn"]',
    'div[data-testid^="conversation-turn-"]',
    'div[data-testid*="conversation-turn"]',
    '[data-testid*="conversation-turn"]',
    '[data-testid*="message"]',
    '[data-message-id]',
    'main article',
    'main [role="article"]',
    'main section article'
  ].join(', '),
  composer: 'textarea, div[contenteditable="true"]',
  sidebarLinks: 'nav a[href*="/c/"], aside a[href*="/c/"], a[href*="/c/"]'
} as const;
