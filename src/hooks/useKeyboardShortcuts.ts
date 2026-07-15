import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { db } from '@/infrastructure/db/db';
import { player } from '@/services/audio/AudioEngine';
import { usePlayerStore } from '@/stores/playerStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';

/**
 * Global shortcuts:
 *  Space play/pause · ←/→ seek ±10s · Shift+←/→ prev/next · ↑/↓ volume
 *  M mute · S shuffle · R repeat · F favorite · Q queue · N now playing · / search
 */
export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.getAttribute('role') === 'slider')
      ) {
        return;
      }

      const settings = useSettingsStore.getState();
      const ui = useUiStore.getState();

      switch (e.key) {
        case ' ':
          e.preventDefault();
          void player.togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) void player.next();
          else player.seekBy(10);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) void player.previous();
          else player.seekBy(-10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          settings.setVolume(Math.min(1, settings.volume + 0.05));
          break;
        case 'ArrowDown':
          e.preventDefault();
          settings.setVolume(Math.max(0, settings.volume - 0.05));
          break;
        case 'm':
        case 'M':
          settings.setMuted(!settings.muted);
          break;
        case 's':
        case 'S':
          player.toggleShuffle();
          break;
        case 'r':
        case 'R':
          player.cycleRepeat();
          break;
        case 'f':
        case 'F': {
          const track = usePlayerStore.getState().currentTrack;
          if (track) {
            void db.tracks.update(track.id, { favorite: track.favorite ? 0 : 1 }).then(() => {
              void db.tracks.get(track.id).then((t) => {
                if (t) usePlayerStore.setState({ currentTrack: t });
              });
            });
          }
          break;
        }
        case 'q':
        case 'Q':
          ui.setQueueOpen(!ui.queueOpen);
          break;
        case 'n':
        case 'N':
          ui.setNowPlayingOpen(!ui.nowPlayingOpen);
          break;
        case '/':
          e.preventDefault();
          navigate('/search');
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate]);
}
