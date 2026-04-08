import type { ChatConversation } from '../core/types';
import JSZip from 'jszip';
import { buildConversationFilenameFromSettings } from '../core/filename';
import { exportConversationToMarkdown } from './markdown';
import { exportConversationToPdf } from './pdf';
import { exportConversationToDocx } from './docx';

export async function exportConversationToZip(conversation: ChatConversation) {
  const zip = new JSZip();
  const markdown = await exportConversationToMarkdown(conversation);
  const pdf = await exportConversationToPdf(conversation);
  const docx = await exportConversationToDocx(conversation);

  zip.file(markdown.filename, await markdown.content.arrayBuffer());
  zip.file(pdf.filename, await pdf.content.arrayBuffer());
  zip.file(docx.filename, await docx.content.arrayBuffer());

  const summary = [
    `Title: ${conversation.title}`,
    `Site: ${conversation.site}`,
    `URL: ${conversation.url}`,
    `Exported At: ${conversation.exportedAt}`,
    `Bundle Contents: ${markdown.filename}, ${pdf.filename}, ${docx.filename}`
  ].join('\n');

  zip.file('README.txt', summary);

  const content = await zip.generateAsync({ type: 'blob' });

  return {
    filename: await buildConversationFilenameFromSettings(conversation, 'zip'),
    mimeType: 'application/zip',
    content
  };
}

