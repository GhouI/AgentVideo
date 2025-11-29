const DEFAULT_BACKEND = 'https://backend-production-2acb.up.railway.app/';
export const BACKEND_BASE_URL =
  (process.env.EXPO_PUBLIC_BACKEND_URL || DEFAULT_BACKEND).replace(/\/+$/, '');

export interface BackendUploadResult {
  remotePath: string;
  remoteUrl: string;
}

export interface BackendToolResult {
  success: boolean;
  message: string;
  outputPath?: string;
  outputUrl?: string;
}

export interface BackendVideoInfo {
  duration: number;
  width: number;
  height: number;
  bitrate: number;
  codec: string;
  fps: number;
  audioCodec?: string;
  audioBitrate?: number;
}

function guessContentType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.mp4')) return 'video/mp4';
  if (lower.endsWith('.mov')) return 'video/quicktime';
  if (lower.endsWith('.mkv')) return 'video/x-matroska';
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.wav')) return 'audio/wav';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

async function handleJsonResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    const detail = (data as { detail?: string; message?: string }).detail || (data as { message?: string }).message;
    const errorMsg = detail || `Backend request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }
  return data as T;
}

export async function ensureBackendProject(projectId: string, title?: string): Promise<void> {
  const payload = { project_id: projectId, title };
  const res = await fetch(`${BACKEND_BASE_URL}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  await handleJsonResponse(res);
}

export async function uploadFileToBackend(
  projectId: string,
  fileUri: string,
  fileName: string,
  fileType: 'video' | 'image' | 'audio'
): Promise<BackendUploadResult> {
  const normalizedUri = fileUri.startsWith('file://') ? fileUri : `file://${fileUri}`;
  const form = new FormData();
  form.append('file_type', fileType);
  form.append(
    'file',
    {
      uri: normalizedUri,
      name: fileName,
      type: guessContentType(fileName),
    } as any
  );

  const res = await fetch(`${BACKEND_BASE_URL}/projects/${projectId}/files`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body: form,
  });

  const data = await handleJsonResponse<{
    file_path: string;
    file_url: string;
  }>(res);

  return {
    remotePath: data.file_path,
    remoteUrl: data.file_url,
  };
}

export async function callBackendTool(
  projectId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<BackendToolResult> {
  const res = await fetch(`${BACKEND_BASE_URL}/projects/${projectId}/tools/${toolName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(args),
  });

  const data = await handleJsonResponse<{
    success: boolean;
    message: string;
    output_path?: string;
    output_url?: string;
  }>(res);

  return {
    success: data.success,
    message: data.message,
    outputPath: data.output_path,
    outputUrl: data.output_url,
  };
}

export async function fetchBackendVideoInfo(
  projectId: string,
  input: string
): Promise<BackendVideoInfo | null> {
  console.log(`Fetching video info for project ${projectId}, input: ${input}`);
  const res = await fetch(`${BACKEND_BASE_URL}/projects/${projectId}/video-info`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ input }),
  });

  const data = await handleJsonResponse<{ success: boolean; info?: BackendVideoInfo }>(res);
  return data.info ?? null;
}

export async function listBackendFiles(projectId: string): Promise<{
  input: string[];
  output: string[];
}> {
  const res = await fetch(`${BACKEND_BASE_URL}/projects/${projectId}/files`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return handleJsonResponse(res);
}
