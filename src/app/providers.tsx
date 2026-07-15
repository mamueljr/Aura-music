import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';

import { TooltipProvider } from '@/components/ui/tooltip';
import { setAppLanguage } from '@/i18n';
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

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={400}>
        <ThemeSync />
        <LanguageSync />
        {children}
      </TooltipProvider>
    </QueryClientProvider>
  );
}
