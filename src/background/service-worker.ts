import { handleRuntimeRequest } from './message-bus';
import { detectSupportedSiteFromUrl, hasSitePermissionForUrl, requestSitePermission } from './permissions';

async function injectContentScript(tabId: number): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['src/content/index.js']
  });
}

async function ensureSitePermissionForTab(tab: chrome.tabs.Tab): Promise<void> {
  const site = detectSupportedSiteFromUrl(tab.url);
  if (!site) {
    return;
  }

  const permission = await hasSitePermissionForUrl(tab.url);
  if (permission.granted) {
    return;
  }

  const granted = await requestSitePermission(site);
  if (!granted) {
    throw new Error(`Permission for ${site} was not granted.`);
  }
}

async function toggleFloatingPanel(tab: chrome.tabs.Tab): Promise<void> {
  if (!tab.id) {
    return;
  }

  await ensureSitePermissionForTab(tab);

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
