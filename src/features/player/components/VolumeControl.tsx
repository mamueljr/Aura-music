import { Volume1, Volume2, VolumeX } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useSettingsStore } from '@/stores/settingsStore';

export function VolumeControl() {
  const { t } = useTranslation();
  const volume = useSettingsStore((s) => s.volume);
  const muted = useSettingsStore((s) => s.muted);
  const setVolume = useSettingsStore((s) => s.setVolume);
  const setMuted = useSettingsStore((s) => s.setMuted);

  const effective = muted ? 0 : volume;
  const Icon = effective === 0 ? VolumeX : effective < 0.5 ? Volume1 : Volume2;

  return (
    <div className="flex w-36 items-center gap-1.5">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={muted ? t('player.unmute') : t('player.mute')}
        onClick={() => setMuted(!muted)}
      >
        <Icon />
      </Button>
      <Slider
        aria-label={t('player.volume')}
        min={0}
        max={1}
        step={0.02}
        value={[effective]}
        onValueChange={([v]) => setVolume(v)}
      />
    </div>
  );
}
