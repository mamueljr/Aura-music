import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import type { Track } from '@/core/types';
import { cn } from '@/lib/utils';
import { player } from '@/services/audio/AudioEngine';
import { getLyrics } from '@/services/lyrics';
import { usePlayerStore } from '@/stores/playerStore';

/**
 * Lyrics with karaoke behavior when the source is time-synced: the active
 * line lights up, auto-scrolls to center, and tapping a line seeks to it.
 * `stage` renders the large full-screen variant used inside Now Playing.
 */
export function LyricsPanel({ track, stage = false }: { track: Track; stage?: boolean }) {
  const { t } = useTranslation();
  const position = usePlayerStore((s) => s.position);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['lyrics', track.id],
    queryFn: () => getLyrics(track),
    staleTime: Infinity,
    retry: false,
  });

  const positionMs = position * 1000;
  const activeIndex = data?.synced
    ? data.lines.reduce(
        (acc, line, i) => (line.timeMs != null && line.timeMs <= positionMs ? i : acc),
        -1,
      )
    : -1;

  useEffect(() => {
    if (activeIndex < 0 || !containerRef.current) return;
    const el = containerRef.current.querySelector<HTMLElement>(`[data-line="${activeIndex}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeIndex]);

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center', stage ? 'h-full' : 'h-40')}>
        <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-aura-1" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className={cn(stage && 'flex h-full items-center justify-center')}>
        <p className="py-10 text-center text-sm text-muted-foreground">
          {navigator.onLine ? t('player.lyricsNotFound') : t('player.lyricsOffline')}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'overflow-y-auto scrollbar-none',
        stage ? 'h-full px-2 py-[35vh] text-center md:px-10' : 'max-h-[55vh] px-1 py-2',
      )}
    >
      {data.lines.map((line, i) => {
        const isActive = data.synced && i === activeIndex;
        const clickable = data.synced && line.timeMs != null;
        return (
          <p
            key={i}
            data-line={i}
            onClick={clickable ? () => player.seek(line.timeMs! / 1000) : undefined}
            className={cn(
              'transition-all duration-300',
              stage
                ? 'py-2 text-xl font-bold leading-snug md:text-2xl'
                : 'py-1.5 text-[15px] leading-snug',
              clickable && 'cursor-pointer',
              data.synced
                ? isActive
                  ? 'aura-text scale-[1.03]'
                  : cn('text-muted-foreground', stage && 'opacity-50 hover:opacity-80')
                : 'text-foreground',
            )}
          >
            {line.text || '♪'}
          </p>
        );
      })}
      <p
        className={cn(
          'pt-4 text-[10px] uppercase tracking-widest text-muted-foreground/60',
          stage && 'pb-6',
        )}
      >
        {data.source}
      </p>
    </div>
  );
}
