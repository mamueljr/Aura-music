import type { LyricsResult, Track } from '@/core/types';

import { lrclibProvider } from './providers/lrclib';
import type { LyricsProvider } from './types';

/**
 * Provider registry. Order matters: the first provider that returns lyrics
 * wins. Add new providers here without touching any UI code.
 */
const providers: LyricsProvider[] = [lrclibProvider];

export async function getLyrics(track: Track): Promise<LyricsResult | null> {
  for (const provider of providers) {
    try {
      const result = await provider.fetchLyrics(track);
      if (result && result.lines.length > 0) return result;
    } catch {
      // Provider unavailable (offline, rate limit…): try the next one.
    }
  }
  return null;
}

export type { LyricsProvider };
