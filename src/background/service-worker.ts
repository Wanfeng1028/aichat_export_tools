import { handleRuntimeRequest } from './message-bus';
import { detectSupportedSiteFromUrl } from './permissions';

function getPopupUrl(sourceTabId: number): string {
  const url = new URL(chrome.runtime.getURL('src/ui/popup/index.html'));
  url.searchParams.set('sourceTabId', String(sourceTabId));
  return url.toString();
}

async function openStandalonePopup(tabId: number): Promise<void> {
  const url = getPopupUrl(tabId);

  try {
    await chrome.windows.create({
      url,
      type: 'popup',
      width: 540,
      height: 920,
      focused: true
    });
  } catch {
    await chrome.tabs.create({ url });
  }
}

async function injectContentScript(tabId: number): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['src/content/index.js']
  });
}

async function toggleFloatingPanel(tab: chrome.tabs.Tab): Promise<void> {
  if (!tab.id) {
    return;
  }

  const site = detectSupportedSiteFromUrl(tab.url);
  if (!site) {
    return;
  }

  if (site !== 'chatgpt') {
    await openStandalonePopup(tab.id);
    return;
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_FLOATING_PANEL', sourceTabId: tab.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes('Receiving end does not exist') && !message.includes('Cannot access contents of the page')) {
      throw error;
    }
    await injectContentScript(tab.id);
    await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_FLOATING_PANEL', sourceTabId: tab.id });
  }
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  void handleRuntimeRequest(request).then(sendResponse);
  return true;
});

chrome.action.onClicked.addListener(async (tab) => {
  try {
    await toggleFloatingPanel(tab);
  } catch (error) {
    console.error('Failed to toggle floating panel', error);
  }
});
