"""OpenCL C 1.2 kernel sources for HW-12, as strings. Plain OpenCL C that the macOS OpenCL compiler accepts; no vendor extensions except
the standard cl_khr_fp64 / cl_khr_fp16 pragmas, which are switched on only by -D USE_FP64 / -D USE_FP16 so a missing extension cannot break the other kernels."""
import sys
sys.dont_write_bytecode = True

HEAD = """
#ifdef USE_FP64
#pragma OPENCL EXTENSION cl_khr_fp64 : enable
#endif
#ifdef USE_FP16
#pragma OPENCL EXTENSION cl_khr_fp16 : enable
#endif
"""

# ---------------------------------------------------------------- arithmetic throughput
ARITH = HEAD + """
// 8 independent chains of fused multiply-add: 16 floating point operations per loop pass per work item.
__kernel void fma_f32(__global float* out, const int iters, const float a, const float b) {
    const size_t gid = get_global_id(0);
    float x0 = (float)gid * 1e-7f + 0.1f, x1 = x0 + 0.1f, x2 = x0 + 0.2f, x3 = x0 + 0.3f;
    float x4 = x0 + 0.4f, x5 = x0 + 0.5f, x6 = x0 + 0.6f, x7 = x0 + 0.7f;
    for (int i = 0; i < iters; i++) {
        x0 = fma(x0, a, b); x1 = fma(x1, a, b); x2 = fma(x2, a, b); x3 = fma(x3, a, b);
        x4 = fma(x4, a, b); x5 = fma(x5, a, b); x6 = fma(x6, a, b); x7 = fma(x7, a, b);
    }
    out[gid] = ((x0 + x1) + (x2 + x3)) + ((x4 + x5) + (x6 + x7));
}

#ifdef USE_FP64
__kernel void fma_f64(__global double* out, const int iters, const double a, const double b) {
    const size_t gid = get_global_id(0);
    double x0 = (double)gid * 1e-7 + 0.1, x1 = x0 + 0.1, x2 = x0 + 0.2, x3 = x0 + 0.3;
    double x4 = x0 + 0.4, x5 = x0 + 0.5, x6 = x0 + 0.6, x7 = x0 + 0.7;
    for (int i = 0; i < iters; i++) {
        x0 = fma(x0, a, b); x1 = fma(x1, a, b); x2 = fma(x2, a, b); x3 = fma(x3, a, b);
        x4 = fma(x4, a, b); x5 = fma(x5, a, b); x6 = fma(x6, a, b); x7 = fma(x7, a, b);
    }
    out[gid] = ((x0 + x1) + (x2 + x3)) + ((x4 + x5) + (x6 + x7));
}
#endif

#ifdef USE_FP16
// half2 vectors: 8 chains x 2 lanes x 2 operations = 32 floating point operations per pass.
__kernel void fma_f16(__global float* out, const int iters, const float af, const float bf) {
    const size_t gid = get_global_id(0);
    const half2 a = (half2)((half)af, (half)af), b = (half2)((half)bf, (half)bf);
    half h0 = (half)((float)gid * 1e-7f + 0.1f);
    half2 x0 = (half2)(h0, h0 + (half)0.01f), x1 = x0 + (half2)((half)0.1f), x2 = x0 + (half2)((half)0.2f), x3 = x0 + (half2)((half)0.3f);
    half2 x4 = x0 + (half2)((half)0.4f), x5 = x0 + (half2)((half)0.5f), x6 = x0 + (half2)((half)0.6f), x7 = x0 + (half2)((half)0.7f);
    for (int i = 0; i < iters; i++) {
        x0 = fma(x0, a, b); x1 = fma(x1, a, b); x2 = fma(x2, a, b); x3 = fma(x3, a, b);
        x4 = fma(x4, a, b); x5 = fma(x5, a, b); x6 = fma(x6, a, b); x7 = fma(x7, a, b);
    }
    half2 s = ((x0 + x1) + (x2 + x3)) + ((x4 + x5) + (x6 + x7));
    out[gid] = (float)s.x + (float)s.y;
}
#endif

// 8 chains of multiply, add, shift, xor: 32 integer operations per pass per work item.
__kernel void int_ops(__global uint* out, const int iters, const uint a, const uint b) {
    const uint gid = (uint)get_global_id(0);
    uint x0 = gid, x1 = gid + 1u, x2 = gid + 2u, x3 = gid + 3u, x4 = gid + 4u, x5 = gid + 5u, x6 = gid + 6u, x7 = gid + 7u;
    for (int i = 0; i < iters; i++) {
        x0 = (x0 * a + b) ^ (x0 >> 7); x1 = (x1 * a + b) ^ (x1 >> 7); x2 = (x2 * a + b) ^ (x2 >> 7); x3 = (x3 * a + b) ^ (x3 >> 7);
        x4 = (x4 * a + b) ^ (x4 >> 7); x5 = (x5 * a + b) ^ (x5 >> 7); x6 = (x6 * a + b) ^ (x6 >> 7); x7 = (x7 * a + b) ^ (x7 >> 7);
    }
    out[gid] = x0 ^ x1 ^ x2 ^ x3 ^ x4 ^ x5 ^ x6 ^ x7;
}

__kernel void nop(__global int* p) {
    if (get_global_id(0) == 0xFFFFFFF0UL) p[0] = 1;
}
"""

