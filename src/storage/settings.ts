import type { ExportFormat } from '../core/types';

export interface AppSettings {
  preferredFormat: ExportFormat;
  filenameTemplate: string;
}

export const defaultSettings: AppSettings = {
  preferredFormat: 'markdown',
  filenameTemplate: '{site}__{title}__{timestamp}'
};

const SETTINGS_KEY = 'app_settings';

function getStorageArea(): chrome.storage.LocalStorageArea | null {
  return globalThis.chrome?.storage?.local ?? null;
}

export async function getSettings(): Promise<AppSettings> {
  const storage = getStorageArea();
  if (!storage) {
    return defaultSettings;
  }

  const result = await storage.get(SETTINGS_KEY);
  const raw = result[SETTINGS_KEY] as Partial<AppSettings> | undefined;

  return {
    preferredFormat: raw?.preferredFormat ?? defaultSettings.preferredFormat,
    filenameTemplate: raw?.filenameTemplate?.trim() || defaultSettings.filenameTemplate
  };
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const storage = getStorageArea();
  const nextSettings = {
    ...(await getSettings()),
    ...patch
  };

  if (!storage) {
    return nextSettings;
  }

  await storage.set({ [SETTINGS_KEY]: nextSettings });
  return nextSettings;
}
