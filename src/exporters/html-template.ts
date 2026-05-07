import type { ChatConversation } from '../core/types';
import { buildConversationSections, buildConversationSummary } from './shared';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char] ?? char);
}

export function buildConversationHtml(conversation: ChatConversation): string {
  const summary = buildConversationSummary(conversation)
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join('');

  const sections = buildConversationSections(conversation)
    .map(
      (section) => `
        <section>
          <h2>${escapeHtml(section.heading)}</h2>
          <pre>${escapeHtml(section.body)}</pre>
        </section>
      `
    )
    .join('');

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(conversation.title)}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 32px; color: #101828; }
          h1 { margin-bottom: 8px; }
          ul { padding-left: 18px; }
          section { margin-top: 24px; padding-top: 16px; border-top: 1px solid #d0d5dd; }
          pre { white-space: pre-wrap; word-break: break-word; background: #f8fafc; padding: 16px; border-radius: 12px; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(conversation.title)}</h1>
        <ul>${summary}</ul>
        ${sections}
      </body>
    </html>
  `;
}
