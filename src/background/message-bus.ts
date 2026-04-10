import type {
  AdapterStatus,
  BatchExportResult,
  ChatConversation,
  ConversationSummary,
  ExportFormat,
  ExportHistoryRecord,
  ExportJobRecord
} from '../core/types';
import { addHistoryRecord, clearHistoryRecords, listHistoryRecords } from '../storage/history';
import { clearJobRecords, listJobRecords, updateJobStatus, upsertJobRecord } from '../storage/jobs';
import { exportConversation, exportConversationBatch } from '../exporters';
import { downloadArtifact } from './download';
import { hasSitePermissionForUrl, hasTabsPermission } from './permissions';

export type RuntimeRequest =
  | { type: 'GET_ACTIVE_SITE_STATUS'; sourceTabId?: number }
  | { type: 'SCAN_CONVERSATIONS'; sourceTabId: number }
  | { type: 'PREVIEW_CURRENT_CONVERSATION'; sourceTabId?: number }
  | { type: 'EXPORT_CURRENT_CONVERSATION'; format: ExportFormat; sourceTabId?: number }
  | { type: 'EXPORT_CONVERSATION_FROM_SUMMARY'; sourceTabId: number; format: ExportFormat; summary: ConversationSummary }
  | { type: 'EXPORT_SELECTED_CONVERSATIONS'; sourceTabId: number; format: ExportFormat; conversations: ConversationSummary[] }
  | { type: 'LIST_EXPORT_HISTORY' }
  | { type: 'LIST_EXPORT_JOBS' }
  | { type: 'CLEAR_EXPORT_DATA' }
  | { type: 'OPEN_DASHBOARD'; sourceTabId?: number }
  | { type: 'OPEN_DOWNLOAD_FILE'; downloadId: number }
  | { type: 'OPEN_DOWNLOAD_FOLDER'; downloadId: number };

export type RuntimeResponse =
  | { ok: true; status: AdapterStatus }
  | { ok: true; conversation: ChatConversation }
  | { ok: true; conversations: ConversationSummary[] }
  | { ok: true; history: ExportHistoryRecord[] }
  | { ok: true; jobs: ExportJobRecord[] }
  | { ok: true; batch: BatchExportResult }
  | { ok: true }
  | { ok: false; error: string };

type ContentErrorEnvelope = { __contentError: string };

function isContentErrorEnvelope(value: unknown): value is ContentErrorEnvelope {
  return Boolean(value) && typeof value === 'object' && '__contentError' in value && typeof (value as { __contentError?: unknown }).__contentError === 'string';
}

async function ensureTabsPermission(): Promise<void> {
  const granted = await hasTabsPermission();
  if (!granted) throw new Error('Please grant tabs permission before batch exporting.');
}

async function getActiveTabId(): Promise<number> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab found.');
  return tab.id;
}

async function resolveSourceTabId(sourceTabId?: number): Promise<number> {
  return sourceTabId ?? getActiveTabId();
}

async function ensureAccessToTab(tabId: number): Promise<void> {
  const tab = await chrome.tabs.get(tabId);
  const permission = await hasSitePermissionForUrl(tab.url);
  if (!permission.granted) throw new Error('Please grant this site permission before exporting or scanning.');
}

async function injectContentScript(tabId: number): Promise<void> {
  await chrome.scripting.executeScript({ target: { tabId }, files: ['src/content/index.js'] });
}

function unwrapContentResponse<T>(response: T | ContentErrorEnvelope | undefined): T {
  if (!response) throw new Error('The content script did not return a response.');
  if (isContentErrorEnvelope(response)) throw new Error(response.__contentError);
  return response;
}

async function sendMessageToTab<T>(tabId: number, message: unknown): Promise<T> {
  try {
    const response = (await chrome.tabs.sendMessage(tabId, message)) as T | ContentErrorEnvelope | undefined;
    return unwrapContentResponse<T>(response);
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    if (!messageText.includes('Receiving end does not exist') && !messageText.includes('Cannot access contents of the page')) throw error;
    await ensureAccessToTab(tabId);
    await injectContentScript(tabId);
    const retryResponse = (await chrome.tabs.sendMessage(tabId, message)) as T | ContentErrorEnvelope | undefined;
    return unwrapContentResponse<T>(retryResponse);
  }
}

export async function requestContentStatus(sourceTabId?: number): Promise<AdapterStatus> {
  const tabId = await resolveSourceTabId(sourceTabId);
  return sendMessageToTab<AdapterStatus>(tabId, { type: 'CONTENT_GET_STATUS' });
}

