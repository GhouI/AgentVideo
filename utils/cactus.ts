import { CactusLM, type Message } from 'cactus-react-native';

// Custom tool type that extends the basic cactus type with additional properties
interface ExtendedTool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
}

// FFmpeg tools that the AI agent can call
export const ffmpegTools: ExtendedTool[] = [
  {
    name: 'ffmpeg_trim',
    description: 'Trim/cut a video file between start and end timestamps',
    parameters: {
      type: 'object',
      properties: {
        inputFile: {
          type: 'string',
          description: 'Path to the input video file in the sandbox',
        },
        outputFile: {
          type: 'string',
          description: 'Path for the output video file',
        },
        startTime: {
          type: 'string',
          description: 'Start timestamp in format HH:MM:SS or seconds (e.g., "00:00:10" or "10")',
        },
        endTime: {
          type: 'string',
          description: 'End timestamp in format HH:MM:SS or seconds (e.g., "00:00:30" or "30")',
        },
      },
      required: ['inputFile', 'outputFile', 'startTime', 'endTime'],
    },
  },
  {
    name: 'ffmpeg_concat',
    description: 'Concatenate multiple video files into one',
    parameters: {
      type: 'object',
      properties: {
        inputFiles: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of input video file paths to concatenate in order',
        },
        outputFile: {
          type: 'string',
          description: 'Path for the output video file',
        },
      },
      required: ['inputFiles', 'outputFile'],
    },
  },
  {
    name: 'ffmpeg_filter',
    description: 'Apply visual filters to a video (brightness, contrast, saturation, blur, etc.)',
    parameters: {
      type: 'object',
      properties: {
        inputFile: {
          type: 'string',
          description: 'Path to the input video file',
        },
        outputFile: {
          type: 'string',
          description: 'Path for the output video file',
        },
        filterName: {
          type: 'string',
          enum: ['brightness', 'contrast', 'saturation', 'blur', 'sharpen', 'grayscale', 'sepia', 'vignette'],
          description: 'The filter to apply',
        },
        value: {
          type: 'number',
          description: 'Filter intensity value (typically -1 to 1 or 0 to 2 depending on filter)',
        },
      },
      required: ['inputFile', 'outputFile', 'filterName'],
    },
  },
  {
    name: 'ffmpeg_scale',
    description: 'Resize/scale a video to different dimensions',
    parameters: {
      type: 'object',
      properties: {
        inputFile: {
          type: 'string',
          description: 'Path to the input video file',
        },
        outputFile: {
          type: 'string',
          description: 'Path for the output video file',
        },
        width: {
          type: 'number',
          description: 'Target width in pixels (-1 to maintain aspect ratio)',
        },
        height: {
          type: 'number',
          description: 'Target height in pixels (-1 to maintain aspect ratio)',
        },
      },
      required: ['inputFile', 'outputFile', 'width', 'height'],
    },
  },
  {
    name: 'ffmpeg_speed',
    description: 'Change the playback speed of a video',
    parameters: {
      type: 'object',
      properties: {
        inputFile: {
          type: 'string',
          description: 'Path to the input video file',
        },
        outputFile: {
          type: 'string',
          description: 'Path for the output video file',
        },
        speed: {
          type: 'number',
          description: 'Speed multiplier (0.5 = half speed, 2 = double speed)',
        },
      },
      required: ['inputFile', 'outputFile', 'speed'],
    },
  },
  {
    name: 'ffmpeg_audio',
    description: 'Adjust audio properties or remove/add audio from video',
    parameters: {
      type: 'object',
      properties: {
        inputFile: {
          type: 'string',
          description: 'Path to the input video file',
        },
        outputFile: {
          type: 'string',
          description: 'Path for the output video file',
        },
        action: {
          type: 'string',
          enum: ['mute', 'volume', 'extract', 'replace'],
          description: 'Audio action to perform',
        },
        value: {
          type: 'number',
          description: 'Volume level (for volume action, 1 = normal, 2 = double)',
        },
        audioFile: {
          type: 'string',
          description: 'Path to audio file (for replace action)',
        },
      },
      required: ['inputFile', 'outputFile', 'action'],
    },
  },
  {
    name: 'ffmpeg_crop',
    description: 'Crop a video to a specific region',
    parameters: {
      type: 'object',
      properties: {
        inputFile: {
          type: 'string',
          description: 'Path to the input video file',
        },
        outputFile: {
          type: 'string',
          description: 'Path for the output video file',
        },
        width: {
          type: 'number',
          description: 'Width of the crop area',
        },
        height: {
          type: 'number',
          description: 'Height of the crop area',
        },
        x: {
          type: 'number',
          description: 'X position of the crop area (from top-left)',
        },
        y: {
          type: 'number',
          description: 'Y position of the crop area (from top-left)',
        },
      },
      required: ['inputFile', 'outputFile', 'width', 'height', 'x', 'y'],
    },
  },
  {
    name: 'ffmpeg_overlay',
    description: 'Overlay an image or video on top of another video',
    parameters: {
      type: 'object',
      properties: {
        baseFile: {
          type: 'string',
          description: 'Path to the base video file',
        },
        overlayFile: {
          type: 'string',
          description: 'Path to the overlay image/video file',
        },
        outputFile: {
          type: 'string',
          description: 'Path for the output video file',
        },
        x: {
          type: 'number',
          description: 'X position for the overlay',
        },
        y: {
          type: 'number',
          description: 'Y position for the overlay',
        },
        startTime: {
          type: 'number',
          description: 'When to start showing the overlay (in seconds)',
        },
        duration: {
          type: 'number',
          description: 'How long to show the overlay (in seconds)',
        },
      },
      required: ['baseFile', 'overlayFile', 'outputFile', 'x', 'y'],
    },
  },
  {
    name: 'ffmpeg_transition',
    description: 'Apply a transition effect between two video clips',
    parameters: {
      type: 'object',
      properties: {
        inputFile1: {
          type: 'string',
          description: 'Path to the first video file',
        },
        inputFile2: {
          type: 'string',
          description: 'Path to the second video file',
        },
        outputFile: {
          type: 'string',
          description: 'Path for the output video file',
        },
        transitionType: {
          type: 'string',
          enum: ['fade', 'wipe', 'dissolve', 'zoom'],
          description: 'Type of transition effect',
        },
        duration: {
          type: 'number',
          description: 'Duration of the transition in seconds',
        },
      },
      required: ['inputFile1', 'inputFile2', 'outputFile', 'transitionType', 'duration'],
    },
  },
  {
    name: 'ffmpeg_text',
    description: 'Add text overlay to a video',
    parameters: {
      type: 'object',
      properties: {
        inputFile: {
          type: 'string',
          description: 'Path to the input video file',
        },
        outputFile: {
          type: 'string',
          description: 'Path for the output video file',
        },
        text: {
          type: 'string',
          description: 'Text to display on the video',
        },
        fontSize: {
          type: 'number',
          description: 'Font size in pixels',
        },
        fontColor: {
          type: 'string',
          description: 'Font color (e.g., "white", "red", "#FF0000")',
        },
        x: {
          type: 'string',
          description: 'X position (number or expression like "(w-text_w)/2" for center)',
        },
        y: {
          type: 'string',
          description: 'Y position (number or expression like "(h-text_h)/2" for center)',
        },
        startTime: {
          type: 'number',
          description: 'When to start showing text (in seconds)',
        },
        endTime: {
          type: 'number',
          description: 'When to stop showing text (in seconds)',
        },
      },
      required: ['inputFile', 'outputFile', 'text', 'x', 'y'],
    },
  },
  {
    name: 'ffmpeg_zoom',
    description: 'Apply zoom/pan effect (Ken Burns effect)',
    parameters: {
      type: 'object',
      properties: {
        inputFile: {
          type: 'string',
          description: 'Path to the input video/image file',
        },
        outputFile: {
          type: 'string',
          description: 'Path for the output video file',
        },
        zoomDirection: {
          type: 'string',
          enum: ['in', 'out'],
          description: 'Direction of zoom',
        },
        zoomAmount: {
          type: 'number',
          description: 'How much to zoom (1.5 = 50% zoom)',
        },
        duration: {
          type: 'number',
          description: 'Duration of the zoom effect in seconds',
        },
      },
      required: ['inputFile', 'outputFile', 'zoomDirection', 'zoomAmount', 'duration'],
    },
  },
  {
    name: 'get_video_info',
    description: 'Get information about a video file (duration, resolution, codec, etc.)',
    parameters: {
      type: 'object',
      properties: {
        inputFile: {
          type: 'string',
          description: 'Path to the video file',
        },
      },
      required: ['inputFile'],
    },
  },
  {
    name: 'list_sandbox_files',
    description: 'List all files currently in the project sandbox',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];

