import { useLiveQuery } from 'dexie-react-hooks';
import {
  BadgeCheck,
  FolderOpen,
  HardDriveDownload,
  Monitor,
  Moon,
  RefreshCw,
  Sun,
  Trash2,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { CREATOR_NAME, CREATOR_URL, MAX_CROSSFADE_SECONDS } from '@/core/constants';
import { EqualizerPanel } from '@/features/player/components/EqualizerPanel';
import { useFolders } from '@/hooks/useLibrary';
import { db } from '@/infrastructure/db/db';
import { supportsFsAccess, verifyPermission } from '@/infrastructure/fs/fileSystem';
import { cn } from '@/lib/utils';
import { fetchMissingCovers } from '@/services/artwork/onlineCovers';
import { player } from '@/services/audio/AudioEngine';
import { importFolderToApp } from '@/services/library/importer';
import { reimportFallbackFolder, removeFolder, scanFolder } from '@/services/library/scanner';
import { usePlayerStore } from '@/stores/playerStore';
import { useSettingsStore, type LanguageSetting, type ThemeSetting } from '@/stores/settingsStore';

import { AddFolderButton } from '../library/components/AddFolderButton';
import { ScanProgressBanner } from '../library/components/ScanProgressBanner';

export default function SettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={t('settings.title')} />
      <ScanProgressBanner />

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-5 md:px-8">
        <AppearanceSection />
        <PlaybackSection />
        <EqualizerSection />
        <LibrarySection />
        <DataSection />
        <ShortcutsSection />
        <div className="mx-auto w-full max-w-3xl pb-4 text-center">
          <a
            href={CREATOR_URL}
            target="_blank"
            rel="noreferrer"
            className="block text-xs text-muted-foreground/70 transition-colors hover:text-foreground"
          >
            {t('about.createdBy')} <span className="font-semibold aura-text">{CREATOR_NAME}</span>
          </a>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground/50">v{__APP_VERSION__}</p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto w-full max-w-3xl rounded-2xl border bg-card/60 p-4 md:p-5">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex rounded-full bg-muted p-1" role="radiogroup">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-all',
            value === option.value && 'bg-card text-foreground shadow-sm',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function AppearanceSection() {
  const { t } = useTranslation();
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);

  return (
    <Section title={t('settings.appearance')}>
      <Row label={t('settings.theme')}>
        <SegmentedControl<ThemeSetting>
          value={theme}
          onChange={setTheme}
          options={[
            {
              value: 'system',
              label: (
                <>
                  <Monitor className="size-3.5" /> {t('settings.themeSystem')}
                </>
              ),
            },
            {
              value: 'light',
              label: (
                <>
                  <Sun className="size-3.5" /> {t('settings.themeLight')}
                </>
              ),
            },
            {
              value: 'dark',
              label: (
                <>
                  <Moon className="size-3.5" /> {t('settings.themeDark')}
                </>
              ),
            },
          ]}
        />
      </Row>
      <Row label={t('settings.language')}>
        <SegmentedControl<LanguageSetting>
          value={language}
          onChange={setLanguage}
          options={[
            { value: 'system', label: t('settings.languageSystem') },
            { value: 'es', label: 'Español' },
            { value: 'en', label: 'English' },
          ]}
        />
      </Row>
    </Section>
  );
}

function PlaybackSection() {
  const { t } = useTranslation();
  const crossfadeSeconds = useSettingsStore((s) => s.crossfadeSeconds);
  const setCrossfadeSeconds = useSettingsStore((s) => s.setCrossfadeSeconds);
  const normalization = useSettingsStore((s) => s.normalization);
  const setNormalization = useSettingsStore((s) => s.setNormalization);

  return (
    <Section title={t('settings.playback')}>
      <Row
        label={t('settings.crossfade')}
        hint={
          crossfadeSeconds === 0
            ? t('settings.crossfadeOff')
            : t('settings.crossfadeSeconds', { count: crossfadeSeconds })
        }
      >
        <div className="w-48">
          <Slider
            min={0}
            max={MAX_CROSSFADE_SECONDS}
            step={1}
            value={[crossfadeSeconds]}
            onValueChange={([v]) => setCrossfadeSeconds(v)}
            aria-label={t('settings.crossfade')}
          />
        </div>
      </Row>
      <Row label={t('settings.normalization')} hint={t('settings.normalizationHint')}>
        <Switch
          checked={normalization}
          onCheckedChange={setNormalization}
          aria-label={t('settings.normalization')}
        />
      </Row>
    </Section>
  );
}

