import { handleRuntimeRequest } from './message-bus';

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  void handleRuntimeRequest(request).then(sendResponse);
  return true;
});
