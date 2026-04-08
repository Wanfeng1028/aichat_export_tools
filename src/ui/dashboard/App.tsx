import { useEffect, useMemo, useState } from 'react';
import type { ConversationSummary, ExportFormat, ExportHistoryRecord, ExportJobRecord } from '../../core/types';
import type { RuntimeResponse } from '../../background/message-bus';

const exportFormats: Array<{ value: ExportFormat; label: string }> = [
  { value: 'markdown', label: 'Markdown' },
  { value: 'pdf', label: 'PDF' },
  { value: 'docx', label: 'DOCX' },
  { value: 'zip', label: 'Full bundle' }
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
  const [sourceTabId] = useState<number | null>(() => getSourceTabId());
  const [history, setHistory] = useState<ExportHistoryRecord[]>([]);
  const [jobs, setJobs] = useState<ExportJobRecord[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [scanMessage, setScanMessage] = useState('Scan your ChatGPT sidebar to populate conversations.');

  useEffect(() => { void refreshHistoryAndJobs(); }, []);

  async function refreshHistoryAndJobs() {
    const [historyResponse, jobsResponse] = await Promise.all([callRuntime({ type: 'LIST_EXPORT_HISTORY' }), callRuntime({ type: 'LIST_EXPORT_JOBS' })]);
    if (historyResponse.ok && 'history' in historyResponse) setHistory(historyResponse.history);
    if (jobsResponse.ok && 'jobs' in jobsResponse) setJobs(jobsResponse.jobs);
  }

  async function handleScan() {
    if (!sourceTabId) {
      setError('Dashboard was opened without a source ChatGPT tab. Re-open it from the popup.');
      return;
    }

    setBusy(true);
    setError('');
    setScanMessage('Scanning ChatGPT sidebar conversations...');
    const response = await callRuntime({ type: 'SCAN_CONVERSATIONS', sourceTabId });
    if (response.ok && 'conversations' in response) {
      setConversations(response.conversations);
      setSelectedIds(response.conversations.slice(0, 5).map((item) => item.id));
      setScanMessage(`Found ${response.conversations.length} conversations. The first five are preselected.`);
    } else {
      setError(response.ok ? 'Unknown scan response.' : response.error);
    }
    setBusy(false);
  }

  async function handleBatchExport() {
    if (!sourceTabId) {
      setError('Dashboard was opened without a source ChatGPT tab.');
      return;
    }

    const selected = conversations.filter((item) => selectedIds.includes(item.id));
    if (selected.length === 0) {
      setError('Select at least one conversation before exporting.');
      return;
    }

    setBusy(true);
    setError('');
    setScanMessage(`Exporting ${selected.length} conversations as ${format.toUpperCase()}...`);
    const response = await callRuntime({ type: 'EXPORT_SELECTED_CONVERSATIONS', sourceTabId, format, conversations: selected });
    if (response.ok && 'batch' in response) {
      setScanMessage(`Batch archive ready: ${response.batch.archiveFilename}. Exported ${response.batch.exportedCount}, failed ${response.batch.failedCount}.`);
      await refreshHistoryAndJobs();
    } else {
      setError(response.ok ? 'Unknown batch export response.' : response.error);
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
          <p className="text-xs uppercase tracking-[0.34em] text-white/65">AI Chat Exporter Dashboard</p>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl font-semibold">Batch export workspace</h1>
              <p className="mt-3 max-w-3xl text-sm text-white/75">Scan the ChatGPT sidebar from your source tab, choose the conversations you want, then export them into a single archive.</p>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-3">
              <div className="rounded-2xl bg-white/10 px-4 py-3">Completed: {stats.completed}</div>
              <div className="rounded-2xl bg-white/10 px-4 py-3">Running: {stats.running}</div>
              <div className="rounded-2xl bg-white/10 px-4 py-3">Failed: {stats.failed}</div>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-tide">Conversation scan</p>
                <h2 className="mt-2 text-2xl font-semibold">Select what to export</h2>
              </div>
              <button type="button" onClick={() => void handleScan()} disabled={busy} className="rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300">{busy ? 'Working...' : 'Scan ChatGPT Sidebar'}</button>
            </div>

            <p className="mt-4 text-sm text-slate-600">{scanMessage}</p>
            {error ? <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {exportFormats.map((item) => (
                <button key={item.value} type="button" onClick={() => setFormat(item.value)} className={`rounded-2xl border px-4 py-3 text-left transition ${format === item.value ? 'border-ink bg-ink text-white' : 'border-slate-200 bg-white hover:border-slate-400'}`}>
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className={`mt-1 text-xs ${format === item.value ? 'text-slate-200' : 'text-slate-500'}`}>{item.value === 'zip' ? 'Each conversation carries a full multi-format bundle.' : 'All selected conversations are packed into one zip archive.'}</div>
                </button>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
              <span>{conversations.length} scanned</span>
              <span>{selectedIds.length} selected</span>
            </div>

            <div className="mt-4 max-h-[440px] overflow-auto rounded-3xl border border-slate-200 bg-white">
              {conversations.length === 0 ? <div className="px-5 py-10 text-sm text-slate-500">No conversations scanned yet.</div> : (
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
                              {item.isActive ? <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] uppercase text-amber-900">Current</span> : null}
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

            <button type="button" onClick={() => void handleBatchExport()} disabled={busy || selectedIds.length === 0} className="mt-5 w-full rounded-2xl bg-amber-500 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-slate-300">{busy ? 'Exporting batch...' : 'Export Selected Conversations'}</button>
          </section>

          <div className="grid gap-8">
            <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
              <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Recent jobs</h2><span className="text-sm text-slate-500">{jobs.length}</span></div>
              <div className="mt-4 space-y-3">
                {jobs.length === 0 ? <div className="rounded-2xl bg-white px-4 py-5 text-sm text-slate-500">No jobs yet.</div> : jobs.slice(0, 8).map((item) => (
                  <div key={item.id} className="rounded-2xl bg-white px-4 py-4">
                    <div className="flex items-center justify-between gap-3"><div className="truncate text-sm font-medium text-slate-900">{item.title}</div><span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] uppercase text-slate-700">{item.status}</span></div>
                    <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500"><span>{item.format}</span><span>{new Date(item.updatedAt).toLocaleString()}</span></div>
                    {item.error ? <p className="mt-2 text-xs text-red-600">{item.error}</p> : null}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
              <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Downloaded archives</h2><span className="text-sm text-slate-500">{history.length}</span></div>
              <div className="mt-4 space-y-3">
                {history.length === 0 ? <div className="rounded-2xl bg-white px-4 py-5 text-sm text-slate-500">No exports yet.</div> : history.slice(0, 8).map((item) => (
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
