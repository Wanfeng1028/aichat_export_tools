export interface AppSettings {
  preferredFormat: 'markdown' | 'pdf' | 'docx';
}

export const defaultSettings: AppSettings = {
  preferredFormat: 'markdown'
};
