import { describe, expect, it } from 'vitest';
import { applyFilenameTemplate, buildConversationFilename } from '../../src/core/filename';
import type { ChatConversation } from '../../src/core/types';

const baseConversation: ChatConversation = {
  id: 'conv-1',
  site: 'chatgpt',
  title: 'Plan: ship / export <alpha>?',
  url: 'https://chatgpt.com/c/conv-1',
  exportedAt: '2026-04-09T01:02:03.000Z',
  messages: []
};

describe('buildConversationFilename', () => {
  it('sanitizes reserved characters and preserves timestamp ordering', () => {
    expect(buildConversationFilename(baseConversation, 'md')).toBe(
      'chatgpt__Plan- ship - export -alpha-__2026-04-09T01-02-03.000Z.md'
    );
  });

  it('applies custom filename templates', () => {
    expect(applyFilenameTemplate(baseConversation, '{date}__{site}__{title}__{id}')).toBe(
      '2026-04-09__chatgpt__Plan- ship - export -alpha-__conv-1'
    );
  });
});
