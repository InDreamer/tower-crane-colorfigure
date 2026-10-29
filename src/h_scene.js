
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
  1: ['cab', [158, 48, 52]], 2: ['ch', [148, 31, 28]], 3: ['ch', [130, 30, 24]], 4: ['ch', [112, 25, 17.6]], 5: ['ch', [AX_R[1], 29, 13]],
  6: ['ch', [60, 33.6, 19]], 7: ['ch', [AX_F, 48.2, 15], { pull: [0, 12, 0] }], 8: ['body', [100, 48, 58]], 9: ['gate', 'slide'], 10: ['body', 'ej'],
  11: ['body', [72, 48, 40], { pull: [0, 14, 0] }], 12: ['gate', [20, 49, 58]], 13: ['body', [40.3, 48.4, 46]], 14: ['carr', [2.6, 36.6, 17]],
  15: ['arm', [4.8, 36, 14]], 16: ['lift', [6, 39.4, 19]], 17: ['lift', [7, 38.6, 26]], 18: ['ch', [121, 29.8, 19.6]], 19: ['ch', [112, 45, 17]],
  20: ['gate', [28, 51.6, 31.5]], 21: ['ch', [80, 29.8, 15.6]], 22: ['body', [128, 51, 34], { xo: [0, 12, 4] }], 23: ['gate', [17, 50.6, 37], { xo: [-10, 10, 0] }],
  24: ['gate', [8.3, 25, 41.5], { xo: [-14, 0, 0] }], 25: ['gate', [26.6, 45, 68], { xo: [0, 0, 10] }] };
