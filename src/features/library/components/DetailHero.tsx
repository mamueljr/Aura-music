import { ArrowLeft, Play, Shuffle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { Artwork } from '@/components/Artwork';
import { Button } from '@/components/ui/button';

/** Hero header shared by album / artist / genre / playlist detail pages. */
export function DetailHero({
  kind,
  title,
  subtitle,
  meta,
  coverId,
  coverName,
  round = false,
  onPlay,
  onShuffle,
  actions,
}: {
  kind: string;
  title: string;
  subtitle?: string;
  meta?: string;
  coverId?: string;
  coverName: string;
  round?: boolean;
  onPlay?: () => void;
  onShuffle?: () => void;
  actions?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden border-b">
      <div className="pointer-events-none absolute inset-0 aura-gradient opacity-[0.07]" />
      <div className="relative flex items-end gap-4 px-4 pb-4 pt-4 md:gap-6 md:px-8 md:pb-6">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Back"
          onClick={() => navigate(-1)}
          className="absolute left-2 top-2 md:left-4"
        >
          <ArrowLeft />
        </Button>

        <Artwork
          coverId={coverId}
          name={coverName}
          rounded={round ? 'rounded-full' : 'rounded-2xl'}
          className="mt-8 size-28 shrink-0 shadow-xl md:mt-6 md:size-44"
        />

        <div className="min-w-0 flex-1 pb-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {kind}
          </p>
          <h1 className="mt-0.5 truncate text-2xl font-extrabold tracking-tight md:text-4xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
          {meta ? <p className="mt-0.5 text-xs text-muted-foreground">{meta}</p> : null}

          <div className="mt-3 flex items-center gap-2">
            {onPlay ? (
              <Button size="sm" onClick={onPlay}>
                <Play className="fill-current" /> {t('common.playAll')}
              </Button>
            ) : null}
            {onShuffle ? (
              <Button variant="secondary" size="sm" onClick={onShuffle}>
                <Shuffle /> {t('common.shufflePlay')}
              </Button>
            ) : null}
            {actions}
          </div>
        </div>
      </div>
    </div>
  );
}
