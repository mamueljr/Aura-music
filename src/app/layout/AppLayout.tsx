import { Outlet } from 'react-router-dom';

import { BottomNav } from '@/app/layout/BottomNav';
import { Sidebar } from '@/app/layout/Sidebar';
import { AddToPlaylistDialog } from '@/features/playlists/components/AddToPlaylistDialog';
import { MiniPlayer } from '@/features/player/components/MiniPlayer';
import { NowPlayingOverlay } from '@/features/player/components/NowPlayingOverlay';
import { QueueSheet } from '@/features/player/components/QueueSheet';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useMediaSession } from '@/hooks/useMediaSession';
import { usePlaybackPersistence } from '@/hooks/usePlaybackPersistence';

export function AppLayout() {
  useKeyboardShortcuts();
  useMediaSession();
  usePlaybackPersistence();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="relative min-h-0 flex-1 overflow-y-auto" id="main-content">
          <Outlet />
          {/* Spacer so content never hides behind the mini player */}
          <div className="h-4" />
        </main>
      </div>
      <MiniPlayer />
      <BottomNav />
      <NowPlayingOverlay />
      <QueueSheet />
      <AddToPlaylistDialog />
    </div>
  );
}
