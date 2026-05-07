let observer: MutationObserver | null = null;
let lastMutationAt = 0;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function observeConversationMutations(): void {
  if (observer || typeof MutationObserver === 'undefined') {
    return;
  }

  const root = document.body ?? document.documentElement;
  if (!root) {
    return;
  }

  lastMutationAt = Date.now();
  observer = new MutationObserver(() => {
    lastMutationAt = Date.now();
  });
  observer.observe(root, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

export async function waitForConversationMutationsToSettle(quietMs = 250, timeoutMs = 2500): Promise<void> {
  observeConversationMutations();

  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (Date.now() - lastMutationAt >= quietMs) {
      return;
    }

    await delay(Math.min(quietMs, 100));
  }
}
