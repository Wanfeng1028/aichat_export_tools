import { useEffect, useMemo, useState } from 'react';
import type { ConversationSummary, ExportFormat } from '../../core/types';
import type { RuntimeResponse } from '../../background/message-bus';
import { languageOptions, translate } from '../shared/i18n';
import { useLanguage } from '../shared/hooks/useLanguage';

const exportFormats: Array<{ value: ExportFormat; label: string; hintKey: 'markdownHint' | 'pdfHint' | 'docxHint' | 'zipHint' }> = [
  { value: 'markdown', label: 'Markdown', hintKey: 'markdownHint' },
  { value: 'pdf', label: 'PDF', hintKey: 'pdfHint' },
  { value: 'docx', label: 'DOCX', hintKey: 'docxHint' },
  { value: 'zip', label: 'ZIP', hintKey: 'zipHint' }
];

async function callRuntime(message: { type: string; format?: ExportFormat; sourceTabId?: number }): Promise<RuntimeResponse> {
  return chrome.runtime.sendMessage(message) as Promise<RuntimeResponse>;
}

export function PopupApp() {
  const { language, setLanguage, ready } = useLanguage();
  const [sourceTabId, setSourceTabId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);

  useEffect(() => {
    if (!ready) return;
    setStatusText(translate(language, 'scanningCurrentTab'));
    void (async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const tabId = tab?.id ?? null;
      setSourceTabId(tabId);

      if (!tabId) {
        setStatusText(translate(language, 'noActiveSiteTab'));
        return;
      }

      const response = await callRuntime({ type: 'GET_ACTIVE_SITE_STATUS', sourceTabId: tabId });
      if (response.ok && 'status' in response) {
        setStatusText(response.status.message ?? translate(language, 'ready'));
        return;
      }

      setStatusText(response.ok ? translate(language, 'unknownResponse') : response.error);
    })();
  }, [language, ready]);

  const conversationCountLabel = useMemo(() => {
    if (conversations.length === 0) return translate(language, 'noScanYet');
    return `${conversations.length} ${translate(language, 'detectedSuffix')}`;
  }, [conversations, language]);

  async function handleExportCurrent() {
    if (!sourceTabId) return;
    setBusy(true);
    setStatusText(translate(language, 'exportingCurrentAs', { format: format.toUpperCase() }));
    const response = await callRuntime({ type: 'EXPORT_CURRENT_CONVERSATION', format, sourceTabId });
    setStatusText(response.ok && 'conversation' in response ? translate(language, 'exportedConversation', { title: response.conversation.title }) : response.ok ? translate(language, 'exportFinished') : response.error);
    setBusy(false);
  }

  async function handleScan() {
    if (!sourceTabId) return;
    setBusy(true);
    setStatusText(translate(language, 'scanningSidebar'));
    const response = await chrome.runtime.sendMessage({ type: 'SCAN_CONVERSATIONS', sourceTabId }) as RuntimeResponse;
    if (response.ok && 'conversations' in response) {
      setConversations(response.conversations);
      setStatusText(translate(language, 'scanCompleteFound', { count: response.conversations.length }));
    } else {
      setStatusText(response.ok ? translate(language, 'scanFinished') : response.error);
    }
    setBusy(false);
  }

  async function openDashboard() {
    await callRuntime({ type: 'OPEN_DASHBOARD' });
  }

  return (
    <main className="min-h-screen bg-transparent p-4 text-ink">
      <section className="overflow-hidden rounded-[30px] border border-white/70 bg-white/85 shadow-panel backdrop-blur">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(230,126,34,0.22),_transparent_35%),linear-gradient(135deg,_#10233b,_#1e3556)] px-5 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.32em] text-white/70">AI Chat Exporter</p>
              <h1 className="mt-2 text-2xl font-semibold">{translate(language, 'exportCenter')}</h1>
              <p className="mt-2 max-w-sm text-sm text-white/75">{translate(language, 'popupIntro')}</p>
            </div>
            <div className="min-w-[110px]">
              <div className="mb-2 text-[11px] uppercase tracking-[0.2em] text-white/60">{translate(language, 'language')}</div>
              <select value={language} onChange={(event) => void setLanguage(event.target.value as 'zh-CN' | 'en')} className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none">
                {languageOptions.map((option) => <option key={option.value} value={option.value} className="text-black">{option.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.24em] text-tide">{translate(language, 'currentTab')}</div>
              <div className="mt-2 text-lg font-semibold">{sourceTabId ? translate(language, 'connected') : translate(language, 'missing')}</div>
              <div className="mt-2 text-sm text-slate-500">{statusText}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.24em] text-tide">{translate(language, 'conversationList')}</div>
              <div className="mt-2 text-lg font-semibold">{conversationCountLabel}</div>
              <div className="mt-2 text-sm text-slate-500">{translate(language, 'sidebarTip')}</div>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {exportFormats.map((item) => (
              <button key={item.value} type="button" onClick={() => setFormat(item.value)} className={`rounded-2xl border px-4 py-3 text-left transition ${format === item.value ? 'border-ink bg-ink text-white' : 'border-slate-200 bg-white text-slate-800 hover:border-slate-400'}`}>
                <div className="text-sm font-medium">{item.label === 'ZIP' ? translate(language, 'bundle') : item.label}</div>
                <div className={`mt-1 text-xs ${format === item.value ? 'text-slate-200' : 'text-slate-500'}`}>{translate(language, item.hintKey)}</div>
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-3">
            <button type="button" onClick={() => void handleExportCurrent()} disabled={busy || !sourceTabId} className="rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300">{busy ? translate(language, 'working') : translate(language, 'exportCurrentConversation')}</button>
            <button type="button" onClick={() => void handleScan()} disabled={busy || !sourceTabId} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100">{translate(language, 'scanConversationList')}</button>
            <button type="button" onClick={() => void openDashboard()} className="rounded-2xl border border-transparent bg-amber-100 px-4 py-3 text-sm font-medium text-amber-900 transition hover:bg-amber-200">{translate(language, 'openFullDashboard')}</button>
          </div>
        </div>
      </section>
    </main>
  );
}
