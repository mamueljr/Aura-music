import type { LyricsResult, Track } from '@/core/types';

import { parseLrc, type LyricsProvider } from '../types';

interface LrclibResponse {
  syncedLyrics?: string | null;
  plainLyrics?: string | null;
}

/**
 * LRCLIB (https://lrclib.net) — free, no API key, CORS-enabled.
 */
export const lrclibProvider: LyricsProvider = {
  name: 'LRCLIB',

  async fetchLyrics(track: Track): Promise<LyricsResult | null> {
    if (!track.artist || !track.title) return null;

    const params = new URLSearchParams({
      artist_name: track.artist,
      track_name: track.title,
    });
    if (track.album) params.set('album_name', track.album);
    if (track.duration) params.set('duration', String(Math.round(track.duration)));

    const res = await fetch(`https://lrclib.net/api/get?${params}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as LrclibResponse;
    if (data.syncedLyrics) {
      return { synced: true, lines: parseLrc(data.syncedLyrics), source: this.name };
    }
    if (data.plainLyrics) {
      return {
        synced: false,
        lines: data.plainLyrics.split(/\r?\n/).map((text) => ({ text })),
        source: this.name,
      };
    }
    return null;
  },
};
