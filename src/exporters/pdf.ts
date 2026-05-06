import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import dengRegularUrl from '../../assets/fonts/Deng-Regular.ttf';
import dengBoldUrl from '../../assets/fonts/Deng-Bold.ttf';
import type { ChatConversation, ExportArtifact } from '../core/types';
import { buildConversationFilenameFromSettings } from '../core/filename';
import { buildConversationSections, buildConversationSummary } from './shared';

async function loadFontBytes(url: string): Promise<Uint8Array> {
  const candidates = [
    typeof globalThis.chrome?.runtime?.getURL === 'function' ? globalThis.chrome.runtime.getURL(url.replace(/^\/+/, '')) : null,
    typeof globalThis.location?.href === 'string' ? new URL(url, globalThis.location.href).toString() : null,
    url
  ].filter((item): item is string => Boolean(item));

  let lastError: unknown = null;
  for (const candidate of Array.from(new Set(candidates))) {
    try {
      const response = await fetch(candidate);
      if (!response.ok) {
        throw new Error(`Failed to load PDF font asset: ${response.status}`);
      }

      return new Uint8Array(await response.arrayBuffer());
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Failed to load PDF font asset.');
}

function isCjkToken(token: string): boolean {
  return /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(token);
}

function splitForWrap(text: string): string[] {
  return text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]+[，。！？；：、,.!?;:]?|\p{P}+|[A-Za-z0-9_:/.@#%+\-=]+|\s+|./gu) ?? [];
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const normalized = text.replace(/\r/g, '');
  const lines: string[] = [];

  const pushWrappedToken = (token: string) => {
    let current = '';
    for (const char of Array.from(token)) {
      const candidate = `${current}${char}`;
      if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
        lines.push(current);
        current = char;
      } else {
        current = candidate;
      }
    }

    return current;
  };

  for (const paragraph of normalized.split('\n')) {
    if (!paragraph.trim()) {
      lines.push('');
      continue;
    }

    let current = '';
    for (const token of splitForWrap(paragraph)) {
      const candidate = `${current}${token}`;
      if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
        lines.push(current.trimEnd());
        current = isCjkToken(token) ? token : token.trimStart();
        if (font.widthOfTextAtSize(current, size) > maxWidth) {
          current = pushWrappedToken(current);
        }
        continue;
      }

      if (font.widthOfTextAtSize(candidate, size) > maxWidth) {
        current = pushWrappedToken(candidate);
      } else {
        current = candidate;
      }
    }

    if (current) {
      lines.push(current.trimEnd());
    }
  }

  return lines;
}

async function resolvePdfFonts(pdf: PDFDocument): Promise<{ font: PDFFont; boldFont: PDFFont }> {
  pdf.registerFontkit(fontkit);

  try {
    const [regularFontBytes, boldFontBytes] = await Promise.all([
      loadFontBytes(dengRegularUrl),
      loadFontBytes(dengBoldUrl)
    ]);

    return {
      font: await pdf.embedFont(regularFontBytes, { subset: false }),
      boldFont: await pdf.embedFont(boldFontBytes, { subset: false })
    };
  } catch (error) {
    console.warn('AI Chat Exporter could not load bundled PDF fonts. Falling back to Helvetica; CJK text may not render correctly.', error);
    return {
      font: await pdf.embedFont(StandardFonts.Helvetica),
      boldFont: await pdf.embedFont(StandardFonts.HelveticaBold)
    };
  }
}

export async function exportConversationToPdf(conversation: ChatConversation): Promise<ExportArtifact> {
  const pdf = await PDFDocument.create();
  const { font, boldFont } = await resolvePdfFonts(pdf);

  let page = pdf.addPage([595.28, 841.89]);
  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();
  const margin = 48;
  const lineHeight = 16;
  const maxTextWidth = pageWidth - margin * 2;
  let cursorY = pageHeight - margin;

  const ensureSpace = (requiredHeight: number) => {
    if (cursorY - requiredHeight < margin) {
      page = pdf.addPage([595.28, 841.89]);
      cursorY = pageHeight - margin;
    }
  };

  const drawWrapped = (text: string, size = 11, isBold = false, color = rgb(0.1, 0.15, 0.2)) => {
    const activeFont = isBold ? boldFont : font;
    const lines = wrapText(text, activeFont, size, maxTextWidth);

    for (const line of lines) {
      ensureSpace(lineHeight + 4);
      page.drawText(line || ' ', {
        x: margin,
        y: cursorY,
        size,
        font: activeFont,
        color
      });
      cursorY -= lineHeight;
    }
  };

  drawWrapped(conversation.title, 20, true);
  cursorY -= 8;

  for (const line of buildConversationSummary(conversation)) {
    drawWrapped(line, 10, false, rgb(0.35, 0.4, 0.47));
  }

  cursorY -= 8;

  for (const section of buildConversationSections(conversation)) {
    drawWrapped(section.heading, 13, true, rgb(0.9, 0.45, 0.13));
    drawWrapped(section.body, 11);
    cursorY -= 10;
  }

  const content = new Blob([await pdf.save()], { type: 'application/pdf' });

  return {
    filename: await buildConversationFilenameFromSettings(conversation, 'pdf'),
    mimeType: 'application/pdf',
    content
  };
}
