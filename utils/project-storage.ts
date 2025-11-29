import { Paths, Directory, File } from 'expo-file-system';
import { ensureBackendProject, uploadFileToBackend } from './backend';

// Base directory for all projects using the new expo-file-system API  
const PROJECTS_DIR = Paths.document.uri + 'projects/';

// Helper functions using new expo-file-system API
async function makeDirectoryAsync(path: string): Promise<void> {
  const dir = new Directory(path);
  await dir.create();
}

async function writeAsStringAsync(path: string, content: string): Promise<void> {
  const file = new File(path);
  await file.write(content);
}

async function readAsStringAsync(path: string): Promise<string> {
  const file = new File(path);
  return await file.text();
}

async function getInfoAsync(path: string): Promise<{ exists: boolean; size?: number }> {
  try {
    const file = new File(path);
    const exists = file.exists;
    return { exists, size: 0 };
  } catch {
    return { exists: false };
  }
}

async function copyAsync(options: { from: string; to: string }): Promise<void> {
  const source = new File(options.from);
  const dest = new File(options.to);
  await source.copy(dest);
}

async function deleteAsync(path: string): Promise<void> {
  try {
    const file = new File(path);
    if (file.exists) {
      await file.delete();
    }
  } catch {
    // Ignore
  }
}

async function deleteDirAsync(path: string): Promise<void> {
  try {
    const dir = new Directory(path);
    if (dir.exists) {
      await dir.delete();
    }
  } catch {
    // Ignore
  }
}

async function readDirectoryAsync(path: string): Promise<string[]> {
  try {
    const dir = new Directory(path);
    const contents = await dir.list();
    return contents.map((item: File | Directory) => item.name);
  } catch {
    return [];
  }
}

export interface ProjectFile {
  id: string;
  name: string;
  path: string;
  type: 'video' | 'image' | 'audio';
  size: number;
  addedAt: number;
  isMainVideo?: boolean;
  thumbnailPath?: string;
  duration?: number; // in seconds
  width?: number;
  height?: number;
  remotePath?: string;
  remoteUrl?: string;
}

export interface ProjectMetadata {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  mainVideoId?: string;
  files: ProjectFile[];
  chatHistory: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
  }>;
  currentOutputPath?: string;
  thumbnailPath?: string;
}

// Ensure the projects directory exists
export async function ensureProjectsDirectory(): Promise<void> {
  const dir = new Directory(PROJECTS_DIR);
  if (!dir.exists) {
    await dir.create();
  }
}

// Create a new project with sandbox directories
export async function createProject(title: string): Promise<ProjectMetadata> {
  await ensureProjectsDirectory();
  
  const projectId = generateProjectId();
  const projectDir = `${PROJECTS_DIR}${projectId}/`;
  
  // Create project directory structure
  await makeDirectoryAsync(projectDir);
  await makeDirectoryAsync(`${projectDir}input/`);
  await makeDirectoryAsync(`${projectDir}output/`);
  await makeDirectoryAsync(`${projectDir}thumbnails/`);
  
  const metadata: ProjectMetadata = {
    id: projectId,
    title,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    files: [],
    chatHistory: [],
  };
  
  await ensureBackendProject(projectId, title);
  // Save metadata
  await saveProjectMetadata(metadata);
  
  return metadata;
}

// Generate a unique project ID
function generateProjectId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Get project directory path
export function getProjectDir(projectId: string): string {
  return `${PROJECTS_DIR}${projectId}/`;
}

// Get input directory path
export function getInputDir(projectId: string): string {
  return `${PROJECTS_DIR}${projectId}/input/`;
}

// Get output directory path
export function getOutputDir(projectId: string): string {
  return `${PROJECTS_DIR}${projectId}/output/`;
}

// Get thumbnails directory path
export function getThumbnailsDir(projectId: string): string {
  return `${PROJECTS_DIR}${projectId}/thumbnails/`;
}

// Save project metadata
export async function saveProjectMetadata(metadata: ProjectMetadata): Promise<void> {
  const metadataPath = `${getProjectDir(metadata.id)}metadata.json`;
  await writeAsStringAsync(metadataPath, JSON.stringify(metadata, null, 2));
}

// Load project metadata
export async function loadProjectMetadata(projectId: string): Promise<ProjectMetadata | null> {
  const metadataPath = `${getProjectDir(projectId)}metadata.json`;
  
  try {
    const fileInfo = await getInfoAsync(metadataPath);
    if (!fileInfo.exists) {
      return null;
    }
    
    const content = await readAsStringAsync(metadataPath);
    return JSON.parse(content) as ProjectMetadata;
  } catch {
    return null;
  }
}

// List all projects
export async function listProjects(): Promise<ProjectMetadata[]> {
  await ensureProjectsDirectory();
  
  const projects: ProjectMetadata[] = [];
  
  try {
    const dirs = await readDirectoryAsync(PROJECTS_DIR);
    
    for (const dir of dirs) {
      const metadata = await loadProjectMetadata(dir);
      if (metadata) {
        projects.push(metadata);
      }
    }
    
    // Sort by most recently updated
    projects.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    // Directory might not exist yet
  }
  
  return projects;
}

