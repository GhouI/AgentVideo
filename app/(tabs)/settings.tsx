import {
  ChevronRight,
  CircleHelp,
  Download,
  FileText,
  Globe,
  LogOut,
  Moon,
  SunMedium,
  Shield,
  User,
} from 'lucide-react-native';
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppSettings } from '@/providers/settings-provider';
import {
  downloadModel,
  getAvailableModels,
  getCactusDownloadProgress,
  hasDownloadedModel,
  isCactusDownloading,
  isCactusReady,
} from '@/utils/cactus';

interface SettingItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  type: 'navigate' | 'toggle' | 'action';
  value?: boolean;
}

type ModelStatus = 'idle' | 'checking' | 'downloading' | 'ready' | 'error';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const { theme, setTheme } = useAppSettings();
  const [modelStatus, setModelStatus] = React.useState<ModelStatus>('checking');
  const [modelProgress, setModelProgress] = React.useState(0);

  React.useEffect(() => {
    let isActive = true;
    const checkModel = async () => {
      try {
        if (isCactusDownloading()) {
          if (!isActive) return;
          setModelStatus('downloading');
          setModelProgress(getCactusDownloadProgress());
          return;
        }

        if (isCactusReady()) {
          if (!isActive) return;
          setModelStatus('ready');
          setModelProgress(100);
          return;
        }

        const downloaded = await hasDownloadedModel();
        if (!isActive) return;
        setModelStatus(downloaded ? 'ready' : 'idle');
        setModelProgress(downloaded ? 100 : 0);
      } catch {
        if (isActive) {
          setModelStatus('error');
        }
      }
    };

    checkModel();
    return () => {
      isActive = false;
    };
  }, []);

  const accountSettings: SettingItem[] = [
    {
      id: 'profile',
      icon: <User size={22} color={colors.primary} />,
      title: 'Profile',
      subtitle: 'Edit your profile information',
      type: 'navigate',
    },
    {
      id: 'privacy',
      icon: <Shield size={22} color={colors.primary} />,
      title: 'Privacy',
      subtitle: 'Manage your privacy settings',
      type: 'navigate',
    },
  ];

  const appSettings: SettingItem[] = [
    {
      id: 'darkMode',
      icon: theme === 'dark' ? (
        <Moon size={22} color={colors.secondary} />
      ) : (
        <SunMedium size={22} color={colors.secondary} />
      ),
      title: theme === 'dark' ? 'Dark Mode' : 'Light Mode',
      subtitle: theme === 'dark' ? 'Reduce brightness for low light' : 'Use a bright interface',
      type: 'toggle',
      value: theme === 'dark',
    },
    {
      id: 'downloadModel',
      icon: <Download size={22} color={colors.secondary} />,
      title: 'Download Model',
      subtitle: 'Install the AI model for local editing',
      type: 'action',
    },
    {
      id: 'language',
      icon: <Globe size={22} color={colors.secondary} />,
      title: 'Language',
      subtitle: 'English',
      type: 'navigate',
    },
  ];

  const supportSettings: SettingItem[] = [
    {
      id: 'help',
      icon: <CircleHelp size={22} color={colors.mutedForeground} />,
      title: 'Help & Support',
      type: 'navigate',
    },
    {
      id: 'terms',
      icon: <FileText size={22} color={colors.mutedForeground} />,
      title: 'Terms of Service',
      type: 'navigate',
    },
    {
      id: 'logout',
      icon: <LogOut size={22} color={colors.destructive} />,
      title: 'Log Out',
      type: 'action',
    },
  ];

  const handleToggle = async (id: string) => {
    if (id === 'darkMode') {
      await setTheme(theme === 'dark' ? 'light' : 'dark');
    }
  };

  const handleDownloadModel = async () => {
    if (modelStatus === 'downloading') return;
    
    // Show model selection
    try {
      const models = await getAvailableModels();
      const toolModels = models.filter(m => m.supportsToolCalling);
      
      if (toolModels.length === 0) {
        Alert.alert('Error', 'No models available for download');
        return;
      }
      
      // Show selection dialog
      Alert.alert(
        'Select Model',
        'Choose a model to download:',
        [
          ...toolModels.slice(0, 4).map(model => ({
            text: `${model.name} (${model.sizeMb}MB)${model.isDownloaded ? ' [Downloaded]' : ''}`,
            onPress: () => startDownload(model.name),
          })),
          { text: 'Cancel', style: 'cancel' as const },
        ]
      );
    } catch (error) {
      console.error('Failed to get models:', error);
      Alert.alert('Error', 'Failed to get available models');
    }
  };

  const startDownload = async (modelName: string) => {
    setModelStatus('downloading');
    setModelProgress(0);
    
    try {
      await downloadModel(modelName, {
        onDownloadProgress: (progress) => {
          console.log('Download progress:', progress);
          setModelProgress(progress);
        },
        onDownloadComplete: () => {
          console.log('Download complete');
          setModelProgress(100);
        },
        onError: (error) => {
          console.error('Download error:', error);
          setModelStatus('error');
        },
      });
      
      setModelStatus('ready');
      setModelProgress(100);
      Alert.alert('Success', `${modelName} has been downloaded and is ready to use!`);
    } catch (error) {
      console.error('Download failed:', error);
      setModelStatus('error');
      Alert.alert('Download Failed', String(error));
    }
  };

  const handleAction = async (id: string) => {
    if (id === 'downloadModel') {
      await handleDownloadModel();
    } else if (id === 'logout') {
      Alert.alert('Log Out', 'Logging out is not implemented yet.');
    }
  };

  const modelStatusLabel = React.useMemo(() => {
    if (modelStatus === 'downloading') {
      return `Downloading ${Math.round(modelProgress)}%`;
    }
    if (modelStatus === 'ready') {
      return 'Ready';
    }
    if (modelStatus === 'error') {
      return 'Error';
    }
    if (modelStatus === 'checking') {
      return 'Checking...';
    }
    return 'Not downloaded';
  }, [modelProgress, modelStatus]);

  const renderSettingItem = (item: SettingItem) => (
    <Pressable
      key={item.id}
      style={({ pressed }) => [
        styles.settingItem,
        { backgroundColor: pressed ? colors.muted : colors.card },
      ]}
      onPress={() => {
        if (item.type === 'toggle') {
          handleToggle(item.id);
        } else if (item.type === 'action') {
          handleAction(item.id);
        }
      }}
    >
      <View style={[styles.settingIcon, { backgroundColor: colors.muted }]}>
        {item.icon}
      </View>
      <View style={styles.settingContent}>
        <Text
          style={[
            styles.settingTitle,
            { color: item.id === 'logout' ? colors.destructive : colors.foreground },
          ]}
        >
          {item.title}
        </Text>
        {item.subtitle && (
          <Text style={[styles.settingSubtitle, { color: colors.mutedForeground }]}>
            {item.subtitle}
          </Text>
        )}
      </View>
      {item.id === 'downloadModel' && (
        <View style={styles.statusPill}>
          {modelStatus === 'downloading' ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
              {modelStatusLabel}
            </Text>
          )}
        </View>
      )}
      {item.type === 'navigate' && (
        <ChevronRight size={20} color={colors.mutedForeground} />
      )}
      {item.type === 'toggle' && (
        <Switch
          value={item.value}
          onValueChange={() => handleToggle(item.id)}
          trackColor={{ false: colors.muted, true: colors.primary }}
          thumbColor={colors.card}
        />
      )}
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Settings
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            ACCOUNT
          </Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {accountSettings.map(renderSettingItem)}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            APP SETTINGS
          </Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {appSettings.map(renderSettingItem)}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            SUPPORT
          </Text>
          <View style={[styles.sectionContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {supportSettings.map(renderSettingItem)}
          </View>
        </View>

        <View style={styles.versionContainer}>
          <Text style={[styles.versionText, { color: colors.mutedForeground }]}>
            Version 1.0.0
          </Text>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    paddingLeft: Spacing.sm,
  },
  sectionContent: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: {
    flex: 1,
    gap: 2,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 14,
  },
  statusPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: 'transparent',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  versionText: {
    fontSize: 14,
  },
  bottomPadding: {
    height: 100,
  },
});

