import { Video, ResizeMode } from 'expo-av';
import { useFocusEffect, useRouter } from 'expo-router';
import { 
  ChevronDown, 
  Film, 
  MoreHorizontal, 
  Search, 
  Trash2,
  Video as VideoIcon,
} from 'lucide-react-native';
import React, { useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import {
  listProjects,
  deleteProject,
  getMainVideo,
  getRelativeTimeString,
  formatDuration,
  type ProjectMetadata,
} from '@/utils/project-storage';

type SortOption = 'date' | 'name' | 'size';
type FilterOption = 'all' | 'today' | 'week' | 'month';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'date', label: 'Date' },
  { value: 'name', label: 'Name' },
];

const FILTER_OPTIONS: { value: FilterOption; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

export default function LibraryScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy] = useState<SortOption>('date');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Load projects on focus
  useFocusEffect(
    useCallback(() => {
      const loadProjects = async () => {
        setIsLoading(true);
        try {
          const projectList = await listProjects();
          setProjects(projectList);
        } catch (err) {
          console.error('Failed to load projects:', err);
        } finally {
          setIsLoading(false);
        }
      };
      
      loadProjects();
    }, [])
  );

  const handleProjectPress = useCallback((project: ProjectMetadata) => {
    router.push({
      pathname: '/edit',
      params: { projectId: project.id, projectTitle: project.title },
    });
  }, [router]);

  const handleDeleteProject = useCallback(async (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    
    Alert.alert(
      'Delete Project',
      `Are you sure you want to delete "${project.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProject(projectId);
              setProjects((prev) => prev.filter((p) => p.id !== projectId));
              setSelectedProjectId(null);
            } catch {
              Alert.alert('Error', 'Failed to delete project');
            }
          },
        },
      ]
    );
  }, [projects]);

  const handleMorePress = useCallback((projectId: string) => {
    setSelectedProjectId((prev) => (prev === projectId ? null : projectId));
  }, []);

  // Filter and sort projects
  const filteredProjects = useCallback(() => {
    let result = [...projects];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((p) =>
        p.title.toLowerCase().includes(query)
      );
    }
    
    // Apply time filter
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    switch (filterBy) {
      case 'today':
        result = result.filter((p) => now - p.updatedAt < dayMs);
        break;
      case 'week':
        result = result.filter((p) => now - p.updatedAt < 7 * dayMs);
        break;
      case 'month':
        result = result.filter((p) => now - p.updatedAt < 30 * dayMs);
        break;
    }
    
    // Apply sort
    switch (sortBy) {
      case 'date':
        result.sort((a, b) => b.updatedAt - a.updatedAt);
        break;
      case 'name':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }
    
    return result;
  }, [projects, searchQuery, filterBy, sortBy]);

  // Group projects by date section
  const groupedProjects = useCallback(() => {
    const filtered = filteredProjects();
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    
    const today: ProjectMetadata[] = [];
    const yesterday: ProjectMetadata[] = [];
    const older: ProjectMetadata[] = [];
    
    filtered.forEach((project) => {
      const diff = now - project.updatedAt;
      if (diff < dayMs) {
        today.push(project);
      } else if (diff < 2 * dayMs) {
        yesterday.push(project);
      } else {
        older.push(project);
      }
    });
    
    return { today, yesterday, older };
  }, [filteredProjects]);

  const renderProjectItem = (project: ProjectMetadata) => {
    const mainVideo = getMainVideo(project);
    const isSelected = selectedProjectId === project.id;
    
    return (
      <Pressable
        key={project.id}
        style={({ pressed }) => [
          styles.projectItem,
          { backgroundColor: pressed ? colors.muted : colors.card },
        ]}
        onPress={() => handleProjectPress(project)}
      >
        <View style={styles.projectContent}>
          <View style={[styles.thumbnail, { backgroundColor: colors.muted }]}>
            {mainVideo?.path ? (
              <Video
                source={{ uri: mainVideo.path }}
                style={styles.thumbnailVideo}
                resizeMode={ResizeMode.COVER}
                shouldPlay={false}
              />
            ) : (
              <Film size={24} color={colors.mutedForeground} />
            )}
          </View>
          <View style={styles.projectDetails}>
            <Text 
              style={[styles.projectTitle, { color: colors.foreground }]} 
              numberOfLines={1}
            >
              {project.title}
            </Text>
            {project.chatHistory.length > 0 && (
              <Text 
                style={[styles.projectPrompt, { color: colors.mutedForeground }]} 
                numberOfLines={1}
              >
                Last: &quot;{project.chatHistory[project.chatHistory.length - 1].content}&quot;
              </Text>
            )}
            <Text style={[styles.projectMeta, { color: colors.mutedForeground }]}>
              {getRelativeTimeString(project.updatedAt)}
              {mainVideo?.duration && ` · ${formatDuration(mainVideo.duration)}`}
            </Text>
          </View>
        </View>
        
        <View style={styles.projectActions}>
          <Pressable 
            style={styles.moreButton}
            onPress={() => handleMorePress(project.id)}
          >
            <MoreHorizontal size={20} color={colors.mutedForeground} />
          </Pressable>
          
          {isSelected && (
            <View style={[styles.actionMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Pressable
                style={styles.actionMenuItem}
                onPress={() => handleDeleteProject(project.id)}
              >
                <Trash2 size={18} color={colors.destructive} />
                <Text style={[styles.actionMenuText, { color: colors.destructive }]}>
                  Delete
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  const { today, yesterday, older } = groupedProjects();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.headerIcon}>
          <VideoIcon size={24} color={colors.mutedForeground} />
        </View>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Library
        </Text>
        <View style={styles.headerRight}>
          <Text style={[styles.projectCount, { color: colors.mutedForeground }]}>
            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
          </Text>
        </View>
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
        {FILTER_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            style={[
              styles.filterChip,
              {
                backgroundColor: filterBy === option.value ? colors.primary : colors.muted,
                minWidth: 60,
              },
            ]}
            onPress={() => setFilterBy(option.value)}
          >
            <Text
              style={[
                styles.filterText,
                {
                  color: filterBy === option.value 
                    ? colors.primaryForeground 
                    : colors.foreground,
                },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
        
        <Pressable
          style={[
            styles.filterChip,
            styles.sortChip,
            { backgroundColor: colors.muted },
          ]}
          onPress={() => setShowSortMenu(!showSortMenu)}
        >
          <Text style={[styles.filterText, { color: colors.foreground }]}>
            Sort: {SORT_OPTIONS.find((o) => o.value === sortBy)?.label}
          </Text>
          <ChevronDown size={16} color={colors.foreground} />
        </Pressable>
      </ScrollView>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredProjects().length === 0 ? (
        <View style={styles.emptyState}>
          <Film size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {searchQuery ? 'No Results' : 'No Projects'}
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {searchQuery 
              ? 'Try a different search term'
              : 'Create a project to get started'}
          </Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.projectList} 
          showsVerticalScrollIndicator={false}
          onTouchStart={() => setSelectedProjectId(null)}
        >
          {today.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Today
              </Text>
              {today.map(renderProjectItem)}
            </>
          )}

          {yesterday.length > 0 && (
            <>
              <Text 
                style={[
                  styles.sectionTitle, 
                  { color: colors.foreground, marginTop: today.length > 0 ? Spacing.lg : 0 }
                ]}
              >
                Yesterday
              </Text>
              {yesterday.map(renderProjectItem)}
            </>
          )}

          {older.length > 0 && (
            <>
              <Text 
                style={[
                  styles.sectionTitle, 
                  { 
                    color: colors.foreground, 
                    marginTop: (today.length > 0 || yesterday.length > 0) ? Spacing.lg : 0 
                  }
                ]}
              >
                Older
              </Text>
              {older.map(renderProjectItem)}
            </>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
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
  headerRight: {
    minWidth: 48,
    alignItems: 'flex-end',
  },
  projectCount: {
    fontSize: 12,
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
    gap: Spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  sortChip: {
    marginLeft: Spacing.sm,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xxl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  projectList: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
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
    borderRadius: BorderRadius.lg,
  },
  projectContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  thumbnail: {
    width: 100,
    height: 64,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailVideo: {
    width: '100%',
    height: '100%',
  },
  projectDetails: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  projectTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  projectPrompt: {
    fontSize: 13,
  },
  projectMeta: {
    fontSize: 12,
  },
  projectActions: {
    position: 'relative',
  },
  moreButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionMenu: {
    position: 'absolute',
    top: 36,
    right: 0,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 100,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  actionMenuText: {
    fontSize: 14,
    fontWeight: '500',
  },
  bottomPadding: {
    height: 100,
  },
});
