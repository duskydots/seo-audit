import type { RenderJob } from "../../domain/render/render-job.schema.ts";
import type { RenderObservation } from "../../domain/render/render-observation.schema.ts";
import { RendererMessageSchema } from "../../domain/render/render-worker-message.schema.ts";
import { stableId } from "../../shared/ids.ts";

type Pending = {
  worker: ReturnType<typeof Bun.spawn>;
  resolve: (value: RenderObservation) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

export class RendererPool {
  readonly #workers: Array<ReturnType<typeof Bun.spawn>> = [];
  readonly #available: Array<ReturnType<typeof Bun.spawn>> = [];
  readonly #waiters: Array<(worker: ReturnType<typeof Bun.spawn>) => void> = [];
  readonly #pending = new Map<string, Pending>();
  #closing = false;

  constructor(private readonly size: number) {}

  async start(): Promise<void> {
    try {
      await Promise.all(Array.from({ length: this.size }, () => this.#spawnWorker()));
    } catch (error) {
      this.#closing = true;
      for (const worker of this.#workers) worker.kill();
      throw error;
    }
  }

  async #spawnWorker(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      let ready = false;
      const worker = Bun.spawn([process.execPath, Bun.main, "__render-worker"], {
        stdout: "pipe",
        stderr: "pipe",
        ipc: (raw) => {
          const parsed = RendererMessageSchema.safeParse(raw);
          if (!parsed.success) return;
          const message = parsed.data;
          if (message.type === "ready") {
            ready = true;
            this.#workers.push(worker);
            this.#release(worker);
            resolve();
          } else if (message.type === "result") {
            const pending = this.#pending.get(message.jobId);
            if (!pending) return;
            clearTimeout(pending.timer);
            this.#pending.delete(message.jobId);
            pending.resolve(message.result);
            this.#release(worker);
          } else if (message.type === "error") {
            if (message.jobId === "startup") reject(new Error(message.error));
            const pending = this.#pending.get(message.jobId);
            if (pending) {
              clearTimeout(pending.timer);
              this.#pending.delete(message.jobId);
              pending.reject(new Error(message.error));
              this.#release(worker);
            }
          }
        },
      });
      void worker.exited.then((code) => {
        if (!ready) reject(new Error(`Renderer worker exited during startup with code ${code}`));
        this.#workerExited(worker);
      });
    });
  }

  #workerExited(worker: ReturnType<typeof Bun.spawn>): void {
    const workerIndex = this.#workers.indexOf(worker);
    if (workerIndex >= 0) this.#workers.splice(workerIndex, 1);
    const availableIndex = this.#available.indexOf(worker);
    if (availableIndex >= 0) this.#available.splice(availableIndex, 1);
    for (const [jobId, pending] of this.#pending) {
      if (pending.worker !== worker) continue;
      clearTimeout(pending.timer);
      this.#pending.delete(jobId);
      pending.reject(new Error("Renderer worker exited before returning a result"));
    }
    if (!this.#closing) void this.#spawnWorker().catch(() => undefined);
  }

  #release(worker: ReturnType<typeof Bun.spawn>): void {
    const waiter = this.#waiters.shift();
    if (waiter) waiter(worker);
    else this.#available.push(worker);
  }

  async #acquire(): Promise<ReturnType<typeof Bun.spawn>> {
    const worker = this.#available.shift();
    if (worker) return worker;
    return await new Promise((resolve) => this.#waiters.push(resolve));
  }

  async render(url: string, userAgent: string, timeoutMs: number): Promise<RenderObservation> {
    const worker = await this.#acquire();
    const job: RenderJob = { jobId: stableId("render", `${url}|${performance.now()}`), url, userAgent, timeoutMs, quietWindowMs: 1_000 };
    return await new Promise<RenderObservation>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#pending.delete(job.jobId);
        worker.kill();
        reject(new Error(`Render timed out: ${url}`));
      }, timeoutMs + 5_000);
      this.#pending.set(job.jobId, { worker, resolve, reject, timer });
      worker.send({ type: "render", job });
    });
  }

  async close(): Promise<void> {
    this.#closing = true;
    for (const worker of this.#workers) worker.send({ type: "shutdown" });
    await Promise.all(this.#workers.map((worker) => worker.exited));
  }
}
