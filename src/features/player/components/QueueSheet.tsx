import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLiveQuery } from 'dexie-react-hooks';
import { AnimatePresence, motion } from 'framer-motion';
import { GripVertical, ListMusic, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Artwork } from '@/components/Artwork';
import { Button } from '@/components/ui/button';
import type { Track } from '@/core/types';
import { db } from '@/infrastructure/db/db';
import { cn } from '@/lib/utils';
import { player } from '@/services/audio/AudioEngine';
import { usePlayerStore } from '@/stores/playerStore';
import { useUiStore } from '@/stores/uiStore';

export function QueueSheet() {
  const { t } = useTranslation();
  const open = useUiStore((s) => s.queueOpen);
  const setOpen = useUiStore((s) => s.setQueueOpen);
  const queue = usePlayerStore((s) => s.queue);
  const index = usePlayerStore((s) => s.index);

  const tracks = useLiveQuery(async () => {
    const rows = await db.tracks.bulkGet(queue);
    return rows.map((tr, i) => (tr ? { ...tr, queueKey: `${i}:${tr.id}` } : null));
  }, [queue]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const items = tracks ?? [];
    const from = items.findIndex((tr) => tr?.queueKey === active.id);
    const to = items.findIndex((tr) => tr?.queueKey === over.id);
    if (from >= 0 && to >= 0) player.moveInQueue(from, to);
  };

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 md:bg-transparent"
            onClick={() => setOpen(false)}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="glass fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-sm flex-col border-l pt-[env(safe-area-inset-top)] shadow-2xl"
            role="dialog"
            aria-label={t('player.queue')}
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-base font-semibold">{t('player.queue')}</h2>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t('common.close')}
                onClick={() => setOpen(false)}
              >
                <X />
              </Button>
            </div>

            {tracks && tracks.length > 0 ? (
              <div className="min-h-0 flex-1 overflow-y-auto p-2">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                  onDragEnd={onDragEnd}
                >
                  <SortableContext
                    items={tracks.map((tr, i) => tr?.queueKey ?? `missing-${i}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    {tracks.map((track, i) =>
                      track ? (
                        <QueueRow
                          key={track.queueKey}
                          track={track}
                          index={i}
                          isCurrent={i === index}
                        />
                      ) : null,
                    )}
                  </SortableContext>
                </DndContext>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
                <ListMusic className="size-8" />
                <p className="text-sm">{t('player.queueEmpty')}</p>
              </div>
            )}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function QueueRow({
  track,
  index,
  isCurrent,
}: {
  track: Track & { queueKey: string };
  index: number;
  isCurrent: boolean;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: track.queueKey,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-accent/70',
        isCurrent && 'bg-accent',
        isDragging && 'z-10 opacity-80 shadow-lg',
      )}
    >
      <button
        type="button"
        aria-label="Reorder"
        className="cursor-grab touch-none p-1 text-muted-foreground/60 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        onClick={() => void player.playQueueIndex(index)}
      >
        <Artwork coverId={track.coverId} name={track.album || track.title} className="size-9" />
        <span className="min-w-0">
          <span className={cn('block truncate text-sm font-medium', isCurrent && 'aura-text')}>
            {track.title}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {track.artist || t('common.unknownArtist')}
          </span>
        </span>
      </button>

      {!isCurrent ? (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('player.removeFromQueue')}
          className="opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
          onClick={() => player.removeFromQueue(index)}
        >
          <X />
        </Button>
      ) : null}
    </div>
  );
}
