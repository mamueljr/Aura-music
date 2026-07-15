/**
 * Origin Private File System storage: music imported here belongs to the
 * app's own sandbox, so playback never needs folder permissions again.
 * Layout: /music/<folderId>/<relative/path/to/file.mp3>
 */

async function opfsRoot(): Promise<FileSystemDirectoryHandle | null> {
  try {
    return await navigator.storage.getDirectory();
  } catch {
    return null;
  }
}

export async function opfsSupported(): Promise<boolean> {
  return (await opfsRoot()) != null;
}

async function getDir(
  folderId: number,
  segments: string[],
  create: boolean,
): Promise<FileSystemDirectoryHandle | null> {
  const root = await opfsRoot();
  if (!root) return null;
  try {
    let dir = await root.getDirectoryHandle('music', { create });
    dir = await dir.getDirectoryHandle(String(folderId), { create });
    for (const segment of segments) {
      dir = await dir.getDirectoryHandle(segment, { create });
    }
    return dir;
  } catch {
    return null;
  }
}

export async function saveTrackToOpfs(
  folderId: number,
  path: string,
  file: File,
): Promise<boolean> {
  const parts = path.split('/');
  const dir = await getDir(folderId, parts.slice(0, -1), true);
  if (!dir) return false;
  try {
    const fileHandle = await dir.getFileHandle(parts[parts.length - 1], { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(file);
    await writable.close();
    return true;
  } catch {
    return false;
  }
}

export async function getTrackFromOpfs(folderId: number, path: string): Promise<File | null> {
  const parts = path.split('/');
  const dir = await getDir(folderId, parts.slice(0, -1), false);
  if (!dir) return null;
  try {
    const fileHandle = await dir.getFileHandle(parts[parts.length - 1]);
    return await fileHandle.getFile();
  } catch {
    return null;
  }
}

export async function deleteFolderFromOpfs(folderId: number): Promise<void> {
  const root = await opfsRoot();
  if (!root) return;
  try {
    const music = await root.getDirectoryHandle('music');
    await music.removeEntry(String(folderId), { recursive: true });
  } catch {
    /* nothing to delete */
  }
}
