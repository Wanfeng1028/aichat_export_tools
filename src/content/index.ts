import { createChatGptAdapter } from '../adapters/chatgpt';
import { createGenericSiteAdapter } from '../adapters/generic';
import { createLogger } from '../core/logger';

const logger = createLogger('content');
const FLOATING_ROOT_ID = 'ai-chat-exporter-floating-root';
const FLOATING_FRAME_ID = 'ai-chat-exporter-floating-frame';

type ContentErrorResponse = { __contentError: string };

type ToggleResponse = { ok: true; open: boolean };

function detectSupportedSiteFromUrl(url?: string | null) {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname;
    if (hostname.includes('chatgpt.com')) return 'chatgpt';
    if (hostname.includes('claude.ai')) return 'claude';
    if (hostname.includes('gemini.google.com')) return 'gemini';
    if (hostname.includes('kimi.moonshot.cn') || hostname === 'kimi.com' || hostname === 'www.kimi.com') return 'kimi';
    if (hostname.includes('chat.deepseek.com')) return 'deepseek';
    if (hostname.includes('grok.com') || hostname.includes('x.com')) return 'grok';
    if (hostname.includes('doubao.com')) return 'doubao';
    if (hostname.includes('tongyi.aliyun.com') || hostname.includes('qianwen.aliyun.com') || hostname === 'tongyi.com' || hostname === 'www.tongyi.com' || hostname === 'qwen.ai' || hostname === 'www.qwen.ai') return 'qianwen';
    if (hostname.includes('yiyan.baidu.com') || hostname.includes('wenxin.baidu.com')) return 'yiyan';
    return null;
  } catch {
    return null;
  }
}

function getAdapter() {
  const site = detectSupportedSiteFromUrl(globalThis.location.href);

  if (site === 'chatgpt') {
    return createChatGptAdapter();
  }

  return site ? createGenericSiteAdapter(site) : null;
}

function toErrorResponse(error: unknown): ContentErrorResponse {
  const message = error instanceof Error ? error.message : 'Unknown content script error.';
  return { __contentError: message };
}

function getPopupUrl(sourceTabId?: number): string {
  const url = new URL(chrome.runtime.getURL('src/ui/popup/index.html'));
  url.searchParams.set('embedded', '1');
  if (typeof sourceTabId === 'number') {
    url.searchParams.set('sourceTabId', String(sourceTabId));
  }
  return url.toString();
}

function removeFloatingPanel(): void {
  document.getElementById(FLOATING_ROOT_ID)?.remove();
}

function attachDragBehavior(handle: HTMLElement, target: HTMLElement): void {
  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;
  let dragging = false;

  const onMouseMove = (event: MouseEvent) => {
    if (!dragging) {
      return;
    }

    const nextLeft = Math.max(12, initialLeft + event.clientX - startX);
    const nextTop = Math.max(12, initialTop + event.clientY - startY);
    target.style.left = `${nextLeft}px`;
    target.style.top = `${nextTop}px`;
    target.style.right = 'auto';
  };

  const onMouseUp = () => {
    dragging = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };

  handle.addEventListener('mousedown', (event) => {
    if ((event.target as HTMLElement).closest('button')) {
      return;
    }

    dragging = true;
    startX = event.clientX;
    startY = event.clientY;
    const rect = target.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    event.preventDefault();
  });
}

