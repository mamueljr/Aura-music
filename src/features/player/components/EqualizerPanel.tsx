import { useTranslation } from 'react-i18next';

import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { EQ_BANDS, EQ_PRESETS } from '@/core/constants';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores/settingsStore';

function formatBand(freq: number) {
  return freq >= 1000 ? `${freq / 1000}k` : String(freq);
}

export function EqualizerPanel() {
  const { t } = useTranslation();
  const eqEnabled = useSettingsStore((s) => s.eqEnabled);
  const eqPreset = useSettingsStore((s) => s.eqPreset);
  const eqGains = useSettingsStore((s) => s.eqGains);
  const setEqEnabled = useSettingsStore((s) => s.setEqEnabled);
  const setEqPreset = useSettingsStore((s) => s.setEqPreset);
  const setEqGain = useSettingsStore((s) => s.setEqGain);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <label className="flex items-center gap-2.5 text-sm font-medium">
          <Switch checked={eqEnabled} onCheckedChange={setEqEnabled} aria-label={t('eq.enabled')} />
          {t('eq.enabled')}
        </label>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="sm">
              {t(`eq.presets.${eqPreset}` as const, { defaultValue: eqPreset })}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {Object.keys(EQ_PRESETS).map((preset) => (
              <DropdownMenuItem key={preset} onSelect={() => setEqPreset(preset)}>
                {t(`eq.presets.${preset}` as const)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div
        className={cn(
          'grid grid-cols-10 gap-1.5 transition-opacity',
          !eqEnabled && 'pointer-events-none opacity-40',
        )}
      >
        {EQ_BANDS.map((freq, i) => (
          <div key={freq} className="flex flex-col items-center gap-2">
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {eqGains[i] > 0 ? `+${eqGains[i]}` : eqGains[i]}
            </span>
            <div className="h-32">
              <Slider
                orientation="vertical"
                min={-12}
                max={12}
                step={1}
                value={[eqGains[i] ?? 0]}
                onValueChange={([v]) => setEqGain(i, v)}
                aria-label={`${formatBand(freq)} Hz`}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">{formatBand(freq)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
