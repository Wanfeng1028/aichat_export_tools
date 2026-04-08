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

function buildParagraph(text: string, options?: { bold?: boolean }): string {
  const normalized = text.replace(/\r/g, '').split('\n');
  const runs = normalized.map((line) => {
    const safe = escapeXml(line || ' ');
    const boldTag = options?.bold ? '<w:b/>' : '';
    return `<w:r><w:rPr>${boldTag}<w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">${safe}</w:t></w:r>`;
  }).join('<w:r><w:br/></w:r>');

  return `<w:p>${runs}</w:p>`;
}

function buildDocumentXml(conversation: ChatConversation): string {
  const paragraphs: string[] = [];
  paragraphs.push(buildParagraph(conversation.title, { bold: true }));

  for (const line of buildConversationSummary(conversation)) {
    paragraphs.push(buildParagraph(line));
  }

  for (const section of buildConversationSections(conversation)) {
    paragraphs.push(buildParagraph(''));
    paragraphs.push(buildParagraph(section.heading, { bold: true }));
    paragraphs.push(buildParagraph(section.body));
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

export async function exportConversationToDocx(conversation: ChatConversation): Promise<ExportArtifact> {
  const zip = new JSZip();

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
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
  wordFolder?.folder('_rels')?.file('document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`);

  const content = await zip.generateAsync({ type: 'blob' });

  return {
    filename: await buildConversationFilenameFromSettings(conversation, 'docx'),
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    content
  };
}

