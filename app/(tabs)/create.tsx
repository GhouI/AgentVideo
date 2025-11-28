import { useRouter } from 'expo-router';
import {
  CheckCircle,
  Image as ImageIcon,
  Link as LinkIcon,
  Upload,
  Video,
  XCircle,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface UploadedFile {
  id: string;
  name: string;
  type: 'video' | 'image';
  progress: number;
  status: 'uploading' | 'complete' | 'failed';
}

const MOCK_UPLOADS: UploadedFile[] = [
  {
    id: '1',
    name: 'beach_sunset.mp4',
    type: 'video',
    progress: 100,
    status: 'complete',
  },
  {
    id: '2',
    name: 'vacation_photo_01.jpg',
    type: 'image',
    progress: 75,
    status: 'uploading',
  },
  {
    id: '3',
    name: 'city_timelapse.mov',
    type: 'video',
    progress: 40,
    status: 'failed',
  },
];

export default function CreateScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [uploads, setUploads] = useState<UploadedFile[]>(MOCK_UPLOADS);

  const handleUpload = () => {
    const newUpload: UploadedFile = {
      id: Date.now().toString(),
      name: `new_video_${uploads.length + 1}.mp4`,
      type: 'video',
      progress: 0,
      status: 'uploading',
    };
    setUploads([...uploads, newUpload]);
  };

  const handleDone = () => {
    const completedUploads = uploads.filter((u) => u.status === 'complete');
    if (completedUploads.length > 0) {
      router.push({
        pathname: '/edit',
        params: { projectId: 'new', projectTitle: 'New Project' },
      });
    }
  };

  const getStatusIcon = (file: UploadedFile) => {
    switch (file.status) {
      case 'complete':
        return <CheckCircle size={20} color="rgb(34, 197, 94)" />;
      case 'failed':
        return <XCircle size={20} color={colors.destructive} />;
      case 'uploading':
        return (
          <ActivityIndicator
            size="small"
            color={colors.primary}
          />
        );
    }
  };

  const getProgressColor = (file: UploadedFile) => {
    switch (file.status) {
      case 'complete':
        return colors.primary;
      case 'failed':
        return colors.destructive;
      default:
        return colors.primary;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md, borderBottomColor: colors.border }]}>
        <View style={styles.headerSpacer} />
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Import Resources
        </Text>
        <Pressable onPress={handleDone}>
          <Text style={[styles.doneButton, { color: colors.primary }]}>
            Done
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.uploadOptions}>
          <Pressable
            style={({ pressed }) => [
              styles.uploadButton,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={handleUpload}
          >
            <Upload size={24} color={colors.primary} />
            <Text style={[styles.uploadButtonText, { color: colors.foreground }]}>
              Upload Video Files
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.uploadButton,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <LinkIcon size={24} color={colors.primary} />
            <Text style={[styles.uploadButtonText, { color: colors.foreground }]}>
              Paste URL
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.uploadButton,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <ImageIcon size={24} color={colors.primary} />
            <Text style={[styles.uploadButtonText, { color: colors.foreground }]}>
              Select from Gallery
            </Text>
          </Pressable>
        </View>

        {uploads.length > 0 && (
          <View style={styles.uploadedSection}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
              UPLOADED
            </Text>

            <View style={styles.uploadList}>
              {uploads.map((file) => (
                <View
                  key={file.id}
                  style={[styles.uploadItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={[styles.fileIconWrapper, { backgroundColor: colors.muted }]}>
                    {file.type === 'video' ? (
                      <Video size={20} color={colors.mutedForeground} />
                    ) : (
                      <ImageIcon size={20} color={colors.mutedForeground} />
                    )}
                  </View>

                  <View style={styles.fileInfo}>
                    <Text style={[styles.fileName, { color: colors.foreground }]} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <View style={styles.progressContainer}>
                      <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              backgroundColor: getProgressColor(file),
                              width: `${file.progress}%`,
                            },
                          ]}
                        />
                      </View>
                      <Text
                        style={[
                          styles.progressText,
                          {
                            color: file.status === 'failed' ? colors.destructive : colors.mutedForeground,
                          },
                        ]}
                      >
                        {file.status === 'failed' ? 'Failed' : `${file.progress}%`}
                      </Text>
                    </View>
                  </View>

                  {getStatusIcon(file)}
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.helpText}>
          <Text style={[styles.helpTextContent, { color: colors.mutedForeground }]}>
            Do you want to upload more?
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
  headerSpacer: {
    width: 48,
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
  uploadOptions: {
    gap: Spacing.lg,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
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
  uploadedSection: {
    marginTop: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: Spacing.lg,
  },
  uploadList: {
    gap: Spacing.lg,
  },
  uploadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  fileIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
    width: 40,
  },
  helpText: {
    alignItems: 'center',
    marginTop: Spacing.xxl,
  },
  helpTextContent: {
    fontSize: 16,
  },
});

