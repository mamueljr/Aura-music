import { AnimatePresence, motion } from 'framer-motion';
import { Heart, ListMusic } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Artwork } from '@/components/Artwork';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toggleFavorite } from '@/services/library/actions';
import { usePlayerStore } from '@/stores/playerStore';
import { useUiStore } from '@/stores/uiStore';

import { PlayPauseButton, TransportControls } from './PlayerControls';
import { SeekBar } from './SeekBar';
import { VolumeControl } from './VolumeControl';

export function MiniPlayer() {
  const { t } = useTranslation();
  const track = usePlayerStore((s) => s.currentTrack);
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);
  const setNowPlayingOpen = useUiStore((s) => s.setNowPlayingOpen);
  const setQueueOpen = useUiStore((s) => s.setQueueOpen);
  const queueOpen = useUiStore((s) => s.queueOpen);

  return (
    <AnimatePresence>
      {track ? (
        <motion.div
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 90, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="glass relative z-30 border-t"
        >
          {/* Thin progress line on mobile (full seek bar lives on desktop row) */}
          <div className="absolute inset-x-0 top-0 h-0.5 bg-muted-foreground/15 md:hidden">
            <div
              className="h-full aura-gradient transition-[width] duration-300"
              style={{ width: duration ? `${(position / duration) * 100}%` : '0%' }}
            />
          </div>

          <div
            role="button"
            tabIndex={0}
            aria-label={t('player.nowPlaying')}
            onClick={() => setNowPlayingOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setNowPlayingOpen(true);
            }}
            className="flex cursor-pointer items-center gap-3 px-3 py-2 md:px-4 md:py-2.5"
          >
            <motion.div layoutId="now-playing-art" className="shrink-0">
              <Artwork
                coverId={track.coverId}
                name={track.album || track.title}
                className="size-11 md:size-12 shadow-md"
              />
            </motion.div>

            <div className="min-w-0 flex-1 md:w-56 md:flex-none">
              <p className="truncate text-sm font-semibold">{track.title}</p>
              <p className="truncate text-xs text-muted-foreground">
                {track.artist || t('common.unknownArtist')}
              </p>
            </div>

            <button
              type="button"
              aria-label={
                track.favorite ? t('player.removeFromFavorites') : t('player.addToFavorites')
              }
              aria-pressed={!!track.favorite}
              onClick={(e) => {
                e.stopPropagation();
                void toggleFavorite(track.id);
              }}
              className={cn(
                'hidden rounded-full p-2 text-muted-foreground transition-colors hover:text-foreground sm:block',
                track.favorite && 'text-aura-3',
              )}
            >
              <Heart className={cn('size-4', track.favorite && 'fill-current')} />
            </button>

            {/* Desktop: full transport + seek in the middle */}
            <div className="hidden min-w-0 flex-1 flex-col items-center gap-1 md:flex">
              <TransportControls />
              <div className="w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
                <SeekBar />
              </div>
            </div>

            <div className="hidden items-center gap-1 md:flex" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t('player.queue')}
                aria-pressed={queueOpen}
                onClick={() => setQueueOpen(!queueOpen)}
                className={cn(queueOpen && 'text-aura-1')}
              >
                <ListMusic />
              </Button>
              <VolumeControl />
            </div>

            {/* Mobile: compact controls */}
            <div className="flex items-center gap-1 md:hidden" onClick={(e) => e.stopPropagation()}>
              <PlayPauseButton size="icon" />
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
