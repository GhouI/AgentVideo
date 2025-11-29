import { FFmpegKit, FFprobeKit, ReturnCode } from 'ffmpeg-kit-react-native';

export interface FFmpegExecResult {
  success: boolean;
  stdout?: string;
  stderr?: string;
  error?: string;
}

/**
 * Execute an FFmpeg command using child process-style API
 * Uses @spreen/ffmpeg-kit-react-native under the hood
 *
 * @param command - The FFmpeg command arguments (without 'ffmpeg' prefix)
 * @returns Promise with execution result
 */
export async function executeFFmpeg(command: string): Promise<FFmpegExecResult> {
  try {
    const session = await FFmpegKit.execute(command);
    const returnCode = await session.getReturnCode();
    const output = await session.getOutput();
    const logs = await session.getAllLogsAsString();

    const isSuccess = ReturnCode.isSuccess(returnCode);

    return {
      success: isSuccess,
      stdout: output || '',
      stderr: logs || '',
      error: isSuccess ? undefined : (logs || 'FFmpeg command failed'),
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || String(error),
    };
  }
}

/**
 * Execute an FFprobe command using child process-style API
 * Uses @spreen/ffmpeg-kit-react-native under the hood
 *
 * @param command - The FFprobe command arguments (without 'ffprobe' prefix)
 * @returns Promise with execution result
 */
export async function executeFFprobe(command: string): Promise<FFmpegExecResult> {
  try {
    const session = await FFprobeKit.execute(command);
    const returnCode = await session.getReturnCode();
    const output = await session.getOutput();
    const logs = await session.getAllLogsAsString();

    const isSuccess = ReturnCode.isSuccess(returnCode);

    return {
      success: isSuccess,
      stdout: output || '',
      stderr: logs || '',
      error: isSuccess ? undefined : (logs || 'FFprobe command failed'),
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || String(error),
    };
  }
}

/**
 * Get video information using ffprobe
 * @param filePath - Path to the video file
 * @returns Promise with parsed video information
 */
export async function getVideoInfoRaw(filePath: string): Promise<any> {
  try {
    const session = await FFprobeKit.getMediaInformation(filePath);
    const mediaInfo = await session.getMediaInformation();

    if (!mediaInfo) {
      throw new Error('Failed to get media information');
    }

    // Convert FFprobe media information to a JSON-like structure
    const streams = await mediaInfo.getStreams();
    const format = {
      duration: await mediaInfo.getDuration(),
      bit_rate: await mediaInfo.getBitrate(),
      format_name: await mediaInfo.getFormat(),
    };

    const streamData = await Promise.all(
      (streams || []).map(async (stream: any) => ({
        codec_type: await stream.getType(),
        codec_name: await stream.getCodec(),
        width: await stream.getWidth(),
        height: await stream.getHeight(),
        r_frame_rate: await stream.getAverageFrameRate(),
        bit_rate: await stream.getBitrate(),
      }))
    );

    return {
      streams: streamData,
      format,
    };
  } catch (error) {
    console.error('Error in getVideoInfoRaw:', error);
    throw error;
  }
}

/**
 * Check if FFmpeg is available in the system
 * @returns Promise with boolean indicating availability
 */
export async function checkFFmpegAvailable(): Promise<boolean> {
  try {
    const result = await executeFFmpeg('-version');
    return result.success;
  } catch {
    return false;
  }
}
