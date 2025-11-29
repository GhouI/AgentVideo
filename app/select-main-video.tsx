import { Video, ResizeMode } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Check, Film, Play } from 'lucide-react-native';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  loadProjectMetadata,
  setMainVideo,
  getVideoFiles,
  updateProjectTitle,
  type ProjectFile,
  type ProjectMetadata,
  formatDuration,
} from '@/utils/project-storage';
import { getVideoInfo } from '@/utils/ffmpeg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.lg * 3) / 2;

interface VideoFileWithInfo extends ProjectFile {
  durationSeconds?: number;
}

export default function SelectMainVideoScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ projectId: string }>();
  
  const [project, setProject] = useState<ProjectMetadata | null>(null);
  const [videos, setVideos] = useState<VideoFileWithInfo[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);
  const videoRef = useRef<Video>(null);

  // Load project and video files
  useEffect(() => {
    const loadData = async () => {
      if (!params.projectId) {
        Alert.alert('Error', 'No project ID provided');
        router.back();
        return;
      }
      
      setIsLoading(true);
      
      try {
        const metadata = await loadProjectMetadata(params.projectId);
        if (!metadata) {
          Alert.alert('Error', 'Project not found');
          router.back();
          return;
        }
        
        setProject(metadata);
        
        // Get video files and their info
        const videoFiles = getVideoFiles(metadata);
        const videosWithInfo: VideoFileWithInfo[] = [];
        
        for (const video of videoFiles) {
          const info = await getVideoInfo(metadata.id, {
            remotePath: video.remotePath,
            remoteUrl: video.remoteUrl,
            path: video.path,
          });
          videosWithInfo.push({
            ...video,
            durationSeconds: info?.duration,
            width: info?.width,
            height: info?.height,
          });
        }
        
        setVideos(videosWithInfo);
        
        // Auto-select if only one video
        if (videosWithInfo.length === 1) {
          setSelectedVideoId(videosWithInfo[0].id);
        }
      } catch {
        Alert.alert('Error', 'Failed to load project');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [params.projectId, router]);

  const handleSelectVideo = useCallback((videoId: string) => {
    setSelectedVideoId(videoId);
  }, []);

  const handlePreview = useCallback((videoId: string) => {
    setPreviewVideoId(previewVideoId === videoId ? null : videoId);
  }, [previewVideoId]);

  const handleConfirm = useCallback(async () => {
    if (!selectedVideoId || !project) {
      Alert.alert('Select Video', 'Please select a main video to continue.');
      return;
    }
    
    try {
      await setMainVideo(project.id, selectedVideoId);
      
      // Get selected video name for project title
      const selectedVideo = videos.find((v) => v.id === selectedVideoId);
      if (selectedVideo) {
        const baseName = selectedVideo.name.replace(/\.[^/.]+$/, '');
        await updateProjectTitle(project.id, baseName);
      }
      
      router.replace({
        pathname: '/edit',
        params: { 
          projectId: project.id, 
          projectTitle: selectedVideo?.name || 'New Project' 
        },
      });
    } catch {
      Alert.alert('Error', 'Failed to set main video');
    }
  }, [selectedVideoId, project, videos, router]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
          Loading videos...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable style={styles.headerButton} onPress={handleBack}>
          <ArrowLeft size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Select Main Video
        </Text>
        <Pressable 
          onPress={handleConfirm}
          disabled={!selectedVideoId}
        >
          <Text 
            style={[
              styles.confirmButton, 
              { color: selectedVideoId ? colors.primary : colors.mutedForeground }
            ]}
          >
            Continue
          </Text>
        </Pressable>
      </View>

      <View style={[styles.infoBar, { backgroundColor: colors.muted }]}>
        <Film size={18} color={colors.mutedForeground} />
        <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
          Choose the primary video for your timeline. Other files will be available as assets.
        </Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.videoGrid}>
          {videos.map((video) => (
            <Pressable
              key={video.id}
              style={[
                styles.videoCard,
                {
                  borderColor: selectedVideoId === video.id 
                    ? colors.primary 
                    : colors.border,
                  borderWidth: selectedVideoId === video.id ? 2 : 1,
                },
              ]}
              onPress={() => handleSelectVideo(video.id)}
            >
              <View style={[styles.videoThumbnail, { backgroundColor: colors.muted }]}>
                {previewVideoId === video.id ? (
                  <Video
                    ref={videoRef}
                    source={{ uri: video.path }}
                    style={styles.videoPlayer}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay
                    isLooping
                    isMuted
                  />
                ) : (
                  <View style={styles.thumbnailPlaceholder}>
                    <Film size={32} color={colors.mutedForeground} />
                  </View>
                )}
                
                <Pressable
                  style={[styles.playButton, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
                  onPress={() => handlePreview(video.id)}
                >
                  <Play size={20} color="#fff" fill="#fff" />
                </Pressable>
                
                {selectedVideoId === video.id && (
                  <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                    <Check size={16} color={colors.primaryForeground} />
                  </View>
                )}
                
                {video.durationSeconds !== undefined && (
                  <View style={styles.durationBadge}>
                    <Text style={styles.durationText}>
                      {formatDuration(video.durationSeconds)}
                    </Text>
                  </View>
                )}
              </View>
              
              <View style={styles.videoInfo}>
                <Text 
                  style={[styles.videoName, { color: colors.foreground }]}
                  numberOfLines={2}
                >
                  {video.name}
                </Text>
                {video.width && video.height && (
                  <Text style={[styles.videoMeta, { color: colors.mutedForeground }]}>
                    {video.width}x{video.height}
                  </Text>
                )}
              </View>
            </Pressable>
          ))}
        </View>

        {videos.length === 0 && (
          <View style={styles.emptyState}>
            <Film size={48} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No Videos Found
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Go back and add some video files to your project.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerButton: {
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
  confirmButton: {
    fontSize: 16,
    fontWeight: '700',
  },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
  },
  videoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
  },
  videoCard: {
    width: CARD_WIDTH,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  videoThumbnail: {
    width: '100%',
    aspectRatio: 16 / 9,
    position: 'relative',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  videoInfo: {
    padding: Spacing.md,
    gap: 4,
  },
  videoName: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  videoMeta: {
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});

