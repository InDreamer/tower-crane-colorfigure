
/* ================= painter's order =================
   Every pair of parts that overlap on screen gets an arc "this one first": boxes separated along an axis; else the
   part whose front face is nearer the viewer along rays through their overlap (frontGap); else (level fronts) one
   part wholly outside a face plane of the other; a part inside a shell before the shell; last a fixed build-order
   tie-break. Each arc carries the screen area it decides. The arcs are then added to a depth-sorted order heaviest
   first, skipping any that would close a cycle (orderParts). */
function projectionAxes(poly){
  return poly.map((p, i) => { const q = poly[(i+1) % poly.length], nx = q[1] - p[1], ny = p[0] - q[0], eps = .05*(Math.hypot(nx, ny) || 1);
    let min = Infinity, max = -Infinity;
    for (const v of poly){ const d = v[0]*nx + v[1]*ny; if (d < min) min = d; if (d > max) max = d; }
    return { nx, ny, min, max, eps }; });
}
function polysOverlap(A, B, axesA = projectionAxes(A), axesB = projectionAxes(B)){
  for (const [axes, other] of [[axesA, B], [axesB, A]]) for (const a of axes){
    let min = Infinity, max = -Infinity;
    for (const v of other){ const d = v[0]*a.nx + v[1]*a.ny; if (d < min) min = d; if (d > max) max = d; }
    if (a.max <= min + a.eps || max <= a.min + a.eps) return false;
  }
  return true;
}
// q wholly outside one of p's face planes: q goes after p if the viewer is on that outer side
function planeOrder(p, q){
  if (!p.planes) return 0;
  let best = null, bm = -1e9;
  for (const [n, d] of p.planes){ let mn = 1e9; for (const v of q.pts){ const t = dot(n, v) - d; if (t < mn) mn = t; } if (mn > bm){ bm = mn; best = n; } }
  if (bm < -.08) return 0;
  return dot(best, CAM_V) > 0 ? -1 : 1;
}
/* Which of two screen-overlapping convex parts is in front? Look along the view ray: through a point of their overlap on
   screen, every convex part is hit over an interval of depth, and the one whose front face is nearer the viewer is
   drawn last. For two parts that do not interpenetrate this is exactly "the viewer is on that side of a plane
   separating them", it is continuous in the view angle, and (unlike a box or centre test) it is right for long, thin,
   wrapping parts. Rays are cast through the centre of the overlap polygon and a few points toward its corners. */
