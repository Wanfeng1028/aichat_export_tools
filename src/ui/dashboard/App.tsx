import { useEffect, useMemo, useState } from 'react';
import type { ConversationSummary, ExportFormat, ExportHistoryRecord, ExportJobRecord } from '../../core/types';
import type { RuntimeResponse } from '../../background/message-bus';
import { languageOptions, translate } from '../shared/i18n';
import { useLanguage } from '../shared/hooks/useLanguage';

const exportFormats: Array<{ value: ExportFormat; label: string }> = [
  { value: 'markdown', label: 'Markdown' },
  { value: 'pdf', label: 'PDF' },
  { value: 'docx', label: 'DOCX' },
  { value: 'zip', label: 'zip' }
];

function getSourceTabId(): number | null {
  const params = new URLSearchParams(globalThis.location.search);
  const value = params.get('sourceTabId');
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function callRuntime(message: Record<string, unknown>): Promise<RuntimeResponse> {
  return chrome.runtime.sendMessage(message) as Promise<RuntimeResponse>;
}

export function DashboardApp() {
  const { language, setLanguage } = useLanguage();
  const [sourceTabId] = useState<number | null>(() => getSourceTabId());
  const [history, setHistory] = useState<ExportHistoryRecord[]>([]);
  const [jobs, setJobs] = useState<ExportJobRecord[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [scanMessage, setScanMessage] = useState('');

  useEffect(() => {
    setScanMessage(translate(language, 'scanPopulate'));
    void refreshHistoryAndJobs();
  }, [language]);

  async function refreshHistoryAndJobs() {
    const [historyResponse, jobsResponse] = await Promise.all([callRuntime({ type: 'LIST_EXPORT_HISTORY' }), callRuntime({ type: 'LIST_EXPORT_JOBS' })]);
    if (historyResponse.ok && 'history' in historyResponse) setHistory(historyResponse.history);
    if (jobsResponse.ok && 'jobs' in jobsResponse) setJobs(jobsResponse.jobs);
  }

  async function handleScan() {
    if (!sourceTabId) {
      setError(translate(language, 'sourceTabMissing'));
      return;
    }
    setBusy(true);
    setError('');
    setScanMessage(translate(language, 'scanningSidebar'));
    const response = await callRuntime({ type: 'SCAN_CONVERSATIONS', sourceTabId });
    if (response.ok && 'conversations' in response) {
      setConversations(response.conversations);
      setSelectedIds(response.conversations.slice(0, 5).map((item) => item.id));
      setScanMessage(translate(language, 'foundConversationsPreset', { count: response.conversations.length }));
    } else {
      setError(response.ok ? translate(language, 'unknownScanResponse') : response.error);
    }
    setBusy(false);
  }

  async function handleBatchExport() {
    if (!sourceTabId) {
      setError(translate(language, 'sourceTabMissing'));
      return;
    }
    const selected = conversations.filter((item) => selectedIds.includes(item.id));
    if (selected.length === 0) {
      setError(translate(language, 'selectAtLeastOne'));
      return;
    }

    setBusy(true);
    setError('');
    setScanMessage(translate(language, 'exportingSelectedAs', { count: selected.length, format: format.toUpperCase() }));
    const response = await callRuntime({ type: 'EXPORT_SELECTED_CONVERSATIONS', sourceTabId, format, conversations: selected });
    if (response.ok && 'batch' in response) {
      setScanMessage(translate(language, 'batchReady', { filename: response.batch.archiveFilename, success: response.batch.exportedCount, failed: response.batch.failedCount }));
      await refreshHistoryAndJobs();
    } else {
      setError(response.ok ? translate(language, 'unknownBatchResponse') : response.error);
    }
    setBusy(false);
  }

  function toggleConversation(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  const stats = useMemo(() => ({
    completed: jobs.filter((item) => item.status === 'completed').length,
    running: jobs.filter((item) => item.status === 'running').length,
    failed: jobs.filter((item) => item.status === 'failed').length
  }), [jobs]);

  return (
    <main className="min-h-screen bg-transparent px-6 py-8 text-ink">
      <div className="mx-auto max-w-6xl rounded-[36px] border border-white/70 bg-white/85 p-8 shadow-panel backdrop-blur">
        <section className="rounded-[28px] bg-[radial-gradient(circle_at_top_left,_rgba(230,126,34,0.22),_transparent_28%),linear-gradient(135deg,_#10233b,_#1e3556)] p-8 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.34em] text-white/65">AI Chat Exporter Dashboard</p>
              <h1 className="mt-4 text-4xl font-semibold">{translate(language, 'dashboardTitle')}</h1>
              <p className="mt-3 max-w-3xl text-sm text-white/75">{translate(language, 'dashboardIntro')}</p>
            </div>
            <div className="min-w-[120px]">
              <div className="mb-2 text-[11px] uppercase tracking-[0.2em] text-white/60">{translate(language, 'language')}</div>
              <select value={language} onChange={(event) => void setLanguage(event.target.value as 'zh-CN' | 'en')} className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none">
                {languageOptions.map((option) => <option key={option.value} value={option.value} className="text-black">{option.label}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
            <div className="rounded-2xl bg-white/10 px-4 py-3">{translate(language, 'completed')}: {stats.completed}</div>
            <div className="rounded-2xl bg-white/10 px-4 py-3">{translate(language, 'running')}: {stats.running}</div>
            <div className="rounded-2xl bg-white/10 px-4 py-3">{translate(language, 'failed')}: {stats.failed}</div>
          </div>
        </section>

        <div className="mt-8 grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-tide">{translate(language, 'conversationScan')}</p>
                <h2 className="mt-2 text-2xl font-semibold">{translate(language, 'selectWhatToExport')}</h2>
              </div>
              <button type="button" onClick={() => void handleScan()} disabled={busy} className="rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300">{busy ? translate(language, 'working') : translate(language, 'scanChatGptSidebar')}</button>
            </div>

            <p className="mt-4 text-sm text-slate-600">{scanMessage}</p>
            {error ? <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {exportFormats.map((item) => (
                <button key={item.value} type="button" onClick={() => setFormat(item.value)} className={`rounded-2xl border px-4 py-3 text-left transition ${format === item.value ? 'border-ink bg-ink text-white' : 'border-slate-200 bg-white hover:border-slate-400'}`}>
                  <div className="text-sm font-medium">{item.value === 'zip' ? translate(language, 'fullBundle') : item.label}</div>
                  <div className={`mt-1 text-xs ${format === item.value ? 'text-slate-200' : 'text-slate-500'}`}>{item.value === 'zip' ? translate(language, 'eachConversationBundle') : translate(language, 'packedIntoOneZip')}</div>
                </button>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
              <span>{translate(language, 'scannedCount', { count: conversations.length })}</span>
              <span>{translate(language, 'selectedCount', { count: selectedIds.length })}</span>
            </div>

            <div className="mt-4 max-h-[440px] overflow-auto rounded-3xl border border-slate-200 bg-white">
              {conversations.length === 0 ? <div className="px-5 py-10 text-sm text-slate-500">{translate(language, 'noConversationsScanned')}</div> : (
                <ul className="divide-y divide-slate-200">
                  {conversations.map((item) => {
                    const selected = selectedIds.includes(item.id);
                    return (
                      <li key={item.id} className="px-5 py-4">
                        <label className="flex cursor-pointer items-start gap-3">
                          <input type="checkbox" checked={selected} onChange={() => toggleConversation(item.id)} className="mt-1 h-4 w-4 rounded border-slate-300 text-ink" />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate text-sm font-medium text-slate-900">{item.title}</span>
                              {item.isActive ? <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] uppercase text-amber-900">{translate(language, 'current')}</span> : null}
                            </div>
                            <p className="mt-1 truncate text-xs text-slate-500">{item.url}</p>
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <button type="button" onClick={() => void handleBatchExport()} disabled={busy || selectedIds.length === 0} className="mt-5 w-full rounded-2xl bg-amber-500 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-slate-300">{busy ? translate(language, 'exportingBatch') : translate(language, 'exportSelectedConversations')}</button>
          </section>

          <div className="grid gap-8">
            <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
              <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">{translate(language, 'recentJobs')}</h2><span className="text-sm text-slate-500">{jobs.length}</span></div>
              <div className="mt-4 space-y-3">
                {jobs.length === 0 ? <div className="rounded-2xl bg-white px-4 py-5 text-sm text-slate-500">{translate(language, 'noJobsYet')}</div> : jobs.slice(0, 8).map((item) => (
                  <div key={item.id} className="rounded-2xl bg-white px-4 py-4">
                    <div className="flex items-center justify-between gap-3"><div className="truncate text-sm font-medium text-slate-900">{item.title}</div><span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] uppercase text-slate-700">{item.status}</span></div>
                    <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500"><span>{item.format}</span><span>{new Date(item.updatedAt).toLocaleString()}</span></div>
                    {item.error ? <p className="mt-2 text-xs text-red-600">{item.error}</p> : null}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
              <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">{translate(language, 'downloadedArchives')}</h2><span className="text-sm text-slate-500">{history.length}</span></div>
              <div className="mt-4 space-y-3">
                {history.length === 0 ? <div className="rounded-2xl bg-white px-4 py-5 text-sm text-slate-500">{translate(language, 'noExportsYet')}</div> : history.slice(0, 8).map((item) => (
                  <div key={item.id} className="rounded-2xl bg-white px-4 py-4">
                    <div className="truncate text-sm font-medium text-slate-900">{item.title}</div>
                    <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500"><span>{item.filename}</span><span>{new Date(item.createdAt).toLocaleString()}</span></div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
