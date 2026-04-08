import { createChatGptAdapter } from '../adapters/chatgpt';
import { createLogger } from '../core/logger';

const logger = createLogger('content');

function getAdapter() {
  if (globalThis.location.hostname.includes('chatgpt.com')) {
    return createChatGptAdapter();
  }

  return null;
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  const adapter = getAdapter();

  if (!adapter) {
    sendResponse({
      site: 'chatgpt',
      supported: false,
      loggedIn: false,
      canExportCurrentConversation: false,
      message: 'This site is not supported by the current MVP.'
    });
    return false;
  }

  if (request.type === 'CONTENT_GET_STATUS') {
    void adapter.getStatus().then(sendResponse).catch((error: unknown) => {
      logger.error(error);
      sendResponse({
        site: adapter.site,
        supported: true,
        loggedIn: false,
        canExportCurrentConversation: false,
        message: error instanceof Error ? error.message : 'Failed to inspect the current page.'
      });
    });
    return true;
  }

  if (request.type === 'CONTENT_SCAN_CONVERSATIONS') {
    void adapter.scanConversationList().then(sendResponse).catch((error: unknown) => {
      logger.error(error);
      sendResponse(undefined);
    });
    return true;
  }

  if (request.type === 'CONTENT_EXPORT_CURRENT_CONVERSATION') {
    void adapter.exportCurrentConversation().then(sendResponse).catch((error: unknown) => {
      logger.error(error);
      sendResponse(undefined);
    });
    return true;
  }

  return false;
});

logger.info('Content script loaded.');
