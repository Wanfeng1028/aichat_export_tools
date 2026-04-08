import JSZip from 'jszip';
import type { ChatConversation, ExportArtifact, ExportFormat } from '../core/types';
import { exportConversationToMarkdown } from './markdown';
import { exportConversationToPdf } from './pdf';
import { exportConversationToDocx } from './docx';
import { exportConversationToZip } from './zip';

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

function sanitizeFolderName(value: string): string {
  return value.replace(/[<>:"/\\|?*]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 60) || 'conversation';
}

export async function exportConversationBatch(conversations: ChatConversation[], format: ExportFormat): Promise<ExportArtifact> {
  const zip = new JSZip();

  for (const conversation of conversations) {
    const folder = zip.folder(`${sanitizeFolderName(conversation.title)}__${conversation.id}`) ?? zip;

    if (format === 'zip') {
      const bundle = await exportConversationToZip(conversation);
      folder.file(bundle.filename, await bundle.content.arrayBuffer());
      continue;
    }

    const artifact = await exportConversationByFormat(conversation, format);
    folder.file(artifact.filename, await artifact.content.arrayBuffer());
  }

  zip.file(
    'README.txt',
    [
      `AI Chat Exporter batch archive`,
      `Format: ${format}`,
      `Conversations: ${conversations.length}`,
      `Generated At: ${new Date().toISOString()}`
    ].join('\n')
  );

  const site = conversations[0]?.site ?? 'chat';
  const timestamp = new Date().toISOString().replace(/[:]/g, '-');
  const content = await zip.generateAsync({ type: 'blob' });

  return {
    filename: `${site}-batch-${format}-${timestamp}.zip`,
    mimeType: 'application/zip',
    content
  };
}
