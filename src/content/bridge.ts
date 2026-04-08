(function injectBridge() {
  if (document.getElementById('ai-chat-exporter-bridge')) {
    return;
  }

  const script = document.createElement('script');
  script.id = 'ai-chat-exporter-bridge';
  script.src = chrome.runtime.getURL('src/content/bridge.js');
  script.async = false;
  document.documentElement.appendChild(script);
  script.remove();
})();
