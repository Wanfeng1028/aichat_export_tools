import type { ExportArtifact } from '../core/types';

export async function downloadArtifact(artifact: ExportArtifact): Promise<void> {
  const url = URL.createObjectURL(artifact.content);

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
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}
