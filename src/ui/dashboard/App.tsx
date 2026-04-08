import { useEffect, useMemo, useState } from 'react';
import type { ConversationSummary, ExportFormat, ExportHistoryRecord, ExportJobRecord, SupportedSite } from '../../core/types';
import type { RuntimeResponse } from '../../background/message-bus';
import { detectSupportedSiteFromUrl, hasSitePermissionForUrl, requestSitePermissionForUrl, requestTabsPermission } from '../../background/permissions';
import { languageOptions, translate } from '../shared/i18n';
import { useLanguage } from '../shared/hooks/useLanguage';

const exportFormats: Array<{ value: ExportFormat; label: string }> = [
  { value: 'markdown', label: 'Markdown' },
  { value: 'pdf', label: 'PDF' },
  { value: 'docx', label: 'DOCX' },
  { value: 'zip', label: 'zip' }
];

const siteOptions: Array<{ value: SupportedSite; label: string }> = [
  { value: 'chatgpt', label: 'ChatGPT' },
  { value: 'claude', label: 'Claude' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'kimi', label: 'Kimi' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'grok', label: 'Grok' },
  { value: 'doubao', label: '豆包' },
  { value: 'qianwen', label: '千问' },
  { value: 'yiyan', label: '文心一言' }
];

type DashboardLogItem = {
  id: string;
  text: string;
  level: 'info' | 'success' | 'error';
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  const isZh = language === 'zh-CN';
  const [sourceTabId] = useState<number | null>(() => getSourceTabId());
  const [activeSite, setActiveSite] = useState<SupportedSite>('chatgpt');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [history, setHistory] = useState<ExportHistoryRecord[]>([]);
  const [jobs, setJobs] = useState<ExportJobRecord[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [scanMessage, setScanMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<DashboardLogItem[]>([]);

  function pushLog(text: string, level: DashboardLogItem['level'] = 'info') {
    setLogs((current) => [{ id: `${Date.now()}-${current.length}`, text, level }, ...current].slice(0, 14));
  }

  function startProgress(text: string) {
    setProgress(6);
    setScanMessage(text);
    setLogs([]);
    setError('');
    pushLog(text);
  }

  function markStep(percent: number, text: string, level: DashboardLogItem['level'] = 'info') {
    setProgress(percent);
    setScanMessage(text);
    if (level === 'error') setError(text);
    pushLog(text, level);
  }

  function completeProgress(text: string) {
    setProgress(100);
    setScanMessage(text);
    pushLog(text, 'success');
  }

  function failProgress(text: string) {
    setScanMessage(text);
    setError(text);
    pushLog(text, 'error');
  }

  useEffect(() => {
    void refreshPageContext();
  }, [language, sourceTabId]);

  async function refreshPageContext() {
    if (sourceTabId) {
      const tab = await chrome.tabs.get(sourceTabId);
      setActiveSite(detectSupportedSiteFromUrl(tab.url) ?? 'chatgpt');
      const permission = await hasSitePermissionForUrl(tab.url);
      setPermissionGranted(permission.granted);
    }
    setScanMessage(translate(language, 'scanPopulate'));
    await refreshHistoryAndJobs();
  }

  async function refreshHistoryAndJobs() {
    const [historyResponse, jobsResponse] = await Promise.all([callRuntime({ type: 'LIST_EXPORT_HISTORY' }), callRuntime({ type: 'LIST_EXPORT_JOBS' })]);
    if (historyResponse.ok && 'history' in historyResponse) setHistory(historyResponse.history);
    if (jobsResponse.ok && 'jobs' in jobsResponse) setJobs(jobsResponse.jobs);
  }

  async function ensurePermissions(needTabs = false) {
    if (!sourceTabId) {
      failProgress(translate(language, 'sourceTabMissing'));
      return false;
    }

    markStep(14, isZh ? '正在检查当前站点权限...' : 'Checking current site permission...');
    const tab = await chrome.tabs.get(sourceTabId);
    const currentPermission = await hasSitePermissionForUrl(tab.url);
    if (!currentPermission.granted) {
      markStep(22, isZh ? '正在申请当前站点权限...' : 'Requesting current site permission...');
      const requested = await requestSitePermissionForUrl(tab.url);
      setPermissionGranted(requested.granted);
      if (!requested.granted) {
        failProgress(isZh ? '当前站点权限未授权，流程已停止。' : 'Current site permission was not granted. The flow stopped.');
        return false;
      }
    }

    setPermissionGranted(true);
    markStep(30, isZh ? '站点权限已确认。' : 'Site permission confirmed.');

    if (needTabs) {
      markStep(38, isZh ? '正在检查批量导出权限...' : 'Checking batch export permission...');
      const tabsGranted = await requestTabsPermission();
      if (!tabsGranted) {
        failProgress(isZh ? '批量导出需要 tabs 权限。' : 'Batch export needs tabs permission.');
        return false;
      }
      markStep(46, isZh ? '批量导出权限已确认。' : 'Batch export permission confirmed.');
    }

    return true;
  }

  async function handleGrantPermission() {
    if (!sourceTabId) return;
    startProgress(isZh ? '正在申请当前站点权限...' : 'Requesting current site permission...');
    setBusy(true);
    try {
      const tab = await chrome.tabs.get(sourceTabId);
      const permission = await requestSitePermissionForUrl(tab.url);
      setPermissionGranted(permission.granted);
      if (permission.granted) {
        completeProgress(isZh ? '当前站点权限已授权。' : 'Current site permission granted.');
      } else {
        failProgress(isZh ? '当前站点权限未授权。' : 'Current site permission not granted.');
      }
    } catch (grantError) {
      failProgress(grantError instanceof Error ? grantError.message : (isZh ? '授权失败。' : 'Permission request failed.'));
    } finally {
      setBusy(false);
      await refreshPageContext();
    }
  }

  async function trackBatchProgress(selected: ConversationSummary[], startedAt: number, stopSignal: { done: boolean }) {
    const targetIds = new Set(selected.map((item) => item.id));

    while (!stopSignal.done) {
      const jobsResponse = await callRuntime({ type: 'LIST_EXPORT_JOBS' });
      if (jobsResponse.ok && 'jobs' in jobsResponse) {
        const relatedJobs = jobsResponse.jobs.filter((job) => targetIds.has(job.conversationId) && new Date(job.createdAt).getTime() >= startedAt - 1000);
        if (relatedJobs.length > 0) {
          const finished = relatedJobs.filter((job) => job.status === 'completed' || job.status === 'failed').length;
          const running = relatedJobs.filter((job) => job.status === 'running').length;
          const percent = 52 + Math.min(42, Math.round((finished / selected.length) * 42));
          markStep(percent, isZh ? `批量处理中：已完成/失败 ${finished}，进行中 ${running}，总数 ${selected.length}。` : `Batch progress: ${finished} finished/failed, ${running} running, ${selected.length} total.`);
        }
      }
      await delay(700);
    }
  }

  async function handleScan(kind: 'default' | 'team' = 'default') {
    if (activeSite !== 'chatgpt') return;
    startProgress(kind === 'team' ? (isZh ? '正在准备扫描 ChatGPT Team 工作空间...' : 'Preparing to scan the ChatGPT Team workspace...') : translate(language, 'scanningSidebar'));
    setBusy(true);

    try {
      if (!(await ensurePermissions())) return;
      markStep(56, kind === 'team' ? (isZh ? '正在读取 Team 工作空间会话...' : 'Reading Team workspace conversations...') : (isZh ? '正在读取 ChatGPT 侧边栏会话...' : 'Reading ChatGPT sidebar conversations...'));
      const response = await callRuntime({ type: 'SCAN_CONVERSATIONS', sourceTabId });
      if (response.ok && 'conversations' in response) {
        setConversations(response.conversations);
        setSelectedIds(response.conversations.slice(0, 5).map((item) => item.id));
        markStep(88, isZh ? `已识别 ${response.conversations.length} 个会话。` : `Recognized ${response.conversations.length} conversations.`);
        completeProgress(kind === 'team' ? (isZh ? `Team 工作空间扫描完成，共找到 ${response.conversations.length} 个会话。` : `Team workspace scan complete. Found ${response.conversations.length} conversations.`) : translate(language, 'foundConversationsPreset', { count: response.conversations.length }));
      } else {
        failProgress(response.ok ? translate(language, 'unknownScanResponse') : response.error);
      }
    } catch (scanError) {
      failProgress(scanError instanceof Error ? scanError.message : (isZh ? '扫描失败。' : 'Scan failed.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleBatchExport(selectedOverride?: ConversationSummary[]) {
    if (activeSite !== 'chatgpt') return;
    const selected = selectedOverride ?? conversations.filter((item) => selectedIds.includes(item.id));
    startProgress(translate(language, 'exportingSelectedAs', { count: selected.length, format: format.toUpperCase() }));
    setBusy(true);

    try {
      if (!(await ensurePermissions(true))) return;
      if (selected.length === 0) {
        failProgress(translate(language, 'selectAtLeastOne'));
        return;
      }

      markStep(56, isZh ? `正在发起 ${selected.length} 个会话的批量导出...` : `Starting batch export for ${selected.length} conversations...`);
      const stopSignal = { done: false };
      const startedAt = Date.now();
      const tracker = trackBatchProgress(selected, startedAt, stopSignal);
      const response = await callRuntime({ type: 'EXPORT_SELECTED_CONVERSATIONS', sourceTabId, format, conversations: selected });
      stopSignal.done = true;
      await tracker;

      if (response.ok && 'batch' in response) {
        markStep(94, isZh ? '批量归档已生成，正在落盘...' : 'Batch archive generated. Saving file...');
        completeProgress(translate(language, 'batchReady', { filename: response.batch.archiveFilename, success: response.batch.exportedCount, failed: response.batch.failedCount }));
        if (response.batch.savedAs) {
          pushLog(translate(language, 'batchSavedAs', { path: response.batch.savedAs }), 'success');
        }
        await refreshHistoryAndJobs();
      } else {
        failProgress(response.ok ? translate(language, 'unknownBatchResponse') : response.error);
      }
    } catch (batchError) {
      failProgress(batchError instanceof Error ? batchError.message : (isZh ? '批量导出失败。' : 'Batch export failed.'));
    } finally {
      setBusy(false);
    }
  }

  function toggleConversation(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function handleOpenDownload(item: ExportHistoryRecord, mode: 'file' | 'folder') {
    if (!item.downloadId) return;
    if (mode === 'file') {
      await chrome.downloads.open(item.downloadId);
      return;
    }
    await chrome.downloads.show(item.downloadId);
  }

  function toggleSelectAll() {
    setSelectedIds((current) => current.length === conversations.length ? [] : conversations.map((item) => item.id));
  }

  const stats = useMemo(() => ({
    completed: jobs.filter((item) => item.status === 'completed').length,
    running: jobs.filter((item) => item.status === 'running').length,
    failed: jobs.filter((item) => item.status === 'failed').length
  }), [jobs]);

  const allSelected = conversations.length > 0 && selectedIds.length === conversations.length;
  const isSupportedSite = activeSite === 'chatgpt';

  return (
    <main className="min-h-screen bg-transparent px-6 py-8 text-ink">
      <div className="mx-auto max-w-6xl rounded-[36px] border border-white/70 bg-white/85 p-8 shadow-panel backdrop-blur">
        <section className="rounded-[28px] bg-[radial-gradient(circle_at_top_left,_rgba(230,126,34,0.22),_transparent_28%),linear-gradient(135deg,_#10233b,_#1e3556)] p-8 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <img src="/logo.png" alt="AI Chat Exporter" className="h-16 w-16 rounded-3xl border border-white/20 bg-white/10 object-cover shadow-lg" />
              <div>
                <p className="text-xs uppercase tracking-[0.34em] text-white/65">AI Chat Exporter Dashboard</p>
                <h1 className="mt-4 text-4xl font-semibold">{translate(language, 'dashboardTitle')}</h1>
                <p className="mt-3 max-w-3xl text-sm text-white/75">{translate(language, 'dashboardIntro')}</p>
              </div>
            </div>
            <div className="min-w-[120px]">
              <div className="mb-2 text-[11px] uppercase tracking-[0.2em] text-white/60">{translate(language, 'language')}</div>
              <select value={language} onChange={(event) => void setLanguage(event.target.value as 'zh-CN' | 'en')} className="w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none">
                {languageOptions.map((option) => <option key={option.value} value={option.value} className="text-black">{option.label}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {siteOptions.map((site) => (
              <button key={site.value} type="button" onClick={() => setActiveSite(site.value)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${activeSite === site.value ? 'bg-white text-slate-900' : 'bg-white/10 text-white/75 hover:bg-white/20'}`}>
                {site.label}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
            <div className="rounded-2xl bg-white/10 px-4 py-3">{translate(language, 'completed')}: {stats.completed}</div>
            <div className="rounded-2xl bg-white/10 px-4 py-3">{translate(language, 'running')}: {stats.running}</div>
            <div className="rounded-2xl bg-white/10 px-4 py-3">{translate(language, 'failed')}: {stats.failed}</div>
          </div>
        </section>

        {!isSupportedSite ? (
          <section className="mt-8 rounded-[28px] border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
            {isZh ? `${siteOptions.find((item) => item.value === activeSite)?.label} 页面和导出入口已预留，适配器还在开发中。` : `${siteOptions.find((item) => item.value === activeSite)?.label} page and export entry are reserved. The adapter is still in progress.`}
          </section>
        ) : (
          <div className="mt-8 grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-tide">{translate(language, 'conversationScan')}</p>
                  <h2 className="mt-2 text-2xl font-semibold">{translate(language, 'selectWhatToExport')}</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void handleScan('default')} disabled={busy} className="rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300">{busy ? translate(language, 'working') : translate(language, 'scanChatGptSidebar')}</button>
                  <button type="button" onClick={() => void handleScan('team')} disabled={busy} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100">{isZh ? '扫描 Team 工作空间' : 'Scan Team workspace'}</button>
                </div>
              </div>

              {!permissionGranted ? (
                <button type="button" onClick={() => void handleGrantPermission()} disabled={busy || !sourceTabId} className="mt-4 w-full rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:bg-slate-100">
                  {isZh ? '先授权当前站点' : 'Grant current site first'}
                </button>
              ) : null}

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-slate-800">{isZh ? '执行进度' : 'Execution progress'}</div>
                  <div className="text-xs text-slate-500">{progress}%</div>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-amber-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-3 max-h-36 overflow-auto rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  {logs.length === 0 ? (
                    <div>{isZh ? '点击扫描或导出后，这里会持续显示每一步：权限、扫描、抓取、导出、落盘。' : 'After you click scan or export, each step will appear here: permission, scan, capture, export, save.'}</div>
                  ) : (
                    <ul className="space-y-1.5">
                      {logs.map((item) => (
                        <li key={item.id} className={item.level === 'error' ? 'text-red-600' : item.level === 'success' ? 'text-emerald-700' : 'text-slate-600'}>{item.text}</li>
                      ))}
                    </ul>
                  )}
                </div>
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
                <div className="flex gap-2 items-center">
                  <span>{translate(language, 'selectedCount', { count: selectedIds.length })}</span>
                  <button type="button" onClick={toggleSelectAll} className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-100">{allSelected ? (isZh ? '取消全选' : 'Clear all') : (isZh ? '全选聊天' : 'Select all')}</button>
                </div>
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

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => void handleBatchExport()} disabled={busy || selectedIds.length === 0} className="rounded-2xl bg-amber-500 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-slate-300">{busy ? translate(language, 'exportingBatch') : translate(language, 'exportSelectedConversations')}</button>
                <button type="button" onClick={() => void handleBatchExport(conversations)} disabled={busy || conversations.length === 0} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100">{isZh ? '导出全部聊天' : 'Export all chats'}</button>
              </div>
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
                <p className="mt-2 text-xs text-slate-500">{translate(language, 'browserDownloadNote')}</p>
                <div className="mt-4 space-y-3">
                  {history.length === 0 ? <div className="rounded-2xl bg-white px-4 py-5 text-sm text-slate-500">{translate(language, 'noExportsYet')}</div> : history.slice(0, 8).map((item) => (
                    <div key={item.id} className="rounded-2xl bg-white px-4 py-4">
                      <div className="truncate text-sm font-medium text-slate-900">{item.title}</div>
                      <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500"><span>{item.filename}</span><span>{new Date(item.createdAt).toLocaleString()}</span></div>

                      <div className="mt-2 text-xs text-slate-500">
                        <span className="font-medium text-slate-700">{translate(language, 'savedAs')}:</span>{' '}
                        <span className="break-all">{item.savedAs ?? translate(language, 'unavailableDownloadPath')}</span>
                      </div>
                      {item.downloadId ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button type="button" onClick={() => void handleOpenDownload(item, 'file')} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100">
                            {translate(language, 'openFile')}
                          </button>
                          <button type="button" onClick={() => void handleOpenDownload(item, 'folder')} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100">
                            {translate(language, 'openFolder')}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}


