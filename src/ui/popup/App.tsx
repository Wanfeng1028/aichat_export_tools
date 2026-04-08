import { useEffect, useMemo, useState } from 'react';
import type { ConversationSummary, ExportFormat } from '../../core/types';
import type { RuntimeResponse } from '../../background/message-bus';

const exportFormats: Array<{ value: ExportFormat; label: string; hint: string }> = [
  { value: 'markdown', label: 'Markdown', hint: 'Plain text knowledge capture' },
  { value: 'pdf', label: 'PDF', hint: 'Snapshot for sharing and review' },
  { value: 'docx', label: 'DOCX', hint: 'Editable office document' },
  { value: 'zip', label: 'Bundle', hint: 'Markdown, PDF, and DOCX together' }
];

async function callRuntime(message: { type: string; format?: ExportFormat; sourceTabId?: number }): Promise<RuntimeResponse> {
  return chrome.runtime.sendMessage(message) as Promise<RuntimeResponse>;
}

export function PopupApp() {
  const [sourceTabId, setSourceTabId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState('Scanning the current tab...');
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);

  useEffect(() => {
    void (async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const tabId = tab?.id ?? null;
      setSourceTabId(tabId);

      if (!tabId) {
        setStatusText('No active site tab found.');
        return;
      }

      const response = await callRuntime({ type: 'GET_ACTIVE_SITE_STATUS', sourceTabId: tabId });
      if (response.ok && 'status' in response) {
        setStatusText(response.status.message ?? 'Ready.');
        return;
      }

      setStatusText(response.ok ? 'Unknown response.' : response.error);
    })();
  }, []);

  const conversationCountLabel = useMemo(() => {
    if (conversations.length === 0) {
      return 'No scan yet';
    }

    return `${conversations.length} conversations detected`;
  }, [conversations]);

  async function handleExportCurrent() {
    if (!sourceTabId) return;
    setBusy(true);
    setStatusText(`Exporting the current conversation as ${format.toUpperCase()}...`);
    const response = await callRuntime({ type: 'EXPORT_CURRENT_CONVERSATION', format, sourceTabId });
    setStatusText(response.ok && 'conversation' in response ? `Exported ${response.conversation.title}.` : response.ok ? 'Export finished.' : response.error);
    setBusy(false);
  }

  async function handleScan() {
    if (!sourceTabId) return;
    setBusy(true);
    setStatusText('Scanning ChatGPT sidebar conversations...');
    const response = await chrome.runtime.sendMessage({ type: 'SCAN_CONVERSATIONS', sourceTabId }) as RuntimeResponse;
    if (response.ok && 'conversations' in response) {
      setConversations(response.conversations);
      setStatusText(`Scan complete. Found ${response.conversations.length} conversations.`);
    } else {
      setStatusText(response.ok ? 'Scan finished.' : response.error);
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
          <p className="text-[11px] uppercase tracking-[0.32em] text-white/70">AI Chat Exporter</p>
          <h1 className="mt-2 text-2xl font-semibold">Export center</h1>
          <p className="mt-2 max-w-sm text-sm text-white/75">Current ChatGPT tab, conversation scan, and dashboard access from one compact panel.</p>
        </div>

        <div className="p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.24em] text-tide">Current tab</div>
              <div className="mt-2 text-lg font-semibold">{sourceTabId ? 'Connected' : 'Missing'}</div>
              <div className="mt-2 text-sm text-slate-500">{statusText}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.24em] text-tide">Conversation list</div>
              <div className="mt-2 text-lg font-semibold">{conversationCountLabel}</div>
              <div className="mt-2 text-sm text-slate-500">Open the ChatGPT sidebar before scanning for the best results.</div>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {exportFormats.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFormat(item.value)}
                className={`rounded-2xl border px-4 py-3 text-left transition ${format === item.value ? 'border-ink bg-ink text-white' : 'border-slate-200 bg-white text-slate-800 hover:border-slate-400'}`}
              >
                <div className="text-sm font-medium">{item.label}</div>
                <div className={`mt-1 text-xs ${format === item.value ? 'text-slate-200' : 'text-slate-500'}`}>{item.hint}</div>
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-3">
            <button type="button" onClick={() => void handleExportCurrent()} disabled={busy || !sourceTabId} className="rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300">{busy ? 'Working...' : 'Export Current Conversation'}</button>
            <button type="button" onClick={() => void handleScan()} disabled={busy || !sourceTabId} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100">Scan Conversation List</button>
            <button type="button" onClick={() => void openDashboard()} className="rounded-2xl border border-transparent bg-amber-100 px-4 py-3 text-sm font-medium text-amber-900 transition hover:bg-amber-200">Open Full Dashboard</button>
          </div>
        </div>
      </section>
    </main>
  );
}
