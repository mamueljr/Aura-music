import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';

import { TooltipProvider } from '@/components/ui/tooltip';
import { setAppLanguage } from '@/i18n';
import { fetchMissingCovers } from '@/services/artwork/onlineCovers';
import { useSettingsStore } from '@/stores/settingsStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

/** Applies the `.dark` class following the theme setting + OS preference. */
function ThemeSync() {
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', dark);
      const meta = document.querySelector('meta[name="theme-color"]');
      meta?.setAttribute('content', dark ? '#0b0a12' : '#f6f5fa');
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  return null;
}

/** Keeps i18next in sync with the language setting. */
function LanguageSync() {
  const language = useSettingsStore((s) => s.language);

  useEffect(() => {
    setAppLanguage(language);
  }, [language]);

  return null;
}

/** Ask the browser to treat our storage as persistent (bucket survives
 *  storage pressure; granted silently for installed PWAs). */
function StoragePersistence() {
  useEffect(() => {
    void navigator.storage?.persist?.();
  }, []);
  return null;
}

/** Background pass for albums still missing artwork (throttled, cached). */
function OnlineCoversSync() {
  const onlineCovers = useSettingsStore((s) => s.onlineCovers);

  useEffect(() => {
    if (!onlineCovers) return;
    const timer = window.setTimeout(() => void fetchMissingCovers(), 4000);
    return () => window.clearTimeout(timer);
  }, [onlineCovers]);

  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={400}>
        <ThemeSync />
        <LanguageSync />
        <StoragePersistence />
        <OnlineCoversSync />
        {children}
      </TooltipProvider>
    </QueryClientProvider>
  );
}
