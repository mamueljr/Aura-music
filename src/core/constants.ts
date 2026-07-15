export const APP_NAME = 'Aura Music';
export const APP_VERSION = '0.1.0';
export const APP_REPO_URL = 'https://github.com/mamueljr/Aura-music';

export const AUDIO_EXTENSIONS = ['mp3', 'm4a', 'aac', 'flac', 'ogg', 'opus', 'wav', 'webm'];

export const UNKNOWN_ARTIST = '__unknown_artist__';
export const UNKNOWN_ALBUM = '__unknown_album__';
export const UNKNOWN_GENRE = '__unknown_genre__';

/** 10-band graphic EQ center frequencies (Hz) */
export const EQ_BANDS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;

export const EQ_PRESETS: Record<string, number[]> = {
  flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  bass: [6, 5, 4, 2, 0, 0, 0, 0, 0, 0],
  treble: [0, 0, 0, 0, 0, 1, 3, 4, 5, 6],
  vocal: [-2, -1, 0, 2, 4, 4, 3, 1, 0, -1],
  rock: [4, 3, 1, 0, -1, 0, 1, 3, 4, 4],
  electronic: [5, 4, 1, 0, -2, 1, 0, 2, 4, 5],
  acoustic: [3, 2, 1, 0, 1, 1, 2, 3, 3, 2],
};

export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

export const SLEEP_TIMER_OPTIONS_MIN = [5, 10, 15, 30, 45, 60, 90] as const;

export const MAX_CROSSFADE_SECONDS = 12;
