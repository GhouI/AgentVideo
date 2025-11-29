import {
  BACKEND_BASE_URL,
  callBackendTool,
  fetchBackendVideoInfo,
  listBackendFiles,
  type BackendVideoInfo,
} from './backend';

export interface VideoInfo {
  duration: number;
  width: number;
  height: number;
  bitrate: number;
  codec: string;
  fps: number;
  audioCodec?: string;
  audioBitrate?: number;
}

export interface FFmpegResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  duration?: number;
}

type VideoInput =
  | string
  | {
      remotePath?: string;
      remoteUrl?: string;
      path?: string;
    };

function mapVideoInfo(info: BackendVideoInfo | null): VideoInfo | null {
  if (!info) return null;
  return {
    duration: info.duration ?? 0,
    width: info.width ?? 0,
    height: info.height ?? 0,
    bitrate: info.bitrate ?? 0,
    codec: info.codec ?? 'unknown',
    fps: info.fps ?? 30,
    audioCodec: info.audioCodec,
    audioBitrate: info.audioBitrate,
  };
}

export async function getVideoInfo(projectId: string, input: VideoInput): Promise<VideoInfo | null> {
  const source =
    typeof input === 'string'
      ? input
      : input.remotePath || input.remoteUrl || '';

  if (!source) {
    console.warn('No remote path or URL available for video info');
    return null;
  }

  try {
    const info = await fetchBackendVideoInfo(projectId, source);
    return mapVideoInfo(info);
  } catch (error) {
    console.error('Error getting video info from backend:', error);
    return null;
  }
}

export async function executeToolCall(
  projectId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<{ success: boolean; result: string; outputPath?: string; outputUrl?: string }> {
  try {
    const response = await callBackendTool(projectId, toolName, args);
    const outputUrl =
      response.outputUrl ||
      (response.outputPath ? `${BACKEND_BASE_URL}/files/${projectId}/${response.outputPath}` : undefined);
    return {
      success: response.success,
      result: response.message,
      outputPath: response.outputPath,
      outputUrl,
    };
  } catch (error) {
    return { success: false, result: `Error executing ${toolName}: ${String(error)}` };
  }
}

export async function listRemoteSandbox(projectId: string): Promise<string> {
  try {
    const files = await listBackendFiles(projectId);
    const inputs = files.input.map((f) => `- input/${f}`).join('\n') || '(none)';
    const outputs = files.output.map((f) => `- output/${f}`).join('\n') || '(none)';
    return `Input files:\n${inputs}\n\nOutput files:\n${outputs}`;
  } catch (error) {
    return `Could not list files: ${String(error)}`;
  }
}