# ---------------------------------------------------------------- memory
MEM = HEAD + """
__kernel void mem_copy(__global const float4* in, __global float4* out, const ulong n) {
    for (ulong i = get_global_id(0); i < n; i += get_global_size(0)) out[i] = in[i];
}
__kernel void mem_read(__global const float4* in, __global float* out, const ulong n) {
    float4 acc = (float4)(0.0f);
    for (ulong i = get_global_id(0); i < n; i += get_global_size(0)) acc += in[i];
    out[get_global_id(0)] = acc.x + acc.y + acc.z + acc.w;
}
__kernel void mem_write(__global float4* out, const ulong n, const float v) {
    const float4 val = (float4)(v, v + 1.0f, v + 2.0f, v + 3.0f);
    for (ulong i = get_global_id(0); i < n; i += get_global_size(0)) out[i] = val;
}
// local memory: 256 work items per group, 2 reads and 1 write per pass, with barriers (12 bytes per work item per pass)
__kernel void local_bw(__global float* out, const int iters) {
    __local float t[256];
    const uint l = (uint)get_local_id(0);
    float acc = (float)l;
    t[l] = acc;
    barrier(CLK_LOCAL_MEM_FENCE);
    for (int i = 0; i < iters; i++) {
        acc = 0.25f * (acc + t[(l + (uint)i + 1u) & 255u] + t[(l * 5u + (uint)i) & 255u]);
        barrier(CLK_LOCAL_MEM_FENCE);
        t[l] = acc;
        barrier(CLK_LOCAL_MEM_FENCE);
    }
    out[get_global_id(0)] = acc;
}
"""

# ---------------------------------------------------------------- shallow water (Lax-Friedrichs, 5 fields: h, hu, hv, bed b, source s)
# REAL is float or double (-D REAL=double -D USE_FP64). Clamped (zero-gradient) edges. c = dt / (2 dx).
SHALLOW = HEAD + """
#define GRAV ((REAL)9.81)
#define HMIN ((REAL)1e-3)
__kernel void sw_step(__global const REAL* h, __global const REAL* hu, __global const REAL* hv,
                      __global const REAL* b, __global const REAL* s,
                      __global REAL* h2, __global REAL* hu2, __global REAL* hv2,
                      const int nx, const int ny, const REAL c, const REAL dt) {
    const int x = get_global_id(0), y = get_global_id(1);
    if (x >= nx || y >= ny) return;
    const int xm = max(x - 1, 0), xp = min(x + 1, nx - 1), ym = max(y - 1, 0), yp = min(y + 1, ny - 1);
    const int i = y * nx + x, iE = y * nx + xp, iW = y * nx + xm, iN = yp * nx + x, iS = ym * nx + x;
    const REAL hE = max(h[iE], HMIN), hW = max(h[iW], HMIN), hN = max(h[iN], HMIN), hS = max(h[iS], HMIN);
    const REAL pE = hu[iE], pW = hu[iW], pN = hu[iN], pS = hu[iS];
    const REAL qE = hv[iE], qW = hv[iW], qN = hv[iN], qS = hv[iS];
    const REAL hc = max(h[i], HMIN);
    // x fluxes (E and W)
    const REAL fh_E = pE, fh_W = pW;
    const REAL fp_E = pE * pE / hE + (REAL)0.5 * GRAV * hE * hE, fp_W = pW * pW / hW + (REAL)0.5 * GRAV * hW * hW;
    const REAL fq_E = pE * qE / hE, fq_W = pW * qW / hW;
    // y fluxes (N and S)
    const REAL gh_N = qN, gh_S = qS;
    const REAL gp_N = pN * qN / hN, gp_S = pS * qS / hS;
    const REAL gq_N = qN * qN / hN + (REAL)0.5 * GRAV * hN * hN, gq_S = qS * qS / hS + (REAL)0.5 * GRAV * hS * hS;
    REAL nh = (REAL)0.25 * (h[iE] + h[iW] + h[iN] + h[iS]) - c * (fh_E - fh_W) - c * (gh_N - gh_S) + dt * s[i];
    REAL np_ = (REAL)0.25 * (pE + pW + pN + pS) - c * (fp_E - fp_W) - c * (gp_N - gp_S) - c * GRAV * hc * (b[iE] - b[iW]);
    REAL nq = (REAL)0.25 * (qE + qW + qN + qS) - c * (fq_E - fq_W) - c * (gq_N - gq_S) - c * GRAV * hc * (b[iN] - b[iS]);
    h2[i] = max(nh, HMIN);
    hu2[i] = np_;
    hv2[i] = nq;
}
"""

