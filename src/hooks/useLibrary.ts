import { useLiveQuery } from 'dexie-react-hooks';

import type { Track } from '@/core/types';
import { db } from '@/infrastructure/db/db';

export type TrackSort = 'title' | 'artist' | 'album' | 'recent' | 'duration';

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });

export function sortTracks(tracks: Track[], sort: TrackSort): Track[] {
  const sorted = [...tracks];
  switch (sort) {
    case 'title':
      return sorted.sort((a, b) => collator.compare(a.title, b.title));
    case 'artist':
      return sorted.sort(
        (a, b) => collator.compare(a.artist, b.artist) || collator.compare(a.title, b.title),
      );
    case 'album':
      return sorted.sort(
        (a, b) =>
          collator.compare(a.album, b.album) ||
          (a.discNo ?? 1) - (b.discNo ?? 1) ||
          (a.trackNo ?? 0) - (b.trackNo ?? 0),
      );
    case 'recent':
      return sorted.sort((a, b) => b.addedAt - a.addedAt);
    case 'duration':
      return sorted.sort((a, b) => b.duration - a.duration);
  }
}

export function useAllTracks(sort: TrackSort = 'title') {
  return useLiveQuery(async () => sortTracks(await db.tracks.toArray(), sort), [sort]);
}

export function useTrackCount() {
  return useLiveQuery(() => db.tracks.count(), []);
}

export function useAlbums() {
  return useLiveQuery(async () => {
    const albums = await db.albums.toArray();
    return albums.sort((a, b) => collator.compare(a.name, b.name));
  }, []);
}

export function useArtists() {
  return useLiveQuery(async () => {
    const artists = await db.artists.toArray();
    return artists.sort((a, b) => collator.compare(a.name, b.name));
  }, []);
}

export function useGenres() {
  return useLiveQuery(async () => {
    const genres = await db.genres.toArray();
    return genres.sort((a, b) => collator.compare(a.name, b.name));
  }, []);
}

export function useAlbum(albumId: string | undefined) {
  return useLiveQuery(async () => (albumId ? db.albums.get(albumId) : undefined), [albumId]);
}

export function useArtist(artistId: string | undefined) {
  return useLiveQuery(async () => (artistId ? db.artists.get(artistId) : undefined), [artistId]);
}

export function useGenre(genreId: string | undefined) {
  return useLiveQuery(async () => (genreId ? db.genres.get(genreId) : undefined), [genreId]);
}

export function useAlbumTracks(albumName: string | undefined, albumArtist: string | undefined) {
  return useLiveQuery(async () => {
    if (albumName === undefined) return undefined;
    const tracks = await db.tracks.where('album').equals(albumName).toArray();
    const filtered = albumArtist
      ? tracks.filter((t) => (t.albumArtist || t.artist) === albumArtist)
      : tracks;
    return sortTracks(filtered, 'album');
  }, [albumName, albumArtist]);
}

export function useArtistTracks(artistName: string | undefined) {
  return useLiveQuery(async () => {
    if (artistName === undefined) return undefined;
    const tracks = await db.tracks.where('artist').equals(artistName).toArray();
    return sortTracks(tracks, 'album');
  }, [artistName]);
}

export function useGenreTracks(genreName: string | undefined) {
  return useLiveQuery(async () => {
    if (genreName === undefined) return undefined;
    const tracks = await db.tracks.where('genre').equals(genreName).toArray();
    return sortTracks(tracks, 'artist');
  }, [genreName]);
}

export function useFavoriteTracks() {
  return useLiveQuery(async () => {
    const tracks = await db.tracks.where('favorite').equals(1).toArray();
    return sortTracks(tracks, 'title');
  }, []);
}

export function usePlaylists() {
  return useLiveQuery(async () => {
    const playlists = await db.playlists.toArray();
    return playlists.sort((a, b) => b.updatedAt - a.updatedAt);
  }, []);
}

export function usePlaylist(id: string | undefined) {
  return useLiveQuery(async () => (id ? db.playlists.get(id) : undefined), [id]);
}

export function usePlaylistTracks(id: string | undefined) {
  return useLiveQuery(async () => {
    if (!id) return undefined;
    const playlist = await db.playlists.get(id);
    if (!playlist) return [];
    const tracks = await db.tracks.bulkGet(playlist.trackIds);
    return tracks.filter((t): t is Track => !!t);
  }, [id]);
}

export function useFolders() {
  return useLiveQuery(() => db.folders.toArray(), []);
}
