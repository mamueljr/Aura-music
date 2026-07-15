# Roadmap

The MVP (v0.1) ships a complete offline experience. Everything below builds on the extension points already in the codebase — none of it requires re-architecting.

## v0.2 — Polish & depth

- [ ] Synced-lyrics view inside Now Playing (LRCLIB already wired; add full-screen karaoke mode)
- [ ] Online cover art fallback (MusicBrainz / Cover Art Archive) behind `services/artwork`
- [ ] Playlist import (M3U / JSON) — the export formats are already defined
- [ ] Smart playlists (recently added, most played, never played) as saved queries
- [ ] ReplayGain-style per-track loudness scan for true normalization
- [ ] Haptics + gesture polish on mobile (swipe mini-player to change track)

## v0.3 — Cloud sync (opt-in)

The `SyncProvider` interface (`services/sync/types.ts`) is the contract. Planned first implementation: **Supabase** (auth + Postgres + RLS), deployable free-tier.

- [ ] Login (OAuth) — sync playlists, favorites, settings, play history
- [ ] Conflict strategy: last-write-wins per entity + tombstones
- [ ] Share a playlist as a public read-only link
- [ ] Alternative provider: Express + SQLite on a personal VPS (same interface)

## v0.4 — Beyond music

- [ ] Podcasts (RSS ingestion, episode progress tracking)
- [ ] Audiobooks (chapter navigation, resume points, speed memory per book)
- [ ] Personal streaming: point the app at your own server (Subsonic/Navidrome-style API adapter as a second "library source")
- [ ] Cross-device continuity ("continue on desktop") via the sync backend

## Continuous

- Lighthouse ≥ 95 on all categories
- Unit tests for scanner/date-model (Vitest) and E2E smoke (Playwright)
- Bundle budget: main chunk < 200 kB gzip