const RAY = { t0: 0, t1: 0 };
function rayTable(p){                       // per face plane: normal . right, . down, . toward viewer, offset
  const pl = p.planes, m = new Float64Array(pl.length*4);
  for (let i = 0; i < pl.length; i++){ const n = pl[i][0]; m[4*i] = dot(n, CAM_R); m[4*i+1] = dot(n, CAM_D); m[4*i+2] = dot(n, CAM_V); m[4*i+3] = pl[i][1]; }
  return m;
}
function rayHit(m, a, b){                   // ray = a*right + b*down + t*toward-viewer; sets RAY.t0/t1 = depth interval inside the solid
  let t0 = -Infinity, t1 = Infinity;
  for (let i = 0; i < m.length; i += 4){
    const num = m[i+3] - a*m[i] - b*m[i+1], s = m[i+2];
    if (s > 1e-9){ const t = num/s; if (t < t1) t1 = t; } else if (s < -1e-9){ const t = num/s; if (t > t0) t0 = t; } else if (num < 0) return false;
  }
  if (t0 > t1 + 1e-7) return false;
  RAY.t0 = t0; RAY.t1 = t1; return true;
}
function clipConvex(S, C){                  // Sutherland-Hodgman, convex S by convex C (both counter-clockwise)
  let out = S;
  for (let i = 0; i < C.length && out.length; i++){
    const a = C[i], b = C[(i+1) % C.length], ex = b[0] - a[0], ey = b[1] - a[1], inp = out; out = [];
    for (let j = 0; j < inp.length; j++){
      const p = inp[j], q = inp[(j+1) % inp.length], sp = ex*(p[1] - a[1]) - ey*(p[0] - a[0]), sq = ex*(q[1] - a[1]) - ey*(q[0] - a[0]);
      if (sp >= 0) out.push(p);
      if ((sp >= 0) !== (sq >= 0)){ const t = sp/(sp - sq); out.push([p[0] + (q[0] - p[0])*t, p[1] + (q[1] - p[1])*t]); }
    }
  }
  return out;
}
// depth by which p's front face is nearer the viewer than q's, averaged over the rays through their overlap, and the
// smallest clearance between the two solids along those rays (negative: they interpenetrate on some ray)
const GAP = { gap: NaN, clear: 0, area: 0 };
function frontGap(p, q, s0){
  GAP.gap = NaN; GAP.clear = 0; GAP.area = 0;
  const poly = clipConvex(p.hl, q.hl);
  if (poly.length < 3 || !p.planes || !q.planes) return NaN;
  if (!p.rt) p.rt = rayTable(p);
  if (!q.rt) q.rt = rayTable(q);
  for (let k = 0; k < poly.length; k++){ const a = poly[k], b = poly[(k+1) % poly.length]; GAP.area += a[0]*b[1] - b[0]*a[1]; }
  GAP.area = Math.abs(GAP.area)/2;
  const m = [0, 0]; for (const v of poly){ m[0] += v[0]; m[1] += v[1]; } m[0] /= poly.length; m[1] /= poly.length;
  const step = Math.max(1, Math.ceil(poly.length/4));
  let sum = 0, wsum = 0, clear = Infinity;
  for (let k = -1; k < poly.length; k += step){
    const x = k < 0 ? m[0] : m[0] + (poly[k][0] - m[0])*.6, y = k < 0 ? m[1] : m[1] + (poly[k][1] - m[1])*.6, a = (x - s0[0])/CAM_K, b = (y - s0[1])/CAM_K;
    if (!rayHit(p.rt, a, b)) continue; const pf = RAY.t1, pb = RAY.t0;
    if (!rayHit(q.rt, a, b)) continue;
    const w = k < 0 ? 2 : 1; sum += w*(pf - RAY.t1); wsum += w;
    const c = Math.max(RAY.t0 - pf, pb - RAY.t1); if (c < clear) clear = c;
  }
  if (!wsum) return NaN;
  GAP.gap = sum/wsum; GAP.clear = clear;
  return GAP.gap;
}
// what the last orderParts did (read by the tests): arcs made, arcs decided only by the tie-break, arcs dropped to break a cycle
const ORDER_STATS = { pairs: 0, tiebreak: 0, dropped: 0 };
const ORDER_TOL = .08;                      // world units: below this the fronts are level and the other rules decide
// pairwise decision: -1 if p goes first, 1 if q does. PAIR_W (its second result) is how much it matters: about the screen
// area at stake, a quarter of that for parts that interpenetrate (a rod through a bracket, a thing inside a shell),
// which are the first to give up when a cycle has to be broken.
let PAIR_W = 0;
function pairOrder(p, q, s0){
  let r = sepOrder(p, q);                     // boxes apart along an axis: a plane separates them, nothing to measure
  if (r){ PAIR_W = (Math.min(p.sb[2], q.sb[2]) - Math.max(p.sb[0], q.sb[0]))*(Math.min(p.sb[3], q.sb[3]) - Math.max(p.sb[1], q.sb[1]))*.5 + 1e-3; return r; }
  const g = frontGap(p, q, s0);
  PAIR_W = (GAP.clear > 0 ? 1 : .25)*GAP.area + 1e-3;
  if (g > ORDER_TOL) return 1;
  if (g < -ORDER_TOL) return -1;
  r = planeOrder(p, q);
  if (!r) r = -planeOrder(q, p);
  if (r){ PAIR_W = .02; return r; }
  if (p.rank !== q.rank){ PAIR_W = .01; return p.rank < q.rank ? -1 : 1; }
  ORDER_STATS.tiebreak++; PAIR_W = .001;
  return p.i > q.i ? 1 : -1;                  // a fixed, view-independent tie-break (build order): nothing to flicker
}
function orderParts(ps){
  const n = ps.length, s0 = P(0, 0, 0);
  ORDER_STATS.pairs = ORDER_STATS.tiebreak = ORDER_STATS.dropped = 0;
  for (let i = 0; i < n; i++){ const p = ps[i];
    p.i = i; p.hl = hull(p.pts.map(q => P(q[0], q[1], q[2])));
    let a = 1e9, b = 1e9, c = -1e9, d = -1e9;
    for (const q of p.hl){ if (q[0] < a) a = q[0]; if (q[0] > c) c = q[0]; if (q[1] < b) b = q[1]; if (q[1] > d) d = q[1]; }
    p.sb = [a, b, c, d]; p.dp = depthOf(boxMid(p.box)); p.axes = projectionAxes(p.hl); p.rt = null;
  }
  const EA = [], EB = [], EW = [];                // arcs: EA goes before EB, with weight EW
  const idx = [...ps.keys()].sort((i, j) => ps[i].sb[0] - ps[j].sb[0]);
  for (let ii = 0; ii < n; ii++){ const i = idx[ii], p = ps[i];
    for (let jj = ii + 1; jj < n; jj++){ const j = idx[jj], q = ps[j];
      if (q.sb[0] >= p.sb[2]) break;
      if (p.sb[3] <= q.sb[1] || q.sb[3] <= p.sb[1]) continue;
      if (p.seg !== undefined && p.seg === q.seg && Math.abs(i - j) === 1) continue;     // neighbouring pieces of one hose
      if (!polysOverlap(p.hl, q.hl, p.axes, q.axes)) continue;
      const r = pairOrder(p, q, s0); ORDER_STATS.pairs++;
      EA.push(r < 0 ? i : j); EB.push(r < 0 ? j : i); EW.push(PAIR_W); } }
  /* Start from the depth order and add the arcs most worth keeping first (largest area where the order is certain),
     each only if it does not close a cycle (incremental topological order, Pearce-Kelly). A cycle of mutual occlusion
     therefore gives up its least visible arc, the rest of the order stays as close to the plain depth order as the
     arcs allow, and it changes smoothly as the view turns. */
  const ne = EW.length, key = new Float64Array(ne);          // sort by weight (quantised), heaviest last; the arc number breaks ties
  for (let e = 0; e < ne; e++) key[e] = Math.floor(Math.min(EW[e]*64, 1e9))*1048576 + e;
  key.sort();
  const seq = [...ps.keys()].sort((i, j) => ps[i].dp - ps[j].dp || i - j), ord = new Int32Array(n);
  seq.forEach((u, k) => ord[u] = k);
  const hF = new Int32Array(n).fill(-1), hB = new Int32Array(n).fill(-1), nF = new Int32Array(ne), nB = new Int32Array(ne), seen = new Uint8Array(n);
  for (let k = ne - 1; k >= 0; k--){ const e = key[k] % 1048576, x = EA[e], y = EB[e];
    if (ord[x] > ord[y]){                                  // against the current order: does y already lead to x?
      const lb = ord[y], ub = ord[x], F = [y], B = [x];
      seen[y] = 1; let cyc = false;
      for (let t = 0; t < F.length && !cyc; t++) for (let a = hF[F[t]]; a >= 0; a = nF[a]){ const v = EB[a];
        if (v === x){ cyc = true; break; } if (!seen[v] && ord[v] < ub){ seen[v] = 1; F.push(v); } }
      if (!cyc){ seen[x] = 1;
        for (let t = 0; t < B.length; t++) for (let a = hB[B[t]]; a >= 0; a = nB[a]){ const v = EA[a]; if (!seen[v] && ord[v] > lb){ seen[v] = 1; B.push(v); } } }
      for (const u of F) seen[u] = 0; for (const u of B) seen[u] = 0;
      if (cyc){ ORDER_STATS.dropped++; continue; }
      F.sort((a, b) => ord[a] - ord[b]); B.sort((a, b) => ord[a] - ord[b]);
      const L = B.concat(F), slots = L.map(u => ord[u]).sort((a, b) => a - b);
      L.forEach((u, t) => { ord[u] = slots[t]; seq[slots[t]] = u; });
    }
    nF[e] = hF[x]; hF[x] = e; nB[e] = hB[y]; hB[y] = e;
  }
  const out = seq.map(i => ps[i]);
  return out;
}

