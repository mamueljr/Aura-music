import { parseAudioMetadata } from '@/infrastructure/workers/parseMetadata';
import type {
  MetadataRequest,
  MetadataResponse,
  ParsedMetadata,
} from '@/infrastructure/workers/metadata.worker';

interface PendingJob {
  resolve: (value: MetadataResponse) => void;
  workerIndex: number;
}

export interface ParseResult {
  metadata?: ParsedMetadata;
  error?: string;
}

/** A single file taking longer than this falls back to main-thread parsing. */
const JOB_TIMEOUT_MS = 15_000;

/**
 * Small worker pool so metadata parsing never blocks the UI thread and large
 * libraries parse in parallel.
 *
 * Some environments (older WebViews, strict CSPs, certain mobile browsers)
 * can't spin up module workers at all, or the worker chunk fails to load after
 * a redeploy. To guarantee scans still complete there, the pool transparently
 * falls back to parsing on the main thread whenever workers are unavailable or
 * a job times out / errors.
 */
export class MetadataWorkerPool {
  private workers: Worker[] = [];
  private pending = new Map<number, PendingJob>();
  private nextJobId = 1;
  private nextWorker = 0;
  private workersUsable = false;

  constructor(size = Math.min(4, Math.max(2, (navigator.hardwareConcurrency || 4) - 1))) {
    try {
      for (let i = 0; i < size; i++) this.spawnWorker(i);
      this.workersUsable = this.workers.length > 0;
    } catch {
      // Worker construction threw (unsupported / blocked): parse inline instead.
      this.workersUsable = false;
    }
  }

  private spawnWorker(index: number) {
    const worker = new Worker(
      new URL('@/infrastructure/workers/metadata.worker.ts', import.meta.url),
      { type: 'module' },
    );
    worker.onmessage = (event: MessageEvent<MetadataResponse>) => {
      const job = this.pending.get(event.data.jobId);
      if (job) {
        this.pending.delete(event.data.jobId);
        job.resolve(event.data);
      }
    };
    // A worker that fails to load (stale/missing chunk after a redeploy) or
    // throws outside our try/catch would otherwise leave its in-flight jobs
    // unresolved forever, hanging the scan at "0/N". Fail those jobs so the
    // caller can retry them on the main thread, and stop trusting workers.
    worker.onerror = (event) => {
      event.preventDefault();
      this.workersUsable = false;
      for (const [jobId, job] of this.pending) {
        if (job.workerIndex !== index) continue;
        this.pending.delete(jobId);
        job.resolve({ jobId, ok: false, path: '', error: event.message || 'worker failed' });
      }
      try {
        worker.terminate();
      } catch {
        // ignore
      }
    };
    this.workers[index] = worker;
  }

  private async parseOnMainThread(file: File): Promise<ParseResult> {
    try {
      const metadata = await parseAudioMetadata(file);
      return { metadata };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }

  async parse(file: File, path: string): Promise<ParseResult> {
    if (!this.workersUsable || this.workers.length === 0) {
      return this.parseOnMainThread(file);
    }

    const jobId = this.nextJobId++;
    const workerIndex = this.nextWorker;
    const worker = this.workers[workerIndex];
    this.nextWorker = (this.nextWorker + 1) % this.workers.length;

    const result = await new Promise<MetadataResponse | null>((resolve) => {
      const timeout = setTimeout(() => {
        if (this.pending.delete(jobId)) resolve(null); // null => fall back
      }, JOB_TIMEOUT_MS);
      this.pending.set(jobId, {
        workerIndex,
        resolve: (res) => {
          clearTimeout(timeout);
          resolve(res);
        },
      });
      try {
        const request: MetadataRequest = { jobId, file, path };
        worker.postMessage(request);
      } catch {
        clearTimeout(timeout);
        this.pending.delete(jobId);
        resolve(null);
      }
    });

    // Worker timed out or errored: retry this file on the main thread so the
    // scan still gets its metadata instead of silently dropping the track.
    if (result === null || (result.ok === false && !result.metadata)) {
      return this.parseOnMainThread(file);
    }
    return { metadata: result.metadata, error: result.error };
  }

  destroy() {
    this.workers.forEach((w) => {
      try {
        w.terminate();
      } catch {
        // ignore
      }
    });
    this.workers = [];
    this.pending.clear();
  }
}
