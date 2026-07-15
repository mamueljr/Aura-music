import { useVirtualizer } from '@tanstack/react-virtual';
import { Heart, ListEnd, ListPlus, ListStart, MoreHorizontal, Play, Trash2 } from 'lucide-react';
import { memo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { Artwork } from '@/components/Artwork';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Track } from '@/core/types';
import { albumId, artistId } from '@/infrastructure/db/aggregates';
import { UNKNOWN_ALBUM, UNKNOWN_ARTIST } from '@/core/constants';
import { cn, formatDuration } from '@/lib/utils';
import { player } from '@/services/audio/AudioEngine';
import { toggleFavorite } from '@/services/library/actions';
import { usePlayerStore } from '@/stores/playerStore';
import { useUiStore } from '@/stores/uiStore';

export interface TrackListProps {
  tracks: Track[];
  /** Queue used when a row is clicked; defaults to `tracks` ids in order. */
  onPlayIndex?: (index: number) => void;
  showAlbum?: boolean;
  showArtwork?: boolean;
  /** Show track number instead of artwork (album pages) */
  showTrackNo?: boolean;
  /** Extra context-menu entry, e.g. "remove from playlist" */
  onRemove?: (track: Track, index: number) => void;
  removeLabel?: string;
  className?: string;
}

export function TrackList({
  tracks,
  onPlayIndex,
  showAlbum = true,
  showArtwork = true,
  showTrackNo = false,
  onRemove,
  removeLabel,
  className,
}: TrackListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: tracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 12,
  });

  const play = (index: number) => {
    if (onPlayIndex) onPlayIndex(index);
    else
      void player.playTracks(
        tracks.map((t) => t.id),
        index,
      );
  };

  return (
    <div ref={parentRef} className={cn('min-h-0 flex-1 overflow-y-auto px-2 md:px-4', className)}>
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((row) => {
          const track = tracks[row.index];
          return (
            <div
              key={track.id}
              className="absolute left-0 top-0 w-full"
              style={{ height: row.size, transform: `translateY(${row.start}px)` }}
            >
              <TrackRow
                track={track}
                index={row.index}
                onPlay={() => play(row.index)}
                showAlbum={showAlbum}
                showArtwork={showArtwork}
                showTrackNo={showTrackNo}
                onRemove={onRemove ? () => onRemove(track, row.index) : undefined}
                removeLabel={removeLabel}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface TrackRowProps {
  track: Track;
  index: number;
  onPlay: () => void;
  showAlbum: boolean;
  showArtwork: boolean;
  showTrackNo: boolean;
  onRemove?: () => void;
  removeLabel?: string;
}

export const TrackRow = memo(function TrackRow({
  track,
  onPlay,
  showAlbum,
  showArtwork,
  showTrackNo,
  onRemove,
  removeLabel,
}: TrackRowProps) {
  const { t } = useTranslation();
  const isCurrent = usePlayerStore((s) => s.currentTrack?.id === track.id);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onPlay}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onPlay();
      }}
      className={cn(
        'group flex h-14 w-full cursor-pointer items-center gap-3 rounded-xl px-2 text-left transition-colors hover:bg-accent/70 md:px-3',
        isCurrent && 'bg-accent',
      )}
      aria-label={`${track.title} — ${track.artist}`}
    >
      {showTrackNo ? (
        <div className="relative w-7 shrink-0 text-center text-sm tabular-nums text-muted-foreground">
          <span className="group-hover:invisible">{track.trackNo ?? '–'}</span>
          <Play className="invisible absolute inset-0 m-auto size-4 group-hover:visible" />
        </div>
      ) : showArtwork ? (
        <div className="relative shrink-0">
          <Artwork coverId={track.coverId} name={track.album || track.title} className="size-10" />
          <div className="absolute inset-0 hidden items-center justify-center rounded-lg bg-black/40 group-hover:flex">
            <Play className="size-4 fill-white text-white" />
          </div>
        </div>
      ) : null}

      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-sm font-medium', isCurrent && 'aura-text')}>
          {track.title}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {track.artist || t('common.unknownArtist')}
        </p>
      </div>

      {showAlbum ? (
        <p className="hidden w-2/5 truncate text-xs text-muted-foreground lg:block">
          {track.album || t('common.unknownAlbum')}
        </p>
      ) : null}

      <button
        type="button"
        aria-label={track.favorite ? t('player.removeFromFavorites') : t('player.addToFavorites')}
        aria-pressed={!!track.favorite}
        onClick={(e) => {
          e.stopPropagation();
          void toggleFavorite(track.id);
        }}
        className={cn(
          'rounded-full p-1.5 text-muted-foreground transition-all hover:text-foreground focus-visible:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100',
          track.favorite && 'text-aura-3 opacity-100',
        )}
      >
        <Heart className={cn('size-4', track.favorite && 'fill-current')} />
      </button>

      <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {formatDuration(track.duration)}
      </span>

      <TrackMenu track={track} onRemove={onRemove} removeLabel={removeLabel} />
    </div>
  );
});

export function TrackMenu({
  track,
  onRemove,
  removeLabel,
}: {
  track: Track;
  onRemove?: () => void;
  removeLabel?: string;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const openAddToPlaylist = useUiStore((s) => s.openAddToPlaylist);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="More"
          className="focus-visible:opacity-100 data-[state=open]:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={() => player.playNext([track.id])}>
          <ListStart /> {t('player.playNext')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => player.addToQueue([track.id])}>
          <ListEnd /> {t('player.addToQueue')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => openAddToPlaylist([track.id])}>
          <ListPlus /> {t('player.addToPlaylist')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() =>
            navigate(
              `/albums/${albumId(track.albumArtist || UNKNOWN_ARTIST, track.album || UNKNOWN_ALBUM)}`,
            )
          }
        >
          {t('player.goToAlbum')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => navigate(`/artists/${artistId(track.artist || UNKNOWN_ARTIST)}`)}
        >
          {t('player.goToArtist')}
        </DropdownMenuItem>
        {onRemove ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onSelect={onRemove}>
              <Trash2 /> {removeLabel ?? t('common.delete')}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