/* ================= labels: anchors per part number (local point in a frame, moved like the part) ================= */
const LBL = {
  1: ['g', [12.4, 12.4, 5]], 2: ['cw', [-42.5, 4.05, 79]], 3: ['cj', [-30, 6.9, 87.4]], 4: ['jib', [13, 0, 89.2]], 5: ['lo', [0, 7.2, 84.5]],
  6: ['cab', [3.5, 17.05, 90]], 7: ['jib', [62, 0, 94.8]], 8: ['trol', [0, 1.9, 88.6]], 9: ['hook', [0, 1.6, 45], { xo: [0, 0, -8*HKS] }], 10: ['s1', [5.4, 5.4, 8]],
  11: ['top', [3.4, 3.4, 106]], 12: ['trol', [-TROL_SX, 0, RZ + ROPE_R]], 13: ['cj', [-24, 3, 95.4]], 14: ['jib', [35, 2.5, 106]], 15: ['cf', [4, 8.2, 70]],
  16: ['cf', [CYL_X, 0, 68]], 17: ['cf', [3, 11.1, 72.6], { xo: [0, 16, 0] }], 18: ['cj', [-11, 3.4, 92]], 19: ['top', [4.6, -6.6, 96]], 20: ['top', [-1.6, 1.6, 123]],
  21: ['top', [1.6, -1.6, 118]], 22: ['s1', [-3.9, 1, 6]], 23: ['cj', [-20, 4.2, 103]], 24: ['jib', [60, 0, 87.6]] };
