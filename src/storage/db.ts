import Dexie, { type Table } from 'dexie';
import type { ExportHistoryRecord, ExportJobRecord } from '../core/types';

export class AIChatExporterDB extends Dexie {
  exportHistory!: Table<ExportHistoryRecord, string>;
  exportJobs!: Table<ExportJobRecord, string>;

  constructor() {
    super('ai-chat-exporter');

    this.version(1).stores({
      exportHistory: '&id, createdAt, site, conversationId, format',
      exportJobs: '&id, createdAt, updatedAt, site, conversationId, format, status'
    });

    this.version(2).stores({
      exportHistory: '&id, createdAt, site, conversationId, format, downloadId',
      exportJobs: '&id, createdAt, updatedAt, site, conversationId, format, status'
    });
  }
}

export const db = new AIChatExporterDB();
