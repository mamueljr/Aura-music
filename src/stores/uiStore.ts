import { create } from 'zustand';

import type { ScanProgress } from '@/core/types';

interface UiState {
  nowPlayingOpen: boolean;
  queueOpen: boolean;
  scan: ScanProgress;
  /** Track pending "add to playlist" (opens the picker dialog) */
  addToPlaylistTrackIds: string[] | null;

  setNowPlayingOpen: (open: boolean) => void;
  setQueueOpen: (open: boolean) => void;
  setScan: (scan: Partial<ScanProgress>) => void;
  resetScan: () => void;
  openAddToPlaylist: (trackIds: string[]) => void;
  closeAddToPlaylist: () => void;
}

const idleScan: ScanProgress = {
  phase: 'idle',
  discovered: 0,
  processed: 0,
  added: 0,
  updated: 0,
  removed: 0,
};

export const useUiStore = create<UiState>((set) => ({
  nowPlayingOpen: false,
  queueOpen: false,
  scan: idleScan,
  addToPlaylistTrackIds: null,

  setNowPlayingOpen: (nowPlayingOpen) => set({ nowPlayingOpen }),
  setQueueOpen: (queueOpen) => set({ queueOpen }),
  setScan: (scan) => set((s) => ({ scan: { ...s.scan, ...scan } })),
  resetScan: () => set({ scan: idleScan }),
  openAddToPlaylist: (addToPlaylistTrackIds) => set({ addToPlaylistTrackIds }),
  closeAddToPlaylist: () => set({ addToPlaylistTrackIds: null }),
}));
