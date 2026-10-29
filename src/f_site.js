
/* ================= the site: the pick pad, the building under construction, the load and its slings (scenery: no number, no system, not taken apart) =================
   Everything is a convex solid and sorts with the crane. Frames: pad and plat are fixed to the ground; load is on its spot or on the hook (loadPose).
   The load styles, sizes and riggings: f_loads.js. */
const SLG = { l: '#ffae4a', m: '#f08414', d: '#a8530a' }, PLK = { l: '#e6e7e3', m: '#c9cbc6', d: '#8f928e' };
const rotRect = (cx, cy, hx, hy, yaw) => { const c = Math.cos(yaw), s = Math.sin(yaw); return [[-hx, -hy], [hx, -hy], [hx, hy], [-hx, hy]].map(([u, v]) => [cx + u*c - v*s, cy + u*s + v*c]); };
// ----- the pick pad: a low concrete slab, a little bigger than the load
function buildPad(){
  const s = SPOT.pad;
  gPr(rotRect(s.x, s.y, 14.5, 7.2, s.yaw), 'z', 0, s.z, CONC, { w: .7, ink: 2 });
}
// ----- the building under construction: four columns, a floor slab and the top slab, rebar stubs sticking out of the top
const BLD = { hx: 15, hy: 11, cx: 12, cy: 8, cw: 1.2, z0: 10.5, z1: 13, z2: 21.5 };      // slab half sizes; column centres and half width; the floor slab's underside and top; the top slab's underside (its top is ROOF_Z)
function buildPlat(){
  const s = SPOT.roof, B = BLD, X = s.x, Y = s.y;
  const slab = (z0, z1) => gB(X - B.hx, Y - B.hy, z0, X + B.hx, Y + B.hy, z1, PLK, .8, { ink: 2, deco: () => onF([0, 0, 1], () =>
    dline([[X - B.hx + 1.2, Y - B.hy + 1.2, z1 + .02], [X + B.hx - 1.2, Y - B.hy + 1.2, z1 + .02], [X + B.hx - 1.2, Y + B.hy - 1.2, z1 + .02], [X - B.hx + 1.2, Y + B.hy - 1.2, z1 + .02], [X - B.hx + 1.2, Y - B.hy + 1.2, z1 + .02]], .5, PLK.d)) });
  for (const sx of [-1, 1]) for (const sy of [-1, 1]){
    const x = X + sx*B.cx, y = Y + sy*B.cy;
    gB(x - 2.2, y - 2.2, 0, x + 2.2, y + 2.2, .9, CONC, .8, { ink: 1.4 });                                     // footing
    gB(x - B.cw, y - B.cw, .9, x + B.cw, y + B.cw, B.z0, CONC, .8, { ink: 1.4 });                              // column, below the floor slab
    gB(x - B.cw, y - B.cw, B.z1, x + B.cw, y + B.cw, B.z2, CONC, .8, { ink: 1.4 });                            // and above it
  }
  slab(B.z0, B.z1); slab(B.z2, ROOF_Z);
  for (const sx of [-1, 1]) for (const y of [-9.5, -4.5, 4.5, 9.5]) gR([X + sx*13.5, Y + y, ROOF_Z], [X + sx*13.5, Y + y, ROOF_Z + 5], .3, REB, .5, { sides: 6, ink: .8 });
}
// the slings: legs from the hook's shackle to the lifting points, drawn out of the shackle by st.sl (0 = not there, 1 = taut). Wire legs (two or
// four) are ropes with a steel thimble on the lifting point; a belt rig is two flat orange belts
const WIRE = { col: '#6b727a', hi: '#a3aab1' };
function gBelt(a, b, ly, i){
  const L = Math.hypot(...sub(b, a)); if (L < 1e-6) return;
  const d = sub(b, a).map(v => v/L), u = norm(sub(ly, vsc(d, dot(d, ly)))), v = cross(d, u), ring = e => [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([cu, cv]) => [0, 1, 2].map(q => e[q] + .85*cu*u[q] + .13*cv*v[q]));
  const A = ring(a), B = ring(b), pt = push(solid(A, B, SLG, .5, tone) + hullInk([...A, ...B], 1), [...A, ...B], { planes: planesOf(A, B) });
  pt.hose = true; pt.seg = 'sl' + i; pt.rank = 0;
}
function buildSlings(st){
  const a = hookAnchor(st), k = sstep(st.sl), rig = LOAD.rig;
  use('load', 0); const pts = loadStyle().lift(LOAD, rig).map(wpt), ly = norm(sub(wpt([0, 1, 0]), wpt([0, 0, 0]))); use('g', 0);       // (world points: the identity frame)
  pts.forEach((q, i) => { const e = vadd(a, vsc(sub(q, a), k));
    if (rig === 'belt') gBelt(a, e, ly, i);
    else { gHose([a, e], 0, 1, .26, { n: 9, col: WIRE.col, hi: WIRE.hi, pad: .02, seg: 'sl' + i });
      const th = gR(vadd(e, [0, 0, .62]), vadd(e, [0, 0, .62]).map((v, j) => v + ly[j]*.5), .62, STL, .5, { sides: 10, ink: .9, world: true }); if (th){ th.hose = true; th.seg = 'th' + i; } } });
}
// the load standing in its frame, slid sideways by dx along its length and faded by op (the swap picture)
function drawLoad(dx, op){
  const i0 = PARTS.length, sty = loadStyle();
  use('load', 0); if (dx){ const T0 = CX.T; CX.T = p => T0([p[0] + dx, p[1], p[2]]); }
  sty.build(LOAD, ldTones(sty, LOAD.color));
  if (op < .999) for (let j = i0; j < PARTS.length; j++) PARTS[j].svg = `<g opacity="${f(op)}">${PARTS[j].svg}</g>`;
}
function buildSite(st){
  const mx = Math.max(...st.E); if (mx > .45) return;
  const i0 = PARTS.length;
  use('pad', 0); buildPad(); use('plat', 0); buildPlat();
  const sw = st.swap && !st.hooked ? st.swap : null;
  if (sw){ const k = sstep(clamp01(sw.t)), cur = ldNorm(LSEL);       // the old load slides off along its length, the new one slides in from the other side
    applyLoad(sw.from); drawLoad(-SWAP_DX*k, 1 - k); applyLoad(cur); drawLoad(SWAP_DX*(1 - k), k);
    if (st.sl > 0) buildSlings(st); }
  else { drawLoad(0, 1); if (st.sl > 0) buildSlings(st); }
  const k = 1 - sstep(mx/.45);                                  // it fades as the crane comes apart
  if (k < .999) for (let j = i0; j < PARTS.length; j++) PARTS[j].svg = `<g opacity="${f(k)}">${PARTS[j].svg}</g>`;
}
const SWAP_DX = 34, SWAP_SECS = .5;
