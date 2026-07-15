import { SearchIcon, X } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/EmptyState';
import { MediaCard } from '@/components/MediaCard';
import { TrackRow } from '@/components/TrackList';
import { Input } from '@/components/ui/input';
import { UNKNOWN_ALBUM, UNKNOWN_ARTIST, UNKNOWN_GENRE } from '@/core/constants';
import { useAlbums, useAllTracks, useArtists, useGenres } from '@/hooks/useLibrary';
import { player } from '@/services/audio/AudioEngine';

export default function SearchPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const q = deferredQuery.trim().toLowerCase();

  const tracks = useAllTracks('title');
  const artists = useArtists();
  const albums = useAlbums();
  const genres = useGenres();

  const results = useMemo(() => {
    if (!q) return null;
    return {
      tracks: (tracks ?? []).filter((tr) => tr.searchText.includes(q)),
      artists: (artists ?? []).filter(
        (a) => a.name !== UNKNOWN_ARTIST && a.name.toLowerCase().includes(q),
      ),
      albums: (albums ?? []).filter(
        (a) => a.name !== UNKNOWN_ALBUM && a.name.toLowerCase().includes(q),
      ),
      genres: (genres ?? []).filter(
        (g) => g.name !== UNKNOWN_GENRE && g.name.toLowerCase().includes(q),
      ),
    };
  }, [q, tracks, artists, albums, genres]);

  const hasResults =
    !!results &&
    (results.tracks.length > 0 ||
      results.artists.length > 0 ||
      results.albums.length > 0 ||
      results.genres.length > 0);

  return (
    <div className="flex h-full flex-col">
      <div className="glass sticky top-0 z-20 border-b px-4 py-3 md:px-8">
        <div className="relative mx-auto max-w-2xl">
          <SearchIcon className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            role="searchbox"
            aria-label={t('search.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search.placeholder')}
            className="h-11 rounded-full pl-10 pr-10"
          />
          {query ? (
            <button
              type="button"
              aria-label={t('common.close')}
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      {!q ? (
        <EmptyState icon={<SearchIcon />} title={t('search.startTyping')} />
      ) : !hasResults ? (
        <EmptyState icon={<SearchIcon />} title={t('search.noResults', { query: deferredQuery })} />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto pb-6">
          {results.artists.length > 0 ? (
            <Section title={t('search.artists')}>
              <div className="flex gap-1 overflow-x-auto px-4 md:px-8">
                {results.artists.slice(0, 12).map((artist) => (
                  <div key={artist.id} className="w-32 shrink-0">
                    <MediaCard
                      to={`/artists/${artist.id}`}
                      coverId={artist.coverId}
                      round
                      name={artist.name}
                      title={artist.name}
                      subtitle={t('common.songs', { count: artist.trackCount })}
                    />
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {results.albums.length > 0 ? (
            <Section title={t('search.albums')}>
              <div className="flex gap-1 overflow-x-auto px-4 md:px-8">
                {results.albums.slice(0, 12).map((album) => (
                  <div key={album.id} className="w-36 shrink-0">
                    <MediaCard
                      to={`/albums/${album.id}`}
                      coverId={album.coverId}
                      name={album.name}
                      title={album.name}
                      subtitle={album.artist}
                    />
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {results.genres.length > 0 ? (
            <Section title={t('search.genres')}>
              <div className="flex flex-wrap gap-2 px-4 md:px-8">
                {results.genres.slice(0, 12).map((genre) => (
                  <MediaChip key={genre.id} to={`/genres/${genre.id}`} label={genre.name} />
                ))}
              </div>
            </Section>
          ) : null}

          {results.tracks.length > 0 ? (
            <Section title={t('search.songs')}>
              <div className="px-2 md:px-4">
                {results.tracks.slice(0, 100).map((track, i, arr) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    index={i}
                    onPlay={() =>
                      void player.playTracks(
                        arr.map((tr) => tr.id),
                        i,
                      )
                    }
                    showAlbum
                    showArtwork
                    showTrackNo={false}
                  />
                ))}
              </div>
            </Section>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="pt-5">
      <h2 className="mb-2 px-4 text-sm font-bold uppercase tracking-wider text-muted-foreground md:px-8">
        {title}
      </h2>
      {children}
    </section>
  );
}

function MediaChip({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="rounded-full border bg-card/60 px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
    >
      {label}
    </Link>
  );
}
