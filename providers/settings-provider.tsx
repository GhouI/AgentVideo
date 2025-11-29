import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform, useColorScheme as useRNColorScheme } from 'react-native';
import * as Notifications from 'expo-notifications';

import { getDefaultThemePreference, loadSettings, saveSettings, type AppSettings, type ThemePreference } from '@/utils/settings-storage';

interface SettingsContextValue extends AppSettings {
  isReady: boolean;
  setTheme: (theme: ThemePreference) => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
  sendProcessingCompleteNotification: (title?: string) => Promise<boolean>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('video-processing', {
    name: 'Video Processing',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#E78A53',
  });
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const systemTheme = useRNColorScheme() ?? 'light';
  const [settings, setSettings] = useState<AppSettings>({
    theme: getDefaultThemePreference(systemTheme as ThemePreference),
    notificationsEnabled: true,
  });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const hydrate = async () => {
      const stored = await loadSettings();
      setSettings((prev) => ({
        ...prev,
        ...stored,
        theme: stored.theme ?? getDefaultThemePreference(systemTheme as ThemePreference),
      }));
      setIsReady(true);
      await ensureNotificationChannel();
    };

    hydrate();
  }, [systemTheme]);

  const updateSettings = useCallback(async (next: AppSettings) => {
    setSettings(next);
    await saveSettings(next);
  }, []);

  const ensureNotificationPermission = useCallback(async (): Promise<boolean> => {
    try {
      const existing = await Notifications.getPermissionsAsync();
      if (existing.granted || existing.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
        return true;
      }

      const requested = await Notifications.requestPermissionsAsync();
      return requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    } catch {
      return false;
    }
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
      let allowed = enabled;
      if (enabled) {
        allowed = await ensureNotificationPermission();
        if (allowed) {
          await ensureNotificationChannel();
        }
      }

      await updateSettings({
        ...settings,
        notificationsEnabled: allowed,
      });
    },
    [ensureNotificationPermission, settings, updateSettings]
  );

  const sendProcessingCompleteNotification = useCallback(
    async (title?: string) => {
      if (!settings.notificationsEnabled) return false;

      const permitted = await ensureNotificationPermission();
      if (!permitted) return false;

      await ensureNotificationChannel();
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Video ready',
          body: title ? `${title} has finished processing.` : 'Your video is ready to view.',
        },
        trigger: null,
      });
      return true;
    },
    [ensureNotificationPermission, settings.notificationsEnabled]
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
