export interface MeshData {
  positions: Uint16Array;
  normals: Int8Array;
  data: Uint8Array;
  indices: Uint32Array;
}

/**
 * Greedy mesher with per-vertex ambient occlusion.
 * `vol` is padded by one voxel on every side: size (sx+2)*(sy+2)*(sz+2), index ((y+1)*(sz+2)+(z+1))*(sx+2)+(x+1).
 * Must stay self-contained: its source is also run inside a Web Worker.
 */
export function greedyMesh(
  vol: Uint8Array,
  sx: number,
  sy: number,
  sz: number,
): MeshData | null {
  const PX = sx + 2;
  const PZ = sz + 2;
  const dims = [sx, sy, sz];
  const at = (x: number, y: number, z: number): number =>
    vol[((y + 1) * PZ + (z + 1)) * PX + (x + 1)];

  let pos = new Uint16Array(4096 * 3);
  let nrm = new Int8Array(4096 * 3);
  let dat = new Uint8Array(4096 * 2);
  let idx = new Uint32Array(4096 * 1.5);
  let vc = 0;
  let ic = 0;
  const grow = () => {
    const p = new Uint16Array(pos.length * 2);
    p.set(pos);
    pos = p;
    const n = new Int8Array(nrm.length * 2);
    n.set(nrm);
    nrm = n;
    const d = new Uint8Array(dat.length * 2);
    d.set(dat);
    dat = d;
    const i = new Uint32Array(idx.length * 2);
    i.set(idx);
    idx = i;
  };

  const c = [0, 0, 0];
  const p = [0, 0, 0];
  const ao = [0, 0, 0, 0];

  for (let d = 0; d < 3; d++) {
    const u = (d + 1) % 3;
    const v = (d + 2) % 3;
    const du = dims[u];
    const dv = dims[v];
    const U = [0, 0, 0];
    const V = [0, 0, 0];
    U[u] = 1;
    V[v] = 1;
    const mask = new Int32Array(du * dv);

    for (let sign = -1; sign <= 1; sign += 2) {
      for (let s = 0; s < dims[d]; s++) {
        let n = 0;
        for (let j = 0; j < dv; j++)
          for (let i = 0; i < du; i++, n++) {
            c[d] = s;
            c[u] = i;
            c[v] = j;
            const mat = at(c[0], c[1], c[2]);
            if (mat === 0) {
              mask[n] = 0;
              continue;
            }
            const qx = c[0] + (d === 0 ? sign : 0);
            const qy = c[1] + (d === 1 ? sign : 0);
            const qz = c[2] + (d === 2 ? sign : 0);
            if (at(qx, qy, qz) !== 0) {
              mask[n] = 0;
              continue;
            }
            let key = mat;
            for (let k = 0; k < 4; k++) {
              const su = k === 1 || k === 2 ? 1 : -1;
              const sv = k >= 2 ? 1 : -1;
              const s1 =
                at(qx + U[0] * su, qy + U[1] * su, qz + U[2] * su) !== 0
                  ? 1
                  : 0;
              const s2 =
                at(qx + V[0] * sv, qy + V[1] * sv, qz + V[2] * sv) !== 0
                  ? 1
                  : 0;
              const sc =
                at(
                  qx + U[0] * su + V[0] * sv,
                  qy + U[1] * su + V[1] * sv,
                  qz + U[2] * su + V[2] * sv,
                ) !== 0
                  ? 1
                  : 0;
              const a = s1 && s2 ? 0 : 3 - (s1 + s2 + sc);
              key |= a << (8 + k * 2);
            }
            mask[n] = key;
          }

        for (let j = 0; j < dv; j++)
          for (let i = 0; i < du; ) {
            const key = mask[j * du + i];
            if (key === 0) {
              i++;
              continue;
            }
            let w = 1;
            while (i + w < du && mask[j * du + i + w] === key) w++;
            let h = 1;
            grow_h: while (j + h < dv) {
              for (let k = 0; k < w; k++)
                if (mask[(j + h) * du + i + k] !== key) break grow_h;
              h++;
            }
            for (let b = 0; b < h; b++)
              for (let a = 0; a < w; a++) mask[(j + b) * du + i + a] = 0;

            if ((vc + 4) * 3 > pos.length || ic + 6 > idx.length) grow();
            const plane = s + (sign > 0 ? 1 : 0);
            for (let k = 0; k < 4; k++) {
              p[d] = plane;
              p[u] = i + (k === 1 || k === 2 ? w : 0);
              p[v] = j + (k >= 2 ? h : 0);
              const o = (vc + k) * 3;
              pos[o] = p[0];
              pos[o + 1] = p[1];
              pos[o + 2] = p[2];
              nrm[o] = d === 0 ? sign : 0;
              nrm[o + 1] = d === 1 ? sign : 0;
              nrm[o + 2] = d === 2 ? sign : 0;
              ao[k] = (key >> (8 + k * 2)) & 3;
              dat[(vc + k) * 2] = key & 255;
              dat[(vc + k) * 2 + 1] = ao[k];
            }
            const diag02 = ao[0] + ao[2] > ao[1] + ao[3];
            const a0 = vc;
            const a1 = vc + 1;
            const a2 = vc + 2;
            const a3 = vc + 3;
            const tris =
              sign > 0
                ? diag02
                  ? [a0, a1, a2, a0, a2, a3]
                  : [a1, a2, a3, a1, a3, a0]
                : diag02
                  ? [a0, a2, a1, a0, a3, a2]
                  : [a1, a3, a2, a1, a0, a3];
            for (let k = 0; k < 6; k++) idx[ic + k] = tris[k];
            vc += 4;
            ic += 6;
            i += w;
          }
      }
    }
  }

  if (vc === 0) return null;
  return {
    positions: pos.slice(0, vc * 3),
    normals: nrm.slice(0, vc * 3),
    data: dat.slice(0, vc * 2),
    indices: idx.slice(0, ic),
  };
}
