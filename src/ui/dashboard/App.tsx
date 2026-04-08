import { useEffect, useMemo, useState } from 'react';
import type { ExportHistoryRecord, ExportJobRecord } from '../../core/types';
import type { RuntimeResponse } from '../../background/message-bus';

async function callRuntime(message: { type: string }): Promise<RuntimeResponse> {
  return chrome.runtime.sendMessage(message) as Promise<RuntimeResponse>;
}

export function DashboardApp() {
  const [history, setHistory] = useState<ExportHistoryRecord[]>([]);
  const [jobs, setJobs] = useState<ExportJobRecord[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    void (async () => {
      const [historyResponse, jobsResponse] = await Promise.all([
        callRuntime({ type: 'LIST_EXPORT_HISTORY' }),
        callRuntime({ type: 'LIST_EXPORT_JOBS' })
      ]);

      if (historyResponse.ok && 'history' in historyResponse) {
        setHistory(historyResponse.history);
      } else {
        setError(historyResponse.ok ? 'Unknown history response.' : historyResponse.error);
      }

      if (jobsResponse.ok && 'jobs' in jobsResponse) {
        setJobs(jobsResponse.jobs);
      } else if (!('history' in jobsResponse)) {
        setError((current) => current || (jobsResponse.ok ? 'Unknown jobs response.' : jobsResponse.error));
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const completed = jobs.filter((item) => item.status === 'completed').length;
    const running = jobs.filter((item) => item.status === 'running').length;
    const failed = jobs.filter((item) => item.status === 'failed').length;
    return { completed, running, failed };
  }, [jobs]);

  return (
    <main className="min-h-screen bg-transparent px-6 py-8 text-ink">
      <div className="mx-auto max-w-5xl rounded-[32px] border border-white/60 bg-white/85 p-8 shadow-panel backdrop-blur">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-tide">Dashboard</p>
            <h1 className="mt-2 text-4xl font-semibold">History and jobs</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-600">
              Current ChatGPT export supports Markdown, PDF, DOCX, and ZIP bundle output. Jobs are recorded locally so
              you can inspect recent runs and failures.
            </p>
          </div>
          <div className="grid gap-2 text-sm text-white sm:grid-cols-3">
            <div className="rounded-2xl bg-ink px-4 py-3">Completed: {stats.completed}</div>
            <div className="rounded-2xl bg-slate-700 px-4 py-3">Running: {stats.running}</div>
            <div className="rounded-2xl bg-red-500 px-4 py-3">Failed: {stats.failed}</div>
          </div>
        </div>

        {error ? <p className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent jobs</h2>
            <span className="text-sm text-slate-500">{jobs.length} recorded</span>
          </div>
          <div className="overflow-hidden rounded-3xl border border-slate-200">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Format</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3 font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={5}>
                      No jobs yet. Start an export from the popup.
                    </td>
                  </tr>
                ) : (
                  jobs.map((item) => (
                    <tr key={item.id} className="border-t border-slate-200 bg-white/70">
                      <td className="px-4 py-4">{item.title}</td>
                      <td className="px-4 py-4 uppercase">{item.format}</td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs uppercase text-slate-700">{item.status}</span>
                      </td>
                      <td className="px-4 py-4">{new Date(item.updatedAt).toLocaleString()}</td>
                      <td className="px-4 py-4 text-slate-500">{item.error ?? '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent files</h2>
            <span className="text-sm text-slate-500">{history.length} exports</span>
          </div>
          <div className="overflow-hidden rounded-3xl border border-slate-200">
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
        </section>
      </div>
    </main>
  );
}
