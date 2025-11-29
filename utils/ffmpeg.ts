import * as FileSystem from 'expo-file-system';
import { getInputDir, getOutputDir, getThumbnailsDir } from './project-storage';
import { executeFFmpeg, getVideoInfoRaw } from './ffmpeg-exec';

export interface VideoInfo {
  duration: number; // in seconds
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

// Execute a raw ffmpeg command
export async function executeFFmpegCommand(command: string): Promise<FFmpegResult> {
  try {
    const result = await executeFFmpeg(command);

    if (result.success) {
      return { success: true };
    } else {
      return { success: false, error: result.error || result.stderr || 'FFmpeg command failed' };
    }
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// Get video information using ffprobe
export async function getVideoInfo(filePath: string): Promise<VideoInfo | null> {
  try {
    const info = await getVideoInfoRaw(filePath);

    if (!info || !info.streams) {
      return null;
    }

    const videoStream = info.streams.find((s: any) => s.codec_type === 'video');
    const audioStream = info.streams.find((s: any) => s.codec_type === 'audio');

    const duration = parseFloat(info.format?.duration || '0');
    const bitrate = parseInt(info.format?.bit_rate || '0', 10);

    // Parse frame rate from string like "30/1" or "29.97"
    let fps = 30;
    if (videoStream?.r_frame_rate) {
      const parts = videoStream.r_frame_rate.split('/');
      if (parts.length === 2) {
        fps = parseFloat(parts[0]) / parseFloat(parts[1]);
      } else {
        fps = parseFloat(videoStream.r_frame_rate);
      }
    }

    return {
      duration,
      width: videoStream?.width || 0,
      height: videoStream?.height || 0,
      bitrate,
      codec: videoStream?.codec_name || 'unknown',
      fps: fps || 30,
      audioCodec: audioStream?.codec_name,
      audioBitrate: audioStream ? parseInt(audioStream.bit_rate || '0', 10) : undefined,
    };
  } catch (error) {
    console.error('Error getting video info:', error);
    return null;
  }
}

// Generate a thumbnail from a video
export async function generateThumbnail(
  projectId: string,
  inputPath: string,
  timestamp: number = 0
): Promise<string | null> {
  const thumbnailsDir = getThumbnailsDir(projectId);
  const outputPath = `${thumbnailsDir}thumb_${Date.now()}.jpg`;
  
  const command = `-y -ss ${timestamp} -i "${inputPath}" -vframes 1 -q:v 2 "${outputPath}"`;
  const result = await executeFFmpegCommand(command);
  
  return result.success ? outputPath : null;
}

// Trim a video
export async function trimVideo(
  projectId: string,
  inputPath: string,
  startTime: string,
  endTime: string
): Promise<FFmpegResult> {
  const outputDir = getOutputDir(projectId);
  const outputPath = `${outputDir}trimmed_${Date.now()}.mp4`;
  
  const command = `-y -i "${inputPath}" -ss ${startTime} -to ${endTime} -c copy "${outputPath}"`;
  const result = await executeFFmpegCommand(command);
  
  return { ...result, outputPath: result.success ? outputPath : undefined };
}

// Concatenate multiple videos
export async function concatVideos(
  projectId: string,
  inputPaths: string[]
): Promise<FFmpegResult> {
  const outputDir = getOutputDir(projectId);
  const outputPath = `${outputDir}concat_${Date.now()}.mp4`;
  const listPath = `${outputDir}concat_list_${Date.now()}.txt`;
  
  // Create concat list file
  const listContent = inputPaths.map(p => `file '${p}'`).join('\n');
  await FileSystem.writeAsStringAsync(listPath, listContent);
  
  const command = `-y -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`;
  const result = await executeFFmpegCommand(command);
  
  // Clean up list file
  await FileSystem.deleteAsync(listPath, { idempotent: true });
  
  return { ...result, outputPath: result.success ? outputPath : undefined };
}

// Apply a visual filter
export async function applyFilter(
  projectId: string,
  inputPath: string,
  filterName: string,
  value?: number
): Promise<FFmpegResult> {
  const outputDir = getOutputDir(projectId);
  const outputPath = `${outputDir}filtered_${Date.now()}.mp4`;
  
  let filterString = '';
  
  switch (filterName) {
    case 'brightness':
      filterString = `eq=brightness=${value ?? 0.1}`;
      break;
    case 'contrast':
      filterString = `eq=contrast=${value ?? 1.2}`;
      break;
    case 'saturation':
      filterString = `eq=saturation=${value ?? 1.3}`;
      break;
    case 'blur':
      filterString = `boxblur=${value ?? 5}`;
      break;
    case 'sharpen':
      filterString = `unsharp=5:5:${value ?? 1.0}`;
      break;
    case 'grayscale':
      filterString = 'colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3';
      break;
    case 'sepia':
      filterString = 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131';
      break;
    case 'vignette':
      filterString = `vignette=PI/${value ?? 4}`;
      break;
    default:
      return { success: false, error: `Unknown filter: ${filterName}` };
  }
  
  const command = `-y -i "${inputPath}" -vf "${filterString}" -c:a copy "${outputPath}"`;
  const result = await executeFFmpegCommand(command);
  
  return { ...result, outputPath: result.success ? outputPath : undefined };
}

// Scale/resize video
export async function scaleVideo(
  projectId: string,
  inputPath: string,
  width: number,
  height: number
): Promise<FFmpegResult> {
  const outputDir = getOutputDir(projectId);
  const outputPath = `${outputDir}scaled_${Date.now()}.mp4`;
  
  const command = `-y -i "${inputPath}" -vf "scale=${width}:${height}" -c:a copy "${outputPath}"`;
  const result = await executeFFmpegCommand(command);
  
  return { ...result, outputPath: result.success ? outputPath : undefined };
}

// Change video speed
export async function changeSpeed(
  projectId: string,
  inputPath: string,
  speed: number
): Promise<FFmpegResult> {
  const outputDir = getOutputDir(projectId);
  const outputPath = `${outputDir}speed_${Date.now()}.mp4`;
  
  const videoSpeed = 1 / speed;
  const audioSpeed = speed;
  
  const command = `-y -i "${inputPath}" -filter_complex "[0:v]setpts=${videoSpeed}*PTS[v];[0:a]atempo=${audioSpeed}[a]" -map "[v]" -map "[a]" "${outputPath}"`;
  const result = await executeFFmpegCommand(command);
  
  return { ...result, outputPath: result.success ? outputPath : undefined };
}

// Audio operations
export async function adjustAudio(
  projectId: string,
  inputPath: string,
  action: 'mute' | 'volume' | 'extract',
  value?: number,
  audioFile?: string
): Promise<FFmpegResult> {
  const outputDir = getOutputDir(projectId);
  let command = '';
  let outputPath = '';
  
  switch (action) {
    case 'mute':
      outputPath = `${outputDir}muted_${Date.now()}.mp4`;
      command = `-y -i "${inputPath}" -c:v copy -an "${outputPath}"`;
      break;
    case 'volume':
      outputPath = `${outputDir}volume_${Date.now()}.mp4`;
      command = `-y -i "${inputPath}" -filter:a "volume=${value ?? 1}" -c:v copy "${outputPath}"`;
      break;
    case 'extract':
      outputPath = `${outputDir}audio_${Date.now()}.mp3`;
      command = `-y -i "${inputPath}" -vn -acodec mp3 "${outputPath}"`;
      break;
  }
  
  const result = await executeFFmpegCommand(command);
  return { ...result, outputPath: result.success ? outputPath : undefined };
}

// Replace audio in video
export async function replaceAudio(
  projectId: string,
  videoPath: string,
  audioPath: string
): Promise<FFmpegResult> {
  const outputDir = getOutputDir(projectId);
  const outputPath = `${outputDir}audio_replaced_${Date.now()}.mp4`;
  
  const command = `-y -i "${videoPath}" -i "${audioPath}" -c:v copy -map 0:v:0 -map 1:a:0 -shortest "${outputPath}"`;
  const result = await executeFFmpegCommand(command);
  
  return { ...result, outputPath: result.success ? outputPath : undefined };
}

// Crop video
export async function cropVideo(
  projectId: string,
  inputPath: string,
  width: number,
  height: number,
  x: number,
  y: number
): Promise<FFmpegResult> {
  const outputDir = getOutputDir(projectId);
  const outputPath = `${outputDir}cropped_${Date.now()}.mp4`;
  
  const command = `-y -i "${inputPath}" -filter:v "crop=${width}:${height}:${x}:${y}" -c:a copy "${outputPath}"`;
  const result = await executeFFmpegCommand(command);
  
  return { ...result, outputPath: result.success ? outputPath : undefined };
}

// Add overlay (image or video)
export async function addOverlay(
  projectId: string,
  baseFile: string,
  overlayFile: string,
  x: number,
  y: number,
  startTime?: number,
  duration?: number
): Promise<FFmpegResult> {
  const outputDir = getOutputDir(projectId);
  const outputPath = `${outputDir}overlay_${Date.now()}.mp4`;
  
  let enableExpr = '';
  if (startTime !== undefined && duration !== undefined) {
    enableExpr = `:enable='between(t,${startTime},${startTime + duration})'`;
  }
  
  const command = `-y -i "${baseFile}" -i "${overlayFile}" -filter_complex "overlay=${x}:${y}${enableExpr}" -c:a copy "${outputPath}"`;
  const result = await executeFFmpegCommand(command);
  
  return { ...result, outputPath: result.success ? outputPath : undefined };
}

// Add text overlay
export async function addText(
  projectId: string,
  inputPath: string,
  text: string,
  x: string,
  y: string,
  fontSize: number = 48,
  fontColor: string = 'white',
  startTime?: number,
  endTime?: number
): Promise<FFmpegResult> {
  const outputDir = getOutputDir(projectId);
  const outputPath = `${outputDir}text_${Date.now()}.mp4`;
  
  let enableExpr = '';
  if (startTime !== undefined && endTime !== undefined) {
    enableExpr = `:enable='between(t,${startTime},${endTime})'`;
  }
  
  // Escape special characters in text
  const escapedText = text.replace(/'/g, "\\'").replace(/:/g, "\\:");
  
  const command = `-y -i "${inputPath}" -vf "drawtext=text='${escapedText}':fontsize=${fontSize}:fontcolor=${fontColor}:x=${x}:y=${y}${enableExpr}" -c:a copy "${outputPath}"`;
  const result = await executeFFmpegCommand(command);
  
  return { ...result, outputPath: result.success ? outputPath : undefined };
}

// Apply zoom/pan effect (Ken Burns)
export async function applyZoomPan(
  projectId: string,
  inputPath: string,
  zoomDirection: 'in' | 'out',
  zoomAmount: number,
  duration: number
): Promise<FFmpegResult> {
  const outputDir = getOutputDir(projectId);
  const outputPath = `${outputDir}zoompan_${Date.now()}.mp4`;
  
  // Get video info for proper scaling
  const videoInfo = await getVideoInfo(inputPath);
  if (!videoInfo) {
    return { success: false, error: 'Could not get video info' };
  }
  
  const fps = videoInfo.fps || 30;
  const totalFrames = duration * fps;
  
  let zoomExpr = '';
  if (zoomDirection === 'in') {
    zoomExpr = `zoom+${(zoomAmount - 1) / totalFrames}`;
  } else {
    zoomExpr = `${zoomAmount}-${(zoomAmount - 1) / totalFrames}*on`;
  }
  
  const command = `-y -i "${inputPath}" -vf "zoompan=z='${zoomExpr}':d=${totalFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${videoInfo.width}x${videoInfo.height}" -c:a copy "${outputPath}"`;
  const result = await executeFFmpegCommand(command);
  
  return { ...result, outputPath: result.success ? outputPath : undefined };
}

// Apply transition between two videos
export async function applyTransition(
  projectId: string,
  input1: string,
  input2: string,
  transitionType: 'fade' | 'wipe' | 'dissolve' | 'zoom',
  duration: number
): Promise<FFmpegResult> {
  const outputDir = getOutputDir(projectId);
  const outputPath = `${outputDir}transition_${Date.now()}.mp4`;
  
  // Get durations
  const info1 = await getVideoInfo(input1);
  const info2 = await getVideoInfo(input2);
  
  if (!info1 || !info2) {
    return { success: false, error: 'Could not get video info' };
  }
  
  const offset = info1.duration - duration;
  
  let filterComplex = '';
  
  switch (transitionType) {
    case 'fade':
      filterComplex = `[0:v]fade=t=out:st=${offset}:d=${duration}[v0];[1:v]fade=t=in:st=0:d=${duration}[v1];[v0][v1]concat=n=2:v=1:a=0[outv]`;
      break;
    case 'dissolve':
    case 'wipe':
      filterComplex = `[0:v][1:v]xfade=transition=${transitionType === 'dissolve' ? 'fade' : 'wipeleft'}:duration=${duration}:offset=${offset}[outv]`;
      break;
    case 'zoom':
      filterComplex = `[0:v][1:v]xfade=transition=zoomin:duration=${duration}:offset=${offset}[outv]`;
      break;
  }
  
  const command = `-y -i "${input1}" -i "${input2}" -filter_complex "${filterComplex}" -map "[outv]" "${outputPath}"`;
  const result = await executeFFmpegCommand(command);
  
  return { ...result, outputPath: result.success ? outputPath : undefined };
}

// Execute a tool call from the AI agent
export async function executeToolCall(
  projectId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<{ success: boolean; result: string; outputPath?: string }> {
  const inputDir = getInputDir(projectId);
  const outputDir = getOutputDir(projectId);
  
  // Helper to resolve relative paths
  const resolvePath = (path: string): string => {
    if (path.startsWith('input/')) {
      return inputDir + path.substring(6);
    } else if (path.startsWith('output/')) {
      return outputDir + path.substring(7);
    }
    return path;
  };
  
  try {
    switch (toolName) {
      case 'ffmpeg_trim': {
        const result = await trimVideo(
          projectId,
          resolvePath(args.inputFile as string),
          args.startTime as string,
          args.endTime as string
        );
        return {
          success: result.success,
          result: result.success
            ? `Trimmed video saved to ${result.outputPath}`
            : `Error: ${result.error}`,
          outputPath: result.outputPath,
        };
      }
      
      case 'ffmpeg_concat': {
        const result = await concatVideos(
          projectId,
          (args.inputFiles as string[]).map(resolvePath)
        );
        return {
          success: result.success,
          result: result.success
            ? `Concatenated video saved to ${result.outputPath}`
            : `Error: ${result.error}`,
          outputPath: result.outputPath,
        };
      }
      
      case 'ffmpeg_filter': {
        const result = await applyFilter(
          projectId,
          resolvePath(args.inputFile as string),
          args.filterName as string,
          args.value as number | undefined
        );
        return {
          success: result.success,
          result: result.success
            ? `Applied ${args.filterName} filter, saved to ${result.outputPath}`
            : `Error: ${result.error}`,
          outputPath: result.outputPath,
        };
      }
      
      case 'ffmpeg_scale': {
        const result = await scaleVideo(
          projectId,
          resolvePath(args.inputFile as string),
          args.width as number,
          args.height as number
        );
        return {
          success: result.success,
          result: result.success
            ? `Scaled video to ${args.width}x${args.height}, saved to ${result.outputPath}`
            : `Error: ${result.error}`,
          outputPath: result.outputPath,
        };
      }
      
      case 'ffmpeg_speed': {
        const result = await changeSpeed(
          projectId,
          resolvePath(args.inputFile as string),
          args.speed as number
        );
        return {
          success: result.success,
          result: result.success
            ? `Changed speed to ${args.speed}x, saved to ${result.outputPath}`
            : `Error: ${result.error}`,
          outputPath: result.outputPath,
        };
      }
      
      case 'ffmpeg_audio': {
        const result = await adjustAudio(
          projectId,
          resolvePath(args.inputFile as string),
          args.action as 'mute' | 'volume' | 'extract',
          args.value as number | undefined
        );
        return {
          success: result.success,
          result: result.success
            ? `Audio ${args.action} complete, saved to ${result.outputPath}`
            : `Error: ${result.error}`,
          outputPath: result.outputPath,
        };
      }
      
      case 'ffmpeg_crop': {
        const result = await cropVideo(
          projectId,
          resolvePath(args.inputFile as string),
          args.width as number,
          args.height as number,
          args.x as number,
          args.y as number
        );
        return {
          success: result.success,
          result: result.success
            ? `Cropped video to ${args.width}x${args.height}, saved to ${result.outputPath}`
            : `Error: ${result.error}`,
          outputPath: result.outputPath,
        };
      }
      
      case 'ffmpeg_overlay': {
        const result = await addOverlay(
          projectId,
          resolvePath(args.baseFile as string),
          resolvePath(args.overlayFile as string),
          args.x as number,
          args.y as number,
          args.startTime as number | undefined,
          args.duration as number | undefined
        );
        return {
          success: result.success,
          result: result.success
            ? `Added overlay, saved to ${result.outputPath}`
            : `Error: ${result.error}`,
          outputPath: result.outputPath,
        };
      }
      
      case 'ffmpeg_transition': {
        const result = await applyTransition(
          projectId,
          resolvePath(args.inputFile1 as string),
          resolvePath(args.inputFile2 as string),
          args.transitionType as 'fade' | 'wipe' | 'dissolve' | 'zoom',
          args.duration as number
        );
        return {
          success: result.success,
          result: result.success
            ? `Applied ${args.transitionType} transition, saved to ${result.outputPath}`
            : `Error: ${result.error}`,
          outputPath: result.outputPath,
        };
      }
      
      case 'ffmpeg_text': {
        const result = await addText(
          projectId,
          resolvePath(args.inputFile as string),
          args.text as string,
          args.x as string,
          args.y as string,
          args.fontSize as number | undefined,
          args.fontColor as string | undefined,
          args.startTime as number | undefined,
          args.endTime as number | undefined
        );
        return {
          success: result.success,
          result: result.success
            ? `Added text overlay, saved to ${result.outputPath}`
            : `Error: ${result.error}`,
          outputPath: result.outputPath,
        };
      }
      
      case 'ffmpeg_zoom': {
        const result = await applyZoomPan(
          projectId,
          resolvePath(args.inputFile as string),
          args.zoomDirection as 'in' | 'out',
          args.zoomAmount as number,
          args.duration as number
        );
        return {
          success: result.success,
          result: result.success
            ? `Applied zoom ${args.zoomDirection} effect, saved to ${result.outputPath}`
            : `Error: ${result.error}`,
          outputPath: result.outputPath,
        };
      }
      
      case 'get_video_info': {
        const info = await getVideoInfo(resolvePath(args.inputFile as string));
        if (info) {
          return {
            success: true,
            result: `Video info:\n- Duration: ${info.duration.toFixed(2)}s\n- Resolution: ${info.width}x${info.height}\n- Codec: ${info.codec}\n- FPS: ${info.fps}\n- Bitrate: ${info.bitrate}`,
          };
        }
        return { success: false, result: 'Could not get video info' };
      }
      
      case 'list_sandbox_files': {
        const inputFiles = await FileSystem.readDirectoryAsync(inputDir).catch(() => []);
        const outputFiles = await FileSystem.readDirectoryAsync(outputDir).catch(() => []);
        return {
          success: true,
          result: `Input files:\n${inputFiles.map(f => `- input/${f}`).join('\n') || '(none)'}\n\nOutput files:\n${outputFiles.map(f => `- output/${f}`).join('\n') || '(none)'}`,
        };
      }
      
      default:
        return { success: false, result: `Unknown tool: ${toolName}` };
    }
  } catch (error) {
    return { success: false, result: `Error executing ${toolName}: ${String(error)}` };
  }
}

