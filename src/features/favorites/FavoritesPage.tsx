import { Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { TrackList } from '@/components/TrackList';
import { Button } from '@/components/ui/button';
import { Play, Shuffle } from 'lucide-react';
import { useFavoriteTracks } from '@/hooks/useLibrary';
import { player } from '@/services/audio/AudioEngine';

export default function FavoritesPage() {
  const { t } = useTranslation();
  const tracks = useFavoriteTracks();

  if (!tracks) return null;
  const ids = tracks.map((tr) => tr.id);

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={t('favorites.title')}
        subtitle={t('common.songs', { count: tracks.length })}
        actions={
          tracks.length > 0 ? (
            <>
              <Button size="sm" onClick={() => void player.playTracks(ids, 0, { shuffle: false })}>
                <Play className="fill-current" /> {t('common.playAll')}
              </Button>
              <Button
                variant="secondary"
                size="icon-sm"
                aria-label={t('common.shufflePlay')}
                onClick={() =>
                  void player.playTracks(ids, Math.floor(Math.random() * ids.length), {
                    shuffle: true,
                  })
                }
              >
                <Shuffle />
              </Button>
            </>
          ) : undefined
        }
      />

      {tracks.length === 0 ? (
        <EmptyState
          icon={<Heart />}
          title={t('favorites.emptyTitle')}
          body={t('favorites.emptyBody')}
        />
      ) : (
        <TrackList tracks={tracks} />
      )}
    </div>
  );
}
