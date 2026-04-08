import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { exportConversationBatch } from '../../src/exporters/batch';
import { exportConversationToMarkdown } from '../../src/exporters/markdown';
import { exportConversationToZip } from '../../src/exporters/zip';
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
  it('renders markdown metadata and message sections', async () => {
    const artifact = await exportConversationToMarkdown(conversation);
    const markdown = await artifact.content.text();

    expect(artifact.filename.endsWith('.md')).toBe(true);
    expect(markdown).toContain('# Quarterly export review');
    expect(markdown).toContain('## user');
    expect(markdown).toContain('## assistant');
    expect(markdown).toContain('**Hi there**');
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
