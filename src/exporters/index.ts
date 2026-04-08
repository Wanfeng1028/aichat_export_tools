import type { ExportFormat, ExportArtifact, ChatConversation } from '../core/types';
import { exportConversationToMarkdown } from './markdown';
import { exportConversationToPdf } from './pdf';
import { exportConversationToDocx } from './docx';

export async function exportConversation(conversation: ChatConversation, format: ExportFormat): Promise<ExportArtifact> {
  if (format === 'markdown') {
    return exportConversationToMarkdown(conversation);
  }

  if (format === 'pdf') {
    return exportConversationToPdf(conversation);
  }

  if (format === 'docx') {
    return exportConversationToDocx(conversation);
  }

  throw new Error(`Unsupported export format: ${format}`);
}
