import { AnimatePresence, motion } from 'framer-motion';
import { FolderLock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { useFolders } from '@/hooks/useLibrary';
import { verifyPermission } from '@/infrastructure/fs/fileSystem';

/**
 * After a restart, Chromium sets stored folder handles back to the "prompt"
 * permission state. Instead of surprising the user with a permission dialog
 * mid-playback, this banner asks once — right when the app opens — and a
 * single tap re-grants access to every library folder. If the user picks
 * Chrome's "Allow on every visit" option, the banner never comes back.
 */
export function PermissionBanner() {
  const { t } = useTranslation();
  const folders = useFolders();
  const [needsPermission, setNeedsPermission] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const pending = [];
      for (const folder of folders ?? []) {
        if (folder.mode !== 'fs-access' || !folder.handle) continue;
        try {
          const state = await folder.handle.queryPermission?.({ mode: 'read' });
          if (state === 'prompt') pending.push(folder);
        } catch {
          /* handle unusable — the scan flow will surface it */
        }
      }
      if (!cancelled) setNeedsPermission(pending.length > 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [folders]);

  const grantAll = async () => {
    setBusy(true);
    try {
      for (const folder of folders ?? []) {
        if (folder.mode === 'fs-access' && folder.handle) {
          await verifyPermission(folder.handle);
        }
      }
      setNeedsPermission(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {needsPermission ? (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="glass flex flex-wrap items-center gap-3 border-b px-4 py-3 md:px-8">
            <FolderLock className="size-5 shrink-0 text-aura-1" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{t('library.permissionTitle')}</p>
              <p className="text-xs text-muted-foreground">{t('library.permissionBody')}</p>
            </div>
            <Button size="sm" disabled={busy} onClick={() => void grantAll()}>
              {t('library.permissionAllow')}
            </Button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
