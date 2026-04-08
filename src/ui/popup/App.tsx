import { useEffect, useMemo, useState } from 'react';
import type { ConversationSummary, ExportFormat, SupportedSite } from '../../core/types';
import type { RuntimeResponse } from '../../background/message-bus';
import { detectSupportedSiteFromUrl, hasSitePermissionForUrl, requestSitePermissionForUrl, requestTabsPermission } from '../../background/permissions';
import { languageOptions, translate } from '../shared/i18n';
import { useLanguage } from '../shared/hooks/useLanguage';
import { getSettings } from '../../storage/settings';

const exportFormats: Array<{ value: ExportFormat; label: string; hintKey: 'markdownHint' | 'pdfHint' | 'docxHint' | 'zipHint' }> = [
  { value: 'markdown', label: 'Markdown', hintKey: 'markdownHint' },
  { value: 'pdf', label: 'PDF', hintKey: 'pdfHint' },
  { value: 'docx', label: 'DOCX', hintKey: 'docxHint' },
  { value: 'zip', label: 'ZIP', hintKey: 'zipHint' }
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

type PopupLogItem = {
  id: string;
  text: string;
  level: 'info' | 'success' | 'error';
};

function getPresetSourceTabId(): number | null {
  const params = new URLSearchParams(globalThis.location.search);
  const value = params.get('sourceTabId');
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function callRuntime(message: { type: string; format?: ExportFormat; sourceTabId?: number; conversations?: ConversationSummary[] }): Promise<RuntimeResponse> {
  return chrome.runtime.sendMessage(message) as Promise<RuntimeResponse>;
}

export function PopupApp() {
  const { language, setLanguage, ready } = useLanguage();
  const isZh = language === 'zh-CN';
  const [sourceTabId, setSourceTabId] = useState<number | null>(() => getPresetSourceTabId());
  const [activeSite, setActiveSite] = useState<SupportedSite>('chatgpt');
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [progress, setProgress] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [logs, setLogs] = useState<PopupLogItem[]>([]);

  function pushLog(text: string, level: PopupLogItem['level'] = 'info') {
    setLogs((current) => [{ id: `${Date.now()}-${current.length}`, text, level }, ...current].slice(0, 10));
  }

  function startProgress(initialText: string) {
    setProgress(6);
    setStatusText(initialText);
    setLogs([]);
    pushLog(initialText);
  }

  function markStep(percent: number, text: string, level: PopupLogItem['level'] = 'info') {
    setProgress(percent);
    setStatusText(text);
    pushLog(text, level);
  }

  function completeProgress(text: string) {
    setProgress(100);
    setStatusText(text);
    pushLog(text, 'success');
  }

  function failProgress(text: string) {
    setStatusText(text);
    pushLog(text, 'error');
  }

  async function resolveSourceTab(): Promise<number | null> {
    const preset = getPresetSourceTabId();
    if (preset) {
      setSourceTabId(preset);
      return preset;
    }
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const tabId = tab?.id ?? null;
    setSourceTabId(tabId);
    return tabId;
  }

  async function refreshPageContext() {
    const tabId = await resolveSourceTab();
    if (!tabId) {
      setStatusText(translate(language, 'noActiveSiteTab'));
      setPermissionGranted(false);
      return;
    }

    const tab = await chrome.tabs.get(tabId);
    const detectedSite = detectSupportedSiteFromUrl(tab.url) ?? 'chatgpt';
    setActiveSite(detectedSite);

    const permission = await hasSitePermissionForUrl(tab.url);
    setPermissionGranted(permission.granted);

    const response = await callRuntime({ type: 'GET_ACTIVE_SITE_STATUS', sourceTabId: tabId });
    if (response.ok && 'status' in response) {
      setStatusText(response.status.message ?? translate(language, 'ready'));
      return;
    }

    setStatusText(response.ok ? translate(language, 'unknownResponse') : response.error);
  }

  useEffect(() => {
    if (!ready) return;
    setStatusText(translate(language, 'scanningCurrentTab'));
    void refreshPageContext();
  }, [language, ready]);

  useEffect(() => {
    void (async () => {
      const settings = await getSettings();
      setFormat(settings.preferredFormat);
    })();
  }, []);

  const conversationCountLabel = useMemo(() => {
    if (conversations.length === 0) return translate(language, 'noScanYet');
    return `${conversations.length} ${translate(language, 'detectedSuffix')}`;
  }, [conversations, language]);

  async function ensureSitePermission(needTabs = false) {
    if (!sourceTabId) {
      failProgress(translate(language, 'noActiveSiteTab'));
      return false;
    }

    markStep(14, isZh ? '正在检查站点权限...' : 'Checking site permission...');
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
    } catch (error) {
      failProgress(error instanceof Error ? error.message : (isZh ? '授权失败。' : 'Permission request failed.'));
    } finally {
      setBusy(false);
      await refreshPageContext();
    }
  }

  async function handleExportCurrent() {
    if (!sourceTabId || activeSite !== 'chatgpt') return;
    startProgress(translate(language, 'exportingCurrentAs', { format: format.toUpperCase() }));
    setBusy(true);
    try {
      if (!(await ensureSitePermission())) return;
      markStep(52, isZh ? '正在抓取当前会话内容...' : 'Capturing current conversation...');
      const response = await callRuntime({ type: 'EXPORT_CURRENT_CONVERSATION', format, sourceTabId });
      if (response.ok && 'conversation' in response) {
        markStep(90, isZh ? '导出内容已生成，正在落盘...' : 'Export artifact generated. Saving file...');
        completeProgress(translate(language, 'exportedConversation', { title: response.conversation.title }));
      } else {
        failProgress(response.ok ? translate(language, 'exportFinished') : response.error);
      }
    } catch (error) {
      failProgress(error instanceof Error ? error.message : (isZh ? '导出失败。' : 'Export failed.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleScan() {
    if (!sourceTabId || activeSite !== 'chatgpt') return;
    startProgress(translate(language, 'scanningSidebar'));
    setBusy(true);
    try {
      if (!(await ensureSitePermission())) return;
      markStep(52, isZh ? '正在读取 ChatGPT 侧边栏会话...' : 'Reading ChatGPT sidebar conversations...');
      const response = await callRuntime({ type: 'SCAN_CONVERSATIONS', sourceTabId });
      if (response.ok && 'conversations' in response) {
        setConversations(response.conversations);
        markStep(88, isZh ? `已识别 ${response.conversations.length} 个会话。` : `Recognized ${response.conversations.length} conversations.`);
        completeProgress(translate(language, 'scanCompleteFound', { count: response.conversations.length }));
      } else {
        failProgress(response.ok ? translate(language, 'scanFinished') : response.error);
      }
    } catch (error) {
      failProgress(error instanceof Error ? error.message : (isZh ? '扫描失败。' : 'Scan failed.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleExportAll() {
    if (!sourceTabId || activeSite !== 'chatgpt') return;
    startProgress(isZh ? '正在准备导出全部会话...' : 'Preparing to export all conversations...');
    setBusy(true);
    try {
      if (!(await ensureSitePermission(true))) return;
      let selected = conversations;
      if (selected.length === 0) {
        markStep(52, isZh ? '本地没有扫描结果，先自动扫描...' : 'No local scan result. Starting an automatic scan first...');
        const scanResponse = await callRuntime({ type: 'SCAN_CONVERSATIONS', sourceTabId });
        if (!(scanResponse.ok && 'conversations' in scanResponse)) {
          failProgress(scanResponse.ok ? translate(language, 'scanFinished') : scanResponse.error);
          return;
        }
        setConversations(scanResponse.conversations);
        selected = scanResponse.conversations;
      }

      markStep(68, isZh ? `准备导出 ${selected.length} 个会话...` : `Preparing ${selected.length} conversations for export...`);
      const response = await callRuntime({ type: 'EXPORT_SELECTED_CONVERSATIONS', sourceTabId, format, conversations: selected });
      if (response.ok && 'batch' in response) {
        markStep(92, isZh ? '批量归档已生成，正在落盘...' : 'Batch archive generated. Saving file...');
        completeProgress(translate(language, 'batchReady', { filename: response.batch.archiveFilename, success: response.batch.exportedCount, failed: response.batch.failedCount }));
      } else {
        failProgress(response.ok ? translate(language, 'exportFinished') : response.error);
      }
    } catch (error) {
      failProgress(error instanceof Error ? error.message : (isZh ? '批量导出失败。' : 'Batch export failed.'));
    } finally {
      setBusy(false);
    }
  }

  async function openDashboard() {
    await callRuntime({ type: 'OPEN_DASHBOARD' });
  }

  const isSupportedSite = activeSite === 'chatgpt';

  return (
    <main className="w-[500px] min-h-screen bg-transparent p-4 text-ink">
      <section className="overflow-hidden rounded-[30px] border border-white/70 bg-white/85 shadow-panel backdrop-blur">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(230,126,34,0.22),_transparent_35%),linear-gradient(135deg,_#10233b,_#1e3556)] px-5 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <img src="/logo.png" alt="AI Chat Exporter" className="h-14 w-14 shrink-0 rounded-2xl border border-white/20 bg-white/10 object-cover shadow-lg" />
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.32em] text-white/70">AI Chat Exporter</p>
                <h1 className="mt-2 text-2xl font-semibold">{translate(language, 'exportCenter')}</h1>
                <p className="mt-2 max-w-[260px] text-sm leading-6 text-white/75">{isZh ? '这是一个可移动的小窗，权限弹窗不会再把它直接关掉。' : 'This is a movable mini window, so permission prompts will not close it immediately.'}</p>
              </div>
            </div>
            <div className="w-[124px] shrink-0">
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
        </div>

        <div className="p-5">
          {!isSupportedSite ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              {isZh ? `${siteOptions.find((item) => item.value === activeSite)?.label} 导出页已预留，适配器还在开发中。` : `${siteOptions.find((item) => item.value === activeSite)?.label} export page is reserved. The adapter is still in progress.`}
            </div>
          ) : (
            <>
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

              {!permissionGranted ? (
                <button type="button" onClick={() => void handleGrantPermission()} disabled={busy || !sourceTabId} className="mt-4 w-full rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:bg-slate-100">
                  {isZh ? '先授权当前站点' : 'Grant current site first'}
                </button>
              ) : null}

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-slate-800">{isZh ? '执行进度' : 'Execution progress'}</div>
                  <div className="text-xs text-slate-500">{progress}%</div>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-amber-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-3 max-h-36 overflow-auto rounded-xl bg-white px-3 py-2 text-xs text-slate-600">
                  {logs.length === 0 ? (
                    <div>{isZh ? '点击按钮后，这里会持续显示每一步：权限、扫描、抓取、导出、落盘。' : 'After you click a button, each step will appear here: permission, scan, capture, export, save.'}</div>
                  ) : (
                    <ul className="space-y-1.5">
                      {logs.map((item) => (
                        <li key={item.id} className={item.level === 'error' ? 'text-red-600' : item.level === 'success' ? 'text-emerald-700' : 'text-slate-600'}>{item.text}</li>
                      ))}
                    </ul>
                  )}
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
                <button type="button" onClick={() => void handleExportAll()} disabled={busy || !sourceTabId} className="rounded-2xl bg-amber-500 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-slate-300">{isZh ? '导出全部会话' : 'Export all conversations'}</button>
                <button type="button" onClick={() => void openDashboard()} className="rounded-2xl border border-transparent bg-amber-100 px-4 py-3 text-sm font-medium text-amber-900 transition hover:bg-amber-200">{translate(language, 'openFullDashboard')}</button>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}


