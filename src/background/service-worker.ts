import { handleRuntimeRequest } from './message-bus';

async function injectContentScript(tabId: number): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['src/content/index.js']
  });
}

async function toggleFloatingPanel(tabId: number): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_FLOATING_PANEL', sourceTabId: tabId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('Receiving end does not exist') && !message.includes('Cannot access contents of the page')) {
      throw error;
    }
    await injectContentScript(tabId);
    await chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_FLOATING_PANEL', sourceTabId: tabId });
  }
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  void handleRuntimeRequest(request).then(sendResponse);
  return true;
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) {
    return;
  }

  await toggleFloatingPanel(tab.id);
});
