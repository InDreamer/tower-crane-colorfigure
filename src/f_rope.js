
/* ================= 5 钢丝绳与吊钩: hook block (striped plates, sheave, swivel, hook), the sheaves the ropes turn on, hoist and trolley ropes ================= */
const ROPE_R = .42, ROPE_WD = .38;                      // a rope runs on the surface of what it turns on: circles are grown by this
// the hook block is modelled at 1.6 x the real proportions about its sheave centre (x = y = 0, z = HZ0) so a small child can see it
const HKS = 1.6, HS_R = 1.45*HKS;                      // block scale; hook sheave radius (its rope side sits right under the trolley sheaves' inner side)
const HK_PLATE = [[-2.6, 43.4], [-1.2, 41.8], [1.2, 41.8], [2.6, 43.4], [2.6, 46], [1.4, 47.6], [-1.4, 47.6], [-2.6, 46]].map(([u, v]) => [u*HKS, HZ0 + (v - HZ0)*HKS]);   // plate outline (x, z)
const HK_PW = [2.6*HKS, 3.2*HKS, 2.6*HKS];             // plate width (x 2 x half), depth below / height above the sheave centre
const HK_C = [2*HKS, HZ0 + (35 - HZ0)*HKS], HK_R = 2*HKS;      // the hook's bend: centre (x, z) and radius
// the spokes on the hook sheave's faces turn with the rope (a lowering hook turns it counter-clockwise seen from -y)
const sheaveSpokes = (sg, K) => { let s = '', th = sheaveAngH(GST); for (let k = 0; k < 6; k++){ const a = k/6*2*Math.PI + th;
  s += dline([[.55*K*Math.cos(a), sg*.5*K, HZ0 + .55*K*Math.sin(a)], [1.55*K*Math.cos(a), sg*.5*K, HZ0 + 1.55*K*Math.sin(a)]], k ? .5 : 1.1, k ? DKS.m : HKY.m); } return s; };
