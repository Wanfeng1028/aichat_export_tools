import type { ExportArtifact } from '../core/types';

export interface DownloadResult {
  downloadId: number;
  savedAs?: string;
}

const pendingFilenameSuggestions = new Map<string, string>();
let filenameListenerRegistered = false;

function ensureFilenameListener(): void {
  if (filenameListenerRegistered) {
    return;
  }

  chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
    const filename = pendingFilenameSuggestions.get(downloadItem.finalUrl) ?? pendingFilenameSuggestions.get(downloadItem.url);
    if (!filename) {
      suggest();
      return;
    }

    pendingFilenameSuggestions.delete(downloadItem.finalUrl);
    pendingFilenameSuggestions.delete(downloadItem.url);
    suggest({ filename, conflictAction: 'uniquify' });
  });

  filenameListenerRegistered = true;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function inferExtension(mimeType: string): string {
  const normalized = mimeType.toLowerCase();
  if (normalized.includes('markdown')) return 'md';
  if (normalized.includes('pdf')) return 'pdf';
  if (normalized.includes('wordprocessingml')) return 'docx';
  if (normalized.includes('zip')) return 'zip';
  if (normalized.includes('json')) return 'json';
  if (normalized.includes('html')) return 'html';
  if (normalized.includes('plain')) return 'txt';
  return 'bin';
}

function sanitizeFilenameSegment(value: string): string {
  return value
    .replace(/[<>:"/\\|?*]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeDownloadFilename(artifact: ExportArtifact): string {
  const desiredExtension = inferExtension(artifact.mimeType);
  const raw = sanitizeFilenameSegment(artifact.filename || '');
  const genericNames = new Set(['download', '下载', '未命名', 'file']);

  let base = raw;
  let extension = '';
  const lastDot = raw.lastIndexOf('.');
  if (lastDot > 0 && lastDot < raw.length - 1) {
    base = raw.slice(0, lastDot);
    extension = raw.slice(lastDot + 1).toLowerCase();
  }

  const normalizedBase = sanitizeFilenameSegment(base).replace(/[.]+$/g, '') || 'chat-export';
  const safeBase = genericNames.has(normalizedBase.toLowerCase()) ? `chat-export-${Date.now()}` : normalizedBase;
  const safeExtension = extension && extension !== '下载' ? extension : desiredExtension;

  return `${safeBase}.${safeExtension}`;
}

async function toDataUrl(artifact: ExportArtifact): Promise<string> {
  const buffer = await artifact.content.arrayBuffer();
  const base64 = arrayBufferToBase64(buffer);
  return `data:${artifact.mimeType};base64,${base64}`;
}

async function toDownloadUrl(artifact: ExportArtifact): Promise<{ url: string; revoke?: () => void }> {
  if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    const objectUrl = URL.createObjectURL(artifact.content);
    return {
      url: objectUrl,
      revoke: () => URL.revokeObjectURL(objectUrl)
    };
  }

  return { url: await toDataUrl(artifact) };
}

async function resolveSavedFilename(downloadId: number): Promise<string | undefined> {
  const [item] = await chrome.downloads.search({ id: downloadId });
  return item?.filename;
}

export async function downloadArtifact(artifact: ExportArtifact): Promise<DownloadResult> {
  ensureFilenameListener();
  const finalFilename = normalizeDownloadFilename(artifact);
  const { url, revoke } = await toDownloadUrl(artifact);
  pendingFilenameSuggestions.set(url, finalFilename);

  try {
    const downloadId = await chrome.downloads.download({
      url,
      filename: finalFilename,
      conflictAction: 'uniquify',
      saveAs: false
    });

    if (!downloadId) {
      throw new Error('The browser did not create a download task.');
    }

    return {
      downloadId,
      savedAs: await resolveSavedFilename(downloadId)
    };
  } finally {
    pendingFilenameSuggestions.delete(url);
    revoke?.();
  }
}
