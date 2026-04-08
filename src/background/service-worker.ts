import { handleRuntimeRequest } from './message-bus';

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  void handleRuntimeRequest(request).then(sendResponse);
  return true;
});

chrome.action.onClicked.addListener(async (tab) => {
  const query = tab.id ? `?sourceTabId=${tab.id}` : '';
  await chrome.windows.create({
    url: chrome.runtime.getURL(`src/ui/popup/index.html${query}`),
    type: 'popup',
    width: 520,
    height: 920,
    focused: true
  });
});
