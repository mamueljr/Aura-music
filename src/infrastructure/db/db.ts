import Dexie, { type Table } from 'dexie';

import type {
  AlbumEntry,
  ArtistEntry,
  CoverArt,
  GenreEntry,
  LibraryFolder,
  PersistedPlaybackState,
  Playlist,
  Track,
} from '@/core/types';

/**
 * Local-first storage. Everything the app knows lives here; the audio files
 * themselves stay on disk and are read on demand through the folder handles.
 */
export class AuraDatabase extends Dexie {
  tracks!: Table<Track, string>;
  covers!: Table<CoverArt, string>;
  folders!: Table<LibraryFolder, number>;
  playlists!: Table<Playlist, string>;
  albums!: Table<AlbumEntry, string>;
  artists!: Table<ArtistEntry, string>;
  genres!: Table<GenreEntry, string>;
  playbackState!: Table<PersistedPlaybackState, string>;

  constructor() {
    super('aura-music');
    this.version(1).stores({
      tracks:
        'id, folderId, title, artist, albumArtist, album, genre, favorite, addedAt, lastPlayedAt, playCount',
      covers: 'id',
      folders: '++id',
      playlists: 'id, name, updatedAt',
      albums: 'id, name, artist',
      artists: 'id, name',
      genres: 'id, name',
      playbackState: 'id',
    });
  }
}

export const db = new AuraDatabase();
