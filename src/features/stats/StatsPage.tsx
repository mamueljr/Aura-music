import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { BarChart3, Clock, Disc3, Flame, Heart, Mic2, Music2, Play } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { Artwork } from '@/components/Artwork';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { UNKNOWN_ALBUM, UNKNOWN_ARTIST, UNKNOWN_GENRE } from '@/core/constants';
import type { Track } from '@/core/types';
import { db } from '@/infrastructure/db/db';
import { formatTotalDuration } from '@/lib/utils';
import { player } from '@/services/audio/AudioEngine';

interface RankedEntry {
  key: string;
  label: string;
  plays: number;
  seconds: number;
  coverId?: string;
  trackIds: string[];
}

function rankBy(tracks: Track[], keyOf: (t: Track) => string, labelOf: (t: Track) => string) {
  const map = new Map<string, RankedEntry>();
  for (const t of tracks) {
    if (!t.playCount) continue;
    const key = keyOf(t);
    const entry = map.get(key);
    if (entry) {
      entry.plays += t.playCount;
      entry.seconds += t.playCount * t.duration;
      entry.trackIds.push(t.id);
      if (!entry.coverId && t.coverId) entry.coverId = t.coverId;
    } else {
      map.set(key, {
        key,
        label: labelOf(t),
        plays: t.playCount,
        seconds: t.playCount * t.duration,
        coverId: t.coverId,
        trackIds: [t.id],
      });
    }
  }
  return [...map.values()].sort((a, b) => b.plays - a.plays).slice(0, 5);
}

