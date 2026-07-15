import { UNKNOWN_ALBUM, UNKNOWN_ARTIST } from '@/core/constants';
import type { AlbumEntry } from '@/core/types';
import { db } from '@/infrastructure/db/db';
import { hash53 } from '@/lib/utils';
import { useSettingsStore } from '@/stores/settingsStore';

/**
 * Fetches cover art from the internet for albums whose files carry no
 * embedded artwork. Providers (in order): iTunes Search API, then
 * MusicBrainz + Cover Art Archive. Results are stored as regular covers;
 * misses are negative-cached in Dexie so we never hammer the APIs.
 */

const MAX_ALBUMS_PER_RUN = 30;
const THROTTLE_MS = 400;
/** Retry failed lookups after a week (new releases get indexed over time). */
const NEGATIVE_CACHE_MS = 7 * 24 * 60 * 60 * 1000;

let running = false;

export async function fetchMissingCovers(): Promise<void> {
  if (running) return;
  if (!useSettingsStore.getState().onlineCovers) return;
  if (!navigator.onLine) return;

  running = true;
  try {
    const albums = await db.albums.toArray();
    const candidates = albums.filter(
      (a) => !a.coverId && a.name !== UNKNOWN_ALBUM && a.artist !== UNKNOWN_ARTIST,
    );

    let processed = 0;
    for (const album of candidates) {
      if (processed >= MAX_ALBUMS_PER_RUN) break;
      if (!useSettingsStore.getState().onlineCovers) break;

      const cacheKey = `coverCheck:${album.id}`;
      const cached = await db.settings.get(cacheKey);
      if (cached && Date.now() - (cached.value as number) < NEGATIVE_CACHE_MS) continue;

      processed += 1;
      const blob = await lookupCover(album);
      if (blob) {
        await storeCover(album, blob);
        await db.settings.delete(cacheKey);
      } else {
        await db.settings.put({ key: cacheKey, value: Date.now() });
      }
      await new Promise((r) => setTimeout(r, THROTTLE_MS));
    }
  } finally {
    running = false;
  }
}

async function lookupCover(album: AlbumEntry): Promise<Blob | null> {
  for (const provider of [fromItunes, fromCoverArtArchive]) {
    try {
      const blob = await provider(album.artist, album.name);
      if (blob && blob.size > 0 && blob.type.startsWith('image/')) return blob;
    } catch {
      /* provider unavailable — try the next one */
    }
  }
  return null;
}

async function storeCover(album: AlbumEntry, blob: Blob): Promise<void> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const head = bytes.subarray(0, 512).join(',');
  const tail = bytes.subarray(Math.max(0, bytes.length - 512)).join(',');
  const coverId = hash53(`cover::${bytes.length}::${head}::${tail}`);

  await db.covers.put({ id: coverId, blob });
  await db.albums.update(album.id, { coverId });
  await db.tracks
    .where('album')
    .equals(album.name)
    .filter((t) => (t.albumArtist || t.artist) === album.artist && !t.coverId)
    .modify({ coverId });

  // Give the artist a face too if it doesn't have one yet.
  const artist = (await db.artists.toArray()).find((a) => a.name === album.artist);
  if (artist && !artist.coverId) await db.artists.update(artist.id, { coverId });
}

async function fromItunes(artist: string, albumName: string): Promise<Blob | null> {
  const term = encodeURIComponent(`${artist} ${albumName}`);
  const res = await fetch(
    `https://itunes.apple.com/search?media=music&entity=album&limit=1&term=${term}`,
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { results?: Array<{ artworkUrl100?: string }> };
  const url = data.results?.[0]?.artworkUrl100?.replace('100x100bb', '600x600bb');
  if (!url) return null;
  const img = await fetch(url);
  return img.ok ? img.blob() : null;
}

async function fromCoverArtArchive(artist: string, albumName: string): Promise<Blob | null> {
  const query = encodeURIComponent(`releasegroup:"${albumName}" AND artist:"${artist}"`);
  const res = await fetch(
    `https://musicbrainz.org/ws/2/release-group/?query=${query}&fmt=json&limit=1`,
    { headers: { Accept: 'application/json' } },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { 'release-groups'?: Array<{ id: string; score?: number }> };
  const group = data['release-groups']?.[0];
  if (!group || (group.score ?? 0) < 80) return null;
  const img = await fetch(`https://coverartarchive.org/release-group/${group.id}/front-500`);
  return img.ok ? img.blob() : null;
}
