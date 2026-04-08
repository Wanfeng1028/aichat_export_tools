import type { ChatConversation, ExportArtifact } from '../core/types';
import { buildConversationFilename } from '../core/filename';

function decodeHtml(html: string): string {
  return html
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function htmlToMarkdown(html: string): string {
  return decodeHtml(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|section|article|h1|h2|h3|h4|h5|h6)>/gi, '\n\n')
      .replace(/<(strong|b)>(.*?)<\/(strong|b)>/gi, '**$2**')
      .replace(/<(em|i)>(.*?)<\/(em|i)>/gi, '_$2_')
      .replace(/<code>(.*?)<\/code>/gi, '`$1`')
      .replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (_match, code) => `\n\n\0\n${decodeHtml(code)}\n\1\n\n`)
      .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<blockquote>(.*?)<\/blockquote>/gi, (_match, text) => `\n> ${text}\n`)
      .replace(/<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      .replace(/<[^>]+>/g, '')
  )
    .replace(/\u00060/g, '```')
    .replace(/\u00061/g, '```')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function toMarkdown(message: ChatConversation['messages'][number]): string {
  if (message.html) {
    return htmlToMarkdown(message.html);
  }

  return message.text.trim();
}

export async function exportConversationToMarkdown(conversation: ChatConversation): Promise<ExportArtifact> {
  const lines = [
    `# ${conversation.title}`,
    '',
    `- Site: ${conversation.site}`,
    `- URL: ${conversation.url}`,
    `- Exported At: ${conversation.exportedAt}`,
    `- Messages: ${conversation.messages.length}`,
    ''
  ];

  for (const message of conversation.messages) {
    lines.push(`## ${message.role}`);
    lines.push('');
    lines.push(toMarkdown(message) || '[Empty message]');
    lines.push('');
  }

  const content = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });

  return {
    filename: buildConversationFilename(conversation, 'md'),
    mimeType: 'text/markdown;charset=utf-8',
    content
  };
}
