import type { ExportFormat, ExportArtifact, ChatConversation } from '../core/types';
import { exportConversationToMarkdown } from './markdown';
import { exportConversationToPdf } from './pdf';
import { exportConversationToDocx } from './docx';
import { exportConversationToZip } from './zip';
import { exportConversationBatch as exportConversationBatchImpl } from './batch';

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

  if (format === 'zip') {
    return exportConversationToZip(conversation);
  }

  throw new Error(`Unsupported export format: ${format}`);
}

export async function exportConversationBatch(conversations: ChatConversation[], format: ExportFormat): Promise<ExportArtifact> {
  return exportConversationBatchImpl(conversations, format);
}
