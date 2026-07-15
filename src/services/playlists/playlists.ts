import type { Playlist, Track } from '@/core/types';
import { db } from '@/infrastructure/db/db';
import { downloadBlob, hash53 } from '@/lib/utils';

function newId(name: string) {
  return hash53(`playlist::${name}::${Date.now()}::${Math.random()}`);
}

export async function createPlaylist(name: string, description?: string): Promise<Playlist> {
  const playlist: Playlist = {
    id: newId(name),
    name: name.trim(),
    description: description?.trim() || undefined,
    trackIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await db.playlists.add(playlist);
  return playlist;
}

export async function renamePlaylist(id: string, name: string, description?: string) {
  await db.playlists.update(id, {
    name: name.trim(),
    description: description?.trim() || undefined,
    updatedAt: Date.now(),
  });
}

export async function deletePlaylist(id: string) {
  await db.playlists.delete(id);
}

export async function duplicatePlaylist(id: string, copySuffix: string): Promise<Playlist | null> {
  const source = await db.playlists.get(id);
  if (!source) return null;
  const copy: Playlist = {
    ...source,
    id: newId(source.name),
    name: `${source.name} (${copySuffix})`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await db.playlists.add(copy);
  return copy;
}

export async function addTracksToPlaylist(id: string, trackIds: string[]) {
  const playlist = await db.playlists.get(id);
  if (!playlist) return;
  const existing = new Set(playlist.trackIds);
  const additions = trackIds.filter((tid) => !existing.has(tid));
  if (additions.length === 0) return;
  await db.playlists.update(id, {
    trackIds: [...playlist.trackIds, ...additions],
    updatedAt: Date.now(),
  });
}

export async function removeTrackAt(id: string, index: number) {
  const playlist = await db.playlists.get(id);
  if (!playlist) return;
  const trackIds = playlist.trackIds.filter((_, i) => i !== index);
  await db.playlists.update(id, { trackIds, updatedAt: Date.now() });
}

export async function moveTrack(id: string, from: number, to: number) {
  const playlist = await db.playlists.get(id);
  if (!playlist || from === to) return;
  const trackIds = [...playlist.trackIds];
  const [moved] = trackIds.splice(from, 1);
  trackIds.splice(to, 0, moved);
  await db.playlists.update(id, { trackIds, updatedAt: Date.now() });
}

export async function exportPlaylistM3U(id: string) {
  const playlist = await db.playlists.get(id);
  if (!playlist) return;
  const tracks = (await db.tracks.bulkGet(playlist.trackIds)).filter((t): t is Track => !!t);
  const lines = ['#EXTM3U'];
  for (const track of tracks) {
    lines.push(`#EXTINF:${Math.round(track.duration)},${track.artist} - ${track.title}`);
    lines.push(track.path);
  }
  downloadBlob(
    new Blob([lines.join('\n')], { type: 'audio/x-mpegurl' }),
    `${playlist.name}.m3u8`,
  );
}

export async function exportPlaylistJSON(id: string) {
  const playlist = await db.playlists.get(id);
  if (!playlist) return;
  const tracks = (await db.tracks.bulkGet(playlist.trackIds)).filter((t): t is Track => !!t);
  const payload = {
    format: 'aura-music-playlist',
    version: 1,
    name: playlist.name,
    description: playlist.description,
    exportedAt: new Date().toISOString(),
    tracks: tracks.map((track) => ({
      title: track.title,
      artist: track.artist,
      album: track.album,
      duration: track.duration,
      path: track.path,
    })),
  };
  downloadBlob(
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
    `${playlist.name}.json`,
  );
}
