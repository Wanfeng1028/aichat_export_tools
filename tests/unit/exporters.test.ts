import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import JSZip from 'jszip';
import { exportConversationBatch } from '../../src/exporters/batch';
import { exportConversationToMarkdown } from '../../src/exporters/markdown';
import { splitForPdfWrap } from '../../src/exporters/pdf';
import { exportConversationToZip } from '../../src/exporters/zip';
import { buildConversationSections } from '../../src/exporters/shared';
import type { ChatConversation } from '../../src/core/types';

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
    expect(markdown).toContain('## user');
    expect(markdown).toContain('## assistant');
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
});
