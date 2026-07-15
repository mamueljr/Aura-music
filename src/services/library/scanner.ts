import type { Track } from '@/core/types';
import { rebuildAggregates } from '@/infrastructure/db/aggregates';
import { db } from '@/infrastructure/db/db';
import {
  cacheFallbackFile,
  discoverFromFileList,
  discoverFromHandle,
  pickDirectory,
  verifyPermission,
  type DiscoveredFile,
} from '@/infrastructure/fs/fileSystem';
import { MetadataWorkerPool } from '@/infrastructure/workers/metadataPool';
import { hash53 } from '@/lib/utils';
import { useUiStore } from '@/stores/uiStore';

const trackId = (folderId: number, path: string) => hash53(`track::${folderId}::${path}`);

function coverId(bytes: Uint8Array): string {
  // Hash a sample of the image bytes: fast and good enough to dedupe
  // identical embedded covers across an album.
  const head = bytes.subarray(0, 512).join(',');
  const tail = bytes.subarray(Math.max(0, bytes.length - 512)).join(',');
  return hash53(`cover::${bytes.length}::${head}::${tail}`);
}

function buildSearchText(t: Pick<Track, 'title' | 'artist' | 'album' | 'genre'>) {
  return `${t.title} ${t.artist} ${t.album} ${t.genre}`.toLowerCase();
}

const setScan = (patch: Parameters<ReturnType<typeof useUiStore.getState>['setScan']>[0]) =>
  useUiStore.getState().setScan(patch);

/** Adds a folder via the File System Access API and scans it. */
export async function addFolderWithPicker(): Promise<void> {
  const handle = await pickDirectory();
  if (!(await verifyPermission(handle))) throw new Error('PERMISSION_DENIED');

  const existing = await db.folders.toArray();
  for (const folder of existing) {
    if (folder.handle && (await handle.isSameEntry?.(folder.handle))) {
      await scanFolder(folder.id!);
      return;
    }
  }

  const folderId = await db.folders.add({
    name: handle.name,
    handle,
    mode: 'fs-access',
    addedAt: Date.now(),
  });
  await scanFolder(folderId as number);
}

/** Adds a folder from a `<input webkitdirectory>` selection (fallback mode). */
export async function addFolderFromFileList(files: FileList): Promise<void> {
  const { name, files: discovered } = discoverFromFileList(files);
  if (discovered.length === 0) return;

  const folder = (await db.folders.toArray()).find(
    (f) => f.mode === 'fallback' && f.name === name,
  );
  let folderId: number;
  if (folder) {
    folderId = folder.id!;
  } else {
    folderId = (await db.folders.add({
      name,
      mode: 'fallback',
      addedAt: Date.now(),
    })) as number;
  }

  // Keep the picked files around so this session can play them.
  for (const d of discovered) {
    cacheFallbackFile(folderId, d.path, await d.getFile());
  }

  await runScan(folderId, discovered);
}

/** Rescans a stored folder (detects new, changed and removed songs). */
export async function scanFolder(folderId: number): Promise<void> {
  const folder = await db.folders.get(folderId);
  if (!folder) throw new Error('Folder not found');
  if (folder.mode === 'fallback' || !folder.handle) {
    // Fallback folders cannot be re-walked without user interaction.
    return;
  }
  if (!(await verifyPermission(folder.handle))) throw new Error('PERMISSION_DENIED');

  setScan({ phase: 'discovering', discovered: 0, processed: 0, added: 0, updated: 0, removed: 0 });
  const discovered = await discoverFromHandle(folder.handle);
  await runScan(folderId, discovered);
}

export async function rescanAllFolders(): Promise<void> {
  const folders = await db.folders.toArray();
  for (const folder of folders) {
    if (folder.mode === 'fs-access') await scanFolder(folder.id!);
  }
}

export async function removeFolder(folderId: number): Promise<void> {
  await db.transaction('rw', [db.tracks, db.folders], async () => {
    await db.tracks.where('folderId').equals(folderId).delete();
    await db.folders.delete(folderId);
  });
  await pruneOrphanCovers();
  await rebuildAggregates();
}

