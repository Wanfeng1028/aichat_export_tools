import { useEffect, useState } from 'react';
import type { ExportHistoryRecord } from '../../core/types';
import type { RuntimeResponse } from '../../background/message-bus';

async function callRuntime(message: { type: string }): Promise<RuntimeResponse> {
  return chrome.runtime.sendMessage(message) as Promise<RuntimeResponse>;
}

export function DashboardApp() {
  const [history, setHistory] = useState<ExportHistoryRecord[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    void (async () => {
      const response = await callRuntime({ type: 'LIST_EXPORT_HISTORY' });
      if (response.ok && 'history' in response) {
        setHistory(response.history);
        return;
      }

      setError(response.ok ? 'Unknown dashboard response.' : response.error);
    })();
  }, []);

  return (
    <main className="min-h-screen bg-transparent px-6 py-8 text-ink">
      <div className="mx-auto max-w-4xl rounded-[32px] border border-white/60 bg-white/85 p-8 shadow-panel backdrop-blur">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-tide">Dashboard</p>
            <h1 className="mt-2 text-4xl font-semibold">Export history</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600">
              This MVP tracks successful Markdown exports initiated from the popup. Batch jobs and multi-format export
              will land in later milestones.
            </p>
          </div>
          <div className="rounded-2xl bg-ink px-4 py-3 text-sm text-white">
            <div>{history.length} recent exports</div>
          </div>
        </div>

        {error ? <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Site</th>
                <th className="px-4 py-3 font-medium">Format</th>
                <th className="px-4 py-3 font-medium">Created At</th>
                <th className="px-4 py-3 font-medium">File</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={5}>
                    No exports yet. Run an export from the popup on a ChatGPT conversation page.
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id} className="border-t border-slate-200 bg-white/70">
                    <td className="px-4 py-4">{item.title}</td>
                    <td className="px-4 py-4 uppercase">{item.site}</td>
                    <td className="px-4 py-4">{item.format}</td>
                    <td className="px-4 py-4">{new Date(item.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-4 text-slate-500">{item.filename}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
