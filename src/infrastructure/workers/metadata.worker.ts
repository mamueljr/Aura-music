/// <reference lib="webworker" />
import { parseAudioMetadata, type ParsedMetadata } from './parseMetadata';

export type { ParsedMetadata };

export interface MetadataRequest {
  jobId: number;
  file: File;
  path: string;
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
    const metadata = await parseAudioMetadata(file);
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
