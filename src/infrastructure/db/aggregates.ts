import { UNKNOWN_ALBUM, UNKNOWN_ARTIST, UNKNOWN_GENRE } from '@/core/constants';
import type { AlbumEntry, ArtistEntry, GenreEntry, Track } from '@/core/types';
import { db } from '@/infrastructure/db/db';
import { hash53 } from '@/lib/utils';

export const albumId = (albumArtist: string, album: string) =>
  hash53(`album::${albumArtist.toLowerCase()}::${album.toLowerCase()}`);
export const artistId = (artist: string) => hash53(`artist::${artist.toLowerCase()}`);
export const genreId = (genre: string) => hash53(`genre::${genre.toLowerCase()}`);

/**
 * Materializes albums/artists/genres from the tracks table. Runs after every
 * scan so list views never need to aggregate 20k tracks on the fly.
 */
export async function rebuildAggregates(): Promise<void> {
  const tracks = await db.tracks.toArray();

  const albums = new Map<string, AlbumEntry>();
  const artists = new Map<string, ArtistEntry & { albumIds: Set<string> }>();
  const genres = new Map<string, GenreEntry>();

  for (const t of tracks) {
    addTrack(albums, artists, genres, t);
  }

  const albumRows = [...albums.values()];
  const artistRows = [...artists.values()].map(({ albumIds, ...a }) => ({
    ...a,
    albumCount: albumIds.size,
  }));
  const genreRows = [...genres.values()];

  await db.transaction('rw', [db.albums, db.artists, db.genres], async () => {
    await Promise.all([db.albums.clear(), db.artists.clear(), db.genres.clear()]);
    await Promise.all([
      db.albums.bulkPut(albumRows),
      db.artists.bulkPut(artistRows),
      db.genres.bulkPut(genreRows),
    ]);
  });
}

function addTrack(
  albums: Map<string, AlbumEntry>,
  artists: Map<string, ArtistEntry & { albumIds: Set<string> }>,
  genres: Map<string, GenreEntry>,
  t: Track,
) {
  const albumKey = albumId(t.albumArtist || UNKNOWN_ARTIST, t.album || UNKNOWN_ALBUM);
  const album = albums.get(albumKey);
  if (album) {
    album.trackCount += 1;
    album.totalDuration += t.duration;
    if (!album.coverId && t.coverId) album.coverId = t.coverId;
    if (!album.year && t.year) album.year = t.year;
  } else {
    albums.set(albumKey, {
      id: albumKey,
      name: t.album || UNKNOWN_ALBUM,
      artist: t.albumArtist || t.artist || UNKNOWN_ARTIST,
      year: t.year,
      coverId: t.coverId,
      trackCount: 1,
      totalDuration: t.duration,
    });
  }

  const artistName = t.artist || UNKNOWN_ARTIST;
  const artistKey = artistId(artistName);
  const artist = artists.get(artistKey);
  if (artist) {
    artist.trackCount += 1;
    artist.albumIds.add(albumKey);
    if (!artist.coverId && t.coverId) artist.coverId = t.coverId;
  } else {
    artists.set(artistKey, {
      id: artistKey,
      name: artistName,
      trackCount: 1,
      albumCount: 0,
      coverId: t.coverId,
      albumIds: new Set([albumKey]),
    });
  }

  const genreName = t.genre || UNKNOWN_GENRE;
  const genreKey = genreId(genreName);
  const genre = genres.get(genreKey);
  if (genre) {
    genre.trackCount += 1;
    if (!genre.coverId && t.coverId) genre.coverId = t.coverId;
  } else {
    genres.set(genreKey, {
      id: genreKey,
      name: genreName,
      trackCount: 1,
      coverId: t.coverId,
    });
  }
}
