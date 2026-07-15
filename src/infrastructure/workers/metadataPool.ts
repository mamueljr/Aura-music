import type {
  MetadataRequest,
  MetadataResponse,
  ParsedMetadata,
} from '@/infrastructure/workers/metadata.worker';

interface PendingJob {
  resolve: (value: MetadataResponse) => void;
}

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
    for (let i = 0; i < size; i++) {
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
      this.workers.push(worker);
    }
  }

  parse(file: File, path: string): Promise<{ metadata?: ParsedMetadata; error?: string }> {
    const jobId = this.nextJobId++;
    const worker = this.workers[this.nextWorker];
    this.nextWorker = (this.nextWorker + 1) % this.workers.length;

    return new Promise((resolve) => {
      this.pending.set(jobId, {
        resolve: (res) => resolve({ metadata: res.metadata, error: res.error }),
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
