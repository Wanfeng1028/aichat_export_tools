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

  it('does not match unrelated hosts that merely contain a site substring', () => {
    // "netflix.com".includes("x.com") === true，includes 匹配曾把无关站点误判成 grok
    expect(detectSupportedSiteFromUrl('https://www.netflix.com/watch')).toBeNull();
    expect(detectSupportedSiteFromUrl('https://box.com')).toBeNull();
    expect(detectSupportedSiteFromUrl('https://notchatgpt.com/')).toBeNull();
    expect(detectSupportedSiteFromUrl('https://grok.example.com/')).toBeNull();
  });

  it('matches supported sites on subdomains', () => {
    expect(detectSupportedSiteFromUrl('https://www.qwen.ai/')).toBe('qianwen');
    expect(detectSupportedSiteFromUrl('https://www.tongyi.com/')).toBe('qianwen');
    expect(detectSupportedSiteFromUrl('https://doubao.com/chat')).toBe('doubao');
  });
});
