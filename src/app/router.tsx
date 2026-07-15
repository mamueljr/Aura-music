import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import { AppLayout } from '@/app/layout/AppLayout';

const HomePage = lazy(() => import('@/features/home/HomePage'));
const LibraryPage = lazy(() => import('@/features/library/LibraryPage'));
const ArtistDetailPage = lazy(() => import('@/features/library/ArtistDetailPage'));
const AlbumDetailPage = lazy(() => import('@/features/library/AlbumDetailPage'));
const GenreDetailPage = lazy(() => import('@/features/library/GenreDetailPage'));
const FavoritesPage = lazy(() => import('@/features/favorites/FavoritesPage'));
const PlaylistsPage = lazy(() => import('@/features/playlists/PlaylistsPage'));
const PlaylistDetailPage = lazy(() => import('@/features/playlists/PlaylistDetailPage'));
const SearchPage = lazy(() => import('@/features/search/SearchPage'));
const StatsPage = lazy(() => import('@/features/stats/StatsPage'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));
const AboutPage = lazy(() => import('@/features/about/AboutPage'));

function Page({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-aura-1" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <AppLayout />,
      children: [
        {
          index: true,
          element: (
            <Page>
              <HomePage />
            </Page>
          ),
        },
        {
          path: 'library',
          element: (
            <Page>
              <LibraryPage />
            </Page>
          ),
        },
        {
          path: 'artists/:id',
          element: (
            <Page>
              <ArtistDetailPage />
            </Page>
          ),
        },
        {
          path: 'albums/:id',
          element: (
            <Page>
              <AlbumDetailPage />
            </Page>
          ),
        },
        {
          path: 'genres/:id',
          element: (
            <Page>
              <GenreDetailPage />
            </Page>
          ),
        },
        {
          path: 'favorites',
          element: (
            <Page>
              <FavoritesPage />
            </Page>
          ),
        },
        {
          path: 'playlists',
          element: (
            <Page>
              <PlaylistsPage />
            </Page>
          ),
        },
        {
          path: 'playlists/:id',
          element: (
            <Page>
              <PlaylistDetailPage />
            </Page>
          ),
        },
        {
          path: 'search',
          element: (
            <Page>
              <SearchPage />
            </Page>
          ),
        },
        {
          path: 'stats',
          element: (
            <Page>
              <StatsPage />
            </Page>
          ),
        },
        {
          path: 'settings',
          element: (
            <Page>
              <SettingsPage />
            </Page>
          ),
        },
        {
          path: 'about',
          element: (
            <Page>
              <AboutPage />
            </Page>
          ),
        },
        {
          path: '*',
          element: (
            <Page>
              <HomePage />
            </Page>
          ),
        },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL },
);
