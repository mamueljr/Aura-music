import { ArrowDownAZ, Music2, Play, RefreshCw, Shuffle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import { EmptyState } from '@/components/EmptyState';
import { MediaCard, MediaGrid } from '@/components/MediaCard';
import { PageHeader } from '@/components/PageHeader';
import { TrackList } from '@/components/TrackList';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UNKNOWN_ALBUM, UNKNOWN_ARTIST, UNKNOWN_GENRE } from '@/core/constants';
import {
  useAlbums,
  useAllTracks,
  useArtists,
  useGenres,
  useTrackCount,
  type TrackSort,
} from '@/hooks/useLibrary';
import { supportsFsAccess } from '@/infrastructure/fs/fileSystem';
import { db } from '@/infrastructure/db/db';
import { cn } from '@/lib/utils';
import { player } from '@/services/audio/AudioEngine';
import { rescanAllFolders } from '@/services/library/scanner';
import { useUiStore } from '@/stores/uiStore';

import { AddFolderButton } from './components/AddFolderButton';
import { ScanProgressBanner } from './components/ScanProgressBanner';

const TABS = ['songs', 'artists', 'albums', 'genres'] as const;
type Tab = (typeof TABS)[number];

export default function LibraryPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const tab = (TABS as readonly string[]).includes(params.get('tab') ?? '')
    ? (params.get('tab') as Tab)
    : 'songs';
  const sort = (params.get('sort') as TrackSort) || 'title';

  const trackCount = useTrackCount();
  const scanPhase = useUiStore((s) => s.scan.phase);
  const scanning = scanPhase !== 'idle' && scanPhase !== 'done' && scanPhase !== 'error';

  const empty = trackCount === 0 && !scanning;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={t('library.title')}
        subtitle={trackCount != null ? t('common.songs', { count: trackCount }) : undefined}
        actions={
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('library.rescan')}
              disabled={scanning}
              onClick={() => void rescanAllFolders()}
            >
              <RefreshCw className={cn(scanning && 'animate-spin')} />
            </Button>
            <AddFolderButton variant="secondary" size="sm" />
          </>
        }
      />

      <ScanProgressBanner />

      {empty ? (
        <>
          <EmptyState
            icon={<Music2 />}
            title={t('library.emptyTitle')}
            body={t('library.emptyBody')}
            action={<AddFolderButton size="lg" />}
          />
          {!supportsFsAccess() ? (
            <p className="mx-auto max-w-md px-6 text-center text-xs text-muted-foreground">
              {t('library.fallbackNotice')}
            </p>
          ) : null}
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 md:px-8">
            <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })}>
              <TabsList>
                {TABS.map((tabKey) => (
                  <TabsTrigger key={tabKey} value={tabKey}>
                    {t(`library.${tabKey}`)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {tab === 'songs' ? (
              <div className="ml-auto flex items-center gap-1.5">
                <SortMenu
                  sort={sort}
                  onChange={(s) => setParams({ tab, sort: s }, { replace: true })}
                />
                <PlayAllButtons />
              </div>
            ) : null}
          </div>

          {tab === 'songs' ? <SongsView sort={sort} /> : null}
          {tab === 'artists' ? <ArtistsView /> : null}
          {tab === 'albums' ? <AlbumsView /> : null}
          {tab === 'genres' ? <GenresView /> : null}
        </>
      )}
    </div>
  );
}

function SortMenu({ sort, onChange }: { sort: TrackSort; onChange: (s: TrackSort) => void }) {
  const { t } = useTranslation();
  const labels: Record<TrackSort, string> = {
    title: t('library.sortTitle'),
    artist: t('library.sortArtist'),
    album: t('library.sortAlbum'),
    recent: t('library.sortRecent'),
    duration: t('library.sortDuration'),
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <ArrowDownAZ /> {labels[sort]}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {(Object.keys(labels) as TrackSort[]).map((key) => (
          <DropdownMenuItem
            key={key}
            onSelect={() => onChange(key)}
            className={cn(key === sort && 'text-aura-1')}
          >
            {labels[key]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PlayAllButtons() {
  const { t } = useTranslation();

  const playAll = async (shuffle: boolean) => {
    const tracks = await db.tracks.toArray();
    if (tracks.length === 0) return;
    const ids = tracks.map((tr) => tr.id);
    const start = shuffle ? Math.floor(Math.random() * ids.length) : 0;
    await player.playTracks(ids, start, { shuffle });
  };

  return (
    <>
      <Button size="sm" onClick={() => void playAll(false)}>
        <Play className="fill-current" /> {t('common.playAll')}
      </Button>
      <Button
        variant="secondary"
        size="icon-sm"
        aria-label={t('common.shufflePlay')}
        onClick={() => void playAll(true)}
      >
        <Shuffle />
      </Button>
    </>
  );
}

function SongsView({ sort }: { sort: TrackSort }) {
  const tracks = useAllTracks(sort);
  if (!tracks) return null;
  return <TrackList tracks={tracks} />;
}

function ArtistsView() {
  const { t } = useTranslation();
  const artists = useArtists();
  if (!artists) return null;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <MediaGrid>
        {artists.map((artist) => (
          <MediaCard
            key={artist.id}
            to={`/artists/${artist.id}`}
            coverId={artist.coverId}
            round
            name={artist.name === UNKNOWN_ARTIST ? t('common.unknownArtist') : artist.name}
            title={artist.name === UNKNOWN_ARTIST ? t('common.unknownArtist') : artist.name}
            subtitle={t('common.songs', { count: artist.trackCount })}
          />
        ))}
      </MediaGrid>
    </div>
  );
}

function AlbumsView() {
  const { t } = useTranslation();
  const albums = useAlbums();
  if (!albums) return null;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <MediaGrid>
        {albums.map((album) => (
          <MediaCard
            key={album.id}
            to={`/albums/${album.id}`}
            coverId={album.coverId}
            name={album.name === UNKNOWN_ALBUM ? t('common.unknownAlbum') : album.name}
            title={album.name === UNKNOWN_ALBUM ? t('common.unknownAlbum') : album.name}
            subtitle={
              album.artist === UNKNOWN_ARTIST ? t('common.unknownArtist') : album.artist
            }
            onPlay={() => {
              void (async () => {
                const tracks = await db.tracks.where('album').equals(album.name).toArray();
                const sorted = tracks
                  .filter((tr) => (tr.albumArtist || tr.artist) === album.artist)
                  .sort(
                    (a, b) => (a.discNo ?? 1) - (b.discNo ?? 1) || (a.trackNo ?? 0) - (b.trackNo ?? 0),
                  );
                await player.playTracks(
                  sorted.map((tr) => tr.id),
                  0,
                );
              })();
            }}
          />
        ))}
      </MediaGrid>
    </div>
  );
}

function GenresView() {
  const { t } = useTranslation();
  const genres = useGenres();
  if (!genres) return null;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <MediaGrid>
        {genres.map((genre) => (
          <MediaCard
            key={genre.id}
            to={`/genres/${genre.id}`}
            coverId={genre.coverId}
            name={genre.name === UNKNOWN_GENRE ? t('common.unknownGenre') : genre.name}
            title={genre.name === UNKNOWN_GENRE ? t('common.unknownGenre') : genre.name}
            subtitle={t('common.songs', { count: genre.trackCount })}
          />
        ))}
      </MediaGrid>
    </div>
  );
}
