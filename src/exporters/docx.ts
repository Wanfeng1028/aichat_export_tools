import JSZip from 'jszip';
import type { ChatConversation, ExportArtifact } from '../core/types';
import { buildConversationFilenameFromSettings } from '../core/filename';
import { buildConversationSections, buildConversationSummary } from './shared';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeXmlForText(value: string): string {
  // For text content, also handle newlines as XML-compatible
  return escapeXml(value).replace(/\n/g, '&#xA;');
}

function buildParagraph(text: string, options?: { bold?: boolean; size?: number; font?: string }): string {
  const normalized = text.replace(/\r/g, '').split('\n');
  const runs = normalized.map((line) => {
    const safe = escapeXmlForText(line || ' ');
    const boldTag = options?.bold ? '<w:b w:val="true"/>' : '';
    const sz = options?.size ?? 22;
    const font = options?.font ?? 'w:ascii="Noto Sans SC" w:hAnsi="Noto Sans SC" w:cs="Noto Sans SC"';
    return `<w:r><w:rPr><w:rFonts ${font}/><w:sz w:val="${sz}"/>${boldTag}</w:rPr><w:t xml:space="preserve">${safe}</w:t></w:r>`;
  }).join('<w:r><w:br/></w:r>');

  return `<w:p>${runs}</w:p>`;
}

function buildStyledParagraph(text: string, options?: { bold?: boolean; size?: number; color?: string }): string {
  const normalized = text.replace(/\r/g, '').split('\n');
  const runs = normalized.map((line) => {
    const safe = escapeXmlForText(line || ' ');
    const boldTag = options?.bold ? '<w:b w:val="true"/>' : '';
    const colorTag = options?.color ? `<w:color w:val="${options.color}"/>` : '';
    const sz = options?.size ?? 22;
    return `<w:r><w:rPr><w:rFonts w:ascii="Noto Sans SC" w:hAnsi="Noto Sans SC" w:cs="Noto Sans SC"/><w:sz w:val="${sz}"/>${boldTag}${colorTag}</w:rPr><w:t xml:space="preserve">${safe}</w:t></w:r>`;
  }).join('<w:r><w:br/></w:r>');

  return `<w:p>${runs}</w:p>`;
}

function buildDocumentXml(conversation: ChatConversation): string {
  const paragraphs: string[] = [];

  // Title (bold, larger)
  paragraphs.push(buildStyledParagraph(conversation.title, { bold: true, size: 28, color: '1A1A2E' }));

  // Summary metadata
  for (const line of buildConversationSummary(conversation)) {
    paragraphs.push(buildStyledParagraph(line, { size: 18, color: '5A5A6E' }));
  }

  // Section separator
  paragraphs.push('<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="D0D5DD"/></w:pBdr></w:pPr></w:p>');

  // Conversation sections
  for (const section of buildConversationSections(conversation)) {
    paragraphs.push('<w:p><w:pPr><w:spacing w:after="240" w:before="240"/></w:pPr></w:p>');
    paragraphs.push(buildStyledParagraph(section.heading, { bold: true, size: 22, color: '1A5276' }));
    paragraphs.push(buildStyledParagraph(section.body, { size: 18, color: '101828' }));
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 wp14">
  <w:body>
    ${paragraphs.join('\n    ')}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

function buildStylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Noto Sans SC" w:hAnsi="Noto Sans SC" w:cs="Noto Sans SC"/>
        <w:sz w:val="20"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault/>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:rPr>
      <w:sz w:val="20"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:pPr>
      <w:spacing w:after="240" w:before="360"/>
    </w:pPr>
    <w:rPr>
      <w:b w:val="true"/>
      <w:sz w:val="28"/>
      <w:color w:val="1A1A2E"/>
    </w:rPr>
  </w:style>
</w:styles>`;
}

export async function exportConversationToDocx(conversation: ChatConversation): Promise<ExportArtifact> {
  const zip = new JSZip();

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`);

  zip.folder('_rels')?.file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`);

  zip.folder('docProps')?.file('core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${escapeXml(conversation.title)}</dc:title>
  <dc:creator>AI Chat Exporter</dc:creator>
  <cp:lastModifiedBy>AI Chat Exporter</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${conversation.exportedAt}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${conversation.exportedAt}</dcterms:modified>
</cp:coreProperties>`);

  zip.folder('docProps')?.file('app.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>AI Chat Exporter</Application>
</Properties>`);

  const wordFolder = zip.folder('word');
  wordFolder?.file('document.xml', buildDocumentXml(conversation));
  wordFolder?.file('styles.xml', buildStylesXml());
  wordFolder?.folder('_rels')?.file('document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`);

  const content = await zip.generateAsync({ type: 'blob' });

  return {
    filename: await buildConversationFilenameFromSettings(conversation, 'docx'),
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    content
  };
}
