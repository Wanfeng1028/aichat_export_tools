import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import JSZip from 'jszip';
import { exportConversationBatch } from '../../src/exporters/batch';
import { exportConversationToDocx } from '../../src/exporters/docx';
import { buildConversationHtml } from '../../src/exporters/html-template';
import { exportConversationToMarkdown } from '../../src/exporters/markdown';
import { sanitizeTextForStandardFont, splitForPdfWrap } from '../../src/exporters/pdf';
import { exportConversationToZip } from '../../src/exporters/zip';
import { buildConversationSections } from '../../src/exporters/shared';
import type { ChatConversation } from '../../src/core/types';

// 让指定标题的会话在 PDF 导出时失败，用于验证批量导出的部分失败容错
vi.mock('../../src/exporters/pdf', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/exporters/pdf')>();
  return {
    ...actual,
    exportConversationToPdf: vi.fn(async (conversation: ChatConversation) => {
      if (conversation.title === 'Batch failure trigger') {
        throw new Error('simulated pdf failure');
      }
      return actual.exportConversationToPdf(conversation);
    })
  };
});

const conversation: ChatConversation = {
  id: 'conversation-42',
  site: 'chatgpt',
  title: 'Quarterly export review',
  url: 'https://chatgpt.com/c/conversation-42',
  exportedAt: '2026-04-09T01:02:03.000Z',
  messages: [
    {
      id: 'm1',
      role: 'user',
      text: 'Hello',
      html: '<p>Hello</p>'
    },
    {
      id: 'm2',
      role: 'assistant',
      text: 'Hi there',
      html: '<p><strong>Hi there</strong></p>'
    }
  ]
};

