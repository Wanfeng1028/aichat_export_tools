import Dexie, { type Table } from 'dexie';
import type { ExportHistoryRecord } from '../core/types';

export class AIChatExporterDB extends Dexie {
  exportHistory!: Table<ExportHistoryRecord, string>;

  constructor() {
    super('ai-chat-exporter');

    this.version(1).stores({
      exportHistory: '&id, createdAt, site, conversationId, format'
    });
  }
}

export const db = new AIChatExporterDB();