function buildHook(st){
  use('hook', 9, { xo: [0, 0, -8*HKS] });
  const K = HKS, M = p => [p[0]*K, p[1]*K, HZ0 + (p[2] - HZ0)*K];
  for (const sg of [-1, 1]){
    const y0 = (sg > 0 ? .7 : -1.3)*K, y1 = (sg > 0 ? 1.3 : -.7)*K;
    gPr(HK_PLATE, 'y', y0, y1, HKY, { w: .6, ink: 1.6, deco: () => onF([0, sg, 0], () => {
      let s = ''; for (let x = -4; x < 3; x += 1.5) s += dpoly([[x, sg*1.32, 41.6], [x + .75, sg*1.32, 41.6], [x + 6.35, sg*1.32, 47.8], [x + 5.6, sg*1.32, 47.8]].map(M), HKB.m, .2*K);
      return clipTo(HK_PLATE.map(([u, v]) => wpt([u, sg*1.32*K, v])), s); }) });
    gR(M([0, sg*1.3, 45]), M([0, sg*1.7, 45]), .45*K, STL, .5, { sides: 10 });
  }
  gR(M([0, -.45, 45]), M([0, .45, 45]), HS_R, STL, .7, { sides: 20, deco: () => [-1, 1].map(sg => onF([0, sg, 0], () =>
    dpoly(on(([u, v]) => [u, sg*.47*K, v], ellUV(0, 45, 1.05*K, 1.05*K, 14)), DKS.m, .3) + dpoly(on(([u, v]) => [u, sg*.49*K, v], ellUV(0, 45, .45*K, .45*K, 8)), ALU.m, .3) + sheaveSpokes(sg, K))).join('') });
  gB(...M([-2.6, -1.3, 40.4]), ...M([2.6, 1.3, 41.8]), HKB, .6, { ink: 1.4 });
  gR(M([0, 0, 40.4]), M([0, 0, 39.2]), 1.1*K, DKS, .6, { sides: 16 });                 // swivel bearing
  gR(M([0, 0, 39.2]), [0, 0, HK_C[1]], .65*K, STL, .6, { sides: 12, r1: .8*K });       // shank
  const pts = []; for (let a = 180; a <= 380; a += 20) pts.push([HK_C[0] + HK_R*Math.cos(a*Math.PI/180), 0, HK_C[1] + HK_R*Math.sin(a*Math.PI/180)]);
  for (let i = 0; i < pts.length - 1; i++) gR(pts[i], pts[i + 1], lerp(.8, .4, i/(pts.length - 1))*K, HKB, .6, { sides: 10, r1: lerp(.8, .4, (i + 1)/(pts.length - 1))*K });
  gR(M([.7, 0, 36.7]), M([3.2, 0, 36.1]), .16*K, RED, .4, { sides: 6, ink: .8 });     // safety latch across the mouth
  gB(HK_C[0] - 1.1, -.7, SHK_Z, HK_C[0] + 1.1, .7, SHK_Z + 1.6, STL, .5, { ink: 1.2 });          // the shackle the slings are fixed to: it hangs under the hook's bend
}
// rope geometry in the plane y = 0, (x, z) coordinates of the up frame. A node is a circle { c, r, w } the rope turns on (w +1 counter-
// clockwise, -1 clockwise; r 0 is a point) tagged with the frame and part it belongs to
function ropeTangent(a, b){
  const dx = b.c[0] - a.c[0], dz = b.c[1] - a.c[1], dd = Math.hypot(dx, dz), k = a.w*a.r - b.w*b.r;
  const th = Math.atan2(dz, dx) + Math.asin(Math.max(-1, Math.min(1, k/dd))), nl = [-Math.sin(th), Math.cos(th)];
  return [[a.c[0] - a.w*a.r*nl[0], a.c[1] - a.w*a.r*nl[1]], [b.c[0] - b.w*b.r*nl[0], b.c[1] - b.w*b.r*nl[1]]];
}
// the polyline (tagged points) of a rope over nodes: straight tangents between nodes, arcs on them
function ropeLine(nodes, st){
  const nd = nodes.length, io = nodes.map(() => [null, null]);
  for (let i = 0; i < nd - 1; i++){ const [pa, pb] = ropeTangent(nodes[i], nodes[i + 1]); io[i][1] = pa; io[i + 1][0] = pb; }
  const out = [], tag = (nd2, x, z) => { const o = nd2.fr === 'trol' ? [st.trolley, 0] : nd2.fr === 'hook' ? [st.trolley, st.hookZ - HZ0] : [0, 0];
    return { fr: nd2.fr, n: nd2.n, p: [x - o[0], 0, z - o[1]] }; };
  nodes.forEach((nd2, i) => {
    const [pi, po] = io[i], c = nd2.c;
    if (!pi) return out.push(tag(nd2, po[0], po[1]));
    if (!po) return out.push(tag(nd2, pi[0], pi[1]));
    const a0 = Math.atan2(pi[1] - c[1], pi[0] - c[0]), a1 = Math.atan2(po[1] - c[1], po[0] - c[0]), TAU = 2*Math.PI;
    let d = (((a1 - a0)*nd2.w) % TAU + TAU) % TAU; if (d > TAU - 1e-3) d = 0;
    const k = Math.max(1, Math.ceil(d/(Math.PI/8)));
    for (let j = 0; j <= k; j++){ const a = a0 + nd2.w*d*j/k; out.push(tag(nd2, c[0] + nd2.r*Math.cos(a), c[1] + nd2.r*Math.sin(a))); }
  });
  return out;
}
// the sheaves on the jib that belong to the rope run (guide sheave at the root, trolley-rope sheave at the tip)
const GX = 10.3, GZ = 84.7, GR = .9, TIPX = 104.6, TIPZ = 88.6, TIPR = 1.2, ANCX = 105.6, ANCZ = 84, DRM2 = [22.2, 88.6, 1.2];
function buildRopeSheaves(){
  use('jib', 7);
  gR([GX, -.45, GZ], [GX, .45, GZ], GR, STL, .6, { sides: 14, deco: () => [-1, 1].map(sg => onF([0, sg, 0], () => dpoly(on(([u, v]) => [u, sg*.47, v], ellUV(GX, GZ, .3, .3, 8)), DKS.m, .3))).join('') });
  for (const sg of [-1, 1]) gR([GX, sg*.45, GZ], [GX, sg*.62, GZ], .26, STL, .4, { sides: 8 });
  gR([TIPX, -.45, TIPZ], [TIPX, .45, TIPZ], TIPR, STL, .6, { sides: 16, deco: () => [-1, 1].map(sg => onF([0, sg, 0], () => dpoly(on(([u, v]) => [u, sg*.47, v], ellUV(TIPX, TIPZ, .4, .4, 8)), DKS.m, .3))).join('') });
  for (const sg of [-1, 1]) gR([TIPX, sg*.45, TIPZ], [TIPX, sg*.62, TIPZ], .3, STL, .4, { sides: 8 });
}
function ropeNodes(st){
  const T = st.trolley, HZ = st.hookZ, e = ROPE_R;
  const dr = HOIST, ap = { c: [0, APZ], r: 1.7 + e, w: -1, fr: 'top', n: 11 };
  const hoist = [{ c: [dr.x, dr.z], r: dr.R + e, w: -1, fr: 'cj', n: 13 }, ap, { c: [GX, GZ], r: GR + e, w: 1, fr: 'jib', n: 7 },
    { c: [T - TROL_SX, RZ - TROL_R], r: TROL_R + e, w: -1, fr: 'trol', n: 8 }, { c: [T, HZ], r: HS_R + e, w: 1, fr: 'hook', n: 9 },
    { c: [T + TROL_SX, RZ - TROL_R], r: TROL_R + e, w: -1, fr: 'trol', n: 8 }, { c: [ANCX, ANCZ + e], r: 0, w: 0, fr: 'jib', n: 7 }];
  const d2 = { c: [DRM2[0], DRM2[1]], r: DRM2[2] + e, fr: 'jib', n: 4 };
  const A = [{ ...d2, w: 1 }, { c: [T - TROL_HL, TROL_AZ], r: 0, w: 0, fr: 'trol', n: 8 }];
  const B = [{ ...d2, w: -1 }, { c: [TIPX, TIPZ], r: TIPR + e, w: -1, fr: 'jib', n: 7 }, { c: [T + TROL_HL, TROL_AZ], r: 0, w: 0, fr: 'trol', n: 8 }];
  return { hoist, A, B };
}
// taken apart, the rope group is on its own: every turning point gets a small grey sheave (or drum) stub and every loose end a dead-end
// pulley, drawn with the rope (fading in as the group leaves the machine, so they never show inside the real sheaves)
function ropeStubs(nodes, n, k){
  const i0 = PARTS.length;
  nodes.forEach((nd, i) => {
    if (nd.fr === 'hook') return;
    let c = nd.c, r = nd.r - ROPE_R, hy = nd.n === 13 ? .9 : .5;
    if (nd.r === 0){                                                   // a loose end: a dead-end pulley just beyond it
      const tg = ropeTangent(nodes[i - 1], nd), dx = tg[1][0] - tg[0][0], dz = tg[1][1] - tg[0][1], L = Math.hypot(dx, dz);
      c = [nd.c[0] + dx/L*.95, nd.c[1] + dz/L*.95]; r = .8;
    }
    gR([c[0], -hy, c[1]], [c[0], hy, c[1]], r, STL, .6, { sides: 14, ink: 1.1 });
  });
  for (let j = i0; j < PARTS.length; j++) PARTS[j].svg = `<g opacity="${f(k)}">${PARTS[j].svg}</g>`;
}
function buildRopes(st){
  buildHook(st); buildRopeSheaves();
  const { hoist, A, B } = ropeNodes(st), fH = st.flowH || 0, fT = st.flowT || 0, dH = st.dirH || 1, dT = st.dirT || 1, ks = sstep(Math.min(1, Math.max(0, (st.E[5] - .2)/.4)));
  use('up', 12); gHose(ropeLine(hoist, st), fH, dH, ROPE_WD, { n: 12, pad: .02, col: ROPE.m, hi: ROPE.l, flow: '#cfd4da', dash: '1.6 3.4' });
  use('up', 24);
  gHose(ropeLine(A, st), fT, dT, ROPE_WD, { n: 24, pad: .02, col: ROPE.m, hi: ROPE.l, flow: '#cfd4da', dash: '1.6 3.4', seg: 'tA' });
  gHose(ropeLine(B, st), fT, -dT, ROPE_WD, { n: 24, pad: .02, col: ROPE.m, hi: ROPE.l, flow: '#cfd4da', dash: '1.6 3.4', seg: 'tB' });
  if (ks > .02){ use('up', 12); ropeStubs(hoist, 12, ks); use('up', 24); ropeStubs(A, 24, ks); ropeStubs(B, 24, ks); }
}
