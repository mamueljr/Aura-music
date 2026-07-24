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

/**
 * A single worker job taking longer than this is given up on: we return an
 * empty result so the caller stores the track with basic (filename) metadata
 * and moves on. It must never wait indefinitely — that's what hung scans at
 * "0/N". Tag-only parsing (no full-file duration scan) is fast, so a file that
 * exceeds this is almost certainly a stuck worker, not slow-but-progressing.
 */
const JOB_TIMEOUT_MS = 10_000;

/**
 * Small worker pool so metadata parsing never blocks the UI thread and large
 * libraries parse in parallel.
 *
 * Two safety nets keep scans from ever hanging:
 *  - If workers can't be constructed at all (older WebViews, strict CSPs), we
 *    parse on the main thread. Tag-only parsing is cheap enough not to freeze
 *    the UI noticeably.
 *  - If a worker IS created but a job stalls or the worker errors, we give up
 *    on that file (basic metadata) rather than parse on the main thread — a
 *    genuinely stuck parse would otherwise freeze the whole app.
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
    // unresolved forever, hanging the scan at "0/N". Fail those jobs (basic
    // metadata) and respawn the worker so remaining files keep flowing.
    worker.onerror = (event) => {
      event.preventDefault();
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
      try {
        this.spawnWorker(index);
      } catch {
        this.workers[index] = undefined as unknown as Worker;
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
    const worker = this.workersUsable ? this.workers[this.nextWorker] : undefined;
    if (!worker) {
      // No usable worker: parse inline. Tag-only parsing is fast enough that a
      // handful of files won't visibly freeze the UI.
      return this.parseOnMainThread(file);
    }

    const jobId = this.nextJobId++;
    const workerIndex = this.nextWorker;
    this.nextWorker = (this.nextWorker + 1) % this.workers.length;

    const result = await new Promise<MetadataResponse | null>((resolve) => {
      const timeout = setTimeout(() => {
        if (this.pending.delete(jobId)) resolve(null); // give up on this file
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

    // Timed out or errored: keep the track with basic metadata rather than
    // freezing the app by re-parsing a stuck file on the main thread.
    if (result === null || (result.ok === false && !result.metadata)) {
      return { error: result?.error ?? 'metadata parse timed out' };
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
