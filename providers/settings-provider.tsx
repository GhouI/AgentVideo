import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import { getDefaultThemePreference, loadSettings, saveSettings, type AppSettings, type ThemePreference } from '@/utils/settings-storage';

interface SettingsContextValue extends AppSettings {
  isReady: boolean;
  setTheme: (theme: ThemePreference) => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  sendProcessingCompleteNotification: (title?: string) => Promise<boolean>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const systemTheme = useRNColorScheme() ?? 'light';
  const [settings, setSettings] = useState<AppSettings>({
    theme: getDefaultThemePreference(systemTheme as ThemePreference),
    notificationsEnabled: false,
  });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const hydrate = async () => {
      const stored = await loadSettings();
      setSettings((prev) => ({
        ...prev,
        ...stored,
        theme: stored.theme ?? getDefaultThemePreference(systemTheme as ThemePreference),
        notificationsEnabled: false,
      }));
      setIsReady(true);
    };

    hydrate();
  }, [systemTheme]);

  const updateSettings = useCallback(async (next: AppSettings) => {
    setSettings(next);
    await saveSettings(next);
  }, []);

  const setTheme = useCallback(
    async (theme: ThemePreference) => {
      await updateSettings({
        ...settings,
        theme,
      });
    },
    [settings, updateSettings]
  );

  const setNotificationsEnabled = useCallback(
    async (enabled: boolean) => {
      // Notifications are disabled; always persist as false regardless of input.
      if (settings.notificationsEnabled !== false) {
        await updateSettings({
          ...settings,
          notificationsEnabled: false,
        });
      }
    },
    [settings, updateSettings]
  );

  const sendProcessingCompleteNotification = useCallback(
    async (title?: string) => {
      // Notifications disabled; nothing to dispatch.
      return false;
    },
    []
  );

  const value = useMemo(
    () => ({
      ...settings,
      isReady,
      setTheme,
      setNotificationsEnabled,
      sendProcessingCompleteNotification,
    }),
    [isReady, sendProcessingCompleteNotification, setNotificationsEnabled, setTheme, settings]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useAppSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useAppSettings must be used within SettingsProvider');
  }
  return ctx;
}
