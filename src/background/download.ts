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

async function toDownloadUrl(artifact: ExportArtifact): Promise<string> {
  const buffer = await artifact.content.arrayBuffer();
  const base64 = arrayBufferToBase64(buffer);
  return `data:${artifact.mimeType};base64,${base64}`;
}

export async function downloadArtifact(artifact: ExportArtifact): Promise<void> {
  const url = await toDownloadUrl(artifact);
  const downloadId = await chrome.downloads.download({
    url,
    filename: artifact.filename,
    conflictAction: 'uniquify',
    saveAs: false
  });

  if (!downloadId) {
    throw new Error('The browser did not create a download task.');
  }
}
