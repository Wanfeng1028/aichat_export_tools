import type { ChatConversation } from './types';
import { defaultSettings, getSettings } from '../storage/settings';

export function sanitizeFilenameSegment(value: string, fallback = 'untitled'): string {
  return value
    .replace(/[<>:"/\\|?*]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || fallback;
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