# ---------------------------------------------------------------- hydrology flow accumulation (D8 receivers, then pull passes)
FLOW = HEAD + """
__kernel void fa_receiver(__global const float* z, __global int* rec, const int nx, const int ny) {
    const int x = get_global_id(0), y = get_global_id(1);
    if (x >= nx || y >= ny) return;
    const int i = y * nx + x;
    const float zc = z[i];
    float best = 0.0f;
    int arg = -1;
    for (int dy = -1; dy <= 1; dy++) {
        for (int dx = -1; dx <= 1; dx++) {
            if (dx == 0 && dy == 0) continue;
            const int xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= nx || yy >= ny) continue;
            const float w = (dx != 0 && dy != 0) ? 0.70710678f : 1.0f;
            const float drop = (zc - z[yy * nx + xx]) * w;
            if (drop > best) { best = drop; arg = yy * nx + xx; }
        }
    }
    rec[i] = arg;
}
// one pull pass: every cell takes 1 plus the totals of the neighbours that drain into it
__kernel void fa_pull(__global const int* rec, __global const int* ain, __global int* aout, const int nx, const int ny) {
    const int x = get_global_id(0), y = get_global_id(1);
    if (x >= nx || y >= ny) return;
    const int i = y * nx + x;
    int sum = 1;
    for (int dy = -1; dy <= 1; dy++) {
        for (int dx = -1; dx <= 1; dx++) {
            if (dx == 0 && dy == 0) continue;
            const int xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= nx || yy >= ny) continue;
            const int j = yy * nx + xx;
            if (rec[j] == i) sum += ain[j];
        }
    }
    aout[i] = sum;
}
"""

# ---------------------------------------------------------------- 5-point diffusion
DIFFUSE = HEAD + """
__kernel void diffuse(__global const float* u, __global float* o, const int nx, const int ny, const float k) {
    const int x = get_global_id(0), y = get_global_id(1);
    if (x >= nx || y >= ny) return;
    const int xm = max(x - 1, 0), xp = min(x + 1, nx - 1), ym = max(y - 1, 0), yp = min(y + 1, ny - 1);
    const float c = u[y * nx + x];
    o[y * nx + x] = c + k * (u[y * nx + xp] + u[y * nx + xm] + u[yp * nx + x] + u[ym * nx + x] - 4.0f * c);
}
"""