// System prompt for the video editor agent
export const VIDEO_EDITOR_SYSTEM_PROMPT = `You are an expert video editor AI assistant. Your role is to help users edit their videos by executing FFmpeg commands in their project sandbox.

CAPABILITIES:
- Trim/cut videos to specific timestamps
- Concatenate multiple videos together
- Apply visual filters (brightness, contrast, saturation, blur, sharpen, grayscale, sepia, vignette)
- Scale/resize videos
- Change playback speed
- Adjust audio (mute, volume, extract, replace)
- Crop videos
- Add overlays (images/videos)
- Apply transitions between clips
- Add text overlays
- Apply zoom/pan effects (Ken Burns)
- Get video information

GUIDELINES:
1. Always analyze what the user wants before executing commands
2. Use get_video_info first if you need to know video properties
3. Use list_sandbox_files to see available files in the project
4. Generate unique output filenames to avoid overwriting (e.g., output_001.mp4, output_002.mp4)
5. When applying multiple effects, chain them properly
6. Provide clear feedback about what you did and the result
7. If a request is unclear, ask for clarification

SANDBOX STRUCTURE:
- Input files are in the 'input/' folder
- Output files should go in the 'output/' folder
- The main video being edited is provided in context

Always respond helpfully and explain what edits you're making.`;

