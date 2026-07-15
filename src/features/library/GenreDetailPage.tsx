import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { TrackList } from '@/components/TrackList';
import { UNKNOWN_GENRE } from '@/core/constants';
import { useGenre, useGenreTracks } from '@/hooks/useLibrary';
import { player } from '@/services/audio/AudioEngine';

import { DetailHero } from './components/DetailHero';

export default function GenreDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const genre = useGenre(id);
  const tracks = useGenreTracks(genre?.name);

  if (!genre || !tracks) return null;

  const ids = tracks.map((tr) => tr.id);
  const displayName = genre.name === UNKNOWN_GENRE ? t('common.unknownGenre') : genre.name;

  return (
    <div className="flex h-full flex-col">
      <DetailHero
        kind={t('library.genres')}
        title={displayName}
        meta={t('common.songs', { count: genre.trackCount })}
        coverId={genre.coverId}
        coverName={genre.name}
        onPlay={() => void player.playTracks(ids, 0, { shuffle: false })}
        onShuffle={() =>
          void player.playTracks(ids, Math.floor(Math.random() * ids.length), { shuffle: true })
        }
      />
      <TrackList tracks={tracks} />
    </div>
  );
}
