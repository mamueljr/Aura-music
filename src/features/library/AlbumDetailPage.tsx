import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { TrackList } from '@/components/TrackList';
import { UNKNOWN_ALBUM, UNKNOWN_ARTIST } from '@/core/constants';
import { useAlbum, useAlbumTracks } from '@/hooks/useLibrary';
import { formatTotalDuration } from '@/lib/utils';
import { player } from '@/services/audio/AudioEngine';

import { DetailHero } from './components/DetailHero';

export default function AlbumDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const album = useAlbum(id);
  const tracks = useAlbumTracks(album?.name, album?.artist);

  if (!album || !tracks) return null;

  const ids = tracks.map((tr) => tr.id);
  const displayName = album.name === UNKNOWN_ALBUM ? t('common.unknownAlbum') : album.name;

  return (
    <div className="flex h-full flex-col">
      <DetailHero
        kind={t('library.albums')}
        title={displayName}
        subtitle={album.artist === UNKNOWN_ARTIST ? t('common.unknownArtist') : album.artist}
        meta={[
          album.year,
          t('common.songs', { count: album.trackCount }),
          formatTotalDuration(album.totalDuration, t('common.hours'), t('common.minutes')),
        ]
          .filter(Boolean)
          .join(' · ')}
        coverId={album.coverId}
        coverName={album.name}
        onPlay={() => void player.playTracks(ids, 0, { shuffle: false })}
        onShuffle={() =>
          void player.playTracks(ids, Math.floor(Math.random() * ids.length), { shuffle: true })
        }
      />
      <TrackList tracks={tracks} showAlbum={false} showArtwork={false} showTrackNo />
    </div>
  );
}
