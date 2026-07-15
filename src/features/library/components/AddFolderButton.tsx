import { FolderPlus } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { supportsFsAccess } from '@/infrastructure/fs/fileSystem';
import { addFolderFromFileList, addFolderWithPicker } from '@/services/library/scanner';

/**
 * "Add folder" entry point. Uses the File System Access API when available
 * (persistent library) and falls back to `<input webkitdirectory>` elsewhere.
 */
export function AddFolderButton({
  variant = 'default',
  size = 'default',
}: {
  variant?: 'default' | 'secondary' | 'outline';
  size?: 'default' | 'sm' | 'lg';
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onClick = async () => {
    if (busy) return;
    if (supportsFsAccess()) {
      setBusy(true);
      try {
        await addFolderWithPicker();
      } catch (error) {
        // AbortError = user cancelled the picker; anything else surfaces in scan state.
        if ((error as DOMException)?.name !== 'AbortError') console.error(error);
      } finally {
        setBusy(false);
      }
    } else {
      inputRef.current?.click();
    }
  };

  return (
    <>
      <Button variant={variant} size={size} onClick={() => void onClick()} disabled={busy}>
        <FolderPlus />
        {t('library.addFolder')}
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
            void addFolderFromFileList(e.target.files).finally(() => {
              setBusy(false);
              e.target.value = '';
            });
          }
        }}
      />
    </>
  );
}
