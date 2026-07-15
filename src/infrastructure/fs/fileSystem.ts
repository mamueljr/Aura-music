import { AUDIO_EXTENSIONS } from '@/core/constants';
import type { LibraryFolder, Track } from '@/core/types';
import { db } from '@/infrastructure/db/db';
import { getTrackFromOpfs } from '@/infrastructure/fs/opfs';

export interface DiscoveredFile {
  /** Path relative to the folder root, using `/` separators */
  path: string;
  getFile: () => Promise<File>;
  size: number;
  lastModified: number;
}

/**
 * Session cache for fallback mode (browsers without the File System Access
 * API): keeps the picked File objects in memory, keyed by `${folderId}:${path}`.
 * The indexed library persists in Dexie, but files must be re-picked after a
 * reload to play them again.
 */
const fallbackFiles = new Map<string, File>();

export const supportsFsAccess = () => typeof window.showDirectoryPicker === 'function';

export function isAudioFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase();
  return !!ext && AUDIO_EXTENSIONS.includes(ext);
}

/** Opens the native directory picker (Chromium). */
export async function pickDirectory(): Promise<FileSystemDirectoryHandle> {
  if (!window.showDirectoryPicker) throw new Error('File System Access API not supported');
  return window.showDirectoryPicker({ id: 'aura-library', mode: 'read' });
}

export async function verifyPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  try {
    if ((await handle.queryPermission?.({ mode: 'read' })) === 'granted') return true;
    return (await handle.requestPermission?.({ mode: 'read' })) === 'granted';
  } catch {
    return false;
  }
}

/** Recursively walks a directory handle yielding every audio file. */
export async function discoverFromHandle(
  handle: FileSystemDirectoryHandle,
  basePath = '',
): Promise<DiscoveredFile[]> {
  const out: DiscoveredFile[] = [];
  for await (const entry of handle.values()) {
    const path = basePath ? `${basePath}/${entry.name}` : entry.name;
    if (entry.kind === 'directory') {
      out.push(...(await discoverFromHandle(entry as FileSystemDirectoryHandle, path)));
    } else if (isAudioFile(entry.name)) {
      const fileHandle = entry as FileSystemFileHandle;
      // Read size/mtime once up-front so incremental scans can diff cheaply.
      const f = await fileHandle.getFile();
      out.push({
        path,
        size: f.size,
        lastModified: f.lastModified,
        getFile: () => fileHandle.getFile(),
      });
    }
  }
  return out;
}

/** Converts a `<input webkitdirectory>` FileList into discovered files. */
export function discoverFromFileList(files: FileList): { name: string; files: DiscoveredFile[] } {
  const out: DiscoveredFile[] = [];
  let rootName = 'Music';
  for (const file of Array.from(files)) {
    const rel = (file.webkitRelativePath || file.name).split('/');
    if (rel.length > 1) rootName = rel[0];
    const path = rel.slice(1).join('/') || file.name;
    if (!isAudioFile(file.name)) continue;
    out.push({
      path,
      size: file.size,
      lastModified: file.lastModified,
      getFile: () => Promise.resolve(file),
    });
  }
  return { name: rootName, files: out };
}

export function cacheFallbackFile(folderId: number, path: string, file: File) {
  fallbackFiles.set(`${folderId}:${path}`, file);
}

/**
 * Resolves the actual audio File for a track, from its library folder.
 * Throws if the folder handle is gone or permission was revoked.
 */
export async function getTrackFile(track: Track): Promise<File> {
  // App-private copy first: needs no permissions, works on every platform.
  if (track.opfs) {
    const opfsFile = await getTrackFromOpfs(track.folderId, track.path);
    if (opfsFile) return opfsFile;
  }

  const cached = fallbackFiles.get(`${track.folderId}:${track.path}`);
  if (cached) return cached;

  const folder = await db.folders.get(track.folderId);
  if (!folder) throw new Error('Library folder not found');
  if (folder.mode === 'fallback' || !folder.handle) {
    throw new Error('FILE_NOT_AVAILABLE_OFFLINE_HANDLE');
  }
  if (!(await verifyPermission(folder.handle))) {
    throw new Error('PERMISSION_DENIED');
  }

  const parts = track.path.split('/');
  let dir: FileSystemDirectoryHandle = folder.handle;
  for (const part of parts.slice(0, -1)) {
    dir = await dir.getDirectoryHandle(part);
  }
  const fileHandle = await dir.getFileHandle(parts[parts.length - 1]);
  return fileHandle.getFile();
}

export async function listFolders(): Promise<LibraryFolder[]> {
  return db.folders.toArray();
}
