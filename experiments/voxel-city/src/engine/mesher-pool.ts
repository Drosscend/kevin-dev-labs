import { greedyMesh, type MeshData } from "./greedy";

interface Job {
  vol: Uint8Array;
  sx: number;
  sy: number;
  sz: number;
  resolve: (mesh: MeshData | null) => void;
}

const WORKER_SOURCE = `const greedyMesh = ${greedyMesh.toString()};
self.onmessage = (e) => {
  const { vol, sx, sy, sz } = e.data;
  const mesh = greedyMesh(vol, sx, sy, sz);
  if (!mesh) { self.postMessage(null); return; }
  self.postMessage(mesh, [mesh.positions.buffer, mesh.normals.buffer, mesh.data.buffer, mesh.indices.buffer]);
};`;

/** Runs the greedy mesher on a pool of Web Workers. */
export class MesherPool {
  private readonly idle: Worker[] = [];
  private readonly busy = new Map<Worker, Job>();
  private readonly queue: Job[] = [];

  constructor(
    size = Math.max(2, Math.min(8, (navigator.hardwareConcurrency || 4) - 1)),
  ) {
    const url = URL.createObjectURL(
      new Blob([WORKER_SOURCE], { type: "text/javascript" }),
    );
    for (let i = 0; i < size; i++) {
      const worker = new Worker(url);
      worker.onmessage = (e: MessageEvent<MeshData | null>) =>
        this.done(worker, e.data);
      this.idle.push(worker);
    }
  }

  get pending(): number {
    return this.queue.length + this.busy.size;
  }

  mesh(
    vol: Uint8Array,
    sx: number,
    sy: number,
    sz: number,
  ): Promise<MeshData | null> {
    return new Promise((resolve) => {
      this.queue.push({ vol, sx, sy, sz, resolve });
      this.pump();
    });
  }

  private pump(): void {
    while (this.idle.length > 0 && this.queue.length > 0) {
      const worker = this.idle.pop() as Worker;
      const job = this.queue.shift() as Job;
      this.busy.set(worker, job);
      worker.postMessage({ vol: job.vol, sx: job.sx, sy: job.sy, sz: job.sz }, [
        job.vol.buffer,
      ]);
    }
  }

  private done(worker: Worker, mesh: MeshData | null): void {
    const job = this.busy.get(worker);
    this.busy.delete(worker);
    this.idle.push(worker);
    job?.resolve(mesh);
    this.pump();
  }
}
