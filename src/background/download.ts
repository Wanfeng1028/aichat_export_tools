import type { ExportArtifact } from '../core/types';

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

export async function downloadArtifact(artifact: ExportArtifact): Promise<void> {
  const { url, revoke } = await toDownloadUrl(artifact);

  try {
    const downloadId = await chrome.downloads.download({
      url,
      filename: artifact.filename,
      conflictAction: 'uniquify',
      saveAs: false
    });

    if (!downloadId) {
      throw new Error('The browser did not create a download task.');
    }
  } finally {
    revoke?.();
  }
}
