<div align="center">
  <img src="public/favicon.svg" width="96" height="96" alt="Aura Music logo" />

# Aura Music

**A premium, offline-first music player for your local library — built as a modern PWA.**

_Tu música. Tu dispositivo. Tu aura._

[![Deploy to GitHub Pages](https://github.com/mamueljr/Aura-music/actions/workflows/deploy.yml/badge.svg)](https://github.com/mamueljr/Aura-music/actions/workflows/deploy.yml)
![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-installable-5a0fc8)
![License](https://img.shields.io/badge/license-MIT-green)

[**Live demo**](https://mamueljr.github.io/Aura-music/) · [Architecture](docs/ARCHITECTURE.md) · [Roadmap](docs/ROADMAP.md) · [Project plan](docs/PROJECT_PLAN.md)

</div>

---

Aura Music indexes the music folders on **your** device, stores the library in IndexedDB and plays everything through a Web Audio engine — with zero servers involved. Close the browser, come back tomorrow, and your library, playlists, favorites and even your playback queue are exactly where you left them. It installs from Chrome on Android, Windows and Linux and works fully offline.

## ✨ Features

**Library**

- 📁 Pick local folders with the **File System Access API** (persistent across sessions on Chromium; graceful `webkitdirectory` fallback elsewhere)
- 🏷️ Full **ID3 metadata**: title, artist, album, genre, year, track №, duration and embedded cover art — parsed in a **Web Worker pool**, UI never blocks
- 🔄 **Incremental rescans** detect new, changed and deleted songs
- 🎨 Covers extracted from the files; albums without embedded art get theirs fetched online (iTunes Search → Cover Art Archive, opt-out in Settings) with a generated fallback
- 📦 Optional **"Import into app"** (OPFS): copies your music into the app's private storage so playback never needs folder permissions — at the cost of the extra space
- ⚡ Virtualized lists ready for **20 000+ song** libraries

**Player**

- ▶️ Play / pause / stop / seek / ±10 s, queue with drag-and-drop reordering
- 🔀 Shuffle · 🔁 repeat (off / all / one) · ⏭ gapless-ish **crossfade** (dual-deck Web Audio graph)
- 🎚️ **10-band equalizer** with presets · 📈 volume normalization (dynamics compressor)
- 🚀 Playback speed (0.5×–2×) · 🌙 sleep timer (minutes or end-of-track)
- 📊 Two live visualizers (spectrum bars & circular "aura") fed by an `AnalyserNode`
- 🎤 **Synced lyrics** (LRCLIB): full-screen karaoke view, active line highlight, tap a line to seek
- 🔒 **Media Session API**: lock-screen / headset / media-key controls
- 💾 Queue and position survive restarts

**App**

- 🖥️ Screens: Home, Library (Songs / Artists / Albums / Genres), details, Favorites, Playlists, Search, Stats, Now Playing, Settings, About
- 📈 **Listening stats**: total plays and time, top songs / artists / albums / genres
- 🔍 Instant search across songs, artists, albums and genres
- 📋 Playlists: create, rename, reorder (drag & drop), duplicate, export **M3U / JSON**
- 🌗 Light & dark themes, subtle glassmorphism, Framer Motion transitions
- 🌍 Bilingual UI (English / Español) switchable at runtime
- ⌨️ Full keyboard shortcuts · ARIA labels throughout
- 📲 Installable PWA, 100 % offline, adaptive icons, standalone display

## 🧱 Tech stack

| Layer     | Choice                                                       |
| --------- | ------------------------------------------------------------ |
| UI        | React 18 · TypeScript (strict) · TailwindCSS v4 · shadcn-style components (Radix) · Framer Motion |
| State     | Zustand (player / settings / UI) · Dexie `liveQuery` (library data) · TanStack Query (external APIs) |
| Data      | IndexedDB via Dexie (tracks, covers, playlists, folders, playback state) |
| Audio     | Web Audio API (dual-deck graph → EQ → compressor → analyser) · Media Session API |
| Metadata  | `music-metadata` running in a Web Worker pool                 |
| PWA       | vite-plugin-pwa (Workbox precache + SPA fallback)             |
| Tooling   | Vite 6 · ESLint (flat) · Prettier · GitHub Actions → GitHub Pages |

## 🚀 Getting started

```bash
git clone https://github.com/mamueljr/Aura-music.git
cd Aura-music
npm install
npm run dev        # http://localhost:5173/Aura-music/
```

| Script              | What it does                                |
| ------------------- | ------------------------------------------- |
| `npm run dev`       | Dev server with HMR                         |
| `npm run build`     | Typecheck + production build + service worker |
| `npm run preview`   | Serve the production build locally          |
| `npm run lint`      | ESLint                                      |
| `npm run typecheck` | `tsc --noEmit`                              |

**Deploy (automatic):** every push to `main` builds and publishes to GitHub Pages via [`deploy.yml`](.github/workflows/deploy.yml). One-time setup: repo **Settings → Pages → Source: GitHub Actions**.

**Deploy (manual fallback):** build locally and push `dist/` to a `gh-pages` branch, then set **Settings → Pages → Source: Deploy from a branch → `gh-pages`**. Useful when Actions are unavailable.

## 🏗️ Architecture at a glance

```
src/
├── app/             # Shell, providers, router, responsive layout
├── core/            # Domain types & constants (framework-agnostic)
├── infrastructure/  # Dexie schema, File System Access, metadata worker
├── services/        # AudioEngine, scanner, artwork, playlists,
│                    # lyrics providers (pluggable), sync provider (pluggable)
├── features/        # home / library / player / playlists / favorites /
│                    # search / settings / about — screen modules
├── components/      # Shared UI (virtualized TrackList, Artwork, shadcn ui/)
├── hooks/ stores/   # Reusable hooks, Zustand stores
└── i18n/            # EN / ES dictionaries
```

Key decisions (full detail in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)):

- **The audio engine is not React.** A singleton owns the Web Audio graph and writes state into a Zustand store; components only render that state and call engine methods. No re-render can glitch audio.
- **Aggregates are materialized.** Albums / artists / genres are computed once per scan and stored, so no view ever folds 20k tracks at render time.
- **External services are interfaces.** Lyrics (`LyricsProvider` — LRCLIB included) and cloud sync (`SyncProvider` — no-op included) are plug-in contracts: adding Musixmatch or a Supabase backend touches zero UI code.

## 🌐 Browser support

| Capability                      | Chrome / Edge | Firefox | Safari |
| ------------------------------- | :-----------: | :-----: | :----: |
| Full app, playback, PWA         | ✅            | ✅      | ✅     |
| Persistent folder access        | ✅            | ⚠️ fallback | ⚠️ fallback |

On Firefox / Safari, folders are imported per-session with `<input webkitdirectory>` — the indexed library persists, but files must be re-picked after a restart (the File System Access API is Chromium-only for now). **"Import into app" removes this limitation everywhere**: once copied into OPFS, music plays on any browser with no permissions and no re-picking.

> 📱 **Android tip:** if the installed app keeps asking for folder permission while the Chrome tab doesn't, uninstall and reinstall the PWA — stale WebAPKs don't inherit persistent permissions correctly.

## 🔒 Privacy

Aura Music collects **nothing**. There is no backend, no analytics, no accounts. Your music, playlists and settings live in your browser's local storage. The only optional network calls are lyrics lookups (LRCLIB) and cover-art lookups (iTunes Search / Cover Art Archive) — both can be avoided (covers via the Settings toggle, lyrics by not opening the panel).

## 📄 License

[MIT](LICENSE) © Emmanuel Rojas

---

<details>
<summary><b>🇪🇸 Resumen en español</b></summary>

**Aura Music** es un reproductor de música offline-first construido como PWA moderna: indexa tus carpetas locales (File System Access API), guarda la biblioteca en IndexedDB y reproduce con un motor Web Audio (ecualizador de 10 bandas, crossfade, normalización, visualizadores). Incluye biblioteca con vistas virtualizadas para más de 20 000 canciones, playlists con arrastrar y soltar, favoritos, búsqueda instantánea, letras sincronizadas (LRCLIB), portadas automáticas desde internet, estadísticas de escucha, importación opcional al almacenamiento de la app (OPFS, reproduce sin permisos), temas claro/oscuro, interfaz bilingüe (ES/EN), atajos de teclado y funcionamiento 100 % sin conexión. Se instala desde Chrome en Android, Windows y Linux, y se despliega en GitHub Pages.

</details>
