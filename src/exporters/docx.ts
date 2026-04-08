import { Document, Packer, Paragraph, TextRun } from 'docx';
import type { ChatConversation, ExportArtifact } from '../core/types';
import { buildConversationFilename } from '../core/filename';
import { buildConversationSections, buildConversationSummary } from './shared';

export async function exportConversationToDocx(conversation: ChatConversation): Promise<ExportArtifact> {
  const children = [
    new Paragraph({
      children: [new TextRun({ text: conversation.title, bold: true, size: 34 })],
      spacing: { after: 240 }
    }),
    ...buildConversationSummary(conversation).map(
      (line) =>
        new Paragraph({
          children: [new TextRun({ text: line, size: 22 })],
          spacing: { after: 80 }
        })
    )
  ];

  for (const section of buildConversationSections(conversation)) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: section.heading, bold: true, size: 26 })],
        spacing: { before: 220, after: 80 }
      })
    );

    children.push(
      new Paragraph({
        children: [new TextRun({ text: section.body, size: 22 })],
        spacing: { after: 120 }
      })
    );
  }

  const document = new Document({
    sections: [{ properties: {}, children }]
  });

  const buffer = await Packer.toBuffer(document);
  const content = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });

  return {
    filename: buildConversationFilename(conversation, 'docx'),
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    content
  };
}
