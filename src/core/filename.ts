import type { ChatConversation } from './types';
import { defaultSettings, getSettings } from '../storage/settings';

function sanitizeSegment(value: string): string {
  return value
    .replace(/[<>:"/\\|?*]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'untitled';
}

function buildTemplateTokens(conversation: ChatConversation) {
  const timestamp = conversation.exportedAt.replace(/[:]/g, '-');
  const date = timestamp.slice(0, 10);

  return {
    site: sanitizeSegment(conversation.site),
    title: sanitizeSegment(conversation.title),
    timestamp,
    date,
    id: sanitizeSegment(conversation.id),
    workspace: sanitizeSegment(conversation.workspace ?? 'default')
  };
}

export function applyFilenameTemplate(conversation: ChatConversation, template: string): string {
  const tokens = buildTemplateTokens(conversation);
  const normalizedTemplate = template.trim() || defaultSettings.filenameTemplate;
  const rendered = normalizedTemplate.replace(/\{(site|title|timestamp|date|id|workspace)\}/g, (_match, token: keyof typeof tokens) => tokens[token]);
  return sanitizeSegment(rendered.replace(/[.]+$/g, ''));
}

export function buildConversationFilename(conversation: ChatConversation, extension: string, template = defaultSettings.filenameTemplate): string {
  return `${applyFilenameTemplate(conversation, template)}.${extension}`;
}

export async function buildConversationFilenameFromSettings(conversation: ChatConversation, extension: string): Promise<string> {
  const settings = await getSettings();
  return buildConversationFilename(conversation, extension, settings.filenameTemplate);
}
