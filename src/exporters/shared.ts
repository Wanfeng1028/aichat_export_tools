import type { ChatAttachment, ChatConversation } from '../core/types';

export interface ExportSection {
  heading: string;
  body: string;
}

function formatAttachments(message: ChatConversation['messages'][number]): string[] {
  const attachments = message.attachments ?? [];
  if (attachments.length === 0) {
    return [];
  }

  return [
    'Attachments:',
    ...attachments.map((attachment) => {
      const details = [attachment.type, attachment.size ? `${attachment.size} bytes` : undefined].filter(Boolean).join(', ');
      const label = details ? `${attachment.name} (${details})` : attachment.name;
      return attachment.url ? `- ${label}: ${attachment.url}` : `- ${label}`;
    })
  ];
}

export interface AttachmentManifestItem extends ChatAttachment {
  messageId: string;
  messageRole: ChatConversation['messages'][number]['role'];
  messageIndex: number;
  urlKind: 'absolute' | 'relative' | 'blob' | 'data' | 'missing';
}

export function classifyAttachmentUrl(url?: string): AttachmentManifestItem['urlKind'] {
  if (!url) return 'missing';
  if (url.startsWith('blob:')) return 'blob';
  if (url.startsWith('data:')) return 'data';
  try {
    new URL(url);
    return 'absolute';
  } catch {
    return 'relative';
  }
}

export function buildAttachmentManifest(conversation: ChatConversation): AttachmentManifestItem[] {
  return conversation.messages.flatMap((message, messageIndex) =>
    (message.attachments ?? []).map((attachment) => ({
      ...attachment,
      messageId: message.id,
      messageRole: message.role,
      messageIndex,
      urlKind: classifyAttachmentUrl(attachment.url)
    }))
  );
}

// 粗粒度 HTML→纯文本回退：仅用于 message.text 为空而 html 有内容的消息，
// 保证 PDF/DOCX/ZIP/HTML 与 Markdown 导出内容一致。不追求保真。
function htmlToPlainText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function buildConversationSections(conversation: ChatConversation): ExportSection[] {
  return conversation.messages.map((message) => {
    const body = message.text.trim() || (message.html ? htmlToPlainText(message.html) : '');
    const attachments = formatAttachments(message);
    const placeholder = attachments.length > 0 ? '[Attachment-only message: files are listed below]' : '[Empty message]';

    return {
      heading: message.role.toUpperCase(),
      body: [body || placeholder, ...attachments].filter(Boolean).join('\n')
    };
  });
}

export function buildConversationSummary(conversation: ChatConversation): string[] {
  return [
    `Title: ${conversation.title}`,
    `Site: ${conversation.site}`,
    `URL: ${conversation.url}`,
    `Exported At: ${conversation.exportedAt}`,
    `Messages: ${conversation.messages.length}`
  ];
}
