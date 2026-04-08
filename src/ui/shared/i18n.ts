export type AppLanguage = 'zh-CN' | 'en';

export const languageOptions: Array<{ value: AppLanguage; label: string }> = [
  { value: 'zh-CN', label: '中文' },
  { value: 'en', label: 'English' }
];

const dictionaries = {
  'zh-CN': {
    language: '语言',
    switchLanguage: '中英文切换',
    exportCenter: '导出中心',
    popupIntro: '在一个紧凑面板里完成当前会话导出、会话扫描和仪表盘入口。',
    currentTab: '当前标签页',
    connected: '已连接',
    missing: '未连接',
    conversationList: '会话列表',
    noScanYet: '还未扫描',
    detectedSuffix: '个会话已识别',
    sidebarTip: '扫描前请先展开 ChatGPT 侧边栏。',
    markdownHint: '适合知识库与纯文本归档',
    pdfHint: '适合分享、审阅和快照保存',
    docxHint: '适合办公软件继续编辑',
    zipHint: '同时打包 Markdown、PDF、DOCX',
    exportCurrentConversation: '导出当前会话',
    scanConversationList: '扫描会话列表',
    openFullDashboard: '打开完整仪表盘',
    scanningCurrentTab: '正在扫描当前标签页...',
    noActiveSiteTab: '未找到有效站点标签页。',
    unknownResponse: '未知响应。',
    ready: '已就绪。',
    exportingCurrentAs: '正在导出当前会话为 {format}...',
    exportedConversation: '已导出 {title}。',
    exportFinished: '导出完成。',
    scanningSidebar: '正在扫描 ChatGPT 侧边栏会话...',
    scanCompleteFound: '扫描完成，共找到 {count} 个会话。',
    scanFinished: '扫描完成。',
    options: '选项',
    preferences: '偏好设置',
    optionsIntro: '当前版本先提供基础语言切换。后续会补充默认导出格式、文件名模板和站点权限控制。',
    dashboardTitle: '批量导出工作台',
    dashboardIntro: '从源标签页扫描 ChatGPT 侧边栏，选择需要的会话，然后导出为单个归档包。',
    completed: '已完成',
    running: '进行中',
    failed: '失败',
    conversationScan: '会话扫描',
    selectWhatToExport: '选择要导出的内容',
    scanChatGptSidebar: '扫描 ChatGPT 侧边栏',
    sourceTabMissing: '仪表盘没有拿到源 ChatGPT 标签页，请从 Popup 重新打开。',
    scanPopulate: '扫描你的 ChatGPT 侧边栏以加载会话列表。',
    foundConversationsPreset: '已找到 {count} 个会话，默认预选前 5 个。',
    unknownScanResponse: '未知扫描响应。',
    selectAtLeastOne: '导出前请至少选择一个会话。',
    exportingSelectedAs: '正在将 {count} 个会话导出为 {format}...',
    batchReady: '批量归档已生成：{filename}。成功 {success} 个，失败 {failed} 个。',
    unknownBatchResponse: '未知批量导出响应。',
    eachConversationBundle: '每个会话都会带完整多格式子包。',
    packedIntoOneZip: '所有选中的会话会被打进一个总 zip。',
    scannedCount: '已扫描 {count}',
    selectedCount: '已选择 {count}',
    noConversationsScanned: '还没有扫描到任何会话。',
    current: '当前',
    exportSelectedConversations: '导出已选会话',
    exportingBatch: '正在批量导出...',
    recentJobs: '最近任务',
    noJobsYet: '还没有任务记录。',
    downloadedArchives: '已下载归档',
    noExportsYet: '还没有导出记录。',
    working: '处理中...',
    bundle: '完整打包',
    fullBundle: '完整打包'
  },
  en: {
    language: 'Language',
    switchLanguage: 'Language switch',
    exportCenter: 'Export center',
    popupIntro: 'Handle current export, conversation scanning, and dashboard access from one compact panel.',
    currentTab: 'Current tab',
    connected: 'Connected',
    missing: 'Missing',
    conversationList: 'Conversation list',
    noScanYet: 'No scan yet',
    detectedSuffix: 'conversations detected',
    sidebarTip: 'Open the ChatGPT sidebar before scanning for the best results.',
    markdownHint: 'Best for knowledge bases and plain-text archives',
    pdfHint: 'Best for sharing, review, and snapshots',
    docxHint: 'Best for editing in office tools',
    zipHint: 'Bundle Markdown, PDF, and DOCX together',
    exportCurrentConversation: 'Export current conversation',
    scanConversationList: 'Scan conversation list',
    openFullDashboard: 'Open full dashboard',
    scanningCurrentTab: 'Scanning the current tab...',
    noActiveSiteTab: 'No active site tab found.',
    unknownResponse: 'Unknown response.',
    ready: 'Ready.',
    exportingCurrentAs: 'Exporting the current conversation as {format}...',
    exportedConversation: 'Exported {title}.',
    exportFinished: 'Export finished.',
    scanningSidebar: 'Scanning ChatGPT sidebar conversations...',
    scanCompleteFound: 'Scan complete. Found {count} conversations.',
    scanFinished: 'Scan finished.',
    options: 'Options',
    preferences: 'Preferences',
    optionsIntro: 'This version starts with language switching. Preferred export format, filename templates, and site permission controls will come next.',
    dashboardTitle: 'Batch export workspace',
    dashboardIntro: 'Scan the ChatGPT sidebar from your source tab, choose the conversations you want, then export them into a single archive.',
    completed: 'Completed',
    running: 'Running',
    failed: 'Failed',
    conversationScan: 'Conversation scan',
    selectWhatToExport: 'Select what to export',
    scanChatGptSidebar: 'Scan ChatGPT sidebar',
    sourceTabMissing: 'Dashboard was opened without a source ChatGPT tab. Re-open it from the popup.',
    scanPopulate: 'Scan your ChatGPT sidebar to populate conversations.',
    foundConversationsPreset: 'Found {count} conversations. The first five are preselected.',
    unknownScanResponse: 'Unknown scan response.',
    selectAtLeastOne: 'Select at least one conversation before exporting.',
    exportingSelectedAs: 'Exporting {count} conversations as {format}...',
    batchReady: 'Batch archive ready: {filename}. Exported {success}, failed {failed}.',
    unknownBatchResponse: 'Unknown batch export response.',
    eachConversationBundle: 'Each conversation carries a full multi-format bundle.',
    packedIntoOneZip: 'All selected conversations are packed into one zip archive.',
    scannedCount: '{count} scanned',
    selectedCount: '{count} selected',
    noConversationsScanned: 'No conversations scanned yet.',
    current: 'Current',
    exportSelectedConversations: 'Export selected conversations',
    exportingBatch: 'Exporting batch...',
    recentJobs: 'Recent jobs',
    noJobsYet: 'No jobs yet.',
    downloadedArchives: 'Downloaded archives',
    noExportsYet: 'No exports yet.',
    working: 'Working...',
    bundle: 'Bundle',
    fullBundle: 'Full bundle'
  }
} as const;

export type TranslationKey = keyof typeof dictionaries['en'];

const STORAGE_KEY = 'app_language';

export async function getStoredLanguage(): Promise<AppLanguage> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const value = result[STORAGE_KEY];
  return value === 'zh-CN' || value === 'en' ? value : 'zh-CN';
}

export async function setStoredLanguage(language: AppLanguage): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: language });
}

export function translate(language: AppLanguage, key: TranslationKey, variables?: Record<string, string | number>): string {
  const template = dictionaries[language][key] ?? dictionaries.en[key] ?? key;
  if (!variables) return template;
  return template.replace(/\{(\w+)\}/g, (_, token) => String(variables[token] ?? ''));
}
