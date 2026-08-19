const short = Math.min(window.innerWidth, window.innerHeight);
const light = short < 700;

/**
 * Decided once, on the machine that opened the page. A phone gets a coarser membrane and fewer
 * pixels rather than the same creature at twelve frames a second.
 */
export const quality = {
  /** Subdivisions of the membrane: 44 is about 39 000 triangles, 26 about 13 500. */
  detail: light ? 26 : 44,
  haloRings: light ? 48 : 96,
  haloBands: light ? 32 : 64,
  pixelRatio: Math.min(window.devicePixelRatio, light ? 1.5 : 2),
};
