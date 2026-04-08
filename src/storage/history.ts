import { db } from './db';
import type { ExportHistoryRecord } from '../core/types';

export async function addHistoryRecord(record: ExportHistoryRecord): Promise<void> {
  await db.exportHistory.put(record);
}

export async function listHistoryRecords(): Promise<ExportHistoryRecord[]> {
  return db.exportHistory.orderBy('createdAt').reverse().limit(20).toArray();
}

export async function clearHistoryRecords(): Promise<void> {
  await db.exportHistory.clear();
}
