import type { ExportFormat, ExportArtifact, ChatConversation } from '../core/types';

export async function exportConversation(conversation: ChatConversation, format: ExportFormat): Promise<ExportArtifact> {
  if (format === 'markdown') {
    const module = await import('./markdown');
    return module.exportConversationToMarkdown(conversation);
  }

  if (format === 'pdf') {
    const module = await import('./pdf');
    return module.exportConversationToPdf(conversation);
  }

  if (format === 'docx') {
    const module = await import('./docx');
    return module.exportConversationToDocx(conversation);
  }

  if (format === 'zip') {
    const module = await import('./zip');
    return module.exportConversationToZip(conversation);
  }

  throw new Error(`Unsupported export format: ${format}`);
}

export async function exportConversationBatch(conversations: ChatConversation[], format: ExportFormat): Promise<ExportArtifact> {
  const module = await import('./batch');
  return module.exportConversationBatch(conversations, format);
}