// Add a file to a project
export async function addFileToProject(
  projectId: string,
  sourceUri: string,
  fileName: string,
  fileType: 'video' | 'image' | 'audio'
): Promise<ProjectFile> {
  const metadata = await loadProjectMetadata(projectId);
  if (!metadata) {
    throw new Error(`Project ${projectId} not found`);
  }
  await ensureBackendProject(projectId, metadata.title);
  
  const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const extension = fileName.split('.').pop() || 'mp4';
  const targetPath = `${getInputDir(projectId)}${fileId}.${extension}`;
  
  // Copy file to project input directory
  await copyAsync({
    from: sourceUri,
    to: targetPath,
  });
  
  // Get file info
  const fileInfo = await getInfoAsync(targetPath);
  
  const projectFile: ProjectFile = {
    id: fileId,
    name: fileName,
    path: targetPath,
    type: fileType,
    size: (fileInfo as { size?: number }).size || 0,
    addedAt: Date.now(),
  };

  // Upload to backend so FFmpeg can process server-side
  const uploadResult = await uploadFileToBackend(projectId, targetPath, fileName, fileType);
  projectFile.remotePath = uploadResult.remotePath;
  projectFile.remoteUrl = uploadResult.remoteUrl;
  
  // Add to metadata
  metadata.files.push(projectFile);
  metadata.updatedAt = Date.now();
  await saveProjectMetadata(metadata);
  
  return projectFile;
}

// Set the main video for a project
export async function setMainVideo(projectId: string, fileId: string): Promise<void> {
  const metadata = await loadProjectMetadata(projectId);
  if (!metadata) {
    throw new Error(`Project ${projectId} not found`);
  }
  
  // Update all files
  metadata.files = metadata.files.map(file => ({
    ...file,
    isMainVideo: file.id === fileId,
  }));
  
  metadata.mainVideoId = fileId;
  metadata.updatedAt = Date.now();
  
  // Set initial output path to main video
  const mainFile = metadata.files.find(f => f.id === fileId);
  if (mainFile) {
    metadata.currentOutputPath = mainFile.remotePath || mainFile.remoteUrl || mainFile.path;
  }
  
  await saveProjectMetadata(metadata);
}

// Get the main video file for a project
export function getMainVideo(metadata: ProjectMetadata): ProjectFile | undefined {
  return metadata.files.find(file => file.id === metadata.mainVideoId);
}

// Get all video files in a project
export function getVideoFiles(metadata: ProjectMetadata): ProjectFile[] {
  return metadata.files.filter(file => file.type === 'video');
}

// Update project title
export async function updateProjectTitle(projectId: string, title: string): Promise<void> {
  const metadata = await loadProjectMetadata(projectId);
  if (!metadata) {
    throw new Error(`Project ${projectId} not found`);
  }
  
  metadata.title = title;
  metadata.updatedAt = Date.now();
  await saveProjectMetadata(metadata);
}

// Add chat message to project history
export async function addChatMessage(
  projectId: string,
  role: 'user' | 'assistant' | 'system',
  content: string
): Promise<void> {
  const metadata = await loadProjectMetadata(projectId);
  if (!metadata) {
    throw new Error(`Project ${projectId} not found`);
  }
  
  metadata.chatHistory.push({
    id: `msg_${Date.now()}`,
    role,
    content,
    timestamp: Date.now(),
  });
  metadata.updatedAt = Date.now();
  await saveProjectMetadata(metadata);
}

// Update current output path
export async function updateCurrentOutput(projectId: string, outputPath: string): Promise<void> {
  const metadata = await loadProjectMetadata(projectId);
  if (!metadata) {
    throw new Error(`Project ${projectId} not found`);
  }
  
  metadata.currentOutputPath = outputPath;
  metadata.updatedAt = Date.now();
  await saveProjectMetadata(metadata);
}

// Delete a project and all its files
export async function deleteProject(projectId: string): Promise<void> {
  const projectDir = getProjectDir(projectId);
  await deleteDirAsync(projectDir);
}

// Remove a file from a project
export async function removeFileFromProject(projectId: string, fileId: string): Promise<void> {
  const metadata = await loadProjectMetadata(projectId);
  if (!metadata) {
    throw new Error(`Project ${projectId} not found`);
  }
  
  const file = metadata.files.find(f => f.id === fileId);
  if (file) {
    // Delete the actual file
    await deleteAsync(file.path);
    if (file.thumbnailPath) {
      await deleteAsync(file.thumbnailPath);
    }
    
    // Remove from metadata
    metadata.files = metadata.files.filter(f => f.id !== fileId);
    
    // Clear main video if it was deleted
    if (metadata.mainVideoId === fileId) {
      metadata.mainVideoId = undefined;
    }
    
    metadata.updatedAt = Date.now();
    await saveProjectMetadata(metadata);
  }
}

// List files in sandbox (for AI agent)
export async function listSandboxFiles(projectId: string): Promise<{
  input: string[];
  output: string[];
}> {
  const inputFiles = await readDirectoryAsync(getInputDir(projectId)).catch(() => []);
  const outputFiles = await readDirectoryAsync(getOutputDir(projectId)).catch(() => []);
  
  return {
    input: inputFiles,
    output: outputFiles,
  };
}

// Copy output file to a different location (for export)
export async function exportOutput(projectId: string, outputFileName: string, destinationUri: string): Promise<void> {
  const sourcePath = `${getOutputDir(projectId)}${outputFileName}`;
  await copyAsync({
    from: sourcePath,
    to: destinationUri,
  });
}

// Get file size in human readable format
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Format duration in MM:SS format
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Get relative time string (e.g., "Today", "Yesterday", "3 days ago")
export function getRelativeTimeString(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) {
    return 'Today';
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return `${days} days ago`;
  } else if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else {
    const months = Math.floor(days / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  }
}

