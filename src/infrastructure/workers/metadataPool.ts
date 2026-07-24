import type {
  MetadataRequest,
  MetadataResponse,
  ParsedMetadata,
} from '@/infrastructure/workers/metadata.worker';

interface PendingJob {
  resolve: (value: MetadataResponse) => void;
  workerIndex: number;
}

/** A single file taking longer than this is treated as unreadable, not a hang. */
const JOB_TIMEOUT_MS = 20_000;

/**
 * Small worker pool so metadata parsing never blocks the UI thread and large
 * libraries parse in parallel.
 */
export class MetadataWorkerPool {
  private workers: Worker[] = [];
  private pending = new Map<number, PendingJob>();
  private nextJobId = 1;
  private nextWorker = 0;

  constructor(size = Math.min(4, Math.max(2, (navigator.hardwareConcurrency || 4) - 1))) {
    for (let i = 0; i < size; i++) this.spawnWorker(i);
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
    // unresolved forever, hanging the scan at "0/N" with no visible error.
    worker.onerror = (event) => {
      event.preventDefault();
      for (const [jobId, job] of this.pending) {
        if (job.workerIndex !== index) continue;
        this.pending.delete(jobId);
        job.resolve({
          jobId,
          ok: false,
          path: '',
          error: event.message || 'El worker de metadatos falló al cargar',
        });
      }
      worker.terminate();
      this.spawnWorker(index);
    };
    this.workers[index] = worker;
  }

  parse(file: File, path: string): Promise<{ metadata?: ParsedMetadata; error?: string }> {
    const jobId = this.nextJobId++;
    const workerIndex = this.nextWorker;
    const worker = this.workers[workerIndex];
    this.nextWorker = (this.nextWorker + 1) % this.workers.length;

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (this.pending.delete(jobId)) {
          resolve({ error: `Tiempo de espera agotado analizando ${path}` });
        }
      }, JOB_TIMEOUT_MS);
      this.pending.set(jobId, {
        workerIndex,
        resolve: (res) => {
          clearTimeout(timeout);
          resolve({ metadata: res.metadata, error: res.error });
        },
      });
      const request: MetadataRequest = { jobId, file, path };
      worker.postMessage(request);
    });
  }

  destroy() {
    this.workers.forEach((w) => w.terminate());
    this.workers = [];
    this.pending.clear();
  }
}
