import { useEffect } from 'react';

import { db } from '@/infrastructure/db/db';
import { player } from '@/services/audio/AudioEngine';
import { usePlayerStore } from '@/stores/playerStore';

/**
 * Persists the queue and playback position to IndexedDB (throttled) and
 * restores them on startup, so closing the app never loses your place.
 */
export function usePlaybackPersistence() {
  useEffect(() => {
    let restored = false;

    void (async () => {
      const saved = await db.playbackState.get('current');
      if (saved && !restored) {
        await player.restore(
          saved.queue,
          saved.originalQueue,
          saved.index,
          saved.positionSeconds,
          saved.shuffle,
          saved.repeat,
        );
      }
      restored = true;
    })();

    let lastSave = 0;
    const unsubscribe = usePlayerStore.subscribe((state) => {
      if (!restored || state.queue.length === 0) return;
      const now = Date.now();
      if (now - lastSave < 3000) return;
      lastSave = now;
      void db.playbackState.put({
        id: 'current',
        queue: state.queue,
        originalQueue: state.originalQueue,
        index: state.index,
        positionSeconds: state.position,
        shuffle: state.shuffle,
        repeat: state.repeat,
      });
    });

    return unsubscribe;
  }, []);
}
