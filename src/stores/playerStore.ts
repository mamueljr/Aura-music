import { create } from 'zustand';

import type { RepeatMode, Track } from '@/core/types';

/**
 * Pure playback state. It is written by the AudioEngine (the single source
 * of truth for actual audio) and read by the UI. UI components never write
 * here directly — they call methods on the engine instead.
 */
interface PlayerState {
  queue: string[];
  originalQueue: string[];
  index: number;
  currentTrack: Track | null;
  isPlaying: boolean;
  /** Seconds, updated ~4×/s while playing */
  position: number;
  duration: number;
  shuffle: boolean;
  repeat: RepeatMode;
  /** Epoch ms when the sleep timer fires; -1 means "end of current track" */
  sleepTimerEndsAt: number | null;
  /** Bumped when the engine loads a new track (used to reset visualizers) */
  loadCount: number;
}

export const usePlayerStore = create<PlayerState>(() => ({
  queue: [],
  originalQueue: [],
  index: -1,
  currentTrack: null,
  isPlaying: false,
  position: 0,
  duration: 0,
  shuffle: false,
  repeat: 'off',
  sleepTimerEndsAt: null,
  loadCount: 0,
}));
