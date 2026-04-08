import type { ExportArtifact } from '../core/types';

export async function downloadArtifact(artifact: ExportArtifact): Promise<void> {
  const url = URL.createObjectURL(artifact.content);

  try {
    await chrome.downloads.download({
      url,
      filename: artifact.filename,
      saveAs: true
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}
