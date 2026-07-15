import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { MediaCard } from '@/components/MediaCard';
import { TrackList } from '@/components/TrackList';
import { UNKNOWN_ARTIST } from '@/core/constants';
import { useAlbums, useArtist, useArtistTracks } from '@/hooks/useLibrary';
import { player } from '@/services/audio/AudioEngine';

import { DetailHero } from './components/DetailHero';

export default function ArtistDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const artist = useArtist(id);
  const tracks = useArtistTracks(artist?.name);
  const allAlbums = useAlbums();

  if (!artist || !tracks) return null;

  const ids = tracks.map((tr) => tr.id);
  const displayName = artist.name === UNKNOWN_ARTIST ? t('common.unknownArtist') : artist.name;
  const artistAlbums = (allAlbums ?? []).filter((a) => a.artist === artist.name);

  return (
    <div className="flex h-full flex-col">
      <DetailHero
        kind={t('library.artists')}
        title={displayName}
        meta={`${t('common.songs', { count: artist.trackCount })} · ${t('common.albums', {
          count: artist.albumCount,
        })}`}
        coverId={artist.coverId}
        coverName={artist.name}
        round
        onPlay={() => void player.playTracks(ids, 0, { shuffle: false })}
        onShuffle={() =>
          void player.playTracks(ids, Math.floor(Math.random() * ids.length), { shuffle: true })
        }
      />

      {artistAlbums.length > 0 ? (
        <div className="border-b py-3">
          <div className="flex gap-1 overflow-x-auto px-4 md:px-8">
            {artistAlbums.map((album) => (
              <div key={album.id} className="w-36 shrink-0">
                <MediaCard
                  to={`/albums/${album.id}`}
                  coverId={album.coverId}
                  name={album.name}
                  title={album.name}
                  subtitle={album.year ? String(album.year) : undefined}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <TrackList tracks={tracks} />
    </div>
  );
}
