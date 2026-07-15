import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Loader2, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useUiStore } from '@/stores/uiStore';

export function ScanProgressBanner() {
  const { t } = useTranslation();
  const scan = useUiStore((s) => s.scan);

  const visible = scan.phase !== 'idle';
  const percent =
    scan.phase === 'reading' && scan.discovered > 0
      ? Math.round((scan.processed / scan.discovered) * 100)
      : null;

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
          role="status"
          aria-live="polite"
        >
          <div className="mx-4 mt-3 rounded-xl border bg-card/70 px-4 py-3 md:mx-8">
            <div className="flex items-center gap-3">
              {scan.phase === 'done' ? (
                <CheckCircle2 className="size-4 shrink-0 text-aura-2" />
              ) : scan.phase === 'error' ? (
                <TriangleAlert className="size-4 shrink-0 text-destructive" />
              ) : (
                <Loader2 className="size-4 shrink-0 animate-spin text-aura-1" />
              )}
              <p className="min-w-0 flex-1 truncate text-sm">
                {scan.phase === 'discovering' && t('library.discoveringFiles')}
                {scan.phase === 'reading' &&
                  t('library.readingMetadata', {
                    processed: scan.processed,
                    discovered: scan.discovered,
                  })}
                {scan.phase === 'saving' && t('library.savingLibrary')}
                {scan.phase === 'done' &&
                  t('library.scanDone', {
                    added: scan.added,
                    updated: scan.updated,
                    removed: scan.removed,
                  })}
                {scan.phase === 'error' && t('library.scanError', { error: scan.error })}
              </p>
              {percent != null ? (
                <span className="text-xs tabular-nums text-muted-foreground">{percent}%</span>
              ) : null}
            </div>
            {percent != null ? (
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full aura-gradient transition-[width] duration-300"
                  style={{ width: `${percent}%` }}
                />
              </div>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
