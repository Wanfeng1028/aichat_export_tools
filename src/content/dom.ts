/**
 * Wait for the conversation DOM to be ready.
 * Checks that the page has loaded and the main content area exists.
 */
export function waitForConversationDom(timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    // If already loaded, resolve immediately
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      resolve();
      return;
    }

    const onReady = () => {
      cleanup();
      resolve();
    };

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('waitForConversationDom: timeout waiting for DOM'));
    }, timeoutMs);

    const cleanup = () => {
      document.removeEventListener('DOMContentLoaded', onReady);
      window.removeEventListener('load', onReady);
      clearTimeout(timeout);
    };

    document.addEventListener('DOMContentLoaded', onReady);
    window.addEventListener('load', onReady);
  });
}
