import JSZip from 'jszip';
import type { ChatConversation, ExportArtifact, ExportFormat } from '../core/types';
import { exportConversationToMarkdown } from './markdown';
import { exportConversationToPdf } from './pdf';
import { exportConversationToDocx } from './docx';
import { exportConversationToZip } from './zip';
import { buildAttachmentManifest } from './shared';
import { sanitizeFilenameSegment } from '../core/filename';

export interface BatchExportArtifact extends ExportArtifact {
  exportedCount: number;
  failedCount: number;
}

async function exportConversationByFormat(conversation: ChatConversation, format: ExportFormat): Promise<ExportArtifact> {
  if (format === 'markdown') {
    return exportConversationToMarkdown(conversation);
  }

  if (format === 'pdf') {
    return exportConversationToPdf(conversation);
  }

  if (format === 'docx') {
    return exportConversationToDocx(conversation);
  }

  return exportConversationToZip(conversation);
}

function buildBatchFolderName(conversation: ChatConversation, usedNames: Set<string>): string {
  const base = `${sanitizeFilenameSegment(conversation.title, 'conversation')}__${sanitizeFilenameSegment(conversation.id, 'conversation')}`;
  let name = base;
  let suffix = 2;
  while (usedNames.has(name)) {
    name = `${base}-${suffix}`;
    suffix += 1;
  }
  usedNames.add(name);
  return name;
}

export async function exportConversationBatch(conversations: ChatConversation[], format: ExportFormat): Promise<BatchExportArtifact> {
  const zip = new JSZip();
  const usedFolderNames = new Set<string>();
  let exportedCount = 0;
  let failedCount = 0;

  for (const conversation of conversations) {
    const folder = zip.folder(buildBatchFolderName(conversation, usedFolderNames)) ?? zip;

    // 单个会话失败不拖垮整批：记录 error.txt 并继续，兜住 BatchExportResult.failedCount 的语义
    try {
      if (format === 'zip') {
        const bundle = await exportConversationToZip(conversation);
        folder.file(bundle.filename, await bundle.content.arrayBuffer());
      } else {
        const artifact = await exportConversationByFormat(conversation, format);
        folder.file(artifact.filename, await artifact.content.arrayBuffer());

        const attachments = buildAttachmentManifest(conversation);
        if (attachments.length > 0) {
          folder.file('attachments.json', JSON.stringify(attachments, null, 2));
        }
      }
      exportedCount += 1;
    } catch (error) {
      failedCount += 1;
      const message = error instanceof Error ? error.message : String(error);
      folder.file('error.txt', `Failed to export this conversation as ${format}: ${message}\n`);
    }
  }

  zip.file(
    'README.txt',
    [
      `AI Chat Exporter batch archive`,
      `Format: ${format}`,
      `Conversations: ${conversations.length}`,
      `Exported: ${exportedCount}`,
      `Failed: ${failedCount}`,
      `Generated At: ${new Date().toISOString()}`,
      `Attachment Note: per-conversation attachments.json files preserve metadata and source URLs only. Temporary blob:, data:, or authenticated URLs may not be usable after the source page session expires.`
    ].join('\n')
  );

  const site = conversations[0]?.site ?? 'chat';
  const timestamp = new Date().toISOString().replace(/[:]/g, '-');
  const content = await zip.generateAsync({ type: 'blob' });

  return {
    filename: `${site}-batch-${format}-${timestamp}.zip`,
    mimeType: 'application/zip',
    content,
    exportedCount,
    failedCount
  };
}