function lblPoint(n){
  // a rope is not fixed to one frame (its ends follow what it is tied to): label the middle of its longest built piece
  if (n === 12 || n === 24){
    let best = null, bl = -1;
    for (const q of PARTS) if (q.hose && q.n === n){ const l = Math.hypot(q.box[1][0] - q.box[0][0], q.box[1][1] - q.box[0][1], q.box[1][2] - q.box[0][2]); if (l > bl){ bl = l; best = q; } }
    if (best) return avg(best.pts);
  }
  const [fr, p, o] = LBL[n];
  use(fr, n, o || {});
  return wpt(p);
}
const lblW = (t, fs) => [...t].reduce((a, c) => a + (c.charCodeAt(0) > 255 ? 1.05 : .62), 0)*fs + fs*3;
function labelLayer(st, items, title, Zp, kk){
  const svgEl = document.getElementById('fig'), vb = svgEl.viewBox.baseVal, btn = document.getElementById('btns');
  const u = window.LBL_U ? LBL_U() : 0, fs = u ? 10*u : 8.6*kk, hgt = u ? 17*u : fs*1.85, gap = hgt + (u ? 3*u : 2.6*kk);
  const pts = items.map(it => Zp(P(...it.w)));
  let s = '';
  if (items.length){
    const xs = PARTS_SB, cx = (xs[0] + xs[2])/2;
    const L = [], R = [];
    // a label picks the side and the row where its leader crosses the least of the other systems' parts (a tie: the side the anchor is on,
    // the row nearest the anchor) and stays there
    const Q = PARTS.filter(p => p.n || (p.fr === 'load' && !p.hose)).map(p => { const h = p.hl.map(q => Zp(q)); let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const q of h){ a = Math.min(a, q[0]); c = Math.max(c, q[0]); b = Math.min(b, q[1]); d = Math.max(d, q[1]); }
      return { h, n: p.n, ld: !p.n, sy: p.sys, bb: [a, b, c, d], sg: h.reduce((t, q, i) => t + q[0]*h[(i + 1) % h.length][1] - h[(i + 1) % h.length][0]*q[1], 0) > 0 ? 1 : -1 }; });
    const run = (a, b, sy) => { let t = 0, x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]);
      for (const q of Q){ if (q.sy === sy || (q.ld && sy >= 0) || q.bb[2] < x0 || q.bb[0] > x1 || q.bb[3] < y0 || q.bb[1] > y1) continue;
        let t0 = 0, t1 = 1, ins = true; const dx = b[0] - a[0], dy = b[1] - a[1], h = q.h;      // Cyrus-Beck: the part of the segment inside this convex hull
        for (let i = 0; i < h.length && t1 > t0; i++){ const p0 = h[i], p1 = h[(i + 1) % h.length], ex = p1[0] - p0[0], ey = p1[1] - p0[1];
          const nn = q.sg*(ex*(a[1] - p0[1]) - ey*(a[0] - p0[0])), dd = q.sg*(ex*dy - ey*dx); if (nn < 0) ins = false;
          if (Math.abs(dd) < 1e-12){ if (nn < 0) t1 = -1; } else if (dd > 0) t0 = Math.max(t0, -nn/dd); else t1 = Math.min(t1, -nn/dd); }
        if (t1 > t0 && !ins) t += (t1 - t0)*Math.hypot(dx, dy); }       // (a hull the leader starts inside is the thing it points at, not a crossing)
      return t; };
    // the buttons (left) and the readout (right) keep their corner clear, but only for a column that reaches under them
    const base = vb.y + fs*1.2, blk = { [-1]: [-1e9, base], [1]: [1e9, base] };
    if (btn && svgEl.getScreenCTM()){ const r = btn.getBoundingClientRect(), q = new DOMPoint(r.right, r.bottom + 14).matrixTransform(svgEl.getScreenCTM().inverse()); blk[-1] = [q.x, q.y + hgt/2]; }
    const sp2 = document.getElementById('stats'), vs = document.querySelector('.vset');
    if (sp2 && svgEl.getScreenCTM()){ const r = (vs || sp2).getBoundingClientRect(), q = new DOMPoint(r.left, r.bottom + 10).matrixTransform(svgEl.getScreenCTM().inverse()); blk[1] = [q.x, q.y + hgt/2]; }
    const topAt = (sd, x0, x1) => sd < 0 ? (x0 < blk[-1][0] ? Math.max(base, blk[-1][1]) : base) : (x1 > blk[1][0] ? Math.max(base, blk[1][1]) : base);
    const mw = Math.max(...items.map(it => u ? hgt*1.3 : lblW(it.text, fs)));      // (the widest label: a side's column count)
    const bot = vb.y + vb.height - hgt;
    const EXd = { [-1]: Math.max(vb.x + 4*kk + mw, xs[0] - 14*kk) + 5*kk, [1]: Math.min(vb.x + vb.width - 4*kk - mw, xs[2] + 14*kk) - 5*kk };      // (where a leader reaches its column: the slant ends 5 short of the label)
    // the labels take their rows one after the other (the rows already taken on a side stay taken); working labels try top-down and bottom-up and keep the cheaper
    const xing = (a, b, c, d) => { const o = (p, q, r) => Math.sign((q[0] - p[0])*(r[1] - p[1]) - (q[1] - p[1])*(r[0] - p[0])); return o(a, b, c)*o(a, b, d) < 0 && o(c, d, a)*o(c, d, b) < 0; };      // (two leaders cross)
    const placeAll = ord => { const occ = { [-1]: [], [1]: [] }, lead = { [-1]: [], [1]: [] }, L = [], R = []; let tot = 0; ord.forEach(i => { const it = items[i], c = { ...it, X: pts[i][0], Y: pts[i][1], w: u ? hgt*(it.n > 9 ? 1.3 : 1) : lblW(it.text, fs) }, sy = it.all ? -1 : SYS_OF(it.n);       // (working labels count every part they cross, their own system too)
      let best = null;
      // a working label may move its dot to the part's silhouette (a few px inside the outline) where that gives a leader that
      // crosses less; the dot then sits on the part, at a point it covers on screen
      const cs = [[c.X, c.Y, 0]];
      if (it.all){ const own = Q.filter(q => q.n === it.n).flatMap(q => q.h); if (own.length){ const hh = hull(own), m = hh.reduce((a, q) => [a[0] + q[0]/hh.length, a[1] + q[1]/hh.length], [0, 0]);
        for (const q of hh){ const d = Math.hypot(q[0] - m[0], q[1] - m[1]) || 1, k = Math.min(1, 4*kk/d); cs.push([q[0] + k*(m[0] - q[0]), q[1] + k*(m[1] - q[1]), 0]); }
        hh.forEach((q, i) => { const r = hh[(i + 1) % hh.length], e = [(q[0] + r[0])/2, (q[1] + r[1])/2], d = Math.hypot(e[0] - m[0], e[1] - m[1]) || 1, k = Math.min(1, 4*kk/d); cs.push([e[0] + k*(m[0] - e[0]), e[1] + k*(m[1] - e[1]), 0]); }); cs.push([m[0], m[1], 0]); cs.forEach(a => { a[2] = .3*Math.hypot(a[0] - c.X, a[1] - c.Y); }); } }
      for (const [ax, ay, mv] of cs) for (const sd of [-1, 1]){
        const tp = topAt(sd, xs[0] - 14*kk - c.w, xs[2] + 14*kk + c.w), rows = [...Array(it.all ? 41 : 33).keys()].map(k => ay + (k - (it.all ? 20 : 16))*gap*(it.all ? 1 : .5)); for (const o of occ[sd]) rows.push(o - gap, o + gap);
        for (const T of rows){
          if (T < tp || T > bot || occ[sd].some(o => Math.abs(T - o) < gap - 1e-6)) continue;
          const E = [EXd[sd], T];
          const cost = run([ax, ay], E, sy) + .1*Math.abs(T - ay) + ((ax < cx) === (sd < 0) ? 0 : 4*kk) + mv + (it.all ? 400*kk*lead[sd].filter(l => xing([ax, ay], E, l[0], l[1])).length : 0);      // (a working label's leader crossing another is swapped away later, so it costs what the swap would)
          if (!best || cost < best.cost - 1e-6) best = { cost, sd, T, ax, ay }; } }
      if (!best){ const sd = c.X < cx ? -1 : 1; best = { sd, T: Math.max(c.Y, topAt(sd, xs[0] - 14*kk - c.w, xs[2] + 14*kk + c.w)) }; }       // (no free row: the spacing below sorts it out)
      if (best.ax != null){ c.X = best.ax; c.Y = best.ay; }
      c.T = best.T; tot += best.cost || 0; occ[best.sd].push(c.T); lead[best.sd].push([[c.X, c.Y], [EXd[best.sd], c.T]]); (best.sd < 0 ? L : R).push(c); });
      return { L, R, tot }; };
    const ord0 = [...items.keys()].sort((i, j) => pts[i][1] - pts[j][1]);
    let pl = placeAll(ord0); if (items.some(it => it.all)){ const p2 = placeAll([...ord0].reverse()); if (p2.tot < pl.tot - 1e-6) pl = p2; }
    L.push(...pl.L); R.push(...pl.R);
    // a side with more labels than rows takes a second column further out (alternate labels, so the leaders pass between the inner ones)
    const lanes = [], inW = {};
    for (const [col, sd] of [[L, -1], [R, 1]]){
      col.sort((a, b) => a.T - b.T);
      if (col.length <= Math.floor((bot - topAt(sd, xs[0] - 14*kk - mw, xs[2] + 14*kk + mw))/gap) + 1) lanes.push([col, sd, 0]);
      else { const a = [], b = []; col.forEach((c, i) => (i % 2 ? b : a).push(c)); lanes.push([a, sd, 0], [b, sd, 1]); }
    }
    for (const [col, sd, lane] of lanes){
      const maxW = Math.max(0, ...col.map(c => c.w)), out = lane ? inW[sd] + 6*kk : 0; if (!lane) inW[sd] = maxW;
      const edge = sd < 0 ? Math.max(vb.x + 4*kk, xs[0] - 14*kk - maxW - out) : Math.min(vb.x + vb.width - 4*kk - maxW, xs[2] + 14*kk + out), exC = sd < 0 ? edge + maxW : edge;
      let y = -1e9; for (const c of col){ c.py = Math.max(c.T, y + gap, sd < 0 ? topAt(-1, exC - c.w, exC) : topAt(1, edge, edge + c.w)); y = c.py; }
      const over = col.length ? col[col.length - 1].py - bot : 0;
      if (over > 0){ let lim = bot; for (let i = col.length - 1; i >= 0; i--){ col[i].py = Math.min(col[i].py, lim); lim = col[i].py - gap; } }
      // leaders must not cross: where two do, the two labels swap places (every swap shortens the leaders, so this ends)
      const side = (a, b, c2) => { const d = ((b[0] - a[0])*(c2[1] - a[1]) - (b[1] - a[1])*(c2[0] - a[0]))/(Math.hypot(b[0] - a[0], b[1] - a[1]) || 1); return Math.abs(d) < .6*kk ? 0 : Math.sign(d); };       // (a point within a line's width of it counts as on it)
      for (let pass = 0, swapped = true; swapped && pass < 60; pass++){ swapped = false;
        for (let i = 0; i < col.length; i++) for (let j = i + 1; j < col.length; j++){
          const a = col[i], b = col[j], A0 = [a.X, a.Y], A1 = [exC, a.py], B0 = [b.X, b.Y], B1 = [exC, b.py];
          if (side(A0, A1, B0)*side(A0, A1, B1) <= 0 && side(B0, B1, A0)*side(B0, B1, A1) <= 0){ [a.py, b.py] = [b.py, a.py]; swapped = true; } } }
      for (const c of col){
        const px = sd < 0 ? edge + maxW - c.w/2 : edge + c.w/2, ex = px - sd*c.w/2;
        const lit = c.on, colr = c.col || SYSC[SYS_OF(c.n)];
        s += `<g class="${c.always ? 'tg2' : 'tag'}${lit ? ' on' : ''}" data-n="${c.n}" data-t="${c.text}"><path d="M${f(c.X)} ${f(c.Y)}L${f(ex - sd*5*kk)} ${f(c.py)}L${f(ex)} ${f(c.py)}" fill="none" stroke="${lit ? colr : INK}" style="stroke-width:${f((lit ? 1.6 : 1)*kk)}px"/>`
          + `<circle cx="${f(c.X)}" cy="${f(c.Y)}" r="${f(1.6*kk)}" fill="${colr}" stroke="${INK}" style="stroke-width:${f(.6*kk)}px"/>`
          + `<rect x="${f(px - c.w/2)}" y="${f(c.py - hgt/2)}" width="${f(c.w)}" height="${f(hgt)}" rx="${f(hgt/2)}" fill="${lit ? mix(colr, '#ffffff', .55) : '#fff8e6'}" stroke="${lit ? colr : INK}" style="stroke-width:${f((lit ? 2 : 1.1)*kk)}px"/>`
          + (u ? `<text x="${f(px)}" y="${f(c.py + fs*.36)}" font-size="${f(fs)}" text-anchor="middle" font-family="${CJKF}" font-weight="800" fill="${INK}">${c.n}</text>`
            : `<circle cx="${f(px - c.w/2 + hgt/2)}" cy="${f(c.py)}" r="${f(hgt/2 - 1.6*kk)}" fill="${colr}"/>`
            + `<text x="${f(px - c.w/2 + hgt/2)}" y="${f(c.py + fs*.32)}" font-size="${f(fs*.82)}" text-anchor="middle" font-family="${CJKF}" font-weight="800" fill="#fff">${c.n}</text>`
            + `<text x="${f(px - c.w/2 + hgt + fs*.35)}" y="${f(c.py + fs*.36)}" font-size="${f(fs)}" font-family="${CJKF}" font-weight="800" fill="${INK}">${c.text}</text>`) + `</g>`;
      }
    }
  }
  if (title){ const sx = Math.min(vb.x + vb.width - 70*kk, Math.max(vb.x + 70*kk, title.X)), sy = Math.max(vb.y + 30*kk, title.Y), colr = SYSC[title.k], tf = 11.5*kk;
    const w = lblW(title.text, tf) + tf*1.2, h = tf*2.1;
    s += `<g data-title="${title.k}" style="cursor:pointer"><rect x="${f(sx - w/2)}" y="${f(sy - h/2)}" width="${f(w)}" height="${f(h)}" rx="${f(h/2)}" fill="${mix(colr, '#ffffff', .82)}" stroke="${colr}" style="stroke-width:${f(2*kk)}px"/>`
      + `<circle cx="${f(sx - w/2 + h/2)}" cy="${f(sy)}" r="${f(h/2 - 2.4*kk)}" fill="${colr}"/><text x="${f(sx - w/2 + h/2)}" y="${f(sy + tf*.36)}" font-size="${f(tf*.9)}" text-anchor="middle" font-family="${CJKF}" font-weight="800" fill="#fff">${title.k}</text>`
      + `<text x="${f(sx - w/2 + h + tf*.4)}" y="${f(sy + tf*.37)}" font-size="${f(tf)}" font-family="${CJKF}" font-weight="800" fill="${colr}">${title.text}</text></g>`; }
  return s;
}

