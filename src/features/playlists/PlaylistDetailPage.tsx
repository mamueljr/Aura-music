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
import { Copy, Download, GripVertical, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { Artwork } from '@/components/Artwork';
import { EmptyState } from '@/components/EmptyState';
import { TrackMenu } from '@/components/TrackList';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import type { Track } from '@/core/types';
import { usePlaylist, usePlaylistTracks } from '@/hooks/useLibrary';
import { cn, formatDuration, formatTotalDuration } from '@/lib/utils';
import { player } from '@/services/audio/AudioEngine';
import {
  deletePlaylist,
  duplicatePlaylist,
  exportPlaylistJSON,
  exportPlaylistM3U,
  moveTrack,
  removeTrackAt,
  renamePlaylist,
} from '@/services/playlists/playlists';

import { DetailHero } from '../library/components/DetailHero';

export default function PlaylistDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const playlist = usePlaylist(id);
  const tracks = usePlaylistTracks(id);

  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!playlist || !tracks) return null;

  const ids = tracks.map((tr) => tr.id);
  const totalDuration = tracks.reduce((acc, tr) => acc + tr.duration, 0);

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !id) return;
    const from = Number(String(active.id).split(':')[0]);
    const to = Number(String(over.id).split(':')[0]);
    if (Number.isFinite(from) && Number.isFinite(to)) void moveTrack(id, from, to);
  };

  return (
    <div className="flex h-full flex-col">
      <DetailHero
        kind={t('playlists.title')}
        title={playlist.name}
        subtitle={playlist.description}
        meta={`${t('common.songs', { count: tracks.length })} · ${formatTotalDuration(
          totalDuration,
          t('common.hours'),
          t('common.minutes'),
        )}`}
        coverName={playlist.name}
        onPlay={
          tracks.length ? () => void player.playTracks(ids, 0, { shuffle: false }) : undefined
        }
        onShuffle={
          tracks.length
            ? () =>
                void player.playTracks(ids, Math.floor(Math.random() * ids.length), {
                  shuffle: true,
                })
            : undefined
        }
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="More">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onSelect={() => {
                  setName(playlist.name);
                  setDescription(playlist.description ?? '');
                  setRenameOpen(true);
                }}
              >
                <Pencil /> {t('common.rename')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  void duplicatePlaylist(playlist.id, t('playlists.copySuffix')).then(
                    (copy) => copy && navigate(`/playlists/${copy.id}`),
                  )
                }
              >
                <Copy /> {t('common.duplicate')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void exportPlaylistM3U(playlist.id)}>
                <Download /> {t('playlists.exportM3U')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void exportPlaylistJSON(playlist.id)}>
                <Download /> {t('playlists.exportJSON')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onSelect={() => setDeleteOpen(true)}>
                <Trash2 /> {t('common.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      {tracks.length === 0 ? (
        <EmptyState
          icon={<Copy />}
          title={t('playlists.emptyPlaylist')}
          action={
            <Button variant="secondary" onClick={() => navigate('/library')}>
              {t('playlists.addSongs')}
            </Button>
          }
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 md:px-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragEnd={onDragEnd}
          >
            <SortableContext
              items={tracks.map((tr, i) => `${i}:${tr.id}`)}
              strategy={verticalListSortingStrategy}
            >
              {tracks.map((track, i) => (
                <PlaylistRow
                  key={`${i}:${track.id}`}
                  sortId={`${i}:${track.id}`}
                  track={track}
                  onPlay={() => void player.playTracks(ids, i)}
                  onRemove={() => id && void removeTrackAt(id, i)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('playlists.renameTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={`${t('common.description')} (${t('common.optional')})`}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              disabled={!name.trim()}
              onClick={() => {
                void renamePlaylist(playlist.id, name, description);
                setRenameOpen(false);
              }}
            >
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('playlists.deleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('playlists.deleteBody', { name: playlist.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                void deletePlaylist(playlist.id).then(() => navigate('/playlists'));
              }}
            >
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlaylistRow({
  sortId,
  track,
  onPlay,
  onRemove,
}: {
  sortId: string;
  track: Track;
  onPlay: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortId,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group flex h-14 items-center gap-2 rounded-xl px-2 transition-colors hover:bg-accent/70',
        isDragging && 'z-10 bg-accent opacity-90 shadow-lg',
      )}
    >
      <button
        type="button"
        aria-label="Reorder"
        className="cursor-grab touch-none p-1 text-muted-foreground/50 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        onClick={onPlay}
      >
        <Artwork coverId={track.coverId} name={track.album || track.title} className="size-10" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{track.title}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {track.artist || t('common.unknownArtist')}
          </span>
        </span>
        <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
          {formatDuration(track.duration)}
        </span>
      </button>

      <TrackMenu
        track={track}
        onRemove={onRemove}
        removeLabel={t('playlists.removeFromPlaylist')}
      />
    </div>
  );
}
