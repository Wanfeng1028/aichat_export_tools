import { db } from './db';
import type { ExportJobRecord, JobStatus } from '../core/types';

export async function upsertJobRecord(record: ExportJobRecord): Promise<void> {
  await db.exportJobs.put(record);
}

export async function updateJobStatus(id: string, status: JobStatus, error?: string): Promise<void> {
  // Dexie 单键原子 update，避免读-改-写竞态用陈旧快照覆盖并发写入的新状态
  // （未提供的字段保持不变，与原先展开 current 的语义一致）
  await db.exportJobs.update(id, {
    status,
    ...(error ? { error } : {}),
    updatedAt: new Date().toISOString()
  });
}

export async function listJobRecords(): Promise<ExportJobRecord[]> {
  return db.exportJobs.orderBy('createdAt').reverse().limit(50).toArray();
}

export async function clearJobRecords(): Promise<void> {
  await db.exportJobs.clear();
}