function EqualizerSection() {
  const { t } = useTranslation();
  return (
    <Section title={t('player.equalizer')}>
      <EqualizerPanel />
    </Section>
  );
}

function LibrarySection() {
  const { t } = useTranslation();
  const folders = useFolders();
  const [pendingRemove, setPendingRemove] = useState<number | null>(null);
  const [importing, setImporting] = useState<Record<number, { done: number; total: number }>>({});
  const pendingFolder = (folders ?? []).find((f) => f.id === pendingRemove);

  const importFolder = async (folderId: number) => {
    const folder = (folders ?? []).find((f) => f.id === folderId);
    if (folder?.mode === 'fs-access' && folder.handle) {
      const granted = await verifyPermission(folder.handle);
      if (!granted) return;
    }
    try {
      await importFolderToApp(folderId, (p) =>
        setImporting((s) => ({ ...s, [folderId]: { done: p.done + p.failed, total: p.total } })),
      );
    } finally {
      setImporting((s) => {
        const next = { ...s };
        delete next[folderId];
        return next;
      });
    }
  };

  return (
    <Section title={t('settings.librarySection')}>
      <Row label={t('settings.folders')}>
        <AddFolderButton variant="secondary" size="sm" />
      </Row>

      {!supportsFsAccess() ? (
        <p className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
          {t('library.fallbackNotice')}
        </p>
      ) : null}

      <OnlineCoversRow />

      <div className="space-y-2">
        {(folders ?? []).map((folder) => (
          <div
            key={folder.id}
            className="flex items-center gap-3 rounded-xl border bg-background/60 px-3 py-2.5"
          >
            <FolderOpen className="size-4 shrink-0 text-aura-1" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{folder.name}</p>
              <p className="text-xs text-muted-foreground">
                {importing[folder.id!]
                  ? t('library.importing', {
                      done: importing[folder.id!].done,
                      total: importing[folder.id!].total,
                    })
                  : t('common.songs', { count: folder.trackCount ?? 0 })}
              </p>
            </div>
            {folder.imported ? (
              <span className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-aura-1">
                <BadgeCheck className="size-3.5" /> {t('library.importedBadge')}
              </span>
            ) : (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t('library.importToApp')}
                title={t('library.importHint')}
                disabled={!!importing[folder.id!]}
                onClick={() => void importFolder(folder.id!)}
              >
                <HardDriveDownload
                  className={cn(importing[folder.id!] && 'animate-pulse text-aura-1')}
                />
              </Button>
            )}
            {folder.mode === 'fs-access' ? (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t('library.rescan')}
                title={t('library.rescan')}
                onClick={() => void scanFolder(folder.id!)}
              >
                <RefreshCw />
              </Button>
            ) : (
              <FallbackReimportButton folderId={folder.id!} />
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('settings.removeFolder')}
              onClick={() => setPendingRemove(folder.id!)}
            >
              <Trash2 className="text-destructive" />
            </Button>
          </div>
        ))}
        {folders && folders.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('settings.noFolders')}</p>
        ) : null}
      </div>

      <Dialog open={pendingRemove != null} onOpenChange={(o) => !o && setPendingRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.removeFolder')}</DialogTitle>
            <DialogDescription>
              {t('settings.removeFolderBody', { name: pendingFolder?.name ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingRemove(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (pendingRemove != null) void removeFolder(pendingRemove);
                setPendingRemove(null);
              }}
            >
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Section>
  );
}

/**
 * Fallback-mode folders (no File System Access API) have no persistent handle,
 * so the only way to pick up new/changed/removed songs is re-selecting the same
 * folder through the OS picker again.
 */
function FallbackReimportButton({ folderId }: { folderId: number }) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('library.reimport')}
        title={t('library.reimportHint')}
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        <RefreshCw className={cn(busy && 'animate-spin')} />
      </Button>
      <input
        ref={inputRef}
        type="file"
        // @ts-expect-error non-standard attribute, needed for the fallback
        webkitdirectory=""
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) {
            setBusy(true);
            void reimportFallbackFolder(folderId, e.target.files).finally(() => {
              setBusy(false);
              e.target.value = '';
            });
          }
        }}
      />
    </>
  );
}

