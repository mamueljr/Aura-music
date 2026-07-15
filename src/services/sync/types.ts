import type { Playlist, Track } from '@/core/types';

/**
 * Contract for a future cloud-sync backend (Supabase, Express on a VPS,
 * Vercel functions…). The app is fully functional with the NoopSyncProvider;
 * swapping in a real backend only requires implementing this interface and
 * changing the export in `services/sync/index.ts`.
 */
export interface SyncSnapshot {
  playlists: Playlist[];
  favorites: string[];
  settings: Record<string, unknown>;
  history: Array<Pick<Track, 'id' | 'playCount' | 'lastPlayedAt'>>;
}

export interface SyncProvider {
  readonly name: string;
  isAuthenticated(): Promise<boolean>;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  push(snapshot: SyncSnapshot): Promise<void>;
  pull(): Promise<SyncSnapshot | null>;
}
