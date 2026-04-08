import type { ChatConversation, ExportArtifact } from '../core/types';
import { buildConversationFilename } from '../core/filename';

function escapeInlineMarkdown(value: string): string {
  return value.replace(/```/g, '\`\`\`');
}

export async function exportConversationToMarkdown(conversation: ChatConversation): Promise<ExportArtifact> {
  const lines = [
    `# ${conversation.title}`,
    '',
    `- Site: ${conversation.site}`,
    `- URL: ${conversation.url}`,
    `- Exported At: ${conversation.exportedAt}`,
    ''
  ];

  for (const message of conversation.messages) {
    lines.push(`## ${message.role}`);
    lines.push('');
    lines.push(escapeInlineMarkdown(message.text || '')); 
    lines.push('');
  }

  const content = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });

  return {
    filename: buildConversationFilename(conversation, 'md'),
    mimeType: 'text/markdown;charset=utf-8',
    content
  };
}