describe('exporters', () => {
  beforeAll(async () => {
    const regularFontBytes = await readFile(resolve('assets/fonts/Deng-Regular.ttf'));
    const boldFontBytes = await readFile(resolve('assets/fonts/Deng-Bold.ttf'));

    vi.stubGlobal('fetch', vi.fn(async (url: string | URL) => {
      const value = String(url);
      const bytes = value.includes('Deng-Bold') ? boldFontBytes : regularFontBytes;
      return {
        ok: true,
        arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
      } as Response;
    }));
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('renders markdown metadata and message sections', async () => {
    const artifact = await exportConversationToMarkdown(conversation);
    const markdown = await artifact.content.text();

    expect(artifact.filename.endsWith('.md')).toBe(true);
    expect(markdown).toContain('# Quarterly export review');
    expect(markdown).toContain('### 👤 User');
    expect(markdown).toContain('### 🤖 Assistant');
    expect(markdown).toContain('**Hi there**');
  });

  it('preserves GFM tables, fenced code, math text, and attachments in markdown', async () => {
    const artifact = await exportConversationToMarkdown({
      ...conversation,
      messages: [
        {
          id: 'complex',
          role: 'assistant',
          text: '',
          html: `
            <table>
              <thead><tr><th>Feature</th><th>Status</th></tr></thead>
              <tbody><tr><td>GFM</td><td>ok</td></tr></tbody>
            </table>
            <pre><code class="language-ts">const value = 42;</code></pre>
            <span data-math-style="inline" data-latex="E = mc^2"></span>
            <img src="https://example.com/chart.png" alt="Chart preview">
          `,
          attachments: [
            {
              name: 'chart.png',
              type: 'image/png',
              url: 'https://example.com/chart.png',
              size: 2048
            }
          ]
        }
      ]
    });
    const markdown = await artifact.content.text();

    expect(markdown).toContain('| Feature | Status |');
    expect(markdown).toContain('```');
    expect(markdown).toContain('const value = 42;');
    expect(markdown).toContain('$E = mc^2$');
    expect(markdown).toContain('![Chart preview](https://example.com/chart.png)');
    expect(markdown).toContain('- [chart.png (image/png, 2048 bytes)](https://example.com/chart.png)');
  });

  it('marks attachment-only markdown messages explicitly', async () => {
    const artifact = await exportConversationToMarkdown({
      ...conversation,
      messages: [
        {
          id: 'attachment-only',
          role: 'user',
          text: '',
          attachments: [{ name: 'image.png', type: 'image/png', url: 'https://example.com/image.png' }]
        }
      ]
    });

    const markdown = await artifact.content.text();
    expect(markdown).toContain('[Attachment-only message: files are listed below]');
    expect(markdown).toContain('- [image.png (image/png)](https://example.com/image.png)');
  });

  it('does not throw when a markdown attachment has no url', async () => {
    const artifact = await exportConversationToMarkdown({
      ...conversation,
      messages: [
        {
          id: 'missing-url-attachment',
          role: 'user',
          text: 'Please review the attached file.',
          attachments: [{ name: 'file.txt', type: 'text/plain' }]
        }
      ]
    });

    const markdown = await artifact.content.text();
    expect(markdown).toContain('Please review the attached file.');
    expect(markdown).toContain('- file.txt (text/plain)');
  });

  it('includes attachment metadata in plain export sections', () => {
    const sections = buildConversationSections({
      ...conversation,
      messages: [
        {
          id: 'image-only',
          role: 'user',
          text: '',
          attachments: [
            {
              name: 'diagram.png',
              type: 'image/png',
              url: 'https://example.com/diagram.png'
            }
          ]
        }
      ]
    });

    expect(sections[0].body).toContain('Attachments:');
    expect(sections[0].body).toContain('[Attachment-only message: files are listed below]');
    expect(sections[0].body).toContain('- diagram.png (image/png): https://example.com/diagram.png');
  });

  it('escapes untrusted content in HTML exports', () => {
    const html = buildConversationHtml({
      ...conversation,
      title: `"><script>alert("title")</script>`,
      messages: [
        {
          id: 'xss',
          role: 'user',
          text: `hello "quotes" <img src=x onerror=alert(1)> & 'apostrophe'`
        }
      ]
    });

    expect(html).toContain('&quot;&gt;&lt;script&gt;alert(&quot;title&quot;)&lt;/script&gt;');
    expect(html).toContain('hello &quot;quotes&quot; &lt;img src=x onerror=alert(1)&gt; &amp; &#39;apostrophe&#39;');
    expect(html).not.toContain('<script>alert');
    expect(html).not.toContain('<img src=x');
  });

  it('keeps CJK punctuation attached for PDF wrapping tokens', () => {
    expect(splitForPdfWrap('这是第一句。下一句继续，ok')).toEqual(['这是第一句。', '下一句继续，', 'ok']);
  });

  it('creates a zip bundle containing markdown, pdf, docx, and a README', async () => {
    const artifact = await exportConversationToZip({
      ...conversation,
      messages: [
        ...conversation.messages,
        {
          id: 'm3',
          role: 'user',
          text: '',
          attachments: [{ name: 'blob-image.png', type: 'image/png', url: 'blob:https://chatgpt.com/123' }]
        }
      ]
    });
    const zip = await JSZip.loadAsync(await artifact.content.arrayBuffer());

    expect(Object.keys(zip.files)).toEqual(
      expect.arrayContaining([
        'chatgpt__Quarterly export review__2026-04-09T01-02-03.000Z.md',
        'chatgpt__Quarterly export review__2026-04-09T01-02-03.000Z.pdf',
        'chatgpt__Quarterly export review__2026-04-09T01-02-03.000Z.docx',
        'attachments.json',
        'README.txt'
      ])
    );

    const attachments = JSON.parse(await zip.file('attachments.json')!.async('text'));
    expect(attachments).toEqual([
      expect.objectContaining({
        messageId: 'm3',
        name: 'blob-image.png',
        urlKind: 'blob'
      })
    ]);
    expect(await zip.file('README.txt')!.async('text')).toContain('Temporary blob:');
  });

  it('creates a batch archive with one folder per conversation', async () => {
    const artifact = await exportConversationBatch([
      {
        ...conversation,
        messages: [
          {
            id: 'm1',
            role: 'user',
            text: '',
            attachments: [{ name: 'relative-file.txt', url: '/backend-api/files/file-1' }]
          }
        ]
      }
    ], 'markdown');
    const zip = await JSZip.loadAsync(await artifact.content.arrayBuffer());

    expect(Object.keys(zip.files)).toEqual(
      expect.arrayContaining([
        'Quarterly export review__conversation-42/',
        'Quarterly export review__conversation-42/chatgpt__Quarterly export review__2026-04-09T01-02-03.000Z.md',
        'Quarterly export review__conversation-42/attachments.json',
        'README.txt'
      ])
    );

    const attachments = JSON.parse(await zip.file('Quarterly export review__conversation-42/attachments.json')!.async('text'));
    expect(attachments[0]).toMatchObject({
      name: 'relative-file.txt',
      urlKind: 'relative'
    });
  });

  it('uses the shared filename length limit for batch folders', async () => {
    const longTitle = 'A'.repeat(100);
    const artifact = await exportConversationBatch([{ ...conversation, title: longTitle }], 'markdown');
    const zip = await JSZip.loadAsync(await artifact.content.arrayBuffer());

    expect(Object.keys(zip.files)).toContain(`${'A'.repeat(80)}__conversation-42/`);
  });

  it('lengthens markdown code fences when the code contains a fence', async () => {
    const artifact = await exportConversationToMarkdown({
      ...conversation,
      messages: [
        { id: 'fence', role: 'assistant', text: '', html: '<pre><code>```\ninner</code></pre>' }
      ]
    });
    const markdown = await artifact.content.text();
    expect(markdown).toContain('````\n```\ninner\n````');
  });

  it('does not duplicate the first row for tables without thead', async () => {
    const artifact = await exportConversationToMarkdown({
      ...conversation,
      messages: [
        { id: 'plain-table', role: 'assistant', text: '', html: '<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>' }
      ]
    });
    const markdown = await artifact.content.text();
    const tableLines = markdown.split('\n').filter((line) => line.startsWith('|'));
    expect(tableLines).toEqual(['| A | B |', '| --- | --- |', '| 1 | 2 |']);
  });

  it('renders tables whose thead row uses td cells', async () => {
    const artifact = await exportConversationToMarkdown({
      ...conversation,
      messages: [
        { id: 'td-table', role: 'assistant', text: '', html: '<table><thead><tr><td>H1</td><td>H2</td></tr></thead><tbody><tr><td>a</td><td>b</td></tr></tbody></table>' }
      ]
    });
    const markdown = await artifact.content.text();
    expect(markdown).toContain('| H1 | H2 |');
    expect(markdown).toContain('| a | b |');
  });

  it('escapes pipes and newlines inside table cells', async () => {
    const artifact = await exportConversationToMarkdown({
      ...conversation,
      messages: [
        { id: 'pipe-table', role: 'assistant', text: '', html: '<table><thead><tr><th>K</th></tr></thead><tbody><tr><td>a | b\nc</td></tr></tbody></table>' }
      ]
    });
    const markdown = await artifact.content.text();
    expect(markdown).toContain('| a \\| b c |');
  });

  it('escapes markdown link syntax in attachment labels and urls', async () => {
    const artifact = await exportConversationToMarkdown({
      ...conversation,
      messages: [
        {
          id: 'weird-attachment',
          role: 'user',
          text: 'see attachment',
          attachments: [{ name: 'note [1].txt', type: 'text/plain', url: 'https://example.com/a(1).txt' }]
        }
      ]
    });
    const markdown = await artifact.content.text();
    expect(markdown).toContain('- [note \\[1\\].txt (text/plain)](https://example.com/a%281%29.txt)');
  });

  it('falls back to html text when message text is empty in shared sections', () => {
    const sections = buildConversationSections({
      ...conversation,
      messages: [{ id: 'formula', role: 'user', text: '', html: '<p>E = mc<sup>2</sup></p>' }]
    });
    expect(sections[0].body).toContain('E = mc');
    expect(sections[0].body).not.toContain('[Empty message]');
  });

  it('strips xml-invalid control characters from docx output', async () => {
    const artifact = await exportConversationToDocx({
      ...conversation,
      messages: [{ id: 'ctrl', role: 'user', text: 'bad \x01\x02control \x0Bchars' }]
    });
    const zip = await JSZip.loadAsync(await artifact.content.arrayBuffer());
    const documentXml = await zip.file('word/document.xml')!.async('text');
    expect(documentXml).not.toMatch(/[\x00-\x08\x0B\x0C\x0E-\x1F]/);
    expect(documentXml).toContain('bad control chars');
    expect(documentXml).toContain('w:pStyle w:val="Heading1"');
    const stylesXml = await zip.file('word/styles.xml')!.async('text');
    expect(stylesXml).toContain('w:eastAsia="Noto Sans SC"');
  });

  it('skips a failing conversation in batch export and reports counts', async () => {
    const artifact = await exportConversationBatch([
      { ...conversation, id: 'conv-broken', title: 'Batch failure trigger', messages: [{ id: 'b1', role: 'user', text: 'x' }] },
      { ...conversation, id: 'conv-fine', title: 'Batch survivor', messages: [{ id: 's1', role: 'user', text: 'y' }] }
    ], 'pdf');

    expect(artifact.exportedCount).toBe(1);
    expect(artifact.failedCount).toBe(1);

    const zip = await JSZip.loadAsync(await artifact.content.arrayBuffer());
    expect(await zip.file('Batch failure trigger__conv-broken/error.txt')!.async('text')).toContain('simulated pdf failure');
    expect(Object.keys(zip.files)).toContain('Batch survivor__conv-fine/chatgpt__Batch survivor__2026-04-09T01-02-03.000Z.pdf');
  });

  it('deduplicates identical batch folder names', async () => {
    const artifact = await exportConversationBatch([{ ...conversation }, { ...conversation }], 'markdown');
    const zip = await JSZip.loadAsync(await artifact.content.arrayBuffer());
    const folders = Object.keys(zip.files).filter((name) => name.endsWith('/'));
    expect(folders).toEqual(expect.arrayContaining([
      'Quarterly export review__conversation-42/',
      'Quarterly export review__conversation-42-2/'
    ]));
  });

  it('replaces non-winansi characters for standard pdf fonts', () => {
    expect(sanitizeTextForStandardFont('中文 hello 世界')).toBe('?? hello ??');
  });
});
