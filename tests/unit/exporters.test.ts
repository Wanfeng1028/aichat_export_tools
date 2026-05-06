import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import JSZip from 'jszip';
import { exportConversationBatch } from '../../src/exporters/batch';
import { exportConversationToMarkdown } from '../../src/exporters/markdown';
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
    expect(sections[0].body).toContain('- diagram.png (image/png): https://example.com/diagram.png');
  });

  it('creates a zip bundle containing markdown, pdf, docx, and a README', async () => {
    const artifact = await exportConversationToZip(conversation);
    const zip = await JSZip.loadAsync(await artifact.content.arrayBuffer());

    expect(Object.keys(zip.files)).toEqual(
      expect.arrayContaining([
        'chatgpt__Quarterly export review__2026-04-09T01-02-03.000Z.md',
        'chatgpt__Quarterly export review__2026-04-09T01-02-03.000Z.pdf',
        'chatgpt__Quarterly export review__2026-04-09T01-02-03.000Z.docx',
        'README.txt'
      ])
    );
  });

  it('creates a batch archive with one folder per conversation', async () => {
    const artifact = await exportConversationBatch([conversation], 'markdown');
    const zip = await JSZip.loadAsync(await artifact.content.arrayBuffer());

    expect(Object.keys(zip.files)).toEqual(
      expect.arrayContaining([
        'Quarterly export review__conversation-42/',
        'Quarterly export review__conversation-42/chatgpt__Quarterly export review__2026-04-09T01-02-03.000Z.md',
        'README.txt'
      ])
    );
  });
});