export default function StatsPage() {
  const { t } = useTranslation();
  const tracks = useLiveQuery(() => db.tracks.toArray(), []);

  const stats = useMemo(() => {
    if (!tracks) return null;
    const played = tracks.filter((tr) => tr.playCount > 0);
    const totalPlays = played.reduce((acc, tr) => acc + tr.playCount, 0);
    const totalSeconds = played.reduce((acc, tr) => acc + tr.playCount * tr.duration, 0);
    return {
      totalPlays,
      totalSeconds,
      distinct: played.length,
      favorites: tracks.filter((tr) => tr.favorite).length,
      topTracks: [...played].sort((a, b) => b.playCount - a.playCount).slice(0, 5),
      topArtists: rankBy(
        played,
        (tr) => tr.artist || UNKNOWN_ARTIST,
        (tr) => tr.artist || t('common.unknownArtist'),
      ),
      topAlbums: rankBy(
        played,
        (tr) => `${tr.albumArtist}::${tr.album || UNKNOWN_ALBUM}`,
        (tr) => tr.album || t('common.unknownAlbum'),
      ),
      topGenres: rankBy(
        played,
        (tr) => tr.genre || UNKNOWN_GENRE,
        (tr) => tr.genre || t('common.unknownGenre'),
      ),
    };
  }, [tracks, t]);

  if (!stats) return null;

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={t('stats.title')} />

      {stats.totalPlays === 0 ? (
        <EmptyState
          icon={<BarChart3 />}
          title={t('stats.emptyTitle')}
          body={t('stats.emptyBody')}
        />
      ) : (
        <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-5 md:px-8">
          {/* Headline numbers */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
              icon={<Play className="size-4" />}
              value={String(stats.totalPlays)}
              label={t('stats.totalPlays')}
            />
            <StatCard
              icon={<Clock className="size-4" />}
              value={formatTotalDuration(stats.totalSeconds, t('common.hours'), t('common.minutes'))}
              label={t('stats.timeListened')}
            />
            <StatCard
              icon={<Music2 className="size-4" />}
              value={String(stats.distinct)}
              label={t('stats.distinctTracks')}
            />
            <StatCard
              icon={<Heart className="size-4" />}
              value={String(stats.favorites)}
              label={t('nav.favorites')}
            />
          </div>

          <RankSection
            icon={<Flame className="size-4" />}
            title={t('stats.topSongs')}
            entries={stats.topTracks.map((tr) => ({
              key: tr.id,
              label: tr.title,
              sub: tr.artist || t('common.unknownArtist'),
              plays: tr.playCount,
              coverId: tr.coverId,
              coverName: tr.album || tr.title,
              onPlay: () =>
                void player.playTracks(
                  stats.topTracks.map((x) => x.id),
                  stats.topTracks.indexOf(tr),
                ),
            }))}
            playsLabel={(n) => t('stats.plays', { count: n })}
          />

          <RankSection
            icon={<Mic2 className="size-4" />}
            title={t('stats.topArtists')}
            entries={stats.topArtists.map((e) => ({
              key: e.key,
              label: e.label,
              sub: formatTotalDuration(e.seconds, t('common.hours'), t('common.minutes')),
              plays: e.plays,
              coverId: e.coverId,
              coverName: e.label,
              round: true,
              onPlay: () => void player.playTracks(e.trackIds, 0),
            }))}
            playsLabel={(n) => t('stats.plays', { count: n })}
          />

          <RankSection
            icon={<Disc3 className="size-4" />}
            title={t('stats.topAlbums')}
            entries={stats.topAlbums.map((e) => ({
              key: e.key,
              label: e.label,
              sub: formatTotalDuration(e.seconds, t('common.hours'), t('common.minutes')),
              plays: e.plays,
              coverId: e.coverId,
              coverName: e.label,
              onPlay: () => void player.playTracks(e.trackIds, 0),
            }))}
            playsLabel={(n) => t('stats.plays', { count: n })}
          />

          <RankSection
            icon={<BarChart3 className="size-4" />}
            title={t('stats.topGenres')}
            entries={stats.topGenres.map((e) => ({
              key: e.key,
              label: e.label,
              sub: formatTotalDuration(e.seconds, t('common.hours'), t('common.minutes')),
              plays: e.plays,
              coverId: e.coverId,
              coverName: e.label,
              onPlay: () => void player.playTracks(e.trackIds, 0),
            }))}
            playsLabel={(n) => t('stats.plays', { count: n })}
          />
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border bg-card/60 p-4"
    >
      <div className="pointer-events-none absolute -right-4 -top-4 size-16 rounded-full bg-aura-1/10 blur-xl" />
      <div className="mb-2 flex size-8 items-center justify-center rounded-lg bg-accent text-aura-1">
        {icon}
      </div>
      <p className="truncate text-xl font-extrabold tabular-nums">{value}</p>
      <p className="truncate text-xs text-muted-foreground">{label}</p>
    </motion.div>
  );
}

interface RankRow {
  key: string;
  label: string;
  sub: string;
  plays: number;
  coverId?: string;
  coverName: string;
  round?: boolean;
  onPlay: () => void;
}

function RankSection({
  icon,
  title,
  entries,
  playsLabel,
}: {
  icon: React.ReactNode;
  title: string;
  entries: RankRow[];
  playsLabel: (n: number) => string;
}) {
  if (entries.length === 0) return null;
  const max = entries[0].plays;

  return (
    <section className="rounded-2xl border bg-card/60 p-4 md:p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
        {icon} {title}
      </h2>
      <div className="space-y-1">
        {entries.map((entry, i) => (
          <button
            key={entry.key}
            type="button"
            onClick={entry.onPlay}
            className="group flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-accent/70"
          >
            <span className="w-5 text-center text-sm font-bold tabular-nums text-muted-foreground">
              {i + 1}
            </span>
            <Artwork
              coverId={entry.coverId}
              name={entry.coverName}
              rounded={entry.round ? 'rounded-full' : 'rounded-lg'}
              className="size-10"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-semibold">{entry.label}</p>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {playsLabel(entry.plays)}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full aura-gradient"
                    style={{ width: `${Math.max(6, (entry.plays / max) * 100)}%` }}
                  />
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground">{entry.sub}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
