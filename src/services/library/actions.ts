import { db } from '@/infrastructure/db/db';
import { usePlayerStore } from '@/stores/playerStore';

export async function toggleFavorite(trackId: string): Promise<void> {
  const track = await db.tracks.get(trackId);
  if (!track) return;
  await db.tracks.update(trackId, { favorite: track.favorite ? 0 : 1 });

  // Keep the player store copy in sync if this track is loaded.
  const { currentTrack } = usePlayerStore.getState();
  if (currentTrack?.id === trackId) {
    const updated = await db.tracks.get(trackId);
    if (updated) usePlayerStore.setState({ currentTrack: updated });
  }
}
