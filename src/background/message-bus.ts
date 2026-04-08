import type {
  AdapterStatus,
  BatchExportResult,
  ChatConversation,
  ConversationSummary,
  ExportFormat,
  ExportHistoryRecord,
  ExportJobRecord
} from '../core/types';
import { addHistoryRecord, listHistoryRecords } from '../storage/history';
import { listJobRecords, updateJobStatus, upsertJobRecord } from '../storage/jobs';
import { exportConversation, exportConversationBatch } from '../exporters';
import { downloadArtifact } from './download';

export type RuntimeRequest =
  | { type: 'GET_ACTIVE_SITE_STATUS'; sourceTabId?: number }
  | { type: 'SCAN_CONVERSATIONS'; sourceTabId: number }
  | { type: 'EXPORT_CURRENT_CONVERSATION'; format: ExportFormat; sourceTabId?: number }
  | { type: 'EXPORT_SELECTED_CONVERSATIONS'; sourceTabId: number; format: ExportFormat; conversations: ConversationSummary[] }
  | { type: 'LIST_EXPORT_HISTORY' }
  | { type: 'LIST_EXPORT_JOBS' }
  | { type: 'OPEN_DASHBOARD' };

export type RuntimeResponse =
  | { ok: true; status: AdapterStatus }
  | { ok: true; conversation: ChatConversation }
  | { ok: true; conversations: ConversationSummary[] }
  | { ok: true; history: ExportHistoryRecord[] }
  | { ok: true; jobs: ExportJobRecord[] }
  | { ok: true; batch: BatchExportResult }
  | { ok: true }
  | { ok: false; error: string };

async function ensureTabsPermission(): Promise<void> {
  const granted = await chrome.permissions.contains({ permissions: ['tabs'] });
  if (granted) return;

  const approved = await chrome.permissions.request({ permissions: ['tabs'] });
  if (!approved) {
    throw new Error('Batch export needs tabs permission to open conversations in background tabs.');
  }
}

async function getActiveTabId(): Promise<number> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab found.');
  return tab.id;
}

async function resolveSourceTabId(sourceTabId?: number): Promise<number> {
  return sourceTabId ?? getActiveTabId();
}

async function sendMessageToTab<T>(tabId: number, message: unknown): Promise<T> {
  const response = (await chrome.tabs.sendMessage(tabId, message)) as T | undefined;
  if (!response) throw new Error('The content script did not return a response.');
  return response;
}

export async function requestContentStatus(sourceTabId?: number): Promise<AdapterStatus> {
  const tabId = await resolveSourceTabId(sourceTabId);
  return sendMessageToTab<AdapterStatus>(tabId, { type: 'CONTENT_GET_STATUS' });
}

export async function requestConversationScan(sourceTabId: number): Promise<ConversationSummary[]> {
  return sendMessageToTab<ConversationSummary[]>(sourceTabId, { type: 'CONTENT_SCAN_CONVERSATIONS' });
}

export async function requestCurrentConversation(sourceTabId?: number): Promise<ChatConversation> {
  const tabId = await resolveSourceTabId(sourceTabId);
  return sendMessageToTab<ChatConversation>(tabId, { type: 'CONTENT_EXPORT_CURRENT_CONVERSATION' });
}

function createJobRecord(seed: { id: string; site: ChatConversation['site']; title: string; exportedAt: string }, format: ExportFormat): ExportJobRecord {
  const now = new Date().toISOString();
  return { id: `${seed.id}-${format}-${seed.exportedAt}`, site: seed.site, conversationId: seed.id, title: seed.title, format, status: 'queued', createdAt: now, updatedAt: now };
}

async function recordSuccess(conversation: ChatConversation, format: ExportFormat, filename: string): Promise<void> {
  await addHistoryRecord({ id: `${conversation.id}-${format}-${conversation.exportedAt}`, site: conversation.site, conversationId: conversation.id, title: conversation.title, format, createdAt: conversation.exportedAt, filename });
}

