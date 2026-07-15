import { useState } from 'react';

import { Slider } from '@/components/ui/slider';
import { formatDuration } from '@/lib/utils';
import { player } from '@/services/audio/AudioEngine';
import { usePlayerStore } from '@/stores/playerStore';

export function SeekBar({ withTimes = true }: { withTimes?: boolean }) {
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);
  const [dragValue, setDragValue] = useState<number | null>(null);

  const value = dragValue ?? position;

  return (
    <div className="flex w-full items-center gap-2.5">
      {withTimes ? (
        <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
          {formatDuration(value)}
        </span>
      ) : null}
      <Slider
        aria-label="Seek"
        min={0}
        max={Math.max(1, duration)}
        step={1}
        value={[Math.min(value, duration || value)]}
        onValueChange={([v]) => setDragValue(v)}
        onValueCommit={([v]) => {
          player.seek(v);
          setDragValue(null);
        }}
      />
      {withTimes ? (
        <span className="w-10 shrink-0 text-[11px] tabular-nums text-muted-foreground">
          {formatDuration(duration)}
        </span>
      ) : null}
    </div>
  );
}
