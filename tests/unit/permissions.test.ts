import { describe, expect, it } from 'vitest';
import { detectSupportedSiteFromUrl } from '../../src/background/permissions';

describe('detectSupportedSiteFromUrl', () => {
  it('maps supported hosts to internal site ids', () => {
    expect(detectSupportedSiteFromUrl('https://chatgpt.com/c/123')).toBe('chatgpt');
    expect(detectSupportedSiteFromUrl('https://claude.ai/chats')).toBe('claude');
    expect(detectSupportedSiteFromUrl('https://kimi.moonshot.cn/')).toBe('kimi');
    expect(detectSupportedSiteFromUrl('https://www.doubao.com/chat')).toBe('doubao');
  });

  it('returns null for unknown or invalid URLs', () => {
    expect(detectSupportedSiteFromUrl('notaurl')).toBeNull();
    expect(detectSupportedSiteFromUrl('https://example.com')).toBeNull();
  });
});
