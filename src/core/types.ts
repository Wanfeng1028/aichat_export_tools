export type SupportedSite = 'chatgpt' | 'claude' | 'gemini' | 'kimi' | 'deepseek' | 'grok';
export type ExportFormat = 'markdown' | 'pdf' | 'docx' | 'zip';
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatAttachment {
  name: string;
  type?: string;
  url?: string;
  size?: number;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  html?: string;
  createdAt?: string;
  attachments?: ChatAttachment[];
}

export interface ChatConversation {
  id: string;
  site: SupportedSite;
  title: string;
  url: string;
  exportedAt: string;
  workspace?: string;
  messages: ChatMessage[];
}

export interface ExportArtifact {
  filename: string;
  mimeType: string;
  content: Blob;
}

export interface ExportHistoryRecord {
  id: string;
  site: SupportedSite;
  conversationId: string;
  title: string;
  format: ExportFormat;
  createdAt: string;
  filename: string;
}

export interface AdapterStatus {
  site: SupportedSite;
  supported: boolean;
  loggedIn: boolean;
  canExportCurrentConversation: boolean;
  message?: string;
}
