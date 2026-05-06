import { describe, expect, it } from 'vitest';
import { manifest } from '../../src/manifest';

describe('extension manifest', () => {
  it('keeps supported site matches available as optional host permissions', () => {
    expect(manifest.optional_host_permissions).toEqual(
      expect.arrayContaining([
        'https://kimi.com/*',
        'https://www.kimi.com/*',
        'https://tongyi.com/*',
        'https://www.tongyi.com/*',
        'https://qwen.ai/*',
        'https://www.qwen.ai/*'
      ])
    );

    expect(manifest.content_scripts[0].matches).toEqual(manifest.optional_host_permissions);
  });
});
