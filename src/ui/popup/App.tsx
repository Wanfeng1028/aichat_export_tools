import { useEffect, useMemo, useState } from 'react';
import type { ChatConversation, ConversationSummary, ExportFormat, SupportedSite } from '../../core/types';
import type { RuntimeResponse } from '../../background/message-bus';
import { detectSupportedSiteFromUrl, hasSitePermissionForUrl, hasTabsPermission, requestPermissionsForUrl } from '../../background/permissions';
import { languageOptions, translate } from '../shared/i18n';
import { useLanguage } from '../shared/hooks/useLanguage';
import { getSettings } from '../../storage/settings';
import { clearScannedConversationCache, getScannedConversationCache, setScannedConversationCache, subscribeScannedConversationCache } from '../../storage/scanned-conversations';

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

function getPopupParams(): { sourceTabId: number | null; embedded: boolean } {
  const params = new URLSearchParams(globalThis.location.search);
  const value = params.get('sourceTabId');
  const parsed = value ? Number(value) : NaN;
  return {
    sourceTabId: Number.isFinite(parsed) ? parsed : null,
    embedded: params.get('embedded') === '1'
  };
}

async function callRuntime(message: Record<string, unknown>): Promise<RuntimeResponse> {
  return chrome.runtime.sendMessage(message) as Promise<RuntimeResponse>;
}

