import { Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { player } from '@/services/audio/AudioEngine';
import { usePlayerStore } from '@/stores/playerStore';

export function PlayPauseButton({
  size = 'icon',
  className = '',
}: {
  size?: 'icon' | 'icon-sm' | 'icon-lg';
  className?: string;
}) {
  const { t } = useTranslation();
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  return (
    <Button
      size={size}
      aria-label={isPlaying ? t('player.pause') : t('player.play')}
      onClick={(e) => {
        e.stopPropagation();
        void player.togglePlay();
      }}
      className={className}
    >
      {isPlaying ? <Pause className="fill-current" /> : <Play className="ml-0.5 fill-current" />}
    </Button>
  );
}

export function TransportControls({ large = false }: { large?: boolean }) {
  const { t } = useTranslation();
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);

  return (
    <div className={cn('flex items-center', large ? 'gap-3 md:gap-5' : 'gap-1')}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size={large ? 'icon' : 'icon-sm'}
            aria-label={t('player.shuffle')}
            aria-pressed={shuffle}
            onClick={(e) => {
              e.stopPropagation();
              player.toggleShuffle();
            }}
            className={cn(shuffle && 'text-aura-1')}
          >
            <Shuffle />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('player.shuffle')}</TooltipContent>
      </Tooltip>

      <Button
        variant="ghost"
        size={large ? 'icon' : 'icon-sm'}
        aria-label={t('player.previous')}
        onClick={(e) => {
          e.stopPropagation();
          void player.previous();
        }}
      >
        <SkipBack className="fill-current" />
      </Button>

      <PlayPauseButton size={large ? 'icon-lg' : 'icon'} />

      <Button
        variant="ghost"
        size={large ? 'icon' : 'icon-sm'}
        aria-label={t('player.next')}
        onClick={(e) => {
          e.stopPropagation();
          void player.next();
        }}
      >
        <SkipForward className="fill-current" />
      </Button>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size={large ? 'icon' : 'icon-sm'}
            aria-label={repeat === 'one' ? t('player.repeatOne') : t('player.repeat')}
            aria-pressed={repeat !== 'off'}
            onClick={(e) => {
              e.stopPropagation();
              player.cycleRepeat();
            }}
            className={cn(repeat !== 'off' && 'text-aura-1')}
          >
            {repeat === 'one' ? <Repeat1 /> : <Repeat />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('player.repeat')}</TooltipContent>
      </Tooltip>
    </div>
  );
}
