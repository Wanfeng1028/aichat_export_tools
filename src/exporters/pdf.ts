import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import notoRegularUrl from '../../assets/fonts/NotoSansSC-Regular.otf';
import notoBoldUrl from '../../assets/fonts/NotoSansSC-Bold.otf';
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

export function splitForPdfWrap(text: string): string[] {
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
    for (const token of splitForPdfWrap(paragraph)) {
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

  // Priority order: NotoSansSC (better CJK coverage) → Deng (fallback) → Helvetica (last resort)
  const fontSources = [
    { regular: notoRegularUrl, bold: notoBoldUrl, label: 'NotoSansSC' },
    { regular: dengRegularUrl, bold: dengBoldUrl, label: 'Deng' }
  ];

  for (const { regular, bold, label } of fontSources) {
    try {
      const [regularFontBytes, boldFontBytes] = await Promise.all([
        loadFontBytes(regular),
        loadFontBytes(bold)
      ]);

      return {
        font: await pdf.embedFont(regularFontBytes, { subset: true }),
        boldFont: await pdf.embedFont(boldFontBytes, { subset: true })
      };
    } catch (error) {
      console.warn(`AI Chat Exporter failed to load ${label} font, trying next source. Error:`, error);
    }
  }

  // Last resort: standard Helvetica (no CJK support)
  console.warn('AI Chat Exporter could not load any bundled PDF fonts. Falling back to Helvetica; CJK text will not render correctly.');
  return {
    font: await pdf.embedFont(StandardFonts.Helvetica),
    boldFont: await pdf.embedFont(StandardFonts.HelveticaBold)
  };
}

export async function exportConversationToPdf(conversation: ChatConversation): Promise<ExportArtifact> {
  const pdf = await PDFDocument.create();
  const { font, boldFont } = await resolvePdfFonts(pdf);

  let page = pdf.addPage([595.28, 841.89]);
  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();
  const margin = 52;
  const lineHeight = 17;
  const maxTextWidth = pageWidth - margin * 2;
  let cursorY = pageHeight - margin;
  let pageNum = 1;

  const ensureSpace = (requiredHeight: number) => {
    if (cursorY - requiredHeight < margin) {
      page = pdf.addPage([595.28, 841.89]);
      cursorY = pageHeight - margin;
      pageNum += 1;
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

  // Page number footer
  const drawFooter = () => {
    page.drawText(`Page ${pageNum}`, {
      x: margin,
      y: 20,
      size: 9,
      font: font,
      color: rgb(0.5, 0.5, 0.5)
    });
  };

  const drawDivider = (yOffset: number, strokeColor = rgb(0.85, 0.85, 0.85)) => {
    page.drawRectangle({
      x: margin,
      y: cursorY - yOffset,
      width: pageWidth - margin * 2,
      height: 0.5,
      color: strokeColor
    });
  };

  drawWrapped(conversation.title, 22, true, rgb(0.1, 0.1, 0.15));
  cursorY -= 12;

  for (const line of buildConversationSummary(conversation)) {
    drawWrapped(line, 10, false, rgb(0.4, 0.45, 0.52));
  }

  drawDivider(0, rgb(0.85, 0.85, 0.85));
  cursorY -= 12;

  for (const section of buildConversationSections(conversation)) {
    ensureSpace(60);
    drawWrapped(section.heading, 14, true, rgb(0.15, 0.35, 0.65));
    drawWrapped(section.body, 11);
    cursorY -= 12;
    drawDivider(0, rgb(0.9, 0.9, 0.9));
    cursorY -= 10;
  }

  // Add page numbers to all pages
  drawFooter();

  const pdfBytes = await pdf.save();
  const pdfBuffer = new ArrayBuffer(pdfBytes.byteLength);
  new Uint8Array(pdfBuffer).set(pdfBytes);
  const content = new Blob([pdfBuffer], { type: 'application/pdf' });

  return {
    filename: await buildConversationFilenameFromSettings(conversation, 'pdf'),
    mimeType: 'application/pdf',
    content
  };
}
