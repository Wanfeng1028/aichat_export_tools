import { useEffect, useState } from 'react';
import type { AdapterStatus } from '../../core/types';
import type { RuntimeResponse } from '../../background/message-bus';

async function callRuntime(message: { type: string; format?: 'markdown' }): Promise<RuntimeResponse> {
  return chrome.runtime.sendMessage(message) as Promise<RuntimeResponse>;
}

export function PopupApp() {
  const [status, setStatus] = useState<AdapterStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string>('Scanning the current tab...');

  useEffect(() => {
    void (async () => {
      const response = await callRuntime({ type: 'GET_ACTIVE_SITE_STATUS' });
      if (response.ok && 'status' in response) {
        setStatus(response.status);
        setFeedback(response.status.message ?? 'Ready.');
        return;
      }

      setFeedback(response.ok ? 'Unknown response.' : response.error);
    })();
  }, []);

  async function handleExport() {
    setBusy(true);
    setFeedback('Exporting current conversation to Markdown...');

    const response = await callRuntime({ type: 'EXPORT_CURRENT_CONVERSATION', format: 'markdown' });

    if (response.ok && 'conversation' in response) {
      setFeedback(`Exported ${response.conversation.messages.length} messages.`);
    } else {
      setFeedback(response.ok ? 'Export finished.' : response.error);
    }

    setBusy(false);
  }

  async function openDashboard() {
    await callRuntime({ type: 'OPEN_DASHBOARD' });
  }

  return (
    <main className="min-h-screen bg-transparent p-4 text-ink">
      <section className="rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-panel backdrop-blur">
        <div className="mb-5">
          <p className="text-xs uppercase tracking-[0.24em] text-tide">AI Chat Exporter</p>
          <h1 className="mt-2 text-2xl font-semibold">Current tab export</h1>
          <p className="mt-2 text-sm text-slate-600">MVP focuses on ChatGPT current conversation export to Markdown.</p>
        </div>

        <div className="rounded-2xl bg-slate-900 px-4 py-3 text-sm text-slate-100">
          <div className="flex items-center justify-between gap-3">
            <span>Support</span>
            <span className="rounded-full bg-white/10 px-2 py-1 text-xs">
              {status?.supported ? 'Detected' : 'Not detected'}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span>Current conversation</span>
            <span className="rounded-full bg-white/10 px-2 py-1 text-xs">
              {status?.canExportCurrentConversation ? 'Ready' : 'Unavailable'}
            </span>
          </div>
        </div>

        <p className="mt-4 min-h-10 text-sm text-slate-700">{feedback}</p>

        <div className="mt-5 grid gap-3">
          <button
            type="button"
            onClick={() => void handleExport()}
            disabled={busy || !status?.canExportCurrentConversation}
            className="rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {busy ? 'Exporting...' : 'Export Current Conversation'}
          </button>
          <button
            type="button"
            onClick={() => void openDashboard()}
            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Open Dashboard
          </button>
        </div>
      </section>
    </main>
  );
}
