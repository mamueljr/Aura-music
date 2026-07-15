import { db } from '@/infrastructure/db/db';
import { getTrackFile } from '@/infrastructure/fs/fileSystem';
import { opfsSupported, saveTrackToOpfs } from '@/infrastructure/fs/opfs';

export interface ImportProgress {
  total: number;
  done: number;
  failed: number;
}

/**
 * Copies every track of a library folder into the app's private storage
 * (OPFS). From then on playback reads the copy: no folder permission
 * prompts, and fallback-mode libraries (Firefox/Safari) survive restarts.
 *
 * Requires the source files to be readable right now — call it from a user
 * gesture so a permission request can succeed if needed.
 */
export async function importFolderToApp(
  folderId: number,
  onProgress?: (progress: ImportProgress) => void,
): Promise<ImportProgress> {
  if (!(await opfsSupported())) throw new Error('OPFS_NOT_SUPPORTED');

  const tracks = await db.tracks.where('folderId').equals(folderId).toArray();
  const pending = tracks.filter((t) => !t.opfs);
  const progress: ImportProgress = { total: pending.length, done: 0, failed: 0 };
  onProgress?.(progress);

  for (const track of pending) {
    try {
      const file = await getTrackFile(track);
      const saved = await saveTrackToOpfs(track.folderId, track.path, file);
      if (saved) {
        await db.tracks.update(track.id, { opfs: 1 });
        progress.done += 1;
      } else {
        progress.failed += 1;
      }
    } catch {
      progress.failed += 1;
    }
    onProgress?.({ ...progress });
  }

  const remaining = await db.tracks
    .where('folderId')
    .equals(folderId)
    .filter((t) => !t.opfs)
    .count();
  await db.folders.update(folderId, { imported: remaining === 0 });

  return progress;
}
