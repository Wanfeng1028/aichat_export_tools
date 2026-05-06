import type { ChatConversation } from '../core/types';
import JSZip from 'jszip';
import { buildConversationFilenameFromSettings } from '../core/filename';
import { exportConversationToMarkdown } from './markdown';
import { exportConversationToPdf } from './pdf';
import { exportConversationToDocx } from './docx';
import { buildAttachmentManifest } from './shared';

export async function exportConversationToZip(conversation: ChatConversation) {
  const zip = new JSZip();
  const markdown = await exportConversationToMarkdown(conversation);
  const pdf = await exportConversationToPdf(conversation);
  const docx = await exportConversationToDocx(conversation);

  zip.file(markdown.filename, await markdown.content.arrayBuffer());
  zip.file(pdf.filename, await pdf.content.arrayBuffer());
  zip.file(docx.filename, await docx.content.arrayBuffer());

  const attachments = buildAttachmentManifest(conversation);
  if (attachments.length > 0) {
    zip.file('attachments.json', JSON.stringify(attachments, null, 2));
  }

  const summary = [
    `Title: ${conversation.title}`,
    `Site: ${conversation.site}`,
    `URL: ${conversation.url}`,
    `Exported At: ${conversation.exportedAt}`,
    `Bundle Contents: ${markdown.filename}, ${pdf.filename}, ${docx.filename}${attachments.length > 0 ? ', attachments.json' : ''}`,
    attachments.length > 0
      ? 'Attachment Note: attachments.json preserves attachment metadata and source URLs only. Temporary blob:, data:, or authenticated URLs may not be usable after the source page session expires.'
      : 'Attachment Note: no attachments were detected.'
  ].join('\n');

  zip.file('README.txt', summary);

  const content = await zip.generateAsync({ type: 'blob' });

  return {
    filename: await buildConversationFilenameFromSettings(conversation, 'zip'),
    mimeType: 'application/zip',
    content
  };
}

