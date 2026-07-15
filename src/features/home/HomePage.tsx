import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { BarChart3, Clock, Flame, Music2, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { Artwork } from '@/components/Artwork';
import { EmptyState } from '@/components/EmptyState';
import { MediaCard } from '@/components/MediaCard';
import type { Track } from '@/core/types';
import { useAlbums, useTrackCount } from '@/hooks/useLibrary';
import { db } from '@/infrastructure/db/db';
import { player } from '@/services/audio/AudioEngine';

import { AddFolderButton } from '../library/components/AddFolderButton';
import { ScanProgressBanner } from '../library/components/ScanProgressBanner';

export default function HomePage() {
  const { t } = useTranslation();
  const trackCount = useTrackCount();

  const recentlyPlayed = useLiveQuery(async () => {
    const tracks = await db.tracks.where('lastPlayedAt').above(0).toArray();
    return tracks.sort((a, b) => (b.lastPlayedAt ?? 0) - (a.lastPlayedAt ?? 0)).slice(0, 12);
  }, []);

  const recentlyAdded = useLiveQuery(async () => {
    const tracks = await db.tracks.orderBy('addedAt').reverse().limit(12).toArray();
    return tracks;
  }, []);

  const mostPlayed = useLiveQuery(async () => {
    const tracks = await db.tracks.where('playCount').above(0).toArray();
    return tracks.sort((a, b) => b.playCount - a.playCount).slice(0, 12);
  }, []);

  const albums = useAlbums();

  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? t('home.greetingMorning')
      : hour < 19
        ? t('home.greetingAfternoon')
        : t('home.greetingEvening');

  const empty = trackCount === 0;

  return (
    <div className="relative">
      {/* Aura ambient header glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 overflow-hidden">
        <div className="absolute -top-32 left-1/4 size-96 rounded-full bg-aura-1/15 blur-[100px]" />
        <div className="absolute -top-24 right-1/4 size-72 rounded-full bg-aura-2/10 blur-[100px]" />
      </div>

      <div className="relative flex items-start justify-between gap-3 px-4 pt-6 md:px-8 md:pt-10">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-extrabold tracking-tight md:text-3xl"
          >
            {greeting}
          </motion.h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('app.tagline')}</p>
        </div>
        {!empty ? (
          <Link
            to="/stats"
            aria-label={t('nav.stats')}
            className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-full border bg-card/60 text-aura-1 transition-colors hover:bg-accent md:hidden"
          >
            <BarChart3 className="size-5" />
          </Link>
        ) : null}
      </div>

      <ScanProgressBanner />

      {empty ? (
        <EmptyState
          icon={<Music2 />}
          title={t('home.emptyTitle')}
          body={t('home.emptyBody')}
          action={<AddFolderButton size="lg" />}
        />
      ) : (
        <div className="relative space-y-2 pb-6 pt-4">
          {recentlyPlayed && recentlyPlayed.length > 0 ? (
            <TrackShelf
              icon={<Clock className="size-4" />}
              title={t('home.recentlyPlayed')}
              tracks={recentlyPlayed}
            />
          ) : null}

          {recentlyAdded && recentlyAdded.length > 0 ? (
            <TrackShelf
              icon={<Sparkles className="size-4" />}
              title={t('home.recentlyAdded')}
              tracks={recentlyAdded}
            />
          ) : null}

          {mostPlayed && mostPlayed.length > 0 ? (
            <TrackShelf
              icon={<Flame className="size-4" />}
              title={t('home.mostPlayed')}
              tracks={mostPlayed}
            />
          ) : null}

          {albums && albums.length > 0 ? (
            <section className="pt-3">
              <div className="mb-2 flex items-baseline justify-between px-4 md:px-8">
                <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  <Music2 className="size-4" /> {t('home.yourAlbums')}
                </h2>
                <Link
                  to="/library?tab=albums"
                  className="text-xs font-medium text-aura-1 hover:underline"
                >
                  {t('common.seeAll')}
                </Link>
              </div>
              <div className="flex gap-1 overflow-x-auto px-4 pb-2 md:px-8">
                {albums.slice(0, 12).map((album) => (
                  <div key={album.id} className="w-36 shrink-0 md:w-40">
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
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}

function TrackShelf({
  icon,
  title,
  tracks,
}: {
  icon: React.ReactNode;
  title: string;
  tracks: Track[];
}) {
  return (
    <section className="pt-3">
      <h2 className="mb-2 flex items-center gap-2 px-4 text-sm font-bold uppercase tracking-wider text-muted-foreground md:px-8">
        {icon} {title}
      </h2>
      <div className="flex gap-2 overflow-x-auto px-4 pb-2 md:px-8">
        {tracks.map((track, i) => (
          <motion.button
            key={track.id}
            type="button"
            whileHover={{ y: -3 }}
            onClick={() =>
              void player.playTracks(
                tracks.map((tr) => tr.id),
                i,
              )
            }
            className="w-32 shrink-0 rounded-2xl p-2 text-left transition-colors hover:bg-accent/70 md:w-36"
          >
            <Artwork
              coverId={track.coverId}
              name={track.album || track.title}
              rounded="rounded-xl"
              className="w-full shadow-md"
            />
            <p className="mt-2 truncate text-sm font-semibold">{track.title}</p>
            <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
          </motion.button>
        ))}
      </div>
    </section>
  );
}