function createFloatingPanel(sourceTabId?: number): HTMLElement {
  const root = document.createElement('div');
  root.id = FLOATING_ROOT_ID;
  root.style.position = 'fixed';
  root.style.top = '12px';
  root.style.right = '12px';
  root.style.width = '520px';
  root.style.height = 'min(920px, calc(100vh - 24px))';
  root.style.zIndex = '2147483647';
  root.style.borderRadius = '24px';
  root.style.overflow = 'hidden';
  root.style.boxShadow = '0 24px 80px rgba(15, 23, 42, 0.35)';
  root.style.border = '1px solid rgba(148, 163, 184, 0.28)';
  root.style.background = 'rgba(255,255,255,0.96)';
  root.style.backdropFilter = 'blur(16px)';
  root.style.userSelect = 'none';

  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'space-between';
  header.style.gap = '12px';
  header.style.padding = '10px 14px';
  header.style.background = 'linear-gradient(135deg, #10233b, #1e3556)';
  header.style.color = '#ffffff';
  header.style.cursor = 'move';

  const title = document.createElement('div');
  title.textContent = 'AI Chat Exporter';
  title.style.fontSize = '13px';
  title.style.fontWeight = '600';
  title.style.letterSpacing = '0.18em';
  title.style.textTransform = 'uppercase';

  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.alignItems = 'center';
  actions.style.gap = '8px';

  const minimizeButton = document.createElement('button');
  minimizeButton.type = 'button';
  minimizeButton.textContent = '-';
  minimizeButton.style.width = '28px';
  minimizeButton.style.height = '28px';
  minimizeButton.style.border = '0';
  minimizeButton.style.borderRadius = '999px';
  minimizeButton.style.background = 'rgba(255,255,255,0.12)';
  minimizeButton.style.color = '#fff';
  minimizeButton.style.fontSize = '18px';
  minimizeButton.style.lineHeight = '1';
  minimizeButton.style.cursor = 'pointer';

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.textContent = 'x';
  closeButton.style.width = '28px';
  closeButton.style.height = '28px';
  closeButton.style.border = '0';
  closeButton.style.borderRadius = '999px';
  closeButton.style.background = 'rgba(255,255,255,0.12)';
  closeButton.style.color = '#fff';
  closeButton.style.fontSize = '18px';
  closeButton.style.lineHeight = '1';
  closeButton.style.cursor = 'pointer';

  const body = document.createElement('div');
  body.style.height = 'calc(100% - 48px)';
  body.style.background = 'transparent';

  const frame = document.createElement('iframe');
  frame.id = FLOATING_FRAME_ID;
  frame.src = getPopupUrl(sourceTabId);
  frame.style.width = '100%';
  frame.style.height = '100%';
  frame.style.border = '0';
  frame.style.background = 'transparent';

  let minimized = false;
  minimizeButton.addEventListener('click', () => {
    minimized = !minimized;
    body.style.display = minimized ? 'none' : 'block';
    root.style.height = minimized ? '48px' : 'min(920px, calc(100vh - 24px))';
    minimizeButton.textContent = minimized ? '+' : '-';
  });

  closeButton.addEventListener('click', () => {
    removeFloatingPanel();
  });

  actions.append(minimizeButton, closeButton);
  header.append(title, actions);
  body.append(frame);
  root.append(header, body);
  attachDragBehavior(header, root);
  return root;
}

function toggleFloatingPanel(sourceTabId?: number): ToggleResponse {
  const existing = document.getElementById(FLOATING_ROOT_ID);
  if (existing) {
    existing.remove();
    return { ok: true, open: false };
  }

  const panel = createFloatingPanel(sourceTabId);
  document.documentElement.append(panel);
  return { ok: true, open: true };
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'TOGGLE_FLOATING_PANEL') {
    sendResponse(toggleFloatingPanel(request.sourceTabId));
    return false;
  }

  const adapter = getAdapter();

  if (!adapter) {
    sendResponse({
      site: detectSupportedSiteFromUrl(globalThis.location.href) ?? 'chatgpt',
      supported: false,
      loggedIn: false,
      canExportCurrentConversation: false,
      message: 'This site is not supported by the current MVP.'
    });
    return false;
  }

  if (request.type === 'CONTENT_GET_STATUS') {
    void adapter.getStatus().then(sendResponse).catch((error: unknown) => {
      logger.error(error);
      sendResponse({
        site: adapter.site,
        supported: true,
        loggedIn: false,
        canExportCurrentConversation: false,
        message: error instanceof Error ? error.message : 'Failed to inspect the current page.'
      });
    });
    return true;
  }

  if (request.type === 'CONTENT_SCAN_CONVERSATIONS') {
    void adapter.scanConversationList().then(sendResponse).catch((error: unknown) => {
      logger.error(error);
      sendResponse(toErrorResponse(error));
    });
    return true;
  }

  if (request.type === 'CONTENT_EXPORT_CURRENT_CONVERSATION') {
    void adapter.exportCurrentConversation().then(sendResponse).catch((error: unknown) => {
      logger.error(error);
      sendResponse(toErrorResponse(error));
    });
    return true;
  }

  return false;
});

logger.info('Content script loaded.');
