import type { ConversationSummary, SupportedSite } from '../core/types';

export interface ScannedConversationCache {
  sourceTabId: number;
  site: SupportedSite;
  conversations: ConversationSummary[];
  updatedAt: string;
}

const SCANNED_CONVERSATIONS_KEY_PREFIX = 'scanned_conversations:';

function getStorageArea(): chrome.storage.LocalStorageArea | null {
  return globalThis.chrome?.storage?.local ?? null;
}

function getCacheKey(sourceTabId: number): string {
  return `${SCANNED_CONVERSATIONS_KEY_PREFIX}${sourceTabId}`;
}

export async function getScannedConversationCache(sourceTabId: number): Promise<ScannedConversationCache | null> {
  const storage = getStorageArea();
  if (!storage) return null;

  const key = getCacheKey(sourceTabId);
  const result = await storage.get(key);
  return (result[key] as ScannedConversationCache | undefined) ?? null;
}

export async function setScannedConversationCache(
  sourceTabId: number,
  site: SupportedSite,
  conversations: ConversationSummary[]
): Promise<ScannedConversationCache> {
  const storage = getStorageArea();
  const payload: ScannedConversationCache = {
    sourceTabId,
    site,
    conversations,
    updatedAt: new Date().toISOString()
  };

  if (!storage) return payload;

  await storage.set({ [getCacheKey(sourceTabId)]: payload });
  return payload;
}

export async function clearScannedConversationCache(sourceTabId: number): Promise<void> {
  const storage = getStorageArea();
  if (!storage) return;
  await storage.remove(getCacheKey(sourceTabId));
}

export function subscribeScannedConversationCache(
  sourceTabId: number,
  callback: (cache: ScannedConversationCache | null) => void
): () => void {
  if (!globalThis.chrome?.storage?.onChanged) {
    return () => undefined;
  }

  const key = getCacheKey(sourceTabId);
  const listener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
    if (areaName !== 'local' || !(key in changes)) return;
    callback((changes[key].newValue as ScannedConversationCache | undefined) ?? null);
  };

  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
