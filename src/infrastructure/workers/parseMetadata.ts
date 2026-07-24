import { parseBlob } from 'music-metadata';

export interface ParsedMetadata {
  title?: string;
  artist?: string;
  albumArtist?: string;
  album?: string;
  genre?: string;
  year?: number;
  trackNo?: number;
  discNo?: number;
  duration: number;
  cover?: { data: ArrayBuffer; format: string };
}

/**
 * Reads tags from an audio file. Shared by the worker pool and the main-thread
 * fallback so both code paths behave identically.
 */
export async function parseAudioMetadata(file: Blob): Promise<ParsedMetadata> {
  // NOTE: `duration: true` is intentionally OFF. For MP3s without a VBR header
  // it forces music-metadata to read the entire file and scan every frame,
  // which on mobile turns a folder scan into minutes-long (effectively hung)
  // work. We only read the tags at the start of the file here; the real
  // duration is filled in cheaply from the <audio> element on first playback.
  const parsed = await parseBlob(file);
  const { common, format } = parsed;
  const picture = common.picture?.[0];

  return {
    title: common.title ?? undefined,
    artist: common.artist ?? common.artists?.[0],
    albumArtist: common.albumartist ?? undefined,
    album: common.album ?? undefined,
    genre: common.genre?.[0],
    year: common.year ?? undefined,
    trackNo: common.track?.no ?? undefined,
    discNo: common.disk?.no ?? undefined,
    duration: format.duration ?? 0,
    cover: picture
      ? {
          data: picture.data.buffer.slice(
            picture.data.byteOffset,
            picture.data.byteOffset + picture.data.byteLength,
          ) as ArrayBuffer,
          format: picture.format,
        }
      : undefined,
  };
}
