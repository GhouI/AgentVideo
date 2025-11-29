import { useAppSettings } from '@/providers/settings-provider';

export function useColorScheme() {
  const { theme } = useAppSettings();
  return theme;
}
