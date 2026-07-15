import { db } from '@/infrastructure/db/db';
import { hash53 } from '@/lib/utils';

/** Object-URL cache: covers are tiny (embedded art), one URL per cover id. */
const urlCache = new Map<string, string>();
const pendingLoads = new Map<string, Promise<string | null>>();

export async function getCoverUrl(coverId: string): Promise<string | null> {
  const cached = urlCache.get(coverId);
  if (cached) return cached;

  const pending = pendingLoads.get(coverId);
  if (pending) return pending;

  const load = (async () => {
    const cover = await db.covers.get(coverId);
    if (!cover) return null;
    const url = URL.createObjectURL(cover.blob);
    urlCache.set(coverId, url);
    return url;
  })().finally(() => pendingLoads.delete(coverId));

  pendingLoads.set(coverId, load);
  return load;
}

const PALETTES: [string, string][] = [
  ['#8b5cf6', '#22d3ee'],
  ['#f472b6', '#8b5cf6'],
  ['#22d3ee', '#34d399'],
  ['#fb923c', '#f472b6'],
  ['#34d399', '#8b5cf6'],
  ['#60a5fa', '#22d3ee'],
  ['#f472b6', '#fb923c'],
  ['#a78bfa', '#f472b6'],
];

/**
 * Deterministic generated cover for tracks/albums without embedded art:
 * an aura-style gradient with the first letter of the name.
 */
export function generatedCoverUri(name: string): string {
  const seed = parseInt(hash53(name || '?').slice(0, 8), 36);
  const [c1, c2] = PALETTES[seed % PALETTES.length];
  const angle = (seed >> 3) % 360;
  const letter = (name.trim()[0] || '♪').toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <defs><linearGradient id="g" gradientTransform="rotate(${angle} 0.5 0.5)">
  <stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>
  </linearGradient></defs>
  <rect width="200" height="200" fill="url(#g)"/>
  <circle cx="100" cy="100" r="55" fill="rgba(0,0,0,0.18)"/>
  <text x="100" y="100" font-family="system-ui,sans-serif" font-size="64" font-weight="700"
    fill="rgba(255,255,255,0.92)" text-anchor="middle" dominant-baseline="central">${escapeXml(letter)}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);
}