async function runScan(folderId: number, discovered: DiscoveredFile[]): Promise<void> {
  const ui = useUiStore.getState();
  ui.setScan({
    phase: 'discovering',
    discovered: discovered.length,
    processed: 0,
    added: 0,
    updated: 0,
    removed: 0,
    error: undefined,
  });

  try {
    const existing = await db.tracks.where('folderId').equals(folderId).toArray();
    const existingByPath = new Map(existing.map((t) => [t.path, t]));
    const discoveredPaths = new Set(discovered.map((d) => d.path));

    const removedIds = existing.filter((t) => !discoveredPaths.has(t.path)).map((t) => t.id);
    const toParse = discovered.filter((d) => {
      const prev = existingByPath.get(d.path);
      return !prev || prev.size !== d.size || prev.lastModified !== d.lastModified;
    });

    setScan({ phase: 'reading', removed: removedIds.length });

    const pool = new MetadataWorkerPool();
    const newTracks: Track[] = [];
    const newCovers = new Map<string, Blob>();
    let added = 0;
    let updated = 0;
    let processed = 0;

    try {
      // Parse with bounded concurrency: the pool round-robins jobs, we just
      // keep a rolling window so we never hold 20k Files in memory at once.
      const WINDOW = 16;
      let cursor = 0;
      const inFlight = new Set<Promise<void>>();

      const processOne = async (d: DiscoveredFile) => {
        const prev = existingByPath.get(d.path);
        try {
          const file = await d.getFile();
          const { metadata } = await pool.parse(file, d.path);
          const fileName = d.path.split('/').pop() ?? d.path;
          const titleFromName = fileName.replace(/\.[^.]+$/, '');

          let cover: string | undefined;
          if (metadata?.cover) {
            const bytes = new Uint8Array(metadata.cover.data);
            cover = coverId(bytes);
            if (!newCovers.has(cover)) {
              newCovers.set(cover, new Blob([bytes], { type: metadata.cover.format }));
            }
          }

          const base = {
            id: trackId(folderId, d.path),
            folderId,
            path: d.path,
            fileName,
            title: metadata?.title || titleFromName,
            artist: metadata?.artist || '',
            albumArtist: metadata?.albumArtist || metadata?.artist || '',
            album: metadata?.album || '',
            genre: metadata?.genre || '',
            year: metadata?.year,
            trackNo: metadata?.trackNo,
            discNo: metadata?.discNo,
            duration: metadata?.duration ?? 0,
            size: d.size,
            lastModified: d.lastModified,
            coverId: cover ?? prev?.coverId,
          };

          newTracks.push({
            ...base,
            searchText: buildSearchText(base),
            favorite: prev?.favorite ?? 0,
            playCount: prev?.playCount ?? 0,
            lastPlayedAt: prev?.lastPlayedAt,
            addedAt: prev?.addedAt ?? Date.now(),
          });
          if (prev) updated += 1;
          else added += 1;
        } catch {
          // Unreadable file: skip it, keep scanning.
        } finally {
          processed += 1;
          if (processed % 10 === 0 || processed === toParse.length) {
            setScan({ phase: 'reading', processed, discovered: toParse.length, added, updated });
          }
        }
      };

      while (cursor < toParse.length || inFlight.size > 0) {
        while (cursor < toParse.length && inFlight.size < WINDOW) {
          const p = processOne(toParse[cursor++]).finally(() => inFlight.delete(p));
          inFlight.add(p);
        }
        if (inFlight.size > 0) await Promise.race(inFlight);
      }
    } finally {
      pool.destroy();
    }

    setScan({ phase: 'saving' });
    await db.transaction('rw', [db.tracks, db.covers, db.folders], async () => {
      if (removedIds.length) await db.tracks.bulkDelete(removedIds);
      if (newTracks.length) await db.tracks.bulkPut(newTracks);
      if (newCovers.size) {
        await db.covers.bulkPut([...newCovers.entries()].map(([id, blob]) => ({ id, blob })));
      }
      const trackCount = await db.tracks.where('folderId').equals(folderId).count();
      await db.folders.update(folderId, { lastScanAt: Date.now(), trackCount });
    });

    await pruneOrphanCovers();
    await rebuildAggregates();

    setScan({ phase: 'done', added, updated, removed: removedIds.length });
    setTimeout(() => {
      if (useUiStore.getState().scan.phase === 'done') useUiStore.getState().resetScan();
    }, 6000);
  } catch (error) {
    setScan({ phase: 'error', error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

async function pruneOrphanCovers(): Promise<void> {
  const usedCoverIds = new Set<string>();
  await db.tracks.each((t) => {
    if (t.coverId) usedCoverIds.add(t.coverId);
  });
  const allCoverIds = await db.covers.toCollection().primaryKeys();
  const orphans = allCoverIds.filter((id) => !usedCoverIds.has(id));
  if (orphans.length) await db.covers.bulkDelete(orphans);
}