// Cactus LM instance management
let cactusInstance: CactusLM | null = null;
let isInitialized = false;
let isDownloading = false;
let downloadProgress = 0;

export interface CactusInitCallbacks {
  onDownloadProgress?: (progress: number) => void;
  onDownloadComplete?: () => void;
  onInitComplete?: () => void;
  onError?: (error: Error) => void;
}

export async function initializeCactus(callbacks?: CactusInitCallbacks): Promise<CactusLM> {
  if (cactusInstance && isInitialized) {
    return cactusInstance;
  }

  if (isDownloading) {
    throw new Error('Cactus is already downloading');
  }

  try {
    cactusInstance = new CactusLM();
    
    // Check if model needs downloading
    const models = await cactusInstance.getModels();
    const toolCallingModels = models.filter(m => m.supportsToolCalling);
    
    // Find a small tool-calling model that's downloaded or download one
    let selectedModel = toolCallingModels.find(m => m.isDownloaded);
    
    if (!selectedModel && toolCallingModels.length > 0) {
      // Download the smallest tool-calling model
      const sortedBySize = toolCallingModels.sort((a, b) => a.sizeMb - b.sizeMb);
      selectedModel = sortedBySize[0];
      
      isDownloading = true;
      callbacks?.onDownloadProgress?.(0);
      
      await cactusInstance.download({
        onProgress: (progress) => {
          downloadProgress = progress;
          callbacks?.onDownloadProgress?.(progress);
        },
      });
      
      isDownloading = false;
      callbacks?.onDownloadComplete?.();
    }

    await cactusInstance.init();
    isInitialized = true;
    callbacks?.onInitComplete?.();
    
    return cactusInstance;
  } catch (error) {
    isDownloading = false;
    isInitialized = false;
    callbacks?.onError?.(error as Error);
    throw error;
  }
}

export function getCactusInstance(): CactusLM | null {
  return cactusInstance;
}

export function isCactusReady(): boolean {
  return isInitialized && cactusInstance !== null;
}

export function getCactusDownloadProgress(): number {
  return downloadProgress;
}

export async function hasDownloadedModel(): Promise<boolean> {
  try {
    if (!cactusInstance) {
      cactusInstance = new CactusLM();
    }

    const models = await cactusInstance.getModels();
    const toolCallingModels = models.filter((m) => m.supportsToolCalling);
    return toolCallingModels.some((m) => m.isDownloaded);
  } catch (error) {
    console.error('Failed to check model availability', error);
    return false;
  }
}

export function isCactusDownloading(): boolean {
  return isDownloading;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  toolCalls?: Array<{
    name: string;
    arguments: Record<string, unknown>;
    result?: string;
  }>;
}

export interface VideoEditSession {
  projectId: string;
  mainVideoPath: string;
  messages: ChatMessage[];
  currentOutputPath: string;
}

export async function sendEditRequest(
  session: VideoEditSession,
  userMessage: string,
  onToken?: (token: string) => void
): Promise<{
  response: string;
  functionCalls: Array<{ name: string; arguments: Record<string, unknown> }>;
}> {
  const cactus = getCactusInstance();
  if (!cactus) {
    throw new Error('Cactus not initialized. Call initializeCactus() first.');
  }

  // Build messages array with context
  const messages: Message[] = [
    {
      role: 'system',
      content: `${VIDEO_EDITOR_SYSTEM_PROMPT}

CURRENT PROJECT CONTEXT:
- Project ID: ${session.projectId}
- Main Video: ${session.mainVideoPath}
- Current Output: ${session.currentOutputPath}`,
    },
    // Add conversation history
    ...session.messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    })),
    // Add new user message
    {
      role: 'user' as const,
      content: userMessage,
    },
  ];

  const result = await cactus.complete({
    messages,
    tools: ffmpegTools as unknown as Parameters<typeof cactus.complete>[0]['tools'],
    onToken,
    options: {
      maxTokens: 1024,
      temperature: 0.7,
    },
  });

  return {
    response: result.response,
    functionCalls: result.functionCalls || [],
  };
}

export async function destroyCactus(): Promise<void> {
  if (cactusInstance) {
    await cactusInstance.destroy();
    cactusInstance = null;
    isInitialized = false;
  }
}