export async function requestConversationScan(sourceTabId: number): Promise<ConversationSummary[]> {
  await ensureAccessToTab(sourceTabId);
  return sendMessageToTab<ConversationSummary[]>(sourceTabId, { type: 'CONTENT_SCAN_CONVERSATIONS' });
}

export async function requestCurrentConversation(sourceTabId?: number): Promise<ChatConversation> {
  const tabId = await resolveSourceTabId(sourceTabId);
  await ensureAccessToTab(tabId);
  return sendMessageToTab<ChatConversation>(tabId, { type: 'CONTENT_EXPORT_CURRENT_CONVERSATION' });
}

function createJobRecord(seed: { id: string; site: ChatConversation['site']; title: string; exportedAt: string }, format: ExportFormat): ExportJobRecord {
  const now = new Date().toISOString();
  return { id: `${seed.id}-${format}-${seed.exportedAt}`, site: seed.site, conversationId: seed.id, title: seed.title, format, status: 'queued', createdAt: now, updatedAt: now };
}

function createBatchJobRecord(site: ChatConversation['site'], format: ExportFormat, conversationCount: number): ExportJobRecord {
  const now = new Date().toISOString();
  return {
    id: `batch-${format}-${now}`,
    site,
    conversationId: 'batch',
    title: `Batch export (${conversationCount} conversations)`,
    format: 'zip',
    status: 'queued',
    createdAt: now,
    updatedAt: now
  };
}

