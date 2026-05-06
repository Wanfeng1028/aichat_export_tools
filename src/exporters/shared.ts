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

export function buildConversationSections(conversation: ChatConversation): ExportSection[] {
  return conversation.messages.map((message) => {
    const body = message.text.trim();
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
