import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import type { ChatConversation, ExportArtifact } from '../core/types';
import { buildConversationFilename } from '../core/filename';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '_'
});

turndownService.use(gfm);

turndownService.addRule('preserveLineBreaks', {
  filter: ['br'],
  replacement: () => '  \n'
});

function toMarkdown(message: ChatConversation['messages'][number]): string {
  if (message.html) {
    return turndownService.turndown(message.html).trim();
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
