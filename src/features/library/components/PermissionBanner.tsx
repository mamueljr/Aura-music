import { AnimatePresence, motion } from 'framer-motion';
import { FolderLock, HardDriveDownload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { useFolders } from '@/hooks/useLibrary';
import { verifyPermission } from '@/infrastructure/fs/fileSystem';
import { opfsSupported } from '@/infrastructure/fs/opfs';
import { importFolderToApp } from '@/services/library/importer';

/**
 * After a restart, Chromium sets stored folder handles back to the "prompt"
 * permission state (on Android this happens on every launch — persistent
 * grants are desktop-only). This banner asks once, right when the app opens.
 * The definitive fix is also offered: importing the music into the app's
 * private storage (OPFS), after which no permission is ever needed again.
 */
export function PermissionBanner() {
  const { t } = useTranslation();
  const folders = useFolders();
  const [needsPermission, setNeedsPermission] = useState(false);
  const [canImport, setCanImport] = useState(false);
  const [busy, setBusy] = useState(false);
  const [importState, setImportState] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const pending = [];
      for (const folder of folders ?? []) {
        // Imported folders play from the app's own storage: no permission needed.
        if (folder.imported || folder.mode !== 'fs-access' || !folder.handle) continue;
        try {
          const state = await folder.handle.queryPermission?.({ mode: 'read' });
          if (state === 'prompt') pending.push(folder);
        } catch {
          /* handle unusable — the scan flow will surface it */
        }
      }
      if (!cancelled) {
        setNeedsPermission(pending.length > 0);
        if (pending.length > 0) setCanImport(await opfsSupported());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [folders]);

  const grantAll = async () => {
    setBusy(true);
    try {
      for (const folder of folders ?? []) {
        if (folder.mode === 'fs-access' && folder.handle && !folder.imported) {
          await verifyPermission(folder.handle);
        }
      }
      setNeedsPermission(false);
    } finally {
      setBusy(false);
    }
  };

  const importAll = async () => {
    setBusy(true);
    try {
      const targets = (folders ?? []).filter((f) => !f.imported);
      for (const folder of targets) {
        if (folder.mode === 'fs-access' && folder.handle) {
          const granted = await verifyPermission(folder.handle);
          if (!granted) continue;
        }
        await importFolderToApp(folder.id!, (p) =>
          setImportState({ done: p.done + p.failed, total: p.total }),
        );
      }
      setNeedsPermission(false);
    } finally {
      setBusy(false);
      setImportState(null);
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
            <div className="min-w-0 flex-1 basis-52">
              <p className="text-sm font-semibold">{t('library.permissionTitle')}</p>
              <p className="text-xs text-muted-foreground">
                {importState
                  ? t('library.importing', { done: importState.done, total: importState.total })
                  : t('library.permissionBody')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canImport ? (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  onClick={() => void importAll()}
                  title={t('library.importHint')}
                >
                  <HardDriveDownload /> {t('library.importToApp')}
                </Button>
              ) : null}
              <Button size="sm" disabled={busy} onClick={() => void grantAll()}>
                {t('library.permissionAllow')}
              </Button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
