import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  Disc3,
  Gauge,
  Heart,
  ListMusic,
  MicVocal,
  Moon,
  SlidersHorizontal,
  Waves,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Artwork } from '@/components/Artwork';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PLAYBACK_RATES, SLEEP_TIMER_OPTIONS_MIN } from '@/core/constants';
import { cn } from '@/lib/utils';
import { player } from '@/services/audio/AudioEngine';
import { toggleFavorite } from '@/services/library/actions';
import { usePlayerStore } from '@/stores/playerStore';
import { useSettingsStore, type VisualizerMode } from '@/stores/settingsStore';
import { useUiStore } from '@/stores/uiStore';

import { EqualizerPanel } from './EqualizerPanel';
import { LyricsPanel } from './LyricsPanel';
import { TransportControls } from './PlayerControls';
import { SeekBar } from './SeekBar';
import { Visualizer } from './Visualizer';

export function NowPlayingOverlay() {
  const { t } = useTranslation();
  const open = useUiStore((s) => s.nowPlayingOpen);
  const setOpen = useUiStore((s) => s.setNowPlayingOpen);
  const setQueueOpen = useUiStore((s) => s.setQueueOpen);
  const track = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const sleepTimerEndsAt = usePlayerStore((s) => s.sleepTimerEndsAt);
  const visualizer = useSettingsStore((s) => s.visualizer);
  const setVisualizer = useSettingsStore((s) => s.setVisualizer);
  const playbackRate = useSettingsStore((s) => s.playbackRate);
  const setPlaybackRate = useSettingsStore((s) => s.setPlaybackRate);

  return (
    <AnimatePresence>
      {open && track ? (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          className="fixed inset-0 z-40 flex flex-col bg-background"
          role="dialog"
          aria-label={t('player.nowPlaying')}
        >
          {/* Ambient aura backdrop */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-1/4 left-1/2 size-[70vmax] -translate-x-1/2 rounded-full bg-aura-1/15 blur-[120px]" />
            <div className="absolute -bottom-1/3 right-0 size-[50vmax] rounded-full bg-aura-2/10 blur-[120px]" />
          </div>

          <div className="relative flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] md:px-8">
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('common.close')}
              onClick={() => setOpen(false)}
            >
              <ChevronDown />
            </Button>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {t('player.nowPlaying')}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('player.queue')}
              onClick={() => setQueueOpen(true)}
            >
              <ListMusic />
            </Button>
          </div>

          {/* Center stage: artwork or visualizer */}
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-6 py-4">
            {visualizer === 'off' ? (
              <motion.div layoutId="now-playing-art" className="w-full max-w-[min(42vh,26rem)]">
                <Artwork
                  coverId={track.coverId}
                  name={track.album || track.title}
                  rounded="rounded-3xl"
                  className="w-full shadow-2xl shadow-aura-1/20"
                />
              </motion.div>
            ) : visualizer === 'bars' ? (
              <div className="flex h-full min-h-0 w-full max-w-2xl flex-col items-center justify-center gap-5">
                <div className="flex min-h-0 flex-1 items-center justify-center">
                  <Artwork
                    coverId={track.coverId}
                    name={track.album || track.title}
                    rounded="rounded-2xl"
                    className="max-h-full w-auto max-w-[min(30vh,16rem)] shadow-xl shadow-aura-1/20"
                  />
                </div>
                <Visualizer mode="bars" className="h-28 w-full shrink-0 md:h-36" />
              </div>
            ) : (
              <div className="relative flex h-full w-full items-center justify-center">
                <Visualizer mode="circular" className="absolute inset-0 h-full w-full" />
                <div className={cn(isPlaying && 'animate-aura-spin')}>
                  <Artwork
                    coverId={track.coverId}
                    name={track.album || track.title}
                    rounded="rounded-full"
                    className="size-[min(26vh,15rem)] shadow-xl shadow-aura-1/30"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Visualizer mode switcher */}
          <div className="relative flex justify-center gap-1.5 pb-2">
            {(
              [
                ['off', Disc3],
                ['bars', Waves],
                ['circular', Gauge],
              ] as [VisualizerMode, typeof Disc3][]
            ).map(([mode, Icon]) => (
              <button
                key={mode}
                type="button"
                aria-label={t(
                  mode === 'off'
                    ? 'player.visualizerOff'
                    : mode === 'bars'
                      ? 'player.visualizerBars'
                      : 'player.visualizerCircular',
                )}
                aria-pressed={visualizer === mode}
                onClick={() => setVisualizer(mode)}
                className={cn(
                  'rounded-full p-2 text-muted-foreground transition-colors hover:text-foreground',
                  visualizer === mode && 'bg-accent text-aura-1',
                )}
              >
                <Icon className="size-4" />
              </button>
            ))}
          </div>

          {/* Track info + controls */}
          <div className="relative mx-auto w-full max-w-2xl px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:px-8">
            <div className="mb-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-xl font-bold md:text-2xl">{track.title}</h2>
                <p className="truncate text-sm text-muted-foreground">
                  {track.artist || t('common.unknownArtist')}
                  {track.album ? ` — ${track.album}` : ''}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={
                  track.favorite ? t('player.removeFromFavorites') : t('player.addToFavorites')
                }
                aria-pressed={!!track.favorite}
                onClick={() => void toggleFavorite(track.id)}
                className={cn(track.favorite && 'text-aura-3')}
              >
                <Heart className={cn(track.favorite && 'fill-current')} />
              </Button>
            </div>

            <SeekBar />

            <div className="mt-2 flex items-center justify-center">
              <TransportControls large />
            </div>

            {/* Secondary controls */}
            <div className="mt-3 flex items-center justify-center gap-1">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label={t('player.equalizer')}>
                    <SlidersHorizontal />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{t('player.equalizer')}</DialogTitle>
                  </DialogHeader>
                  <EqualizerPanel />
                </DialogContent>
              </Dialog>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={t('player.playbackSpeed')}
                    className={cn('tabular-nums', playbackRate !== 1 && 'text-aura-1')}
                  >
                    {playbackRate}×
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                  <DropdownMenuLabel>{t('player.playbackSpeed')}</DropdownMenuLabel>
                  {PLAYBACK_RATES.map((rate) => (
                    <DropdownMenuItem
                      key={rate}
                      onSelect={() => setPlaybackRate(rate)}
                      className={cn('tabular-nums', rate === playbackRate && 'text-aura-1')}
                    >
                      {rate}×
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t('player.sleepTimer')}
                    className={cn(sleepTimerEndsAt != null && 'text-aura-1')}
                  >
                    <Moon />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                  <DropdownMenuLabel>{t('player.sleepTimer')}</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => player.setSleepTimer(null)}>
                    {t('player.sleepTimerOff')}
                  </DropdownMenuItem>
                  {SLEEP_TIMER_OPTIONS_MIN.map((min) => (
                    <DropdownMenuItem key={min} onSelect={() => player.setSleepTimer(min)}>
                      {t('player.sleepTimerMinutes', { count: min })}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem onSelect={() => player.setSleepTimer('end-of-track')}>
                    {t('player.sleepTimerEndOfTrack')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label={t('player.lyrics')}>
                    <MicVocal />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{t('player.lyrics')}</DialogTitle>
                  </DialogHeader>
                  <LyricsPanel track={track} />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
