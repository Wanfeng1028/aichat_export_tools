export const chatGptSelectors = {
  main: 'main',
  title: 'h1',
  conversationTurns: [
    '[data-message-author-role]',
    'article[data-testid^="conversation-turn-"]',
    'main article',
    'div[data-testid^="conversation-turn-"]'
  ].join(', '),
  composer: 'textarea, div[contenteditable="true"]',
  sidebarLinks: 'nav a[href*="/c/"], aside a[href*="/c/"], a[href*="/c/"]'
} as const;
