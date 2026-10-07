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

// Enhanced MathJax and KaTeX rules for LaTeX formula support
turndown.use(gfm);
turndown.addRule('chatgptMath', {
  filter: (node) => node.nodeType === 1 && (
    (node as Element).matches('[data-math-style], .katex, .math, .math-inline, .math-display') ||
    (node as Element).matches('.MathJax, .MathJax_Preview') ||
    (node as Element).matches('mjx-container, mjx-assistive-math') ||
    (node as Element).getAttribute('aria-label') === 'math'
  ),
  replacement: (_content, node) => {
    const element = node as Element;
    // Try multiple sources for the LaTeX content
    const text = element.getAttribute('data-latex') ??
      element.getAttribute('aria-label') ??
      element.getAttribute('data-content') ??
      element.querySelector('[class*="math"]')?.textContent ??
      element.querySelector('[class*="tex"]')?.textContent ??
      element.querySelector('mjx-math')?.textContent ??
      element.textContent?.replace(/\\\[|\]\\|\\(|\\)/g, '') ??
      '';
    const trimmed = text.trim();
    if (!trimmed) {
      return '';
    }

    const display = element.matches('.math-display, [data-math-style="display"]') ||
      element.matches('[class*="display"]') ||
      element.matches('mjx-container[jax="CHUNK"][display="true"]');
    return display ? `\n\n$$${trimmed}$$\n\n` : `$${trimmed}$`;
  }
});

// Enhanced code block rule with language extraction
turndown.addRule('codeBlockWithLanguage', {
  filter: (node) => node.nodeName === 'PRE' && Boolean((node as Element).querySelector('code')),
  replacement: (_content, node) => {
    const pre = node as HTMLPreElement;
    const code = pre.querySelector('code');
    if (!code) return _content;

    // Extract language from class (e.g., language-python, lang-js)
    const className = (code as HTMLElement).className || '';
    const langMatch = className.match(/(?:language|lang)-(\w+)/i);
    const lang = langMatch ? langMatch[1] : '';

    // Get code text content
    const text = code.textContent || '';

    // 代码内容本身含反引号围栏时，加长围栏避免提前闭合（与 turndown 内置规则一致）
    const fenceMatch = text.match(/^`{3,}/gm);
    const fenceLength = fenceMatch ? Math.max(...fenceMatch.map((match) => match.length)) + 1 : 3;
    const fence = '`'.repeat(fenceLength);

    return `\n${fence}${lang || ''}\n${text.replace(/\n$/, '')}\n${fence}\n\n`;
  }
});

// Escape characters that would break GFM table structure
function formatTableCell(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ')
    .trim();
}

// Better table rule
turndown.addRule('htmlTable', {
  filter: 'table',
  replacement: (_content, node) => {
    const table = node as HTMLTableElement;
    if (!table.rows || table.rows.length === 0) return _content;

    // Extract headers. 表头单元格可能是 th 或 td（如 thead 内使用 td 的站点输出）
    const headerRow = table.tHead?.rows[0] ?? null;
    const headerCells = headerRow
      ? headerRow.querySelectorAll('th, td')
      : table.rows[0]?.querySelectorAll('th, td');
    const headers: string[] = [];
    Array.from(headerCells ?? []).forEach((cell) => headers.push(formatTableCell(cell.textContent || '')));

    // Body rows start after the consumed header rows
    const headerRowCount = table.tHead ? table.tHead.rows.length : 1;
    const rows: string[][] = [];
    for (let i = headerRowCount; i < table.rows.length; i++) {
      const cells: string[] = [];
      Array.from(table.rows[i].querySelectorAll('td, th')).forEach((cell) => {
        cells.push(formatTableCell(cell.textContent || ''));
      });
      rows.push(cells);
    }

    if (headers.length === 0 || rows.length === 0) return _content;

    // Build GFM table
    const lines = [
      '| ' + headers.join(' | ') + ' |',
      '| ' + headers.map(() => '---').join(' | ') + ' |',
      ...rows.map(row => '| ' + row.join(' | ') + ' |')
    ];

    return '\n' + lines.join('\n') + '\n\n';
  }
});

function prepareHtmlForMarkdown(html: string): string {
  // Extract LaTeX from data-latex attributes
  return html.replace(
    /<([a-z][\w:-]*)\b([^>]*\bdata-latex=(["'])(.*?)\3[^>]*)>([\s\S]*?)<\/\1>/gi,
    (_match, tag, attrs, _quote, latex) => {
      const display = /\bdata-math-style=(["'])display\1/i.test(attrs) || /\bclass=(["'])[^"']*math-display[^"']*\1/i.test(attrs);
      const delimiter = display ? '$$' : '$';
      return `<${tag}${attrs}>${delimiter}${latex}${delimiter}</${tag}>`;
    }
  );
}

function toMarkdown(message: ChatConversation['messages'][number]): string {
  const body = message.html ? turndown.turndown(prepareHtmlForMarkdown(message.html)) : message.text.trim();
  const attachments = message.attachments ?? [];
  const attachmentLines = attachments.map((attachment) => {
    const details = [attachment.type, attachment.size ? `${attachment.size} bytes` : undefined].filter(Boolean).join(', ');
    const label = details ? `${attachment.name} (${details})` : attachment.name;
    // 附件名来自站点 DOM，转义 Markdown 链接语法，避免破坏输出结构
    const escapedLabel = label.replace(/([\[\]])/g, '\\$1');
    // Handle blob: and data: URLs - replace with readable placeholder
    if (attachment.url && (attachment.url.startsWith('blob:') || attachment.url.startsWith('data:'))) {
      return `- 📎 ${escapedLabel} (local file)`;
    }
    const safeUrl = attachment.url
      ?.replace(/ /g, '%20')
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29');
    return safeUrl ? `- [${escapedLabel}](${safeUrl})` : `- ${escapedLabel}`;
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
    `- **Site:** ${conversation.site}`,
    `- **URL:** ${conversation.url}`,
    `- **Exported At:** ${new Date(conversation.exportedAt).toLocaleString()}`,
    `- **Messages:** ${conversation.messages.length}`,
    ''
  ];

  let messageIndex = 0;
  for (const message of conversation.messages) {
    messageIndex++;
    const roleLabel = message.role === 'user' ? '👤 User' : message.role === 'assistant' ? '🤖 Assistant' : `📝 ${message.role}`;
    lines.push(`### ${roleLabel} (#${messageIndex})`);
    lines.push('');
    lines.push(toMarkdown(message) || '[Empty message]');
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  const content = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });

  return {
    filename: await buildConversationFilenameFromSettings(conversation, 'md'),
    mimeType: 'text/markdown;charset=utf-8',
    content
  };
}
