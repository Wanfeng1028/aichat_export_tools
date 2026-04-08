export const chatGptSelectors = {
  main: 'main',
  title: 'h1',
  conversationTurns: '[data-message-author-role]',
  composer: 'textarea',
  sidebarLinks: 'nav a[href*="/c/"], aside a[href*="/c/"]'
} as const;
