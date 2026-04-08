export interface ExportJob {
  id: string;
  conversationId: string;
  format: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  createdAt: string;
}
