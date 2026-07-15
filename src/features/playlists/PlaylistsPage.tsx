import { Heart, ListMusic, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useFavoriteTracks, usePlaylists } from '@/hooks/useLibrary';
import { generatedCoverUri } from '@/services/artwork/artwork';
import { createPlaylist } from '@/services/playlists/playlists';

export default function PlaylistsPage() {
  const { t } = useTranslation();
  const playlists = usePlaylists();
  const favorites = useFavoriteTracks();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const create = async () => {
    if (!name.trim()) return;
    await createPlaylist(name, description);
    setName('');
    setDescription('');
    setCreateOpen(false);
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={t('playlists.title')}
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus /> {t('playlists.newPlaylist')}
          </Button>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-8">
        {/* Pinned favorites entry */}
        <Link
          to="/favorites"
          className="mb-4 flex items-center gap-4 rounded-2xl border bg-card/60 p-3 transition-colors hover:bg-accent/70"
        >
          <div className="flex size-14 items-center justify-center rounded-xl aura-gradient text-white shadow-md">
            <Heart className="size-6 fill-current" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{t('favorites.title')}</p>
            <p className="text-xs text-muted-foreground">
              {t('common.songs', { count: favorites?.length ?? 0 })}
            </p>
          </div>
        </Link>

        {playlists && playlists.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {playlists.map((playlist) => (
              <Link
                key={playlist.id}
                to={`/playlists/${playlist.id}`}
                className="flex items-center gap-4 rounded-2xl border bg-card/60 p-3 transition-colors hover:bg-accent/70"
              >
                <img
                  src={generatedCoverUri(playlist.name)}
                  alt=""
                  className="size-14 rounded-xl object-cover shadow-md"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{playlist.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t('common.songs', { count: playlist.trackIds.length })}
                    {playlist.description ? ` · ${playlist.description}` : ''}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : playlists ? (
          <EmptyState
            icon={<ListMusic />}
            title={t('playlists.emptyTitle')}
            body={t('playlists.emptyBody')}
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus /> {t('playlists.newPlaylist')}
              </Button>
            }
          />
        ) : null}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('playlists.createTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('common.name')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void create();
              }}
            />
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={`${t('common.description')} (${t('common.optional')})`}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button disabled={!name.trim()} onClick={() => void create()}>
              {t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
