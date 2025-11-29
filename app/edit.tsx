import { AVPlaybackStatus, ResizeMode, Video } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    ArrowLeft,
    ArrowUp,
    Download,
    Loader2,
    Mic,
    Pause,
    Play,
    Scissors,
    Sparkles,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
    initializeCactus,
    isCactusReady,
    sendEditRequest,
    type ChatMessage,
    type VideoEditSession,
} from '@/utils/cactus';
import { BACKEND_BASE_URL } from '@/utils/backend';
import { executeToolCall } from '@/utils/ffmpeg';
import {
    addChatMessage,
    formatDuration,
    getMainVideo,
    loadProjectMetadata,
    updateCurrentOutput,
    type ProjectMetadata,
} from '@/utils/project-storage';
import { useAppSettings } from '@/providers/settings-provider';

export default function EditScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ projectId: string; projectTitle: string }>();
  const { sendProcessingCompleteNotification } = useAppSettings();
  
  const [prompt, setPrompt] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [project, setProject] = useState<ProjectMetadata | null>(null);
  const [currentVideoPath, setCurrentVideoPath] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isAIReady, setIsAIReady] = useState(false);
  const [aiDownloadProgress, setAIDownloadProgress] = useState(0);
  const [streamingResponse, setStreamingResponse] = useState('');
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoPosition, setVideoPosition] = useState(0);
  const [lastNotifiedOutput, setLastNotifiedOutput] = useState<string | null>(null);
  
  const videoRef = useRef<Video>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const projectTitle = params.projectTitle || project?.title || 'Project';

  // Load project data
  useEffect(() => {
    const loadData = async () => {
      if (!params.projectId) {
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
        setLastNotifiedOutput(metadata.currentOutputPath ?? null);
        
        // Get main video or current output
        const mainVideo = getMainVideo(metadata);
        const resolvePlayback = (path?: string | null) => {
          if (!path) return null;
          if (path.startsWith('http') || path.startsWith('file://')) return path;
          return `${BACKEND_BASE_URL}/files/${metadata.id}/${path.replace(/^\/+/, '')}`;
        };
        const videoPath =
          resolvePlayback(metadata.currentOutputPath) ||
          mainVideo?.remoteUrl ||
          resolvePlayback(mainVideo?.remotePath) ||
          mainVideo?.path;
        
        if (videoPath) {
          setCurrentVideoPath(videoPath);
        }
        
        // Load existing chat history
        if (metadata.chatHistory.length > 0) {
          setMessages(metadata.chatHistory.map((msg) => ({
            ...msg,
            timestamp: msg.timestamp,
          })));
        }
      } catch {
        Alert.alert('Error', 'Failed to load project');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [params.projectId, router]);

  // Initialize Cactus AI
  useEffect(() => {
    const initAI = async () => {
      if (isCactusReady()) {
        setIsAIReady(true);
        return;
      }
      
      try {
        await initializeCactus({
          onDownloadProgress: (progress) => {
            setAIDownloadProgress(progress);
          },
          onDownloadComplete: () => {
            setAIDownloadProgress(100);
          },
          onInitComplete: () => {
            setIsAIReady(true);
          },
          onError: (error) => {
            console.error('AI init error:', error);
          },
        });
      } catch (error) {
        console.error('Failed to initialize AI:', error);
      }
    };
    
    initAI();
  }, []);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleExport = useCallback(async () => {
    if (!currentVideoPath) {
      Alert.alert('No Video', 'No video to export.');
      return;
    }
    
    Alert.alert(
      'Export Video',
      'The video will be saved to your device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: async () => {
            try {
              // For now, just show success - in production would use MediaLibrary
              Alert.alert('Success', `Video exported: ${currentVideoPath}`);
            } catch {
              Alert.alert('Error', 'Failed to export video');
            }
          },
        },
      ]
    );
  }, [currentVideoPath]);

  // Direct test function - bypasses AI to test backend directly
  const handleDirectTest = useCallback(async () => {
    if (!project) return;
    
    const mainVideo = getMainVideo(project);
    if (!mainVideo?.remotePath) {
      Alert.alert('Error', 'No video file found');
      return;
    }

    Alert.alert(
      'Test Backend Directly',
      'This will trim the video to first 5 seconds (bypassing AI)',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Test Trim',
          onPress: async () => {
            setIsSending(true);
            try {
              const inputFile = mainVideo.remotePath;
              console.log('[DirectTest] Input file:', inputFile);
              
              const result = await executeToolCall(project.id, 'ffmpeg_trim', {
                inputFile: inputFile,
                outputFile: 'output/test_trim.mp4',
                startTime: '0',
                endTime: '5',
              });
              
              console.log('[DirectTest] Result:', result);
              
              if (result.success && result.outputUrl) {
                setCurrentVideoPath(result.outputUrl);
                Alert.alert('Success', `Video trimmed! Output: ${result.outputPath}`);
              } else {
                Alert.alert('Error', `Backend error: ${result.result}`);
              }
            } catch (error) {
              console.error('[DirectTest] Error:', error);
              Alert.alert('Error', String(error));
            } finally {
              setIsSending(false);
            }
          },
        },
      ]
    );
  }, [project]);

  const togglePlayback = useCallback(async () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
  }, [isPlaying]);

  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    
    setIsPlaying(status.isPlaying);
    setVideoDuration(status.durationMillis ? status.durationMillis / 1000 : 0);
    setVideoPosition(status.positionMillis ? status.positionMillis / 1000 : 0);
  }, []);

  const handleSendPrompt = useCallback(async () => {
    if (!prompt.trim() || !project || isSending) return;
    
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: prompt.trim(),
      timestamp: Date.now(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setPrompt('');
    setIsSending(true);
    setStreamingResponse('');
    
    // Save user message to project
    await addChatMessage(project.id, 'user', userMessage.content);
    
    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    
    try {
      if (!isAIReady) {
        // Fallback message if AI not ready
        const fallbackMessage: ChatMessage = {
          id: `msg_${Date.now() + 1}`,
          role: 'assistant',
          content: 'The AI model is still loading. Please wait a moment and try again.',
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, fallbackMessage]);
        setIsSending(false);
        return;
      }
      
      const mainVideo = getMainVideo(project);
      const session: VideoEditSession = {
        projectId: project.id,
        mainVideoPath:
          mainVideo?.remotePath || mainVideo?.remoteUrl || mainVideo?.path || '',
        messages,
        currentOutputPath: project.currentOutputPath || '',
      };
      
      const result = await sendEditRequest(
        session,
        userMessage.content,
        (token) => {
          setStreamingResponse((prev) => prev + token);
        }
      );
      
      // Process any tool calls
      const toolResults: string[] = [];
      let newOutputPath = project.currentOutputPath || null;
      let newPlaybackPath = currentVideoPath;
      let outputWasUpdated = false;
      const toPlaybackUrl = (path?: string | null): string | null => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        if (path.startsWith('file://')) return path;
        return `${BACKEND_BASE_URL}/files/${project.id}/${path.replace(/^\/+/, '')}`;
      };
      
      console.log('[Edit] Function calls received:', result.functionCalls?.length || 0);
      console.log('[Edit] Function calls:', JSON.stringify(result.functionCalls || []));
      
      if (result.functionCalls && result.functionCalls.length > 0) {
        for (const call of result.functionCalls) {
          console.log(`[Edit] Executing tool: ${call.name}`, call.arguments);
          const toolResult = await executeToolCall(
            project.id,
            call.name,
            call.arguments
          );
          console.log(`[Edit] Tool result:`, toolResult);
          toolResults.push(`[${call.name}]: ${toolResult.result}`);
          
          const candidatePlayback = toPlaybackUrl(toolResult.outputUrl || toolResult.outputPath);
          if (toolResult.outputPath) {
            newOutputPath = toolResult.outputPath;
            outputWasUpdated = toolResult.success || outputWasUpdated;
          }
          if (candidatePlayback) {
            newPlaybackPath = candidatePlayback;
            console.log(`[Edit] New playback path: ${newPlaybackPath}`);
          }
        }
        
        // Update current output path
        if (newPlaybackPath && newPlaybackPath !== currentVideoPath) {
          console.log(`[Edit] Updating video path from ${currentVideoPath} to ${newPlaybackPath}`);
          setCurrentVideoPath(newPlaybackPath);
        }
        if (newOutputPath && newOutputPath !== project.currentOutputPath) {
          await updateCurrentOutput(project.id, newOutputPath);
          setProject((prev) => (prev ? { ...prev, currentOutputPath: newOutputPath } : prev));
          setLastNotifiedOutput(newOutputPath);

          if (outputWasUpdated && newOutputPath !== lastNotifiedOutput) {
            try {
              await sendProcessingCompleteNotification(projectTitle);
            } catch (notifyError) {
              console.warn('Failed to send notification', notifyError);
            }
          }
        }
      } else {
        console.log('[Edit] WARNING: No function calls generated by AI');
        // Add note to response if no tools were called
        if (!result.response?.toLowerCase().includes('tool') && !result.response?.toLowerCase().includes('function')) {
          toolResults.push('[Note: The AI did not execute any editing commands. Try being more specific, e.g., "trim this video from 0 to 5 seconds"]');
        }
      }
      
      // Build assistant response
      let assistantContent = result.response || streamingResponse;
      if (toolResults.length > 0) {
        assistantContent += '\n\n' + toolResults.join('\n');
      }
      
      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: assistantContent,
        timestamp: Date.now(),
        toolCalls: result.functionCalls?.map((call) => ({
          name: call.name,
          arguments: call.arguments,
        })),
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
      setStreamingResponse('');
      
      // Save assistant message
      await addChatMessage(project.id, 'assistant', assistantContent);
      
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${String(error)}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
      setStreamingResponse('');
      
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [
    prompt,
    project,
    isSending,
    isAIReady,
    messages,
    currentVideoPath,
    streamingResponse,
    sendProcessingCompleteNotification,
    projectTitle,
    lastNotifiedOutput,
  ]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable style={styles.headerButton} onPress={handleBack}>
          <ArrowLeft size={24} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          {projectTitle}
        </Text>
        <View style={{ flexDirection: 'row', gap: Spacing.md }}>
          <Pressable onPress={handleDirectTest}>
            <Scissors size={22} color={colors.destructive || '#ef4444'} />
          </Pressable>
          <Pressable onPress={handleExport}>
            <Download size={22} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.videoContainer}>
        <View style={styles.videoWrapper}>
          {currentVideoPath ? (
            <Video
              ref={videoRef}
              source={{ uri: currentVideoPath }}
              style={styles.videoPlayer}
              resizeMode={ResizeMode.CONTAIN}
              onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
              shouldPlay={false}
              isLooping
            />
          ) : (
            <View style={[styles.videoPlaceholder, { backgroundColor: colors.muted }]}>
              <Text style={[styles.placeholderText, { color: colors.mutedForeground }]}>
                No video loaded
              </Text>
            </View>
          )}
          
          {currentVideoPath && (
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
          )}
        </View>
        
        {videoDuration > 0 && (
          <View style={styles.timeBar}>
            <Text style={[styles.timeText, { color: colors.mutedForeground }]}>
              {formatDuration(videoPosition)} / {formatDuration(videoDuration)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.chatSection}>
        {!isAIReady && (
          <View style={[styles.aiStatusBar, { backgroundColor: colors.muted }]}>
            <Loader2 size={16} color={colors.primary} />
            <Text style={[styles.aiStatusText, { color: colors.mutedForeground }]}>
              {aiDownloadProgress > 0 && aiDownloadProgress < 100
                ? `Downloading AI model... ${aiDownloadProgress.toFixed(0)}%`
                : 'Initializing AI...'}
            </Text>
          </View>
        )}
        
        <ScrollView
          ref={scrollViewRef}
          style={[styles.chatHistory, { backgroundColor: colors.muted }]}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && (
            <View style={styles.emptyChat}>
              <Sparkles size={24} color={colors.mutedForeground} />
              <Text style={[styles.emptyChatText, { color: colors.mutedForeground }]}>
                Describe what edits you want to make
              </Text>
              <Text style={[styles.emptyChatHint, { color: colors.mutedForeground }]}>
                Try: &quot;Trim the first 5 seconds&quot; or &quot;Make it brighter&quot;
              </Text>
            </View>
          )}
          
          {messages.map((msg) => (
            <View key={msg.id} style={styles.messageItem}>
              {msg.role === 'user' ? (
                <View style={[styles.userBubble, { backgroundColor: colors.card }]}>
                  <Text style={[styles.messageText, { color: colors.foreground }]}>
                    {msg.content}
                  </Text>
                </View>
              ) : (
                <View style={[styles.assistantBubble, { backgroundColor: colors.primary }]}>
                  <Sparkles size={16} color={colors.primaryForeground} />
                  <Text style={[styles.messageText, { color: colors.primaryForeground, flex: 1 }]}>
                    {msg.content}
                  </Text>
                </View>
              )}
            </View>
          ))}
          
          {streamingResponse && (
            <View style={styles.messageItem}>
              <View style={[styles.assistantBubble, { backgroundColor: colors.primary }]}>
                <Sparkles size={16} color={colors.primaryForeground} />
                <Text style={[styles.messageText, { color: colors.primaryForeground, flex: 1 }]}>
                  {streamingResponse}
                </Text>
              </View>
            </View>
          )}
          
          {isSending && !streamingResponse && (
            <View style={styles.messageItem}>
              <View style={[styles.assistantBubble, { backgroundColor: colors.primary }]}>
                <ActivityIndicator size="small" color={colors.primaryForeground} />
                <Text style={[styles.messageText, { color: colors.primaryForeground }]}>
                  Thinking...
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
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
              editable={!isSending}
            />
            <Pressable style={styles.micButton}>
              <Mic size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <Pressable
            style={[
              styles.sendButton,
              {
                backgroundColor: prompt.trim() && !isSending ? colors.primary : colors.muted,
              },
            ]}
            onPress={handleSendPrompt}
            disabled={!prompt.trim() || isSending}
          >
            {isSending ? (
              <Loader2 size={20} color={colors.mutedForeground} />
            ) : (
              <ArrowUp
                size={20}
                color={prompt.trim() ? colors.primaryForeground : colors.mutedForeground}
              />
            )}
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
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
  videoContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  videoWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 14,
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
  timeBar: {
    marginTop: Spacing.sm,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  chatSection: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  aiStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  aiStatusText: {
    fontSize: 12,
    flex: 1,
  },
  chatHistory: {
    flex: 1,
    borderRadius: BorderRadius.xl,
  },
  chatContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
  },
  emptyChatText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyChatHint: {
    fontSize: 12,
    textAlign: 'center',
  },
  messageItem: {
    gap: Spacing.sm,
  },
  userBubble: {
    maxWidth: '85%',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderTopRightRadius: 4,
    alignSelf: 'flex-end',
  },
  assistantBubble: {
    maxWidth: '85%',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderTopLeftRadius: 4,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
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
