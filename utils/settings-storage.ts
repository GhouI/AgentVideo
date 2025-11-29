import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export type ThemePreference = 'light' | 'dark';

export interface AppSettings {
  theme: ThemePreference;
  notificationsEnabled: boolean;
}

const SETTINGS_FILE = `${FileSystem.documentDirectory ?? ''}app-settings.json`;

const defaultSettings: AppSettings = {
  theme: 'light',
  notificationsEnabled: false,
};

async function ensureDirectoryExists(): Promise<void> {
  if (!FileSystem.documentDirectory) return;
  const dirInfo = await FileSystem.getInfoAsync(FileSystem.documentDirectory);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(FileSystem.documentDirectory, { intermediates: true });
  }
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    if (!SETTINGS_FILE) {
      return defaultSettings;
    }

    const fileInfo = await FileSystem.getInfoAsync(SETTINGS_FILE);
    if (!fileInfo.exists) {
      return defaultSettings;
    }

    const content = await FileSystem.readAsStringAsync(SETTINGS_FILE);
    const parsed = JSON.parse(content) as Partial<AppSettings>;
    return {
      ...defaultSettings,
      ...parsed,
    };
  } catch {
    return defaultSettings;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  if (!SETTINGS_FILE) return;
  await ensureDirectoryExists();
  await FileSystem.writeAsStringAsync(SETTINGS_FILE, JSON.stringify(settings), {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

export function getDefaultThemePreference(systemPreference?: ThemePreference): ThemePreference {
  if (Platform.OS === 'web' && !systemPreference) {
    return 'light';
  }
  return systemPreference ?? defaultSettings.theme;
}
