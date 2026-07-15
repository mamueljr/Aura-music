import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { EQ_PRESETS } from '@/core/constants';

export type ThemeSetting = 'system' | 'light' | 'dark';
export type LanguageSetting = 'system' | 'en' | 'es';
export type VisualizerMode = 'off' | 'bars' | 'circular';

interface SettingsState {
  theme: ThemeSetting;
  language: LanguageSetting;

  volume: number;
  muted: boolean;
  playbackRate: number;
  crossfadeSeconds: number;
  normalization: boolean;

  eqEnabled: boolean;
  eqPreset: string;
  eqGains: number[];

  visualizer: VisualizerMode;

  setTheme: (theme: ThemeSetting) => void;
  setLanguage: (language: LanguageSetting) => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  setCrossfadeSeconds: (seconds: number) => void;
  setNormalization: (enabled: boolean) => void;
  setEqEnabled: (enabled: boolean) => void;
  setEqPreset: (preset: string) => void;
  setEqGain: (band: number, gain: number) => void;
  setVisualizer: (mode: VisualizerMode) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      language: 'system',

      volume: 1,
      muted: false,
      playbackRate: 1,
      crossfadeSeconds: 0,
      normalization: false,

      eqEnabled: false,
      eqPreset: 'flat',
      eqGains: [...EQ_PRESETS.flat],

      visualizer: 'bars',

      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setVolume: (volume) => set({ volume, muted: false }),
      setMuted: (muted) => set({ muted }),
      setPlaybackRate: (playbackRate) => set({ playbackRate }),
      setCrossfadeSeconds: (crossfadeSeconds) => set({ crossfadeSeconds }),
      setNormalization: (normalization) => set({ normalization }),
      setEqEnabled: (eqEnabled) => set({ eqEnabled }),
      setEqPreset: (preset) =>
        set((state) => ({
          eqPreset: preset,
          eqGains: preset in EQ_PRESETS ? [...EQ_PRESETS[preset]] : state.eqGains,
        })),
      setEqGain: (band, gain) =>
        set((state) => {
          const eqGains = [...state.eqGains];
          eqGains[band] = gain;
          return { eqGains, eqPreset: 'custom' };
        }),
      setVisualizer: (visualizer) => set({ visualizer }),
    }),
    { name: 'aura.settings' },
  ),
);