# ---------------------------------------------------------------- agents: field-gradient steering plus 16 index-neighbour separation
AGENTS = HEAD + """
__kernel void agent_step(__global const float* x, __global const float* y, __global const float* vx, __global const float* vy,
                         __global float* x2, __global float* y2, __global float* vx2, __global float* vy2,
                         __global const float* fld, const int fn, const int n, const float dt) {
    const int i = get_global_id(0);
    if (i >= n) return;
    const float px = x[i], py = y[i];
    float ux = vx[i], uy = vy[i];
    // bilinear gradient of the potential field
    const float fx = px * (float)fn - 0.5f, fy = py * (float)fn - 0.5f;
    const float flx = floor(fx), fly = floor(fy);
    const float tx = fx - flx, ty = fy - fly;
    const int ix0 = clamp((int)flx, 0, fn - 1), iy0 = clamp((int)fly, 0, fn - 1);
    const int ix1 = min(ix0 + 1, fn - 1), iy1 = min(iy0 + 1, fn - 1);
    const float f00 = fld[iy0 * fn + ix0], f10 = fld[iy0 * fn + ix1], f01 = fld[iy1 * fn + ix0], f11 = fld[iy1 * fn + ix1];
    const float gx = (f10 - f00) * (1.0f - ty) + (f11 - f01) * ty;
    const float gy = (f01 - f00) * (1.0f - tx) + (f11 - f10) * tx;
    float sx = 0.0f, sy = 0.0f;
    for (int k = 1; k <= 16; k++) {
        int j = i + k;
        if (j >= n) j -= n;
        const float dx = px - x[j], dy = py - y[j];
        const float d2 = dx * dx + dy * dy + 1e-6f;
        const float w = 1e-6f / d2;
        sx += dx * w; sy += dy * w;
    }
    ux = 0.98f * ux + dt * (-gx * 4.0f + sx);
    uy = 0.98f * uy + dt * (-gy * 4.0f + sy);
    float nx = px + dt * ux, ny = py + dt * uy;
    nx -= floor(nx); ny -= floor(ny);
    x2[i] = nx; y2[i] = ny; vx2[i] = ux; vy2[i] = uy;
}
"""

# ---------------------------------------------------------------- reduction and prefix sum
PARALLEL = HEAD + """
__kernel void fill_iota_f32(__global float* out, const ulong n) {
    for (ulong i = get_global_id(0); i < n; i += get_global_size(0)) out[i] = (float)(i & 1023UL) * 0.001f;
}
__kernel void fill_iota_u32(__global uint* out, const ulong n) {
    for (ulong i = get_global_id(0); i < n; i += get_global_size(0)) out[i] = (uint)(i & 1023UL);
}
// work group size must be a power of two (256)
__kernel void red_f32(__global const float* in, __global float* part, const ulong n, __local float* sc) {
    const uint l = (uint)get_local_id(0);
    float acc = 0.0f;
    for (ulong i = get_global_id(0); i < n; i += get_global_size(0)) acc += in[i];
    sc[l] = acc;
    barrier(CLK_LOCAL_MEM_FENCE);
    for (uint s = (uint)get_local_size(0) >> 1; s > 0; s >>= 1) {
        if (l < s) sc[l] += sc[l + s];
        barrier(CLK_LOCAL_MEM_FENCE);
    }
    if (l == 0) part[get_group_id(0)] = sc[0];
}
__kernel void red_u32(__global const uint* in, __global ulong* part, const ulong n, __local ulong* sc) {
    const uint l = (uint)get_local_id(0);
    ulong acc = 0;
    for (ulong i = get_global_id(0); i < n; i += get_global_size(0)) acc += (ulong)in[i];
    sc[l] = acc;
    barrier(CLK_LOCAL_MEM_FENCE);
    for (uint s = (uint)get_local_size(0) >> 1; s > 0; s >>= 1) {
        if (l < s) sc[l] += sc[l + s];
        barrier(CLK_LOCAL_MEM_FENCE);
    }
    if (l == 0) part[get_group_id(0)] = sc[0];
}
// inclusive scan of 256 values per group (Hillis-Steele); group totals go to sums
__kernel void scan_block(__global const uint* in, __global uint* out, __global uint* sums, const uint n) {
    __local uint t[256];
    const uint l = (uint)get_local_id(0), g = (uint)get_global_id(0);
    t[l] = (g < n) ? in[g] : 0u;
    barrier(CLK_LOCAL_MEM_FENCE);
    for (uint off = 1; off < 256u; off <<= 1) {
        const uint add = (l >= off) ? t[l - off] : 0u;
        barrier(CLK_LOCAL_MEM_FENCE);
        t[l] += add;
        barrier(CLK_LOCAL_MEM_FENCE);
    }
    if (g < n) out[g] = t[l];
    if (l == 255u) sums[get_group_id(0)] = t[l];
}
__kernel void scan_add(__global uint* out, __global const uint* sums_scanned, const uint n) {
    const uint g = (uint)get_global_id(0), blk = (uint)get_group_id(0);
    if (blk > 0 && g < n) out[g] += sums_scanned[blk - 1];
}
"""

ALL_SOURCES = {'ARITH': ARITH, 'MEM': MEM, 'SHALLOW': SHALLOW, 'FLOW': FLOW, 'DIFFUSE': DIFFUSE, 'AGENTS': AGENTS, 'PARALLEL': PARALLEL}