// how opaque a part is drawn: covers fade in see-through (k = how far it has faded in); a picked sub-part shows its insides too; lattice fades a little
function partFade(p, st){
  const k = ease(clamp01(st.xr || 0)), ks = Math.max(k, p.n === st.subSel ? Math.min(1, st.pull[p.n] || 0)*.7 : 0);
  return p.shell && ks > 0 ? 1 - .8*ks : p.lat && k > 0 ? 1 - .55*k : 1;
}

/* ================= the scene ================= */
let INK0 = 0, PARTS_SB = [0, 0, 0, 0];
function scene(st, m){
  if (!INK0) INK0 = INK_K;
  GST = st;
  st.E = st.p.map(v => ease(clamp01(v)));
  setFrames(st);
  PARTS = [];
  INK_K = INK0/(st.zs || 1);
  buildTower(st); buildSlew(st); buildJib(st); buildCounter(st); buildRopes(st); buildClimb(st); buildSite(st);
  // framing: fit what is on show (turning the view does not change the zoom), smoothly. The picture is centred on the
  // middle of the crane at slew 0 and stays there while the upper part turns round the tower.
  const svgEl = document.getElementById('fig'), vb = svgEl.viewBox.baseVal;
  const ur = p => rotZ(p, -st.slew), bx = bboxOf(PARTS.filter(p => p.n).flatMap(p => [ur(p.box[0]), ur(p.box[1]), ur([p.box[0][0], p.box[1][1], p.box[0][2]]), ur([p.box[1][0], p.box[0][1], p.box[1][2]])]));
  const cxw = (bx[0][0] + bx[1][0])/2, cyw = (bx[0][1] + bx[1][1])/2, czw = (bx[0][2] + bx[1][2])/2;
  // the picture size that holds the crane (taken apart or not) in every view: the widest and tallest it gets over a full turn at this pitch
  const pc = Math.cos(PITCH*Math.PI/180), ps = Math.sin(PITCH*Math.PI/180);
  let Wm = 0, Hm = 0;
  for (let k = 0; k < 24; k++){
    const th = k*Math.PI/12, c = Math.cos(th), sn = Math.sin(th); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const p of PARTS) if (p.n) for (let i = 0; i < 8; i++){
      const dx = p.box[i & 1][0] - cxw, dy = p.box[(i >> 1) & 1][1] - cyw, dz = p.box[i >> 2][2] - czw, X = dx*sn - dy*c, Y = ps*(dx*c + dy*sn) - pc*dz;
      if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y; }
    Wm = Math.max(Wm, x1 - x0); Hm = Math.max(Hm, y1 - y0);
  }
  const Wp = Wm*CAM_K, Hp = Hm*CAM_K;
  const showL = st.sel > 0 || st.busy || st.auto || !!st.act || st.over > 0 || !document.documentElement.classList.contains('nolabels');
  const zt = Math.max(.5, Math.min(2.2, Math.min((showL ? (innerWidth <= 560 ? .82 : .64) : .9)*vb.width/Wp, .85*vb.height/Hp)));
  st.zs = st.zs ? st.zs + (zt - st.zs)*.2 : zt;
  if (Math.abs(st.zs - zt) > .002) st.zoomMoving = true; else { st.zs = zt; st.zoomMoving = false; }
  const zs = st.zs; INK_K = INK0/zs;
  const Fp = P(cxw, cyw, czw), Ap = [vb.x + vb.width*.5, vb.y + vb.height*.48];
  const tx = Ap[0] - zs*Fp[0], ty = Ap[1] - zs*Fp[1], Zp = p => [tx + zs*p[0], ty + zs*p[1]];
  // the parts in painter's order; shells fade in see-through
  const ord = orderParts(PARTS);
  let body = '';
  for (const p of ord){
    let g = `<g data-ps="${p.sys}" data-pn="${p.n}">${p.svg}</g>`;
    const fd = partFade(p, st); if (fd < 1) g = `<g opacity="${f(fd)}">${g}</g>`;
    body += g;
  }
  // shadows: one hull per piece of the crane, so the ground shadow keeps the crane's shape (a hull of the whole mast and jib would be one
  // solid wedge): each mast section, the cross base, the jib in four lengths, counter-jib, counterweight, slewing unit, tower top, cab, hook
  // block, climbing frame. Ropes and tie bars cast none. What stands on the ground casts full, lifted systems a faint one
  use('jib', 7); const j0 = wpt([0, 0, 90]), jd = sub(wpt([105, 0, 90]), j0), jl = dot(jd, jd);
  const jc = p => { const c = [0, 1, 2].map(k => (p.box[0][k] + p.box[1][k])/2); return Math.min(3, Math.max(0, Math.floor(4*dot(sub(c, j0), jd)/jl))); };
  const groups = {};
  for (const p of PARTS){
    if (p.n === 12 || p.n === 24 || p.n === 14 || p.n === 23 || p.hose) continue;
    const k = p.fr === 'jib' || p.fr === 'trol' ? 'j' + jc(p) : p.fr === 'lo' || p.fr === 'su' ? 'su' : p.fr;
    (groups[k] = groups[k] || { sys: p.sys, pts: [] }).pts.push(...p.pts); }
  let shN = '', shF = '';
  for (const g of Object.values(groups)){ if (st.E[g.sys] > .15) shF += castShadow(g.pts, 0); else shN += castShadow(g.pts, 0); }
  INK_K = INK0;
  PARTS_SB = (() => { const b = PARTS.map(p => p.sb); return [Math.min(...b.map(q => q[0])), Math.min(...b.map(q => q[1])), Math.max(...b.map(q => q[2])), Math.max(...b.map(q => q[3]))].map((v, i) => i % 2 ? ty + zs*v : tx + zs*v); })();
  INK_K = INK0/zs;
  let out = `<g transform="translate(${f(tx)} ${f(ty)}) scale(${zs.toFixed(4)})"><g opacity=".9">${shN}</g><g opacity=".13">${shF}</g>${body}</g>`;
  // labels: a separated system shows its own; while working the busy parts; the Labels switch shows all of them
  INK_K = INK0;
  const act = activeParts(st), items = [];
  let title = null;
  if (st.sel > 0){
    for (let n = 1; n <= NPART; n++) if (SYS_OF(n) === st.sel) items.push({ n, text: PNAME[n], w: lblPoint(n), on: st.subSel === n || act.has(n), always: true });
    const ws = items.map(it => Zp(P(...it.w)));
    const sb = PARTS.filter(p => p.sys === st.sel).map(p => [Zp([p.sb[0], p.sb[1]]), Zp([p.sb[2], p.sb[3]])]);       // the name sits above the whole system, not just above its label anchors
    title = { k: st.sel, text: SYSN[st.sel], X: (Math.min(...sb.map(b => b[0][0])) + Math.max(...sb.map(b => b[1][0])))/2, Y: Math.min(ws.reduce((a, q) => Math.min(a, q[1]), 1e9) - 34*INK0, Math.min(...sb.map(b => b[0][1])) - 22*INK0) };
  } else if (st.busy || st.auto || st.act || st.over > 0){
    for (const n of act) items.push({ n, text: PNAME[n], w: lblPoint(n), on: true, always: true, all: true, col: n === 19 ? (st.over > 0 ? '#d93a2e' : '#e8a317') : null });
  } else if (!document.documentElement.classList.contains('nolabels')) {
    for (let n = 1; n <= NPART; n++) items.push({ n, text: PNAME[n], w: lblPoint(n), on: false });
  }
  if (items.length || title) out += labelLayer(st, items, title, Zp, INK0);
  return out;
}
