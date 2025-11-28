import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ChevronDown, MoreHorizontal, Search, Video } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface Project {
  id: string;
  title: string;
  lastEdited: string;
  duration: string;
  prompt: string;
  thumbnail: string;
  section: 'today' | 'yesterday' | 'older';
}

const MOCK_PROJECTS: Project[] = [
  {
    id: '1',
    title: 'Summer Trip Highlights',
    lastEdited: 'Today',
    duration: '02:45',
    prompt: "Add a cinematic zoom on the first clip...",
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop',
    section: 'today',
  },
  {
    id: '2',
    title: 'Mountain Adventure',
    lastEdited: 'Today',
    duration: '01:15',
    prompt: "Sync the beat drops with the drone shots...",
    thumbnail: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=300&fit=crop',
    section: 'today',
  },
  {
    id: '3',
    title: 'Tokyo Nights',
    lastEdited: 'Yesterday',
    duration: '00:58',
    prompt: "Apply a glitch effect to the transitions",
    thumbnail: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=300&fit=crop',
    section: 'yesterday',
  },
  {
    id: '4',
    title: 'Product Launch',
    lastEdited: '3 days ago',
    duration: '01:30',
    prompt: "Add smooth fade transitions between scenes",
    thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop',
    section: 'older',
  },
];

const FILTER_OPTIONS = ['All', 'Sort by: Date', 'Name', 'Shared'];

export default function LibraryScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const handleProjectPress = (project: Project) => {
    router.push({
      pathname: '/edit',
      params: { projectId: project.id, projectTitle: project.title },
    });
  };

  const filteredProjects = MOCK_PROJECTS.filter((project) =>
    project.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const todayProjects = filteredProjects.filter((p) => p.section === 'today');
  const yesterdayProjects = filteredProjects.filter((p) => p.section === 'yesterday');
  const olderProjects = filteredProjects.filter((p) => p.section === 'older');

  const renderProjectItem = (project: Project) => (
    <Pressable
      key={project.id}
      style={({ pressed }) => [
        styles.projectItem,
        { backgroundColor: colors.card, opacity: pressed ? 0.8 : 1 },
      ]}
      onPress={() => handleProjectPress(project)}
    >
      <View style={styles.projectContent}>
        <Image
          source={{ uri: project.thumbnail }}
          style={[styles.thumbnail, { backgroundColor: colors.muted }]}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.projectDetails}>
          <Text style={[styles.projectTitle, { color: colors.foreground }]} numberOfLines={1}>
            {project.title}
          </Text>
          <Text style={[styles.projectPrompt, { color: colors.mutedForeground }]} numberOfLines={1}>
            Prompt: '{project.prompt}'
          </Text>
          <Text style={[styles.projectMeta, { color: colors.mutedForeground }]}>
            Last edited: {project.lastEdited} · Duration: {project.duration}
          </Text>
        </View>
      </View>
      <Pressable style={styles.moreButton}>
        <MoreHorizontal size={20} color={colors.mutedForeground} />
      </Pressable>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.headerIcon}>
          <Video size={24} color={colors.mutedForeground} />
        </View>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Library
        </Text>
        <Pressable>
          <Text style={[styles.selectButton, { color: colors.primary }]}>
            Select
          </Text>
        </Pressable>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.searchInputWrapper, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Search size={20} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search projects..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
      >
        {FILTER_OPTIONS.map((filter) => (
          <Pressable
            key={filter}
            style={[
              styles.filterChip,
              {
                backgroundColor: activeFilter === filter ? colors.primary : colors.muted,
              },
            ]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text
              style={[
                styles.filterText,
                {
                  color: activeFilter === filter ? colors.primaryForeground : colors.foreground,
                },
              ]}
            >
              {filter}
            </Text>
            {filter === 'Sort by: Date' && (
              <ChevronDown
                size={16}
                color={activeFilter === filter ? colors.primaryForeground : colors.foreground}
              />
            )}
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView style={styles.projectList} showsVerticalScrollIndicator={false}>
        {todayProjects.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Today</Text>
            {todayProjects.map(renderProjectItem)}
          </>
        )}

        {yesterdayProjects.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: Spacing.lg }]}>
              Yesterday
            </Text>
            {yesterdayProjects.map(renderProjectItem)}
          </>
        )}

        {olderProjects.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: Spacing.lg }]}>
              Older
            </Text>
            {olderProjects.map(renderProjectItem)}
          </>
        )}

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerIcon: {
    width: 48,
    height: 48,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  selectButton: {
    fontSize: 16,
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    height: 48,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  filterContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  projectList: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  projectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  projectContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.lg,
  },
  thumbnail: {
    width: 112,
    height: 70,
    borderRadius: BorderRadius.md,
  },
  projectDetails: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  projectPrompt: {
    fontSize: 14,
  },
  projectMeta: {
    fontSize: 14,
  },
  moreButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomPadding: {
    height: 100,
  },
});