function lblPoint(n){
  const [fr, p, o] = LBL[n];
  use(fr, n, o || {});
  let lp = p;
  if (p === 'slide'){ const { Q } = packerGeo(GST); lp = [Q[0] + 9*slideU[0], YC, Q[1] + 9*slideU[1]]; }
  if (p === 'ej') lp = [GST.ej, 46.8, 54];
  return wpt(lp);
}
// which part numbers are working right now (their labels light up)
function activeParts(st){
  const a = new Set(), A = st.act;
  if (st.pump){ a.add(18); a.add(20); a.add(21); }
  if (A === 'lift'){ a.add(14); a.add(16); }
  if (A === 'tip'){ a.add(15); a.add(16); }
  if (A === 'blade' || A === 'slide') a.add(9);
  if (A === 'eject') a.add(10);
  if (A === 'gate') a.add(12);
  if (st.pour > 0 && st.pour < 1) a.add(24);
  if (st.hook > 0 && st.hook < 1 || st.clamp > 0 && st.clamp < 1) a.add(14);
  return a;
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
    items.forEach((it, i) => { const c = { ...it, X: pts[i][0], Y: pts[i][1], w: u ? hgt*(it.n > 9 ? 1.3 : 1) : lblW(it.text, fs) }; (c.X < cx ? L : R).push(c); });
    // keep the two columns about even
    while (L.length > R.length + 3){ L.sort((a, b) => b.X - a.X); R.push(L.shift()); }
    while (R.length > L.length + 3){ R.sort((a, b) => a.X - b.X); L.push(R.shift()); }
    const top = { [-1]: vb.y + fs*1.2, [1]: vb.y + fs*1.2 };
    if (btn && svgEl.getScreenCTM()){ const r = btn.getBoundingClientRect(), q = new DOMPoint(r.right, r.bottom + 14).matrixTransform(svgEl.getScreenCTM().inverse()); if (q.y > top[-1]) top[-1] = q.y + hgt/2; }
    const sp2 = document.getElementById('stats'), vs = document.querySelector('.vset');
    if (sp2 && svgEl.getScreenCTM()){ const r = (vs || sp2).getBoundingClientRect(), q = new DOMPoint(r.left, r.bottom + 10).matrixTransform(svgEl.getScreenCTM().inverse()); if (q.y > top[1]) top[1] = q.y + hgt/2; }
    const bot = vb.y + vb.height - hgt;
    for (const [col, sd] of [[L, -1], [R, 1]]){
      col.sort((a, b) => a.Y - b.Y);
      let y = -1e9; for (const c of col){ c.py = Math.max(c.Y, y + gap, top[sd]); y = c.py; }
      const over = col.length ? col[col.length - 1].py - bot : 0;
      if (over > 0){ let lim = bot; for (let i = col.length - 1; i >= 0; i--){ col[i].py = Math.min(col[i].py, lim); lim = col[i].py - gap; } }
      const maxW = Math.max(0, ...col.map(c => c.w));
      for (const c of col){
        const edge = sd < 0 ? Math.max(vb.x + 4*kk, xs[0] - 14*kk - maxW) : Math.min(vb.x + vb.width - 4*kk - maxW, xs[2] + 14*kk);
        const px = sd < 0 ? edge + maxW - c.w/2 : edge + c.w/2, ex = px - sd*c.w/2;
        const lit = c.on, colr = SYSC[SYS_OF(c.n)];
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

/* ================= the scene ================= */
let INK0 = 0, PARTS_SB = [0, 0, 0, 0];
function scene(st, m){
  if (!INK0) INK0 = INK_K;
  GST = st;
  st.E = st.p.map(v => ease(clamp01(v)));
  setFrames(st);
  PARTS = [];
  INK_K = INK0/(st.zs || 1);
  buildChassis(st); buildCab(st); buildBody(st); buildLifter(st); buildHydraulic(st); buildOther(st); buildPile(st);
  // framing: fit what is on show (turning does not change the zoom), smoothly
  const svgEl = document.getElementById('fig'), vb = svgEl.viewBox.baseVal;
  const bx = bboxOf(PARTS.flatMap(p => [p.box[0], p.box[1]])), cxw = (bx[0][0] + bx[1][0])/2, cyw = (bx[0][1] + bx[1][1])/2;
  const Rr = Math.hypot((bx[1][0] - bx[0][0])/2, (bx[1][1] - bx[0][1])/2), Hh = bx[1][2] - Math.min(0, bx[0][2]);
  const pc = Math.cos(PITCH*Math.PI/180), ps = Math.sin(PITCH*Math.PI/180);
  const Wp = 2*Rr*CAM_K*.97, Hp = CAM_K*(pc*Hh + 2*Rr*ps*.85);
  const showL = st.sel > 0 || st.busy || st.auto || !document.documentElement.classList.contains('nolabels');
  const zt = Math.max(.5, Math.min(2.2, Math.min((showL ? .64 : .9)*vb.width/Wp, .84*vb.height/Hp)));
  st.zs = st.zs ? st.zs + (zt - st.zs)*.2 : zt;
  if (Math.abs(st.zs - zt) > .002) st.zoomMoving = true; else { st.zs = zt; st.zoomMoving = false; }
  const zs = st.zs; INK_K = INK0/zs;
  const Fp = P(cxw, cyw, Hh/2), Ap = [vb.x + vb.width*.5, vb.y + vb.height*.53];
  const tx = Ap[0] - zs*Fp[0], ty = Ap[1] - zs*Fp[1], Zp = p => [tx + zs*p[0], ty + zs*p[1]];
  // the parts in painter's order; shells fade in see-through
  const k = ease(st.xr || 0), ord = orderParts(PARTS);
  let body = '';
  for (const p of ord){
    let g = p.hose ? p.svg : `<g data-ps="${p.sys}" data-pn="${p.n}">${p.svg}</g>`;
    if (k > 0 && p.shell) g = `<g opacity="${f(1 - .8*k)}">${g}</g>`;
    else if (k > 0 && p.wheel) g = `<g opacity="${f(1 - .45*k)}">${g}</g>`;
    body += g;
  }
  // shadows: what stands on the ground casts full, lifted systems a faint one
  let shN = '', shF = '';
  const groups = {};
  for (const p of PARTS){ const key = p.sys === 1 && p.n === 1 ? 'cab' : p.sys === 4 ? 'h' : p.sys === 5 ? 'o' : p.sys === 3 ? 'l' : p.sys === 2 ? 'b' : 'c'; (groups[key] = groups[key] || []).push(...p.pts); }
  const lifted = { cab: st.E[1], b: st.E[2], l: Math.max(st.E[2], st.E[3]), h: st.E[4], o: st.E[5], c: 0 };
  const ground = [];
  for (const [kk, pts] of Object.entries(groups)){ if (lifted[kk] > .15) shF += castShadow(pts, 0); else ground.push(...pts); }
  if (ground.length) shN = castShadow(ground, 0);
  INK_K = INK0;
  PARTS_SB = (() => { const b = PARTS.map(p => p.sb); return [Math.min(...b.map(q => q[0])), Math.min(...b.map(q => q[1])), Math.max(...b.map(q => q[2])), Math.max(...b.map(q => q[3]))].map((v, i) => i % 2 ? ty + zs*v : tx + zs*v); })();
  INK_K = INK0/zs;
  let out = `<g transform="translate(${f(tx)} ${f(ty)}) scale(${zs.toFixed(4)})"><g opacity=".9">${shN}</g><g opacity=".13">${shF}</g>${body}</g>`;
  // labels: a separated system shows its own; while working the busy parts; the Labels switch shows all 25
  INK_K = INK0;
  const act = activeParts(st), items = [];
  let title = null;
  if (st.sel > 0){
    for (let n = 1; n <= 25; n++) if (SYS_OF(n) === st.sel) items.push({ n, text: PNAME[n], w: lblPoint(n), on: st.subSel === n || act.has(n), always: true });
    const ws = items.map(it => Zp(P(...it.w)));
    title = { k: st.sel, text: SYSN[st.sel], X: ws.reduce((a, q) => a + q[0], 0)/ws.length, Y: Math.min(...ws.map(q => q[1])) - 34*INK0 };
  } else if (st.busy || st.auto){
    for (const n of [14, 15, 16, 24, 9, 10, 12, 18, 20, 21]) items.push({ n, text: PNAME[n], w: lblPoint(n), on: act.has(n), always: true });
  } else if (!document.documentElement.classList.contains('nolabels')) {
    for (let n = 1; n <= 25; n++) items.push({ n, text: PNAME[n], w: lblPoint(n), on: false });
  }
  if (items.length || title) out += labelLayer(st, items, title, Zp, INK0);
  return out;
}
// refuse pushed out on the ground behind the open tailgate (a mound), and the stream falling into it
function buildPile(st){
  if (st.pile <= .01) return;
  useWorld(8);
  const n = Math.round(34*Math.min(1, st.pile)), R0 = 14;
  for (let i = 0; i < n; i++){ const a = rnd(i + 300)*2*Math.PI, rr = R0*Math.sqrt(rnd(i + 340)), h = 1.2 + 1.4*rnd(i + 380);
    const x = 24 + rr*Math.cos(a)*.8, y = YC + rr*Math.sin(a)*1.3, z = Math.max(0, (1 - rr/R0)*7*Math.min(1, st.pile));
    gB(x - h*.6, y - h*.7, z, x + h*.6, y + h*.7, z + h, matOf(GAR[i % GAR.length]), .3, { ink: .5 }); }
  if (st.act === 'eject' && st.gate > .9 && st.load > .02){
    for (let i = 0; i < 7; i++){ const t = (st.clock*1.6 + i/7) % 1, M = FT.body([41, YC + (rnd(i + 9) - .5)*30, 26]);
      const p = [lerp(M[0], 30, t), M[1], lerp(M[2], 4, t*t)], h = .9 + .7*rnd(i);
      gB(p[0] - h, p[1] - h, p[2] - h, p[0] + h, p[1] + h, p[2] + h, matOf(GAR[(i + 3) % GAR.length]), .3, { ink: .5 }); }
  }
}
