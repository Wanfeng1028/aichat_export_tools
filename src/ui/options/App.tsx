import { languageOptions, translate } from '../shared/i18n';
import { useLanguage } from '../shared/hooks/useLanguage';
import { useEffect, useState } from 'react';
import { defaultSettings, getSettings, updateSettings } from '../../storage/settings';
import type { ExportFormat } from '../../core/types';

const formatOptions: Array<{ value: ExportFormat; label: string }> = [
  { value: 'markdown', label: 'Markdown' },
  { value: 'pdf', label: 'PDF' },
  { value: 'docx', label: 'DOCX' },
  { value: 'zip', label: 'ZIP' }
];

export function OptionsApp() {
  const { language, setLanguage } = useLanguage();
  const isZh = language === 'zh-CN';
  const [preferredFormat, setPreferredFormat] = useState<ExportFormat>(defaultSettings.preferredFormat);
  const [filenameTemplate, setFilenameTemplate] = useState(defaultSettings.filenameTemplate);
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    void (async () => {
      const settings = await getSettings();
      setPreferredFormat(settings.preferredFormat);
      setFilenameTemplate(settings.filenameTemplate);
    })();
  }, []);

  async function saveSettings() {
    const settings = await updateSettings({
      preferredFormat,
      filenameTemplate: filenameTemplate.trim() || defaultSettings.filenameTemplate
    });
    setPreferredFormat(settings.preferredFormat);
    setFilenameTemplate(settings.filenameTemplate);
    setSavedMessage(isZh ? '设置已保存，新的导出会立即使用这些规则。' : 'Settings saved. New exports will use these rules immediately.');
  }

  return (
    <main className="min-h-screen bg-transparent px-6 py-8 text-ink">
      <section className="mx-auto max-w-3xl rounded-[32px] border border-white/60 bg-white/85 p-8 shadow-panel backdrop-blur">
        <div className="flex items-start gap-4">
          <img src="/logo.png" alt="AI Chat Exporter" className="h-16 w-16 rounded-3xl border border-slate-200 bg-white object-cover shadow-sm" />
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-tide">{translate(language, 'options')}</p>
            <h1 className="mt-2 text-4xl font-semibold">{translate(language, 'preferences')}</h1>
            <p className="mt-4 text-sm text-slate-600">{isZh ? '这里现在会真正控制默认导出格式和文件命名模板，而不是仅显示占位文案。' : 'This page now controls the default export format and filename template instead of only showing placeholder copy.'}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="block text-sm font-medium text-slate-800">{translate(language, 'switchLanguage')}</label>
            <select value={language} onChange={(event) => void setLanguage(event.target.value as 'zh-CN' | 'en')} className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none">
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="block text-sm font-medium text-slate-800">{isZh ? '默认导出格式' : 'Default export format'}</label>
            <select value={preferredFormat} onChange={(event) => setPreferredFormat(event.target.value as ExportFormat)} className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none">
              {formatOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <label className="block text-sm font-medium text-slate-800">{isZh ? '文件命名模板' : 'Filename template'}</label>
          <input value={filenameTemplate} onChange={(event) => setFilenameTemplate(event.target.value)} className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none" />
          <p className="mt-3 text-xs leading-6 text-slate-500">{isZh ? '可用变量：{site}、{title}、{timestamp}、{date}、{id}、{workspace}' : 'Available tokens: {site}, {title}, {timestamp}, {date}, {id}, {workspace}'}</p>
          <p className="mt-2 text-xs leading-6 text-slate-500">{isZh ? '示例：{date}__{site}__{title}' : 'Example: {date}__{site}__{title}'}</p>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          <p className="text-sm text-emerald-700">{savedMessage}</p>
          <button type="button" onClick={() => void saveSettings()} className="rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800">{isZh ? '保存设置' : 'Save settings'}</button>
        </div>
      </section>
    </main>
  );
}
