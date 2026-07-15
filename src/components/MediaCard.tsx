import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Artwork } from '@/components/Artwork';
import { cn } from '@/lib/utils';

/**
 * Grid card for albums / artists / genres / playlists.
 */
export function MediaCard({
  to,
  coverId,
  name,
  title,
  subtitle,
  round = false,
  onPlay,
}: {
  to: string;
  coverId?: string;
  name: string;
  title: string;
  subtitle?: string;
  round?: boolean;
  onPlay?: () => void;
}) {
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.18 }}>
      <Link
        to={to}
        className="group block rounded-2xl p-2.5 transition-colors hover:bg-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <div className="relative">
          <Artwork
            coverId={coverId}
            name={name}
            rounded={round ? 'rounded-full' : 'rounded-xl'}
            className="w-full shadow-md"
          />
          {onPlay ? (
            <button
              type="button"
              aria-label="Play"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPlay();
              }}
              className={cn(
                'absolute bottom-2 right-2 flex size-10 translate-y-1 items-center justify-center rounded-full aura-gradient text-white opacity-0 shadow-lg transition-all',
                'group-hover:translate-y-0 group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100',
              )}
            >
              <Play className="ml-0.5 size-4 fill-current" />
            </button>
          ) : null}
        </div>
        <p className={cn('mt-2 truncate text-sm font-semibold', round && 'text-center')}>{title}</p>
        {subtitle ? (
          <p className={cn('truncate text-xs text-muted-foreground', round && 'text-center')}>
            {subtitle}
          </p>
        ) : null}
      </Link>
    </motion.div>
  );
}

export function MediaGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-1 px-4 pb-6 sm:grid-cols-3 md:grid-cols-4 md:px-8 lg:grid-cols-5 xl:grid-cols-6">
      {children}
    </div>
  );
}
