/* Pure-node picture metrics for the T1a tests (no dependencies). Inputs are decoded PNGs from tests/pixel-check.js decodePng. */
import { decodePng } from './pixel-check.js';
export const luma = (img, x, y) => { const i = (y * img.W + x) * 4; return 0.2126 * img.data[i] + 0.7152 * img.data[i + 1] + 0.0722 * img.data[i + 2]; };
/* in-place radix-2 FFT of (re, im), length n a power of two */
function fft(re, im) {
  const n = re.length; for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) { const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a); for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const u = i + k, v = i + k + len / 2, tr = re[v] * cr - im[v] * ci, ti = re[v] * ci + im[v] * cr; re[v] = re[u] - tr; im[v] = im[u] - ti; re[u] += tr; im[u] += ti; const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } } }
}
/* Grain beat metric on an N x N crop (N = 128): high-pass the luma (minus a 7 x 7 box mean), Hann window, 2D FFT, then
   peak = the strongest bin over the mean power of the bins with radius 6 to 62 (so low-frequency picture content is left out).
   White noise has peak about 10 to 12 (the largest of 8000 exponential bins); a beat or lattice pattern pushes it far higher.
   Also returns amp (levels of the strongest single periodic component) and sd = the standard deviation of the high-passed luma in 8-bit levels (how much grain there is). */
export function grainSpectrum(img, x0, y0, N = 128, energy = false) {
  const L = new Float64Array(N * N); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) L[y * N + x] = luma(img, x0 + x, y0 + y);
  const hp = new Float64Array(N * N), r = 3; let s2 = 0, cnt = 0;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let s = 0, n = 0; for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const xx = x + i, yy = y + j; if (xx >= 0 && yy >= 0 && xx < N && yy < N) { s += L[yy * N + xx]; n++; } } hp[y * N + x] = L[y * N + x] - s / n; if (x > r && y > r && x < N - r && y < N - r) { s2 += hp[y * N + x] ** 2; cnt++; } }
  if (energy) { let m2 = 0; for (let k = 0; k < N * N; k++) { hp[k] = hp[k] * hp[k]; m2 += hp[k]; } m2 /= N * N; for (let k = 0; k < N * N; k++) hp[k] -= m2; }   /* energy mode: the spectrum of the squared grain, which is where a stretch beat (a periodic change in how strong the grain is) shows up */
  const re = new Float64Array(N * N), im = new Float64Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) re[y * N + x] = hp[y * N + x] * (0.5 - 0.5 * Math.cos(2 * Math.PI * x / (N - 1))) * (0.5 - 0.5 * Math.cos(2 * Math.PI * y / (N - 1)));
  const rr = new Float64Array(N), ii = new Float64Array(N);
  for (let y = 0; y < N; y++) { for (let x = 0; x < N; x++) { rr[x] = re[y * N + x]; ii[x] = 0; } fft(rr, ii); for (let x = 0; x < N; x++) { re[y * N + x] = rr[x]; im[y * N + x] = ii[x]; } }
  for (let x = 0; x < N; x++) { for (let y = 0; y < N; y++) { rr[y] = re[y * N + x]; ii[y] = im[y * N + x]; } fft(rr, ii); for (let y = 0; y < N; y++) { re[y * N + x] = rr[y]; im[y * N + x] = ii[y]; } }
  let mx = 0, sum = 0, m = 0;
  for (let ky = 0; ky < N; ky++) for (let kx = 0; kx < N; kx++) { const fx = kx > N / 2 ? kx - N : kx, fy = ky > N / 2 ? ky - N : ky, rad = Math.hypot(fx, fy); if (rad < 6 * N / 128 || rad > 62 * N / 128) continue; const p = re[ky * N + kx] ** 2 + im[ky * N + kx] ** 2; sum += p; m++; if (p > mx) mx = p; }
  let wsum = 0; for (let x = 0; x < N; x++) wsum += 0.5 - 0.5 * Math.cos(2 * Math.PI * x / (N - 1));
  return { peak: mx / (sum / m), amp: 2 * Math.sqrt(mx) / (wsum * wsum), sd: Math.sqrt(s2 / cnt) };   /* amp = the strongest single sinusoid in the crop, in 8-bit levels */
}
/* Banding metric on a vertical strip of a picture (the sky): luma of each row averaged over the strip width, then the count of
   "steps": rows where the averaged luma changes by exactly one 8-bit level or more between neighbours AND is flat on both sides
   would be hidden by the averaging, so instead we look at one column of single pixels: the fraction of neighbouring-row pairs with a
   difference of 0 (a flat run). A smooth gradient quantised to 8 bits has long flat runs with a hard step at the end (high run length);
   a dithered one has short runs. Returns { meanRun, maxRun } over the single-pixel columns of the strip (luma, channel-summed). */
export function bandRuns(img, x0, y0, w, h) {
  let runs = [], maxRun = 0;
  for (let x = x0; x < x0 + w; x++) { let run = 1, prev = null; for (let y = y0; y < y0 + h; y++) { const i = (y * img.W + x) * 4, v = img.data[i] * 3 + img.data[i + 1] * 6 + img.data[i + 2]; if (prev !== null && v === prev) run++; else { if (prev !== null) { runs.push(run); if (run > maxRun) maxRun = run; } run = 1; } prev = v; } runs.push(run); }
  return { meanRun: runs.reduce((a, b) => a + b, 0) / runs.length, maxRun };
}
export { decodePng };
