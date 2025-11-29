import { Video, ResizeMode } from 'expo-av';
import { useFocusEffect, useRouter } from 'expo-router';
import { Film, Plus, Sparkles } from 'lucide-react-native';
import React, { useState, useCallback } from 'react';
import {
  ActivityIndicator,
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
import {
  listProjects,
  getMainVideo,
  getRelativeTimeString,
  type ProjectMetadata,
} from '@/utils/project-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.lg * 3) / 2;

export default function DashboardScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  // Load projects on focus
  useFocusEffect(
    useCallback(() => {
      const loadProjects = async () => {
        setIsLoading(true);
        try {
          const projectList = await listProjects();
          setProjects(projectList);
        } catch (error) {
          console.error('Failed to load projects:', error);
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

  const handleCreateNew = useCallback(() => {
    router.push('/(tabs)/create');
  }, [router]);

  const handleLongPress = useCallback((projectId: string) => {
    setPreviewingId((prev) => (prev === projectId ? null : projectId));
  }, []);

  // Get the main video thumbnail path for a project
  const getProjectThumbnail = useCallback((project: ProjectMetadata): string | null => {
    const mainVideo = getMainVideo(project);
    return mainVideo?.thumbnailPath || mainVideo?.path || null;
  }, []);

  const recentProjects = projects.slice(0, 6);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.headerLeft}>
          <Sparkles size={24} color={colors.primary} />
        </View>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Prompt Edit
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : projects.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
              <Film size={48} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No Projects Yet
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Create your first project to start editing videos with AI
            </Text>
            <Pressable
              style={[styles.emptyButton, { backgroundColor: colors.primary }]}
              onPress={handleCreateNew}
            >
              <Plus size={20} color={colors.primaryForeground} />
              <Text style={[styles.emptyButtonText, { color: colors.primaryForeground }]}>
                Create Project
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Recent Projects
            </Text>

            <View style={styles.projectGrid}>
              {recentProjects.map((project) => {
                const thumbnailPath = getProjectThumbnail(project);
                const isVideo = thumbnailPath?.endsWith('.mp4') || 
                               thumbnailPath?.endsWith('.mov') || 
                               thumbnailPath?.endsWith('.avi');
                const isPreviewing = previewingId === project.id && isVideo;
                
                return (
                  <Pressable
                    key={project.id}
                    style={({ pressed }) => [
                      styles.projectCard,
                      { opacity: pressed ? 0.8 : 1 },
                    ]}
                    onPress={() => handleProjectPress(project)}
                    onLongPress={() => handleLongPress(project.id)}
                  >
                    <View style={[styles.projectThumbnail, { backgroundColor: colors.muted }]}>
                      {thumbnailPath && isVideo && isPreviewing ? (
                        <Video
                          source={{ uri: thumbnailPath }}
                          style={styles.thumbnailVideo}
                          resizeMode={ResizeMode.COVER}
                          shouldPlay
                          isLooping
                          isMuted
                        />
                      ) : thumbnailPath && !isVideo ? (
                        <Video
                          source={{ uri: thumbnailPath }}
                          style={styles.thumbnailVideo}
                          resizeMode={ResizeMode.COVER}
                          shouldPlay={false}
                        />
                      ) : (
                        <View style={styles.thumbnailPlaceholder}>
                          <Film size={32} color={colors.mutedForeground} />
                        </View>
                      )}
                    </View>
                    <View style={styles.projectInfo}>
                      <Text
                        style={[styles.projectTitle, { color: colors.foreground }]}
                        numberOfLines={1}
                      >
                        {project.title}
                      </Text>
                      <Text style={[styles.projectDate, { color: colors.mutedForeground }]}>
                        {getRelativeTimeString(project.updatedAt)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {projects.length > 6 && (
              <Pressable
                style={[styles.viewAllButton, { borderColor: colors.border }]}
                onPress={() => router.push('/(tabs)/library')}
              >
                <Text style={[styles.viewAllText, { color: colors.primary }]}>
                  View All Projects
                </Text>
              </Pressable>
            )}
          </>
        )}

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
  headerLeft: {
    width: 48,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerRight: {
    width: 48,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    paddingVertical: Spacing.xxl * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
    gap: Spacing.md,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 280,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.lg,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
    overflow: 'hidden',
  },
  thumbnailVideo: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  viewAllButton: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
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
