import { ListPlus, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePlaylists } from '@/hooks/useLibrary';
import { addTracksToPlaylist, createPlaylist } from '@/services/playlists/playlists';
import { useUiStore } from '@/stores/uiStore';

/**
 * Global "add to playlist" picker, opened from any track menu via the UI store.
 */
export function AddToPlaylistDialog() {
  const { t } = useTranslation();
  const trackIds = useUiStore((s) => s.addToPlaylistTrackIds);
  const close = useUiStore((s) => s.closeAddToPlaylist);
  const playlists = usePlaylists();
  const [newName, setNewName] = useState('');

  const open = trackIds != null;

  const addTo = async (playlistId: string) => {
    if (!trackIds) return;
    await addTracksToPlaylist(playlistId, trackIds);
    close();
  };

  const createAndAdd = async () => {
    if (!trackIds || !newName.trim()) return;
    const playlist = await createPlaylist(newName);
    await addTracksToPlaylist(playlist.id, trackIds);
    setNewName('');
    close();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('player.addToPlaylist')}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('playlists.newPlaylist')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void createAndAdd();
            }}
          />
          <Button
            variant="secondary"
            size="icon"
            aria-label={t('common.create')}
            disabled={!newName.trim()}
            onClick={() => void createAndAdd()}
          >
            <Plus />
          </Button>
        </div>

        <div className="max-h-64 space-y-1 overflow-y-auto">
          {(playlists ?? []).map((playlist) => (
            <button
              key={playlist.id}
              type="button"
              onClick={() => void addTo(playlist.id)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
            >
              <ListPlus className="size-4 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate font-medium">{playlist.name}</span>
              <span className="text-xs text-muted-foreground">
                {t('common.songs', { count: playlist.trackIds.length })}
              </span>
            </button>
          ))}
          {playlists && playlists.length === 0 ? (
            <p className="px-1 py-3 text-sm text-muted-foreground">{t('playlists.emptyTitle')}</p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
