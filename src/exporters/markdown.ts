import type { ChatConversation, ExportArtifact } from '../core/types';
import { buildConversationFilenameFromSettings } from '../core/filename';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

const turndown = new TurndownService({
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  fence: '```',
  headingStyle: 'atx'
});

turndown.use(gfm);
turndown.addRule('chatgptMath', {
  filter: (node) => node.nodeType === 1 && (
    (node as Element).matches('[data-math-style], .katex, .math, .math-inline, .math-display') ||
    (node as Element).getAttribute('aria-label') === 'math'
  ),
  replacement: (_content, node) => {
    const element = node as Element;
    const text = element.getAttribute('data-latex') ??
      element.getAttribute('aria-label') ??
      element.textContent ??
      '';
    const trimmed = text.trim();
    if (!trimmed) {
      return '';
    }

    const display = element.matches('.math-display, [data-math-style="display"]');
    return display ? `\n\n$$\n${trimmed}\n$$\n\n` : `$${trimmed}$`;
  }
});

function prepareHtmlForMarkdown(html: string): string {
  return html.replace(/<([a-z][\w:-]*)\b([^>]*\bdata-latex=(["'])(.*?)\3[^>]*)>([\s\S]*?)<\/\1>/gi, (_match, tag, attrs, _quote, latex) => {
    const display = /\bdata-math-style=(["'])display\1/i.test(attrs) || /\bclass=(["'])[^"']*math-display[^"']*\1/i.test(attrs);
    const delimiter = display ? '$$' : '$';
    return `<${tag}${attrs}>${delimiter}${latex}${delimiter}</${tag}>`;
  });
}

function toMarkdown(message: ChatConversation['messages'][number]): string {
  const body = message.html ? turndown.turndown(prepareHtmlForMarkdown(message.html)) : message.text.trim();
  const attachments = message.attachments ?? [];
  const attachmentLines = attachments.map((attachment) => {
    const details = [attachment.type, attachment.size ? `${attachment.size} bytes` : undefined].filter(Boolean).join(', ');
    const label = details ? `${attachment.name} (${details})` : attachment.name;
    return attachment.url ? `- [${label}](${attachment.url})` : `- ${label}`;
  });

  if (attachmentLines.length === 0) {
    return body.trim();
  }

  return [body.trim() || '[Attachment-only message: files are listed below]', 'Attachments:', ...attachmentLines].filter(Boolean).join('\n\n');
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
    filename: await buildConversationFilenameFromSettings(conversation, 'md'),
    mimeType: 'text/markdown;charset=utf-8',
    content
  };
}

