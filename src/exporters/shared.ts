import type { ChatConversation } from '../core/types';

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

export function buildConversationSections(conversation: ChatConversation): ExportSection[] {
  return conversation.messages.map((message) => {
    const body = message.text.trim();
    const attachments = formatAttachments(message);

    return {
      heading: message.role.toUpperCase(),
      body: [body || (attachments.length > 0 ? '' : '[Empty message]'), ...attachments].filter(Boolean).join('\n')
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
