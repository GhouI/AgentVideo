import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  ArrowUp,
  Mic,
  Pause,
  Play,
  Sparkles,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, BorderRadius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function EditScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ projectId: string; projectTitle: string }>();
  
  const [prompt, setPrompt] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);

  const projectTitle = params.projectTitle || 'New Project';

  const handleBack = () => {
    router.back();
  };

  const handleExport = () => {
    // Export functionality
  };

  const handleSubmitPrompt = () => {
    if (prompt.trim()) {
      // Process the prompt
      console.log('Processing prompt:', prompt);
      setPrompt('');
    }
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          style={styles.headerButton}
          onPress={handleBack}
        >
          <ArrowLeft size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          {projectTitle}
        </Text>
        <Pressable onPress={handleExport}>
          <Text style={[styles.exportButton, { color: colors.primary }]}>
            Export
          </Text>
        </Pressable>
      </View>

      <View style={styles.videoContainer}>
        <View style={styles.videoWrapper}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=800&h=450&fit=crop' }}
            style={[styles.videoPreview, { backgroundColor: colors.muted }]}
            contentFit="cover"
            transition={200}
          />
          <Pressable
            style={[styles.playButton, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
            onPress={togglePlayback}
          >
            {isPlaying ? (
              <Pause size={32} color="#fff" fill="#fff" />
            ) : (
              <Play size={32} color="#fff" fill="#fff" />
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.promptSection}>
        <View style={[styles.promptHistory, { backgroundColor: colors.muted }]}>
          <View style={styles.promptHistoryItem}>
            <View style={[styles.promptBubble, { backgroundColor: colors.card }]}>
              <Text style={[styles.promptText, { color: colors.foreground }]}>
                Add a cinematic zoom on the first clip and increase the saturation
              </Text>
            </View>
          </View>
          <View style={styles.promptHistoryItem}>
            <View style={[styles.responseBubble, { backgroundColor: colors.primary }]}>
              <Sparkles size={16} color={colors.primaryForeground} />
              <Text style={[styles.responseText, { color: colors.primaryForeground }]}>
                Applied cinematic zoom and increased saturation by 15%
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + Spacing.sm,
          },
        ]}
      >
        <View style={styles.inputRow}>
          <View style={[styles.inputWrapper, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Describe your edit..."
              placeholderTextColor={colors.mutedForeground}
              value={prompt}
              onChangeText={setPrompt}
              multiline
              maxLength={500}
            />
            <Pressable style={styles.micButton}>
              <Mic size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <Pressable
            style={[
              styles.sendButton,
              {
                backgroundColor: prompt.trim() ? colors.primary : colors.muted,
              },
            ]}
            onPress={handleSubmitPrompt}
            disabled={!prompt.trim()}
          >
            <ArrowUp
              size={20}
              color={prompt.trim() ? colors.primaryForeground : colors.mutedForeground}
            />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
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
  headerButton: {
    width: 48,
    height: 48,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  exportButton: {
    fontSize: 16,
    fontWeight: '700',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  videoWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  videoPreview: {
    width: '100%',
    height: '100%',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -32 }, { translateY: -32 }],
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptSection: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  promptHistory: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  promptHistoryItem: {
    alignItems: 'flex-start',
  },
  promptBubble: {
    maxWidth: '85%',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderTopLeftRadius: 4,
  },
  promptText: {
    fontSize: 14,
    lineHeight: 20,
  },
  responseBubble: {
    maxWidth: '85%',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderTopRightRadius: 4,
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  responseText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  inputContainer: {
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderTopWidth: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.sm,
    paddingVertical: Spacing.sm,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingTop: Platform.OS === 'ios' ? 8 : 4,
    paddingBottom: Platform.OS === 'ios' ? 8 : 4,
  },
  micButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