async function waitForTabComplete(tabId: number): Promise<void> {
  const existing = await chrome.tabs.get(tabId);
  if (existing.status === 'complete') return;

  await new Promise<void>((resolve) => {
    const listener = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function exportConversationFromUrl(url: string): Promise<ChatConversation> {
  const tab = await chrome.tabs.create({ url, active: false });
  if (!tab.id) throw new Error(`Failed to create a temporary tab for ${url}.`);

  try {
    await waitForTabComplete(tab.id);
    await new Promise((resolve) => setTimeout(resolve, 1200));

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        return await sendMessageToTab<ChatConversation>(tab.id, { type: 'CONTENT_EXPORT_CURRENT_CONVERSATION' });
      } catch (error) {
        if (attempt === 4) throw error;
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    }

    throw new Error(`Failed to export conversation at ${url}.`);
  } finally {
    await chrome.tabs.remove(tab.id);
  }
}

async function exportCurrentConversationFlow(format: ExportFormat, sourceTabId?: number): Promise<ChatConversation> {
  const conversation = await requestCurrentConversation(sourceTabId);
  const job = createJobRecord(conversation, format);
  await upsertJobRecord(job);
  await updateJobStatus(job.id, 'running');

  try {
    const artifact = await exportConversation(conversation, format);
    await downloadArtifact(artifact);
    await recordSuccess(conversation, format, artifact.filename);
    await updateJobStatus(job.id, 'completed');
    return conversation;
  } catch (error) {
    await updateJobStatus(job.id, 'failed', error instanceof Error ? error.message : 'Unexpected export error');
    throw error;
  }
}

async function exportSelectedConversationsFlow(sourceTabId: number, format: ExportFormat, conversations: ConversationSummary[]): Promise<BatchExportResult> {
  await ensureTabsPermission();
  const successful: ChatConversation[] = [];
  let failedCount = 0;
  const sourceTab = await chrome.tabs.get(sourceTabId);

  for (const summary of conversations) {
    const job = createJobRecord({ id: summary.id, site: summary.site, title: summary.title, exportedAt: new Date().toISOString() }, format);
    await upsertJobRecord(job);
    await updateJobStatus(job.id, 'running');

    try {
      const conversation = sourceTab.url && sourceTab.url.includes(summary.id) ? await requestCurrentConversation(sourceTabId) : await exportConversationFromUrl(summary.url);
      successful.push(conversation);
      await updateJobStatus(job.id, 'completed');
    } catch (error) {
      failedCount += 1;
      await updateJobStatus(job.id, 'failed', error instanceof Error ? error.message : 'Unexpected export error');
    }
  }

  if (successful.length === 0) throw new Error('All selected conversations failed to export.');

  const artifact = await exportConversationBatch(successful, format);
  await downloadArtifact(artifact);
  await addHistoryRecord({ id: `batch-${format}-${Date.now()}`, site: successful[0].site, conversationId: 'batch', title: `Batch export (${successful.length} conversations)`, format: 'zip', createdAt: new Date().toISOString(), filename: artifact.filename });
  return { archiveFilename: artifact.filename, exportedCount: successful.length, failedCount };
}

export async function handleRuntimeRequest(request: RuntimeRequest): Promise<RuntimeResponse> {
  try {
    if (request.type === 'GET_ACTIVE_SITE_STATUS') return { ok: true, status: await requestContentStatus(request.sourceTabId) };
    if (request.type === 'SCAN_CONVERSATIONS') return { ok: true, conversations: await requestConversationScan(request.sourceTabId) };
    if (request.type === 'EXPORT_CURRENT_CONVERSATION') return { ok: true, conversation: await exportCurrentConversationFlow(request.format, request.sourceTabId) };
    if (request.type === 'EXPORT_SELECTED_CONVERSATIONS') return { ok: true, batch: await exportSelectedConversationsFlow(request.sourceTabId, request.format, request.conversations) };
    if (request.type === 'LIST_EXPORT_HISTORY') return { ok: true, history: await listHistoryRecords() };
    if (request.type === 'LIST_EXPORT_JOBS') return { ok: true, jobs: await listJobRecords() };
    if (request.type === 'OPEN_DASHBOARD') {
      const sourceTabId = await getActiveTabId();
      await chrome.tabs.create({ url: chrome.runtime.getURL(`src/ui/dashboard/index.html?sourceTabId=${sourceTabId}`) });
      return { ok: true };
    }
    return { ok: false, error: 'Unsupported request.' };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unexpected runtime error.' };
  }
}
