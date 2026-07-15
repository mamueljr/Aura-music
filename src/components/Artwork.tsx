import { useEffect, useState } from 'react';

import { generatedCoverUri, getCoverUrl } from '@/services/artwork/artwork';
import { cn } from '@/lib/utils';

export function useCoverUrl(coverId: string | undefined, fallbackName: string) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    if (coverId) {
      void getCoverUrl(coverId).then((u) => {
        if (!cancelled) setUrl(u);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [coverId]);

  return url ?? generatedCoverUri(fallbackName);
}

export function Artwork({
  coverId,
  name,
  className,
  rounded = 'rounded-lg',
}: {
  coverId?: string;
  name: string;
  className?: string;
  rounded?: string;
}) {
  const url = useCoverUrl(coverId, name);

  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      className={cn('aspect-square select-none bg-muted object-cover', rounded, className)}
    />
  );
}
