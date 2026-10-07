import type { ChatConversation } from './types';
import { defaultSettings, getSettings } from '../storage/settings';

// Windows 保留设备名（不论扩展名）不能直接作为文件名
const WINDOWS_RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
const MAX_FILENAME_SEGMENT_LENGTH = 80;

export function sanitizeFilenameSegment(value: string, fallback = 'untitled'): string {
  const withoutControlChars = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  // 按码点截断，避免切断代理对（emoji 等）
  const truncated = Array.from(
    withoutControlChars
      .replace(/[<>:"/\\|?*]+/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
  )
    .slice(0, MAX_FILENAME_SEGMENT_LENGTH)
    .join('');

  // 截断可能重新制造结尾的点/空格，Windows 会吞掉它们
  let cleaned = truncated.replace(/[. ]+$/g, '');
  if (WINDOWS_RESERVED_NAMES.test(cleaned)) {
    cleaned = `${cleaned}_`;
  }

  return cleaned || fallback;
}

function buildTemplateTokens(conversation: ChatConversation) {
  const timestamp = conversation.exportedAt.replace(/[:]/g, '-');
  const date = timestamp.slice(0, 10);

  return {
    site: sanitizeFilenameSegment(conversation.site),
    title: sanitizeFilenameSegment(conversation.title),
    timestamp,
    date,
    id: sanitizeFilenameSegment(conversation.id),
    workspace: sanitizeFilenameSegment(conversation.workspace ?? 'default')
  };
}

export function applyFilenameTemplate(conversation: ChatConversation, template: string): string {
  const tokens = buildTemplateTokens(conversation);
  const normalizedTemplate = template.trim() || defaultSettings.filenameTemplate;
  const rendered = normalizedTemplate.replace(/\{(site|title|timestamp|date|id|workspace)\}/g, (_match, token: keyof typeof tokens) => tokens[token]);
  return sanitizeFilenameSegment(rendered.replace(/[.]+$/g, ''));
}

export function buildConversationFilename(conversation: ChatConversation, extension: string, template = defaultSettings.filenameTemplate): string {
  return `${applyFilenameTemplate(conversation, template)}.${extension}`;
}

export async function buildConversationFilenameFromSettings(conversation: ChatConversation, extension: string): Promise<string> {
  const settings = await getSettings();
  return buildConversationFilename(conversation, extension, settings.filenameTemplate);
}