export function PopupApp() {
  const { language, setLanguage, ready } = useLanguage();
  const isZh = language === 'zh-CN';
  const popupParams = getPopupParams();
  const [sourceTabId, setSourceTabId] = useState<number | null>(popupParams.sourceTabId);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [sourceSite, setSourceSite] = useState<SupportedSite>('chatgpt');
  const [activeSite, setActiveSite] = useState<SupportedSite>('chatgpt');
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [progress, setProgress] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [logs, setLogs] = useState<PopupLogItem[]>([]);
  const [_previewConversation, setPreviewConversation] = useState<ChatConversation | null>(null);

  const currentSiteMatches = activeSite === sourceSite;
  const supportsConversationScan = currentSiteMatches;
  const supportsBatch = currentSiteMatches;

  function pushLog(text: string, level: PopupLogItem['level'] = 'info') {
    setLogs((current) => [{ id: `${Date.now()}-${current.length}`, text, level }, ...current].slice(0, 12));
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
    if (popupParams.sourceTabId) {
      setSourceTabId(popupParams.sourceTabId);
      return popupParams.sourceTabId;
    }

    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const tabId = tab?.id ?? null;
    setSourceTabId(tabId);
    return tabId;
  }

  async function syncCacheForSite(tabId: number, site: SupportedSite) {
    const cache = await getScannedConversationCache(tabId);
    if (!cache || cache.site === site) {
      setConversations(cache?.conversations ?? []);
      return;
    }

    await clearScannedConversationCache(tabId);
    setConversations([]);
  }

  async function refreshPageContext() {
    const tabId = await resolveSourceTab();
    if (!tabId) {
      setStatusText(translate(language, 'noActiveSiteTab'));
      setSourceUrl(null);
      setPermissionGranted(false);
      setConversations([]);
      return;
    }

    const tab = await chrome.tabs.get(tabId);
    const nextUrl = tab.url ?? null;
    const detectedSite = detectSupportedSiteFromUrl(nextUrl) ?? 'chatgpt';
    setSourceUrl(nextUrl);
    setSourceSite(detectedSite);
    setActiveSite(detectedSite);

    const permission = await hasSitePermissionForUrl(nextUrl);
    setPermissionGranted(permission.granted);
    await syncCacheForSite(tabId, detectedSite);

    const response = await callRuntime({ type: 'GET_ACTIVE_SITE_STATUS', sourceTabId: tabId });
    if (response.ok && 'status' in response) {
      setStatusText(response.status.message ?? translate(language, 'ready'));
      return;
    }

    setStatusText(response.ok ? translate(language, 'unknownResponse') : response.error);
  }

  async function getCurrentStatus() {
    if (!sourceTabId) return null;
    const response = await callRuntime({ type: 'GET_ACTIVE_SITE_STATUS', sourceTabId });
    if (response.ok && 'status' in response) return response.status;
    if (!response.ok) throw new Error(response.error);
    return null;
  }

  async function ensureSitePermission(needTabs = false) {
    if (!sourceTabId || !sourceUrl) {
      failProgress(translate(language, 'noActiveSiteTab'));
      return false;
    }

    const tabsGranted = needTabs ? await hasTabsPermission() : true;
    if (permissionGranted && tabsGranted) {
      return true;
    }

    markStep(14, isZh ? '正在检查站点权限...' : 'Checking site permission...');
    markStep(22, needTabs ? (isZh ? '正在申请站点和批量导出权限...' : 'Requesting site and batch export permissions...') : (isZh ? '正在申请当前站点权限...' : 'Requesting current site permission...'));
    const requested = await requestPermissionsForUrl(sourceUrl, { tabs: needTabs });
    setPermissionGranted(requested.granted);
    if (!requested.granted) {
      failProgress(needTabs ? (isZh ? '当前流程需要站点与 tabs 权限，授权未完成。' : 'This flow needs site and tabs permissions, but the request was not granted.') : (isZh ? '当前站点权限未授权，流程已停止。' : 'Current site permission was not granted. The flow stopped.'));
      return false;
    }

    setPermissionGranted(true);
    markStep(needTabs ? 46 : 30, needTabs ? (isZh ? '站点和批量导出权限已确认。' : 'Site and batch export permissions confirmed.') : (isZh ? '站点权限已确认。' : 'Site permission confirmed.'));
    return true;
  }

  async function scanConversationsForSite(autoMode = false): Promise<ConversationSummary[]> {
    if (!sourceTabId) return [];
    if (autoMode) {
      markStep(52, isZh ? '当前页面不是会话详情，正在改为扫描会话列表...' : 'This page is not a conversation detail view. Scanning the conversation list instead...');
    } else {
      markStep(52, translate(language, 'scanningConversationList'));
    }

    const response = await callRuntime({ type: 'SCAN_CONVERSATIONS', sourceTabId });
    if (!(response.ok && 'conversations' in response)) {
      throw new Error(response.ok ? translate(language, 'scanFinished') : response.error);
    }

    setConversations(response.conversations);
    await setScannedConversationCache(sourceTabId, sourceSite, response.conversations);
    return response.conversations;
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

  useEffect(() => {
    if (!sourceTabId) {
      setConversations([]);
      return;
    }

    let cancelled = false;
    void getScannedConversationCache(sourceTabId).then(async (cache) => {
      if (cancelled) return;
      if (!cache || cache.site === sourceSite) {
        setConversations(cache?.conversations ?? []);
        return;
      }
      await clearScannedConversationCache(sourceTabId);
      if (!cancelled) setConversations([]);
    });

    const unsubscribe = subscribeScannedConversationCache(sourceTabId, (cache) => {
      if (cancelled) return;
      if (!cache || cache.site === sourceSite) {
        setConversations(cache?.conversations ?? []);
        return;
      }
      void clearScannedConversationCache(sourceTabId);
      setConversations([]);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [sourceSite, sourceTabId]);

  useEffect(() => {
    if (!sourceTabId) return;

    const handleUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (tabId !== sourceTabId) return;
      if (!changeInfo.url && changeInfo.status !== 'complete') return;
      void refreshPageContext();
    };

    const handleRemoved = (tabId: number) => {
      if (tabId !== sourceTabId) return;
      setSourceTabId(null);
      setSourceUrl(null);
      setConversations([]);
      setPermissionGranted(false);
      setStatusText(translate(language, 'sourceTabMissing'));
    };

    chrome.tabs.onUpdated.addListener(handleUpdated);
    chrome.tabs.onRemoved.addListener(handleRemoved);
    return () => {
      chrome.tabs.onUpdated.removeListener(handleUpdated);
      chrome.tabs.onRemoved.removeListener(handleRemoved);
    };
  }, [language, sourceTabId]);

  const conversationCountLabel = useMemo(() => {
    if (!currentSiteMatches) {
      return isZh ? '等待切换源标签页' : 'Waiting for matching tab';
    }
    if (conversations.length === 0) return translate(language, 'noScanYet');
    return `${conversations.length} ${translate(language, 'detectedSuffix')}`;
  }, [conversations, currentSiteMatches, language, isZh]);

  async function handleGrantPermission() {
    if (!sourceTabId || !sourceUrl || !currentSiteMatches) return;
    startProgress(isZh ? '正在申请当前站点权限...' : 'Requesting current site permission...');
    setBusy(true);
    try {
      const permission = await requestPermissionsForUrl(sourceUrl);
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
    if (!sourceTabId || !currentSiteMatches) return;
    startProgress(translate(language, 'exportingCurrentAs', { format: format.toUpperCase() }));
    setBusy(true);
    try {
      const status = await getCurrentStatus();
      const needsFallback = !status?.canExportCurrentConversation;
      if (!(await ensureSitePermission(needsFallback))) return;

      if (!needsFallback) {
        markStep(52, isZh ? '正在抓取当前会话内容...' : 'Capturing current conversation...');
        const response = await callRuntime({ type: 'EXPORT_CURRENT_CONVERSATION', format, sourceTabId });
        if (response.ok && 'conversation' in response) {
          setPreviewConversation(response.conversation);
          markStep(90, isZh ? '导出内容已生成，正在落盘...' : 'Export artifact generated. Saving file...');
          completeProgress(translate(language, 'exportedConversation', { title: response.conversation.title }));
          return;
        }
        failProgress(response.ok ? translate(language, 'exportFinished') : response.error);
        return;
      }

      if (!supportsConversationScan) {
        failProgress(isZh ? '当前页面无法直接导出，且当前站点暂不支持会话列表回退导出。' : 'The current page cannot be exported directly, and conversation-list fallback export is not supported for this site yet.');
        return;
      }

      const scanned = conversations.length > 0 ? conversations : await scanConversationsForSite(true);
      const fallback = scanned[0];
      if (!fallback) {
        failProgress(isZh ? '没有找到可回退导出的会话。' : 'No fallback conversation was found.');
        return;
      }

      markStep(76, isZh ? `当前页面是新对话，改为导出首条会话：${fallback.title}` : `This is a new-chat page. Exporting the first conversation instead: ${fallback.title}`);
      const response = await callRuntime({ type: 'EXPORT_CONVERSATION_FROM_SUMMARY', format, sourceTabId, summary: fallback });
      if (response.ok && 'conversation' in response) {
        setPreviewConversation(response.conversation);
        markStep(92, isZh ? '导出内容已生成，正在落盘...' : 'Export artifact generated. Saving file...');
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
    if (!sourceTabId || !supportsConversationScan) return;
    startProgress(translate(language, 'scanningSidebar'));
    setBusy(true);
    try {
      if (!(await ensureSitePermission())) return;
      const scanned = await scanConversationsForSite(false);
      markStep(88, isZh ? `已识别 ${scanned.length} 个会话。` : `Recognized ${scanned.length} conversations.`);
      completeProgress(translate(language, 'scanCompleteFound', { count: scanned.length }));
    } catch (error) {
      failProgress(error instanceof Error ? error.message : (isZh ? '扫描失败。' : 'Scan failed.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleExportAll() {
    if (!sourceTabId || !supportsBatch) return;
    startProgress(isZh ? '正在准备批量导出...' : 'Preparing batch export...');
    setBusy(true);
    try {
      if (!(await ensureSitePermission(true))) return;
      let selected = conversations;
      if (selected.length === 0) {
        const scanned = await scanConversationsForSite(true);
        selected = scanned.slice(0, 5);
        markStep(68, isZh ? `当前页面是新对话，默认改为导出前 ${selected.length} 条会话。` : `This is a new-chat page. Defaulting to the first ${selected.length} conversations.`);
      } else {
        markStep(68, isZh ? `准备导出 ${selected.length} 个会话...` : `Preparing ${selected.length} conversations for export...`);
      }

      if (selected.length === 0) {
        failProgress(isZh ? '没有找到可导出的会话。' : 'No exportable conversations were found.');
        return;
      }

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
    await callRuntime({ type: 'OPEN_DASHBOARD', sourceTabId: sourceTabId ?? undefined });
  }

  const shellClassName = popupParams.embedded ? 'w-full min-h-full bg-transparent p-0 text-ink' : 'w-[500px] min-h-screen bg-transparent p-4 text-ink';
  const cardClassName = popupParams.embedded ? 'h-full overflow-hidden rounded-none border-0 bg-white/92 shadow-none backdrop-blur' : 'overflow-hidden rounded-[30px] border border-white/70 bg-white/85 shadow-panel backdrop-blur';
  const selectedSiteLabel = siteOptions.find((site) => site.value === activeSite)?.label ?? activeSite;
  const sourceSiteLabel = siteOptions.find((site) => site.value === sourceSite)?.label ?? sourceSite;

  return (
    <main className={shellClassName}>
      <section className={cardClassName}>
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(230,126,34,0.22),_transparent_35%),linear-gradient(135deg,_#10233b,_#1e3556)] px-5 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <img src="/logo.png" alt="AI Chat Exporter" className="h-14 w-14 shrink-0 rounded-2xl border border-white/20 bg-white/10 object-cover shadow-lg" />
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.32em] text-white/70">AI Chat Exporter</p>
                <h1 className="mt-2 text-2xl font-semibold">{translate(language, 'exportCenter')}</h1>
                <p className="mt-2 max-w-[260px] text-sm leading-6 text-white/75">{popupParams.embedded ? (isZh ? '这是页面内可拖动浮窗，你可以拖着它在页面里移动。' : 'This is a draggable in-page floating panel. You can move it anywhere on the page.') : (isZh ? '这是一个可移动的小窗，权限弹窗不会再把它直接关掉。' : 'This is a movable mini window, so permission prompts will not close it immediately.')}</p>
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
          {!currentSiteMatches ? (
            <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {isZh ? `当前源标签页是 ${sourceSiteLabel}，不是 ${selectedSiteLabel}。请先切到对应平台页面，再执行导出。` : `The source tab is ${sourceSiteLabel}, not ${selectedSiteLabel}. Switch to a matching page before exporting.`}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.24em] text-tide">{translate(language, 'currentTab')}</div>
              <div className="mt-2 text-lg font-semibold">{sourceTabId ? translate(language, 'connected') : translate(language, 'missing')}</div>
              <div className="mt-2 text-sm text-slate-500">{statusText}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-[0.24em] text-tide">{translate(language, 'conversationList')}</div>
              <div className="mt-2 text-lg font-semibold">{conversationCountLabel}</div>
              <div className="mt-2 text-sm text-slate-500">{!currentSiteMatches ? (isZh ? '当前弹窗仍绑定原始源标签页，跨平台旧扫描结果不会再复用。' : 'This popup is still bound to the original source tab. Cross-site stale scan results are now blocked.') : translate(language, 'sidebarTip')}</div>
            </div>
          </div>

          {!permissionGranted ? (
            <button type="button" onClick={() => void handleGrantPermission()} disabled={busy || !sourceTabId || !currentSiteMatches} className="mt-4 w-full rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:bg-slate-100">
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
            <button type="button" onClick={() => void handleExportCurrent()} disabled={busy || !sourceTabId || !currentSiteMatches} className="rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300">{busy ? translate(language, 'working') : translate(language, 'exportCurrentConversation')}</button>
            <button type="button" onClick={() => void handleScan()} disabled={busy || !sourceTabId || !currentSiteMatches} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100">{translate(language, 'scanConversationList')}</button>
            {supportsBatch ? <button type="button" onClick={() => void handleExportAll()} disabled={busy || !sourceTabId} className="rounded-2xl bg-amber-500 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-slate-300">{translate(language, 'exportAllConversations')}</button> : null}
            <button type="button" onClick={() => void openDashboard()} className="rounded-2xl border border-transparent bg-amber-100 px-4 py-3 text-sm font-medium text-amber-900 transition hover:bg-amber-200">{translate(language, 'openFullDashboard')}</button>
          </div>
        </div>
      </section>
    </main>
  );
}

