import { useEffect, useState } from 'react';
import type { AppLanguage } from '../i18n';
import { getStoredLanguage, setStoredLanguage } from '../i18n';

export function useLanguage() {
  const [language, setLanguage] = useState<AppLanguage>('zh-CN');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const stored = await getStoredLanguage();
      setLanguage(stored);
      setReady(true);
    })();
  }, []);

  async function updateLanguage(nextLanguage: AppLanguage) {
    setLanguage(nextLanguage);
    await setStoredLanguage(nextLanguage);
  }

  return { language, setLanguage: updateLanguage, ready };
}
