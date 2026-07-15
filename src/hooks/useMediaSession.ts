import { useEffect } from 'react';

import { player } from '@/services/audio/AudioEngine';
import { generatedCoverUri, getCoverUrl } from '@/services/artwork/artwork';
import { usePlayerStore } from '@/stores/playerStore';

/**
 * Integrates with the OS media controls (lock screen, media keys, headsets)
 * through the Media Session API.
 */
export function useMediaSession() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.setActionHandler('play', () => void player.togglePlay());
    navigator.mediaSession.setActionHandler('pause', () => player.pause());
    navigator.mediaSession.setActionHandler('stop', () => player.stop());
    navigator.mediaSession.setActionHandler('previoustrack', () => void player.previous());
    navigator.mediaSession.setActionHandler('nexttrack', () => void player.next());
    navigator.mediaSession.setActionHandler('seekbackward', (d) =>
      player.seekBy(-(d.seekOffset ?? 10)),
    );
    navigator.mediaSession.setActionHandler('seekforward', (d) =>
      player.seekBy(d.seekOffset ?? 10),
    );
    navigator.mediaSession.setActionHandler('seekto', (d) => {
      if (d.seekTime != null) player.seek(d.seekTime);
    });

    return () => {
      const actions: MediaSessionAction[] = [
        'play',
        'pause',
        'stop',
        'previoustrack',
        'nexttrack',
        'seekbackward',
        'seekforward',
        'seekto',
      ];
      actions.forEach((a) => {
        try {
          navigator.mediaSession.setActionHandler(a, null);
        } catch {
          /* not supported */
        }
      });
    };
  }, []);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;
    let cancelled = false;

    const setMetadata = async () => {
      const artworkUrl = currentTrack.coverId
        ? await getCoverUrl(currentTrack.coverId)
        : generatedCoverUri(currentTrack.album || currentTrack.title);
      if (cancelled) return;
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album,
        artwork: artworkUrl ? [{ src: artworkUrl, sizes: '512x512' }] : [],
      });
    };
    void setMetadata();

    return () => {
      cancelled = true;
    };
  }, [currentTrack]);
}
