import type { SyncProvider, SyncSnapshot } from './types';

/** Default provider: the app works 100% locally, sync is a silent no-op. */
class NoopSyncProvider implements SyncProvider {
  readonly name = 'local-only';
  async isAuthenticated() {
    return false;
  }
  async signIn() {
    /* no backend configured */
  }
  async signOut() {
    /* no backend configured */
  }
  async push(_snapshot: SyncSnapshot) {
    /* no backend configured */
  }
  async pull() {
    return null;
  }
}

export const syncProvider: SyncProvider = new NoopSyncProvider();
export type { SyncProvider, SyncSnapshot };