async function recordSuccess(
  conversation: ChatConversation,
  format: ExportFormat,
  filename: string,
  downloadMeta?: { downloadId: number; savedAs?: string }
): Promise<void> {
  await addHistoryRecord({
    id: `${conversation.id}-${format}-${conversation.exportedAt}`,
    site: conversation.site,
    conversationId: conversation.id,
    title: conversation.title,
    format,
    createdAt: conversation.exportedAt,
    filename,
    downloadId: downloadMeta?.downloadId,
    savedAs: downloadMeta?.savedAs
  });
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

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function exportConversationFromUrl(url: string): Promise<ChatConversation> {
  const tab = await chrome.tabs.create({ url, active: false });
  if (!tab.id) throw new Error(`Failed to create a temporary tab for ${url}.`);

  try {
    await waitForTabComplete(tab.id);

    let lastError: unknown = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        if (attempt > 0) {
          await delay(900);
        }
        return await requestCurrentConversation(tab.id);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error(`Failed to export ${url}.`);
  } finally {
    await chrome.tabs.remove(tab.id);
  }
}

async function saveConversationFlow(conversation: ChatConversation, format: ExportFormat, jobSeed?: { id: string; site: ChatConversation['site']; title: string }): Promise<ChatConversation> {
  const seed = jobSeed ?? { id: conversation.id, site: conversation.site, title: conversation.title };
  const job = createJobRecord({ ...seed, exportedAt: conversation.exportedAt }, format);
  await upsertJobRecord(job);
  await updateJobStatus(job.id, 'running');

  try {
    const artifact = await exportConversation(conversation, format);
    const download = await downloadArtifact(artifact);
    await recordSuccess(conversation, format, artifact.filename, download);
    await updateJobStatus(job.id, 'completed');
    return conversation;
  } catch (error) {
    await updateJobStatus(job.id, 'failed', error instanceof Error ? error.message : 'Unexpected export error');
    throw error;
  }
}

async function exportCurrentConversationFlow(format: ExportFormat, sourceTabId?: number): Promise<ChatConversation> {
  const conversation = await requestCurrentConversation(sourceTabId);
  return saveConversationFlow(conversation, format);
}

async function exportConversationSummaryFlow(format: ExportFormat, summary: ConversationSummary): Promise<ChatConversation> {
  await ensureTabsPermission();
  const conversation = await exportConversationFromUrl(summary.url);
  return saveConversationFlow(conversation, format, { id: summary.id, site: summary.site, title: summary.title });
}

async function exportSelectedConversationsFlow(sourceTabId: number, format: ExportFormat, conversations: ConversationSummary[]): Promise<BatchExportResult> {
  await ensureTabsPermission();
  await ensureAccessToTab(sourceTabId);
  const successful: ChatConversation[] = [];
  const successfulJobIds: string[] = [];
  let failedCount = 0;
  const sourceTab = await chrome.tabs.get(sourceTabId);
  const batchJob = createBatchJobRecord(conversations[0]?.site ?? 'chatgpt', format, conversations.length);
  await upsertJobRecord(batchJob);
  await updateJobStatus(batchJob.id, 'running');

  for (const summary of conversations) {
    const job = createJobRecord({ id: summary.id, site: summary.site, title: summary.title, exportedAt: new Date().toISOString() }, format);
    await upsertJobRecord(job);
    await updateJobStatus(job.id, 'running');
    try {
      const conversation = sourceTab.url && sourceTab.url.includes(summary.id)
        ? await requestCurrentConversation(sourceTabId)
        : await exportConversationFromUrl(summary.url);
      successful.push(conversation);
      successfulJobIds.push(job.id);
      await updateJobStatus(job.id, 'completed');
    } catch (error) {
      failedCount += 1;
      await updateJobStatus(job.id, 'failed', error instanceof Error ? error.message : 'Unexpected export error');
    }
  }

  if (successful.length === 0) {
    await updateJobStatus(batchJob.id, 'failed', 'All selected conversations failed to export.');
    throw new Error('All selected conversations failed to export.');
  }

  try {
    const artifact = await exportConversationBatch(successful, format);
    const download = await downloadArtifact(artifact);
    await addHistoryRecord({
      id: `batch-${format}-${Date.now()}`,
      site: successful[0].site,
      conversationId: 'batch',
      title: `Batch export (${successful.length} conversations)`,
      format: 'zip',
      createdAt: new Date().toISOString(),
      filename: artifact.filename,
      downloadId: download.downloadId,
      savedAs: download.savedAs
    });
    await updateJobStatus(batchJob.id, 'completed');
    return { archiveFilename: artifact.filename, exportedCount: successful.length, failedCount, savedAs: download.savedAs };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unexpected export error';
    await updateJobStatus(batchJob.id, 'failed', errorMessage);
    await Promise.all(successfulJobIds.map((jobId) => updateJobStatus(jobId, 'failed', `Archive download failed: ${errorMessage}`)));
    throw error;
  }
}

async function getDownloadItem(downloadId: number): Promise<chrome.downloads.DownloadItem> {
  const [item] = await chrome.downloads.search({ id: downloadId });
  if (!item) {
    throw new Error('浏览器已经找不到这条下载记录了。');
  }

  if (item.exists === false) {
    throw new Error('文件已经被移动、删除，或浏览器无法再定位它。');
  }

  return item;
}

async function openDownloadedFile(downloadId: number): Promise<void> {
  await getDownloadItem(downloadId);
  await chrome.downloads.open(downloadId);
}

async function openDownloadedFolder(downloadId: number): Promise<void> {
  await getDownloadItem(downloadId);
  await chrome.downloads.show(downloadId);
}

export async function handleRuntimeRequest(request: RuntimeRequest): Promise<RuntimeResponse> {
  try {
    if (request.type === 'GET_ACTIVE_SITE_STATUS') return { ok: true, status: await requestContentStatus(request.sourceTabId) };
    if (request.type === 'SCAN_CONVERSATIONS') return { ok: true, conversations: await requestConversationScan(request.sourceTabId) };
    if (request.type === 'PREVIEW_CURRENT_CONVERSATION') return { ok: true, conversation: await requestCurrentConversation(request.sourceTabId) };
    if (request.type === 'EXPORT_CURRENT_CONVERSATION') return { ok: true, conversation: await exportCurrentConversationFlow(request.format, request.sourceTabId) };
    if (request.type === 'EXPORT_CONVERSATION_FROM_SUMMARY') return { ok: true, conversation: await exportConversationSummaryFlow(request.format, request.summary) };
    if (request.type === 'EXPORT_SELECTED_CONVERSATIONS') return { ok: true, batch: await exportSelectedConversationsFlow(request.sourceTabId, request.format, request.conversations) };
    if (request.type === 'LIST_EXPORT_HISTORY') return { ok: true, history: await listHistoryRecords() };
    if (request.type === 'LIST_EXPORT_JOBS') return { ok: true, jobs: await listJobRecords() };
    if (request.type === 'CLEAR_EXPORT_DATA') {
      await clearHistoryRecords();
      await clearJobRecords();
      return { ok: true };
    }
    if (request.type === 'OPEN_DASHBOARD') {
      const sourceTabId = await resolveSourceTabId(request.sourceTabId);
      await chrome.tabs.create({ url: chrome.runtime.getURL(`src/ui/dashboard/index.html?sourceTabId=${sourceTabId}`) });
      return { ok: true };
    }
    if (request.type === 'OPEN_DOWNLOAD_FILE') {
      await openDownloadedFile(request.downloadId);
      return { ok: true };
    }
    if (request.type === 'OPEN_DOWNLOAD_FOLDER') {
      await openDownloadedFolder(request.downloadId);
      return { ok: true };
    }
    return { ok: false, error: 'Unsupported request.' };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unexpected runtime error.' };
  }
}
