import {
  Bell,
  ChevronRight,
  CircleHelp,
  FileText,
  Globe,
  LogOut,
  Moon,
  Palette,
  Shield,
  User,
} from 'lucide-react-native';
import React from 'react';
import {
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

interface SettingItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  type: 'navigate' | 'toggle' | 'action';
  value?: boolean;
}

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const [darkMode, setDarkMode] = React.useState(colorScheme === 'dark');
  const [notifications, setNotifications] = React.useState(true);

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
      id: 'appearance',
      icon: <Palette size={22} color={colors.secondary} />,
      title: 'Appearance',
      subtitle: 'Customize the look and feel',
      type: 'navigate',
    },
    {
      id: 'darkMode',
      icon: <Moon size={22} color={colors.secondary} />,
      title: 'Dark Mode',
      type: 'toggle',
      value: darkMode,
    },
    {
      id: 'notifications',
      icon: <Bell size={22} color={colors.secondary} />,
      title: 'Notifications',
      type: 'toggle',
      value: notifications,
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

  const handleToggle = (id: string) => {
    if (id === 'darkMode') {
      setDarkMode(!darkMode);
    } else if (id === 'notifications') {
      setNotifications(!notifications);
    }
  };

  const renderSettingItem = (item: SettingItem) => (
    <Pressable
      key={item.id}
      style={({ pressed }) => [
        styles.settingItem,
        { backgroundColor: pressed ? colors.muted : colors.card },
      ]}
      onPress={() => item.type === 'toggle' && handleToggle(item.id)}
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

