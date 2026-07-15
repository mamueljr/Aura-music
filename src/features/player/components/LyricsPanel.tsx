import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import type { Track } from '@/core/types';
import { cn } from '@/lib/utils';
import { getLyrics } from '@/services/lyrics';
import { usePlayerStore } from '@/stores/playerStore';

export function LyricsPanel({ track }: { track: Track }) {
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
      <div className="flex h-40 items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-aura-1" />
      </div>
    );
  }

  if (!data) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        {navigator.onLine ? t('player.lyricsNotFound') : t('player.lyricsOffline')}
      </p>
    );
  }

  return (
    <div ref={containerRef} className="max-h-[55vh] overflow-y-auto px-1 py-2">
      {data.lines.map((line, i) => (
        <p
          key={i}
          data-line={i}
          className={cn(
            'py-1.5 text-[15px] leading-snug transition-colors',
            data.synced
              ? i === activeIndex
                ? 'font-semibold aura-text'
                : 'text-muted-foreground'
              : 'text-foreground',
          )}
        >
          {line.text || '♪'}
        </p>
      ))}
      <p className="pt-4 text-[10px] uppercase tracking-widest text-muted-foreground/60">
        {data.source}
      </p>
    </div>
  );
}
