import { db } from './db';
import type { ExportJobRecord, JobStatus } from '../core/types';

export async function upsertJobRecord(record: ExportJobRecord): Promise<void> {
  await db.exportJobs.put(record);
}

export async function updateJobStatus(id: string, status: JobStatus, error?: string): Promise<void> {
  const current = await db.exportJobs.get(id);
  if (!current) {
    return;
  }

  await db.exportJobs.put({
    ...current,
    status,
    error,
    updatedAt: new Date().toISOString()
  });
}

export async function listJobRecords(): Promise<ExportJobRecord[]> {
  return db.exportJobs.orderBy('createdAt').reverse().limit(20).toArray();
}
