import { Github, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { PageHeader } from '@/components/PageHeader';
import { APP_REPO_URL, APP_VERSION } from '@/core/constants';

const TECH = [
  'React',
  'TypeScript',
  'Vite',
  'TailwindCSS',
  'Zustand',
  'TanStack Query',
  'Framer Motion',
  'Dexie (IndexedDB)',
  'Web Audio API',
  'Media Session API',
  'Workbox / PWA',
];

export default function AboutPage() {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={t('about.title')} />

      <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8 md:px-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <img
            src={`${import.meta.env.BASE_URL}favicon.svg`}
            alt=""
            className="size-20 rounded-3xl shadow-xl shadow-aura-1/25"
          />
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">
              Aura <span className="aura-text">Music</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('about.version', { version: APP_VERSION })}
            </p>
          </div>
          <p className="max-w-md text-sm text-muted-foreground">{t('about.body')}</p>
          <a
            href={APP_REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
          >
            <Github className="size-4" /> {t('about.sourceCode')}
          </a>
        </div>

        <section className="rounded-2xl border bg-card/60 p-5">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            <ShieldCheck className="size-4" /> {t('about.privacy')}
          </h3>
          <p className="text-sm text-muted-foreground">{t('about.privacyBody')}</p>
        </section>

        <section className="rounded-2xl border bg-card/60 p-5">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            {t('about.tech')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {TECH.map((item) => (
              <span
                key={item}
                className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
              >
                {item}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
