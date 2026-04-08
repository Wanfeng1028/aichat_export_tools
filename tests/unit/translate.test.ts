import { describe, expect, it } from 'vitest';
import { translate } from '../../src/ui/shared/i18n';

describe('translate', () => {
  it('interpolates variables into localized templates', () => {
    expect(translate('en', 'batchReady', { filename: 'archive.zip', success: 3, failed: 1 })).toBe(
      'Batch archive ready: archive.zip. Exported 3, failed 1.'
    );
  });

  it('falls back to the dictionary value without variables', () => {
    expect(translate('zh-CN', 'language')).toBe('语言');
  });
});
