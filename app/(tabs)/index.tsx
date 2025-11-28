import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import React from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface Project {
  id: string;
  title: string;
  lastEdited: string;
  thumbnail: string;
}

const MOCK_PROJECTS: Project[] = [
  {
    id: '1',
    title: 'LA Trip Highlights',
    lastEdited: 'Oct 26, 2023',
    thumbnail: 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=400&h=600&fit=crop',
  },
  {
    id: '2',
    title: 'Birthday Party Reel',
    lastEdited: 'Oct 24, 2023',
    thumbnail: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400&h=600&fit=crop',
  },
  {
    id: '3',
    title: 'Summer Vacation',
    lastEdited: 'Oct 21, 2023',
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=600&fit=crop',
  },
  {
    id: '4',
    title: 'Product Demo Video',
    lastEdited: 'Oct 19, 2023',
    thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=600&fit=crop',
  },
  {
    id: '5',
    title: 'Mountain Hike',
    lastEdited: 'Oct 15, 2023',
    thumbnail: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=600&fit=crop',
  },
  {
    id: '6',
    title: 'Cooking Show Intro',
    lastEdited: 'Oct 12, 2023',
    thumbnail: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=600&fit=crop',
  },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.lg * 3) / 2;

export default function DashboardScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleProjectPress = (project: Project) => {
    router.push({
      pathname: '/edit',
      params: { projectId: project.id, projectTitle: project.title },
    });
  };

  const handleCreateNew = () => {
    router.push('/(tabs)/create');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.headerSpacer} />
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Prompt Edit
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Recent Projects
        </Text>

        <View style={styles.projectGrid}>
          {MOCK_PROJECTS.map((project) => (
            <Pressable
              key={project.id}
              style={({ pressed }) => [
                styles.projectCard,
                { opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={() => handleProjectPress(project)}
            >
              <Image
                source={{ uri: project.thumbnail }}
                style={[styles.projectThumbnail, { backgroundColor: colors.muted }]}
                contentFit="cover"
                transition={200}
              />
              <View style={styles.projectInfo}>
                <Text
                  style={[styles.projectTitle, { color: colors.foreground }]}
                  numberOfLines={1}
                >
                  {project.title}
                </Text>
                <Text style={[styles.projectDate, { color: colors.mutedForeground }]}>
                  Last edited: {project.lastEdited}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
        ]}
        onPress={handleCreateNew}
      >
        <Plus size={24} color={colors.primaryForeground} />
        <Text style={[styles.fabText, { color: colors.primaryForeground }]}>
          Create New
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerSpacer: {
    width: 48,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    paddingVertical: Spacing.lg,
  },
  projectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
  },
  projectCard: {
    width: CARD_WIDTH,
    gap: Spacing.md,
    paddingBottom: Spacing.md,
  },
  projectThumbnail: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: BorderRadius.xl,
  },
  projectInfo: {
    gap: 4,
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  projectDate: {
    fontSize: 14,
  },
  bottomPadding: {
    height: 100,
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingLeft: 20,
    paddingRight: 24,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
