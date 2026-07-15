/**
 * Domain types for Aura Music.
 * These are storage- and framework-agnostic: the Dexie schema, the audio
 * engine and the UI all consume these shapes.
 */

export interface Track {
  /** Stable id: hash of `${folderId}:${path}` */
  id: string;
  folderId: number;
  /** Path relative to the library folder root */
  path: string;
  fileName: string;
  title: string;
  artist: string;
  albumArtist: string;
  album: string;
  genre: string;
  year?: number;
  trackNo?: number;
  discNo?: number;
  /** Seconds */
  duration: number;
  size: number;
  lastModified: number;
  coverId?: string;
  /** Lower-cased "title artist album genre" used for instant search */
  searchText: string;
  /** 0 | 1 so Dexie can index it */
  favorite: 0 | 1;
  playCount: number;
  lastPlayedAt?: number;
  addedAt: number;
  /** 1 when a copy lives in the app's private storage (OPFS) */
  opfs?: 0 | 1;
}

export interface AlbumEntry {
  /** hash of `${albumArtist}::${album}` */
  id: string;
  name: string;
  artist: string;
  year?: number;
  coverId?: string;
  trackCount: number;
  totalDuration: number;
}

export interface ArtistEntry {
  /** hash of artist name */
  id: string;
  name: string;
  trackCount: number;
  albumCount: number;
  coverId?: string;
}

export interface GenreEntry {
  /** hash of genre name */
  id: string;
  name: string;
  trackCount: number;
  coverId?: string;
}

export interface CoverArt {
  /** hash of the image bytes (deduplicated across an album) */
  id: string;
  blob: Blob;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  trackIds: string[];
  createdAt: number;
  updatedAt: number;
}

export type FolderMode = 'fs-access' | 'fallback';

export interface LibraryFolder {
  id?: number;
  name: string;
  /** Only present in `fs-access` mode (Chromium). Structured-cloneable. */
  handle?: FileSystemDirectoryHandle;
  mode: FolderMode;
  addedAt: number;
  lastScanAt?: number;
  trackCount?: number;
  /** True when every track of this folder has an OPFS copy */
  imported?: boolean;
}

export interface KeyValueEntry {
  key: string;
  value: unknown;
}

export type RepeatMode = 'off' | 'all' | 'one';

export interface PersistedPlaybackState {
  id: 'current';
  queue: string[];
  /** Original (unshuffled) queue order */
  originalQueue: string[];
  index: number;
  positionSeconds: number;
  shuffle: boolean;
  repeat: RepeatMode;
}

export interface ScanProgress {
  phase: 'idle' | 'discovering' | 'reading' | 'saving' | 'done' | 'error';
  discovered: number;
  processed: number;
  added: number;
  updated: number;
  removed: number;
  currentFile?: string;
  error?: string;
}

export interface LyricsLine {
  timeMs?: number;
  text: string;
}

export interface LyricsResult {
  synced: boolean;
  lines: LyricsLine[];
  source: string;
}
