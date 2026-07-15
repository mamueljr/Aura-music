import type { LyricsResult, Track } from '@/core/types';

/**
 * Pluggable lyrics source. Implementations (LRCLIB, Musixmatch, lyrics.ovh…)
 * are registered in the provider registry; the UI only talks to `getLyrics`.
 */
export interface LyricsProvider {
  readonly name: string;
  fetchLyrics(track: Track): Promise<LyricsResult | null>;
}

/** Parses LRC-format text (`[mm:ss.xx] line`) into timed lines. */
export function parseLrc(lrc: string): LyricsResult['lines'] {
  const lines: LyricsResult['lines'] = [];
  for (const raw of lrc.split(/\r?\n/)) {
    const match = raw.match(/^\s*\[(\d+):(\d+)(?:[.:](\d+))?\]\s?(.*)$/);
    if (match) {
      const [, mm, ss, frac, text] = match;
      const fracMs = frac ? Math.round(Number(`0.${frac}`) * 1000) : 0;
      lines.push({ timeMs: Number(mm) * 60_000 + Number(ss) * 1000 + fracMs, text });
    } else if (raw.trim()) {
      lines.push({ text: raw.trim() });
    }
  }
  return lines;
}
