import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import {
  AlertCircle,
  CheckCircle,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  Upload,
  Video,
  X,
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
  createProject,
  addFileToProject,
  type ProjectFile,
  type ProjectMetadata,
} from '@/utils/project-storage';

interface UploadItem {
  id: string;
  name: string;
  type: 'video' | 'image';
  sourceUri: string;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'failed';
  error?: string;
  projectFile?: ProjectFile;
}

export default function CreateScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [currentProject, setCurrentProject] = useState<ProjectMetadata | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);

  // Pick video/image files
  const handlePickFiles = useCallback(async (type: 'video' | 'image' | 'all') => {
    try {
      const mimeTypes = type === 'video' 
        ? ['video/*'] 
        : type === 'image' 
          ? ['image/*'] 
          : ['video/*', 'image/*'];
          
      const result = await DocumentPicker.getDocumentAsync({
        type: mimeTypes,
        multiple: true,
      });
      
      if (result.canceled || !result.assets) return;
      
      const newUploads: UploadItem[] = result.assets.map((asset) => ({
        id: `upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        name: asset.name,
        type: asset.mimeType?.startsWith('video/') ? 'video' : 'image',
        sourceUri: asset.uri,
        progress: 0,
        status: 'pending',
      }));
      
      setUploads((prev) => [...prev, ...newUploads]);
    } catch {
      Alert.alert('Error', 'Failed to pick files');
    }
  }, []);

  // Handle URL input
  const handleAddUrl = useCallback(() => {
    if (!urlInput.trim()) return;
    
    // Check if it's a YouTube URL
    const isYouTube = urlInput.includes('youtube.com') || urlInput.includes('youtu.be');
    
    if (isYouTube) {
      Alert.alert(
        'YouTube URL',
        'YouTube downloads are not yet supported in this version. Please download the video manually and upload the file.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // For direct video URLs, add to uploads
    const fileName = urlInput.split('/').pop() || 'video_from_url.mp4';
    const newUpload: UploadItem = {
      id: `upload_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: fileName,
      type: 'video',
      sourceUri: urlInput,
      progress: 0,
      status: 'pending',
    };
    
    setUploads((prev) => [...prev, newUpload]);
    setUrlInput('');
    setShowUrlInput(false);
  }, [urlInput]);

  // Remove an upload
  const handleRemoveUpload = useCallback((id: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  }, []);

  // Process uploads and create project
  const handleDone = useCallback(async () => {
    if (uploads.length === 0) {
      Alert.alert('No Files', 'Please add at least one video or image file.');
      return;
    }
    
    const pendingUploads = uploads.filter((u) => u.status === 'pending');
    if (pendingUploads.length === 0 && uploads.some((u) => u.status === 'complete')) {
      // All uploads done, navigate to select main video
      if (currentProject) {
        (router as { push: (href: string) => void }).push(`/select-main-video?projectId=${currentProject.id}`);
      }
      return;
    }
    
    setIsCreatingProject(true);
    
    try {
      // Create project if not exists
      let project = currentProject;
      if (!project) {
        project = await createProject('New Project');
        setCurrentProject(project);
      }
      
      // Process each pending upload
      for (const upload of pendingUploads) {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === upload.id ? { ...u, status: 'uploading', progress: 10 } : u
          )
        );
        
        try {
          // Add file to project
          const projectFile = await addFileToProject(
            project.id,
            upload.sourceUri,
            upload.name,
            upload.type
          );
          
          setUploads((prev) =>
            prev.map((u) =>
              u.id === upload.id
                ? { ...u, status: 'complete', progress: 100, projectFile }
                : u
            )
          );
        } catch (error) {
          setUploads((prev) =>
            prev.map((u) =>
              u.id === upload.id
                ? { ...u, status: 'failed', error: String(error) }
                : u
            )
          );
        }
      }
      
      // Check if all complete
      const updatedUploads = uploads.map((u) => {
        if (pendingUploads.find((p) => p.id === u.id)) {
          return { ...u, status: 'complete' as const };
        }
        return u;
      });
      
      const allComplete = updatedUploads.every(
        (u) => u.status === 'complete' || u.status === 'failed'
      );
      
      if (allComplete && updatedUploads.some((u) => u.status === 'complete')) {
        // Navigate to select main video
        (router as { push: (href: string) => void }).push(`/select-main-video?projectId=${project.id}`);
      }
    } catch {
      Alert.alert('Error', 'Failed to create project');
    } finally {
      setIsCreatingProject(false);
    }
  }, [uploads, currentProject, router]);

  const getStatusIcon = (upload: UploadItem) => {
    switch (upload.status) {
      case 'complete':
        return <CheckCircle size={20} color="rgb(34, 197, 94)" />;
      case 'failed':
        return <AlertCircle size={20} color={colors.destructive} />;
      case 'uploading':
        return <ActivityIndicator size="small" color={colors.primary} />;
      default:
        return <Loader2 size={20} color={colors.mutedForeground} />;
    }
  };

  const hasVideos = uploads.some((u) => u.type === 'video');
  const canProceed = uploads.length > 0 && hasVideos;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md, borderBottomColor: colors.border }]}>
        <Pressable 
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <X size={24} color={colors.mutedForeground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          New Project
        </Text>
        <Pressable 
          onPress={handleDone}
          disabled={!canProceed || isCreatingProject}
        >
          <Text 
            style={[
              styles.doneButton, 
              { 
                color: canProceed && !isCreatingProject 
                  ? colors.primary 
                  : colors.mutedForeground 
              }
            ]}
          >
            {isCreatingProject ? 'Processing...' : 'Next'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          ADD FILES
        </Text>
        
        <View style={styles.uploadOptions}>
          <Pressable
            style={({ pressed }) => [
              styles.uploadButton,
              { 
                backgroundColor: colors.card, 
                borderColor: colors.border, 
                opacity: pressed ? 0.8 : 1 
              },
            ]}
            onPress={() => handlePickFiles('video')}
          >
            <Video size={24} color={colors.primary} />
            <Text style={[styles.uploadButtonText, { color: colors.foreground }]}>
              Select Videos
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.uploadButton,
              { 
                backgroundColor: colors.card, 
                borderColor: colors.border, 
                opacity: pressed ? 0.8 : 1 
              },
            ]}
            onPress={() => handlePickFiles('image')}
          >
            <ImageIcon size={24} color={colors.primary} />
            <Text style={[styles.uploadButtonText, { color: colors.foreground }]}>
              Select Images
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.uploadButton,
              { 
                backgroundColor: colors.card, 
                borderColor: colors.border, 
                opacity: pressed ? 0.8 : 1 
              },
            ]}
            onPress={() => setShowUrlInput(true)}
          >
            <LinkIcon size={24} color={colors.primary} />
            <Text style={[styles.uploadButtonText, { color: colors.foreground }]}>
              Add from URL
            </Text>
          </Pressable>
        </View>

        {showUrlInput && (
          <View style={[styles.urlInputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.urlInput, { color: colors.foreground }]}
              placeholder="Paste video URL..."
              placeholderTextColor={colors.mutedForeground}
              value={urlInput}
              onChangeText={setUrlInput}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Pressable
              style={[styles.urlAddButton, { backgroundColor: colors.primary }]}
              onPress={handleAddUrl}
            >
              <Upload size={18} color={colors.primaryForeground} />
            </Pressable>
          </View>
        )}

        {uploads.length > 0 && (
          <View style={styles.uploadedSection}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              FILES ({uploads.length})
            </Text>

            <View style={styles.uploadList}>
              {uploads.map((upload) => (
                <View
                  key={upload.id}
                  style={[
                    styles.uploadItem, 
                    { backgroundColor: colors.card, borderColor: colors.border }
                  ]}
                >
                  <View style={[styles.fileIconWrapper, { backgroundColor: colors.muted }]}>
                    {upload.type === 'video' ? (
                      <Video size={20} color={colors.mutedForeground} />
                    ) : (
                      <ImageIcon size={20} color={colors.mutedForeground} />
                    )}
                  </View>

                  <View style={styles.fileInfo}>
                    <Text 
                      style={[styles.fileName, { color: colors.foreground }]} 
                      numberOfLines={1}
                    >
                      {upload.name}
                    </Text>
                    <Text 
                      style={[
                        styles.fileStatus, 
                        { 
                          color: upload.status === 'failed' 
                            ? colors.destructive 
                            : colors.mutedForeground 
                        }
                      ]}
                    >
                      {upload.status === 'failed' 
                        ? upload.error || 'Failed' 
                        : upload.status === 'complete'
                          ? 'Ready'
                          : upload.status === 'uploading'
                            ? 'Processing...'
                            : 'Pending'}
                    </Text>
                  </View>

                  {getStatusIcon(upload)}
                  
                  <Pressable
                    style={styles.removeButton}
                    onPress={() => handleRemoveUpload(upload.id)}
                  >
                    <X size={18} color={colors.mutedForeground} />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}

        {!hasVideos && uploads.length > 0 && (
          <View style={[styles.warningBox, { backgroundColor: colors.muted }]}>
            <AlertCircle size={20} color={colors.primary} />
            <Text style={[styles.warningText, { color: colors.foreground }]}>
              Add at least one video file to continue
            </Text>
          </View>
        )}

        <View style={styles.helpSection}>
          <Text style={[styles.helpTitle, { color: colors.foreground }]}>
            Supported formats
          </Text>
          <Text style={[styles.helpText, { color: colors.mutedForeground }]}>
            Video: MP4, MOV, AVI, MKV, WebM
          </Text>
          <Text style={[styles.helpText, { color: colors.mutedForeground }]}>
            Image: JPG, PNG, WebP, GIF
          </Text>
        </View>
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
    borderBottomWidth: 1,
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
  doneButton: {
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.xl,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  uploadOptions: {
    gap: Spacing.md,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  urlInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  urlInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: Spacing.sm,
  },
  urlAddButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadedSection: {
    marginTop: Spacing.xxl,
  },
  uploadList: {
    gap: Spacing.md,
  },
  uploadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  fileIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
    gap: 2,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
  },
  fileStatus: {
    fontSize: 12,
  },
  removeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.xl,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
  },
  helpSection: {
    marginTop: Spacing.xxl,
    gap: Spacing.xs,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  helpText: {
    fontSize: 13,
  },
});
