import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { ChatConversation, ExportArtifact } from '../core/types';
import { buildConversationFilename } from '../core/filename';
import { buildConversationSections, buildConversationSummary } from './shared';

function wrapText(text: string, maxChars: number): string[] {
  const normalized = text.replace(/\r/g, '');
  const lines: string[] = [];

  for (const paragraph of normalized.split('\n')) {
    if (!paragraph.trim()) {
      lines.push('');
      continue;
    }

    let current = '';
    for (const word of paragraph.split(/\s+/)) {
      const candidate = current ? `${current} ${word}` : word;
      if (candidate.length > maxChars) {
        if (current) {
          lines.push(current);
        }
        current = word;
      } else {
        current = candidate;
      }
    }

    if (current) {
      lines.push(current);
    }
  }

  return lines;
}

export async function exportConversationToPdf(conversation: ChatConversation): Promise<ExportArtifact> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([595.28, 841.89]);
  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();
  const margin = 48;
  const lineHeight = 16;
  let cursorY = pageHeight - margin;

  const ensureSpace = (requiredHeight: number) => {
    if (cursorY - requiredHeight < margin) {
      page = pdf.addPage([595.28, 841.89]);
      cursorY = pageHeight - margin;
    }
  };

  const drawLine = (text: string, size = 11, isBold = false, color = rgb(0.1, 0.15, 0.2)) => {
    ensureSpace(lineHeight + 4);
    page.drawText(text, {
      x: margin,
      y: cursorY,
      size,
      font: isBold ? boldFont : font,
      color
    });
    cursorY -= lineHeight;
  };

  drawLine(conversation.title, 20, true);
  cursorY -= 8;

  for (const line of buildConversationSummary(conversation)) {
    drawLine(line, 10, false, rgb(0.35, 0.4, 0.47));
  }

  cursorY -= 8;

  for (const section of buildConversationSections(conversation)) {
    drawLine(section.heading, 13, true, rgb(0.9, 0.45, 0.13));
    for (const line of wrapText(section.body, 80)) {
      drawLine(line || ' ', 11);
    }
    cursorY -= 10;
  }

  const content = new Blob([await pdf.save()], { type: 'application/pdf' });

  return {
    filename: buildConversationFilename(conversation, 'pdf'),
    mimeType: 'application/pdf',
    content
  };
}
