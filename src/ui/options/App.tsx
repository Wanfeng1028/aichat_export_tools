import { languageOptions, translate } from '../shared/i18n';
import { useLanguage } from '../shared/hooks/useLanguage';

export function OptionsApp() {
  const { language, setLanguage } = useLanguage();

  return (
    <main className="min-h-screen bg-transparent px-6 py-8 text-ink">
      <section className="mx-auto max-w-3xl rounded-[32px] border border-white/60 bg-white/85 p-8 shadow-panel backdrop-blur">
        <p className="text-xs uppercase tracking-[0.3em] text-tide">{translate(language, 'options')}</p>
        <h1 className="mt-2 text-4xl font-semibold">{translate(language, 'preferences')}</h1>
        <p className="mt-4 text-sm text-slate-600">{translate(language, 'optionsIntro')}</p>

        <div className="mt-8 max-w-xs rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <label className="block text-sm font-medium text-slate-800">{translate(language, 'switchLanguage')}</label>
          <select value={language} onChange={(event) => void setLanguage(event.target.value as 'zh-CN' | 'en')} className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none">
            {languageOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </section>
    </main>
  );
}
