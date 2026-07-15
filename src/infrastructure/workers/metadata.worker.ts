/// <reference lib="webworker" />
import { parseBlob } from 'music-metadata';

export interface MetadataRequest {
  jobId: number;
  file: File;
  path: string;
}

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

export interface MetadataResponse {
  jobId: number;
  ok: boolean;
  path: string;
  metadata?: ParsedMetadata;
  error?: string;
}

self.onmessage = async (event: MessageEvent<MetadataRequest>) => {
  const { jobId, file, path } = event.data;
  try {
    const parsed = await parseBlob(file, { duration: true });
    const { common, format } = parsed;
    const picture = common.picture?.[0];

    const metadata: ParsedMetadata = {
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

    const response: MetadataResponse = { jobId, ok: true, path, metadata };
    self.postMessage(response, metadata.cover ? [metadata.cover.data] : []);
  } catch (error) {
    const response: MetadataResponse = {
      jobId,
      ok: false,
      path,
      error: error instanceof Error ? error.message : String(error),
    };
    self.postMessage(response);
  }
};
