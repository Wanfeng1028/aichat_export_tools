import type { AdapterStatus, ChatConversation, ExportFormat, ExportHistoryRecord, ExportJobRecord } from '../core/types';
import { addHistoryRecord, listHistoryRecords } from '../storage/history';
import { listJobRecords, updateJobStatus, upsertJobRecord } from '../storage/jobs';
import { exportConversation } from '../exporters';
import { downloadArtifact } from './download';

export type RuntimeRequest =
  | { type: 'GET_ACTIVE_SITE_STATUS' }
  | { type: 'EXPORT_CURRENT_CONVERSATION'; format: ExportFormat }
  | { type: 'LIST_EXPORT_HISTORY' }
  | { type: 'LIST_EXPORT_JOBS' }
  | { type: 'OPEN_DASHBOARD' };

export type RuntimeResponse =
  | { ok: true; status: AdapterStatus }
  | { ok: true; conversation: ChatConversation }
  | { ok: true; history: ExportHistoryRecord[] }
  | { ok: true; jobs: ExportJobRecord[] }
  | { ok: true }
  | { ok: false; error: string };

async function getActiveTabId(): Promise<number> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error('No active tab found.');
  }

  return tab.id;
}

export async function requestContentStatus(): Promise<AdapterStatus> {
  const tabId = await getActiveTabId();
  const response = (await chrome.tabs.sendMessage(tabId, { type: 'CONTENT_GET_STATUS' })) as AdapterStatus | undefined;

  if (!response) {
    throw new Error('The content script did not return a status response.');
  }

  return response;
}

export async function requestCurrentConversation(): Promise<ChatConversation> {
  const tabId = await getActiveTabId();
  const response = (await chrome.tabs.sendMessage(tabId, { type: 'CONTENT_EXPORT_CURRENT_CONVERSATION' })) as ChatConversation | undefined;

  if (!response) {
    throw new Error('The content script did not return a conversation payload.');
  }

  return response;
}

function createJobRecord(conversation: ChatConversation, format: ExportFormat): ExportJobRecord {
  const now = new Date().toISOString();

  return {
    id: `${conversation.id}-${format}-${conversation.exportedAt}`,
    site: conversation.site,
    conversationId: conversation.id,
    title: conversation.title,
    format,
    status: 'queued',
    createdAt: now,
    updatedAt: now
  };
}

export async function handleRuntimeRequest(request: RuntimeRequest): Promise<RuntimeResponse> {
  try {
    if (request.type === 'GET_ACTIVE_SITE_STATUS') {
      const status = await requestContentStatus();
      return { ok: true, status };
    }

    if (request.type === 'EXPORT_CURRENT_CONVERSATION') {
      const conversation = await requestCurrentConversation();
      const job = createJobRecord(conversation, request.format);
      await upsertJobRecord(job);
      await updateJobStatus(job.id, 'running');

      try {
        const artifact = await exportConversation(conversation, request.format);
        await downloadArtifact(artifact);
        await addHistoryRecord({
          id: `${conversation.id}-${request.format}-${conversation.exportedAt}`,
          site: conversation.site,
          conversationId: conversation.id,
          title: conversation.title,
          format: request.format,
          createdAt: conversation.exportedAt,
          filename: artifact.filename
        });
        await updateJobStatus(job.id, 'completed');
      } catch (error) {
        await updateJobStatus(job.id, 'failed', error instanceof Error ? error.message : 'Unexpected export error');
        throw error;
      }

      return { ok: true, conversation };
    }

    if (request.type === 'LIST_EXPORT_HISTORY') {
      const history = await listHistoryRecords();
      return { ok: true, history };
    }

    if (request.type === 'LIST_EXPORT_JOBS') {
      const jobs = await listJobRecords();
      return { ok: true, jobs };
    }

    if (request.type === 'OPEN_DASHBOARD') {
      await chrome.tabs.create({ url: chrome.runtime.getURL('src/ui/dashboard/index.html') });
      return { ok: true };
    }

    return { ok: false, error: 'Unsupported request.' };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unexpected runtime error.'
    };
  }
}