function OnlineCoversRow() {
  const { t } = useTranslation();
  const onlineCovers = useSettingsStore((s) => s.onlineCovers);
  const setOnlineCovers = useSettingsStore((s) => s.setOnlineCovers);

  return (
    <Row label={t('settings.onlineCovers')} hint={t('settings.onlineCoversHint')}>
      <Switch
        checked={onlineCovers}
        onCheckedChange={(checked) => {
          setOnlineCovers(checked);
          if (checked) void fetchMissingCovers();
        }}
        aria-label={t('settings.onlineCovers')}
      />
    </Row>
  );
}

function DataSection() {
  const { t } = useTranslation();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const storage = useLiveQuery(async () => {
    if (!navigator.storage?.estimate) return null;
    const estimate = await navigator.storage.estimate();
    return estimate.usage ?? null;
  }, []);

  const clearAll = async () => {
    player.stop();
    await Promise.all([
      db.tracks.clear(),
      db.covers.clear(),
      db.folders.clear(),
      db.playlists.clear(),
      db.albums.clear(),
      db.artists.clear(),
      db.genres.clear(),
      db.playbackState.clear(),
    ]);
    usePlayerStore.setState({
      queue: [],
      originalQueue: [],
      index: -1,
      currentTrack: null,
      isPlaying: false,
      position: 0,
      duration: 0,
    });
    setConfirmOpen(false);
  };

  return (
    <Section title={t('settings.dataSection')}>
      {storage != null ? (
        <Row label={t('settings.storageUsed')}>
          <span className="text-sm tabular-nums text-muted-foreground">
            {(storage / (1024 * 1024)).toFixed(1)} MB
          </span>
        </Row>
      ) : null}
      <Row label={t('settings.clearLibrary')} hint={t('settings.clearLibraryBody')}>
        <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)}>
          <Trash2 /> {t('settings.clearLibrary')}
        </Button>
      </Row>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.clearLibrary')}</DialogTitle>
            <DialogDescription>{t('settings.clearLibraryBody')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={() => void clearAll()}>
              {t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Section>
  );
}

function ShortcutsSection() {
  const { t } = useTranslation();
  const shortcuts: [string, string][] = [
    ['Space', t('settings.shortcuts.playPause')],
    ['Shift + →', t('settings.shortcuts.nextTrack')],
    ['Shift + ←', t('settings.shortcuts.prevTrack')],
    ['← / →', t('settings.shortcuts.seek')],
    ['↑ / ↓', t('settings.shortcuts.volume')],
    ['M', t('settings.shortcuts.mute')],
    ['S', t('settings.shortcuts.shuffle')],
    ['R', t('settings.shortcuts.repeat')],
    ['/', t('settings.shortcuts.search')],
    ['N', t('settings.shortcuts.nowPlaying')],
    ['Q', t('settings.shortcuts.queuePanel')],
  ];

  return (
    <Section title={t('settings.keyboardShortcuts')}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {shortcuts.map(([keys, label]) => (
          <div key={keys} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <kbd className="rounded-md border bg-muted px-2 py-0.5 font-mono text-xs">{keys}</kbd>
          </div>
        ))}
      </div>
    </Section>
  );
}
