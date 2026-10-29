
/* ================= 2 垃圾箱: subframe, box, side panels, ejector, tailgate with packer, seal; refuse ================= */
const GAR = ['#8a6a45', '#6f7a52', '#c9bc98', '#3d3f45', '#e2ddcf', '#5d86a8', '#a0583c', '#d4a84a'];
const rnd = i => { const x = Math.sin(i*127.1 + 311.7)*43758.5453; return x - Math.floor(x); };
const GARM = d => ({ l: mix('#9b7d55', '#5e4a33', d), m: mix('#7d6243', '#4a3a28', d), d: mix('#4f3d29', '#2c2218', d) });
// scattered refuse on a local face: plane(u, v) -> point, count lumps inside [u0,u1] x [v0,v1]
function lumps(plane, u0, u1, v0, v1, cnt, seed){
  let s = '';
  for (let i = 0; i < cnt; i++){ const u = lerp(u0, u1, rnd(seed + i*3)), v = lerp(v0, v1, rnd(seed + i*3 + 1)), r = .6 + 1.1*rnd(seed + i*3 + 2);
    const ru = Math.min(r, u - u0, u1 - u), rv = Math.min(r*.75, v - v0, v1 - v); if (ru < .25 || rv < .25) continue;
    s += dpoly(ellUV(u, v, ru, rv, 7).map(([a, b]) => plane(a, b)), GAR[(seed + i) % GAR.length], .3); }
  return s;
}
// a loose heap of refuse (small rough boxes) around local centre c, n pieces, spread r
function heap(c, n, r, seed, sc = 1){
  for (let i = 0; i < n; i++){ const a = rnd(seed + i)*2*Math.PI, rr = r*Math.sqrt(rnd(seed + i + 40)), h = (.9 + rnd(seed + i + 80)*1.4)*sc;
    const x = c[0] + rr*Math.cos(a), y = c[1] + rr*Math.sin(a)*2.2, z = c[2] + rnd(seed + i + 120)*r*.5;
    gB(x - h*.6, y - h*.7, z, x + h*.6, y + h*.7, z + h, matOf(GAR[(seed + i) % GAR.length]), .3, { ink: .5 }); }
}
function buildBody(st){
  const ej = st.ej;
  /* subframe on the frame rails */
  use('body', 8);
  for (const [y0, y1] of [[16.4, 18.4], [31.6, 33.6]]) gB(BX0 + 1, y0, RZ1, BX1, y1, BZ0, GRND, .6, { ink: 1.2 });
  /* box: rear ring, floor, roof, front wall, chords, roof ribs, hinge brackets */
  const shell = { shell: true };
  use('body', 8, shell);
  gB(42.6, 2, BZ0, BX1 - 1, 48, BZ0 + 1, GRND, .7, { ink: 1.6 });
  gB(42.6, 2, BZ1 - 1, BX1 - 1, 48, BZ1, GRN, .7, { ink: 1.8 });
  gB(BX1 - 1, 1.2, BZ0, BX1, 48.8, BZ1, GRN, .8, { ink: 2.2, deco: () => onF([1,0,0], () => { let s = '';
    for (const yy of [10, 25, 40]) s += dline([[BX1 + .05, yy, BZ0 + 1], [BX1 + .05, yy, BZ1 - 1]], .9, GRN.d); return s; }) });
  for (const [y0, y1] of [[1.2, 3], [47, 48.8]]){
    gB(40.6, y0, BZ0 - .5, 42.6, y1, BZ1 + .6, GRN, .7, { ink: 1.4 });
    gB(42.6, y0 < YC ? 1.2 : 48, BZ0, BX1 - 1, y0 < YC ? 2 : 48.8, BZ0 + 2.5, GRND, .6, { ink: 1.1, deco: () => {
      const yy = y0 < YC ? 1.15 : 48.85, sg = y0 < YC ? -1 : 1; let s = '';
      s += onF([0, sg, 0], () => { let d = ''; for (let x = 46; x < 132; x += 6) d += dpoly([[x, yy, BZ0 + .6], [x + 3, yy, BZ0 + .6], [x + 3, yy, BZ0 + 1.9], [x, yy, BZ0 + 1.9]], (x/6) % 2 < 1 ? RFL : '#f4f1ea', 0); return d; });
      return s; } });
    gB(42.6, y0 < YC ? 1.2 : 48, BZ1 - 2.5, BX1 - 1, y0 < YC ? 2 : 48.8, BZ1, GRND, .6, { ink: 1.1 });
  }
  gB(40.6, 1.2, BZ1 - 1.2, 42.6, 48.8, BZ1 + .6, GRN, .7, { ink: 1.3 });
  for (const x of [56, 76, 96, 116]) gB(x - .7, 2, BZ1, x + .7, 48, BZ1 + .7, GRND, .5, { ink: .9 });
  for (const yy of [4.5, 45.5]){ gB(38.5, yy - 1, BZ1 - .4, 43, yy + 1, 66.2, GRND, .5, { ink: 1 }); }
  // amber side marker lamps on the bottom chords
  use('body', 8);
  for (const x of [60, 90, 120]) for (const yy of [.8, 48.8]) gB(x - .8, yy, 24, x + .8, yy + .4, 25, matOf(AMB), .3, { ink: .5 });
  /* side panels (侧板) with their vertical ribs */
  for (const [y0, y1, sg] of [[2, 3, -1], [47, 48, 1]]){
    use('body', 11, { shell: true, pull: [0, 14*sg, 0] });
    gB(42.6, y0, BZ0 + 1, BX1 - 1, y1, BZ1 - 1, GRN, .8, { ink: 2, deco: () => onF([0, sg, 0], () => {
      const yy = sg > 0 ? 48.05 : 1.95; let d = '';
      for (let x = 44; x < 131; x += 5.4) d += dpoly([[x, yy, 28], [x + 2.7, yy, 28], [x + 2.7, yy, 29.3], [x, yy, 29.3]], Math.round(x/5.4) % 2 ? RFL : '#f4f1ea', 0);
      return d; }) });
    for (const x of [52, 66, 80, 94, 108, 122]) gB(x - .7, sg > 0 ? 48 : 1.2, BZ0 + 2.5, x + .7, sg > 0 ? 48.8 : 2, BZ1 - 2.5, GRND, .5, { ink: 1 });
  }
  /* mudguards and flaps over the tandem, hung under the box */
  use('body', 8);
  for (const [y0, y1] of [[.2, 13.6], [36.4, 49.8]]){
    gB(49, y0, 22.3, 102, y1, 22.9, CHS, .5, { ink: 1.2 });
    gB(101.4, y0, 16, 102, y1, 22.3, CHS, .4, { ink: .9 });
    gB(49, y0, 15, 49.6, y1, 22.3, CHS, .4, { ink: .9 });
    gB(48.8, y0 + .5, 5.5, 49.3, y1 - .5, 15, RUB, .4, { ink: .9 });
  }
  /* ejector (推板): plate with ribs, guide shoes on the floor, telescopic cylinder from the front wall */
  use('body', 10);
  gB(ej, 3.2, BZ0 + 1.1, ej + 1.2, 46.8, BZ1 - 1.4, GRND, .8, { ink: 2, deco: () => onF([-1,0,0], () => { let d = '';
    for (const yy of [12, 25, 38]) d += dline([[ej - .05, yy, BZ0 + 2], [ej - .05, yy, BZ1 - 2.4]], .8, GRN.d); return d; }) });
  for (const yy of [10, 40]) gB(ej + 1.2, yy - 1, BZ0 + 2, ej + 3.4, yy + 1, BZ1 - 2.5, GRN, .5, { ink: .9 });
  for (const [y0, y1] of [[3.2, 6.4], [43.6, 46.8]]) gB(ej - 1, y0, BZ0 + 1, ej + 6, y1, BZ0 + 2.6, ALU, .4, { ink: .8 });
  { const a = [BX1 - 1.6, YC, 31], b = [ej + 1.4, YC, 47], L = Math.hypot(...sub(b, a)), d = sub(b, a).map(v => v/L), seg = Math.max(L/4 + .8, 10);
    const rs = [2.4, 1.95, 1.5, 1.05], col = [BLU, BLU, ALU, ALU];
    for (let i = 0; i < 4; i++){ const p0 = vadd(a, vsc(d, Math.min(L - 2, i*(L - seg)/3))), p1 = vadd(p0, vsc(d, Math.min(seg, L - Math.min(L - 2, i*(L - seg)/3))));
      gR(p0, p1, rs[i], i < 1 ? BLU : ALU, .6, { sides: 14 }); }
    gB(BX1 - 2.6, YC - 3, 28.5, BX1 - 1, YC + 3, 33.5, GRND, .5, { ink: .9 }); }
  /* refuse packed in the body, between the rear opening and the ejector */
  if (st.load > .01 || ej < EJ0 - .5){
    use('body', 8);
    const x0 = 42.8, x1 = ej - .1, gm = GARM(st.dense);
    if (x1 > x0 + .5) gB(x0, 3.4, BZ0 + 1.05, x1, 46.6, BZ1 - 1.6, gm, .5, { ink: 1, rank: 0, deco: () => {
      let s = onF([-1,0,0], () => lumps((u, v) => [x0 - .05, u, v], 3.6, 46.4, BZ0 + 1.4, BZ1 - 2, 38, 7));
      s += onF([0,0,1], () => lumps((u, v) => [u, v, BZ1 - 1.55], x0 + .5, x1 - .5, 3.8, 46.2, Math.round((x1 - x0)*.9), 31));
      for (const sg of [-1, 1]) s += onF([0, sg, 0], () => lumps((u, v) => [u, sg > 0 ? 46.65 : 3.35, v], x0 + .5, x1 - .5, BZ0 + 1.4, BZ1 - 2, Math.round((x1 - x0)*1.1), 57 + sg));
      return s; } });
  }
  /* rubber seal (密封条) round the rear opening, between the box and the tailgate */
  use('body', 13);
  gB(40, 1.6, BZ1 - .6, 40.6, 48.4, BZ1 + .4, RUB, .4, { ink: .8 });
  gB(40, 1.6, BZ0 - .4, 40.6, 48.4, BZ0 + .6, RUB, .4, { ink: .8 });
  for (const [y0, y1] of [[1.6, 2.6], [47.4, 48.4]]) gB(40, y0, BZ0 + .6, 40.6, y1, BZ1 - .6, RUB, .4, { ink: .8 });
  buildGate(st);
}
/* ---------- tailgate (后门) with the packer inside (压缩装置: slide plate + sweep blade, their cylinders) ---------- */
const slideU = (() => { const d = [GU1[0] - GU0[0], GU1[1] - GU0[1]], l = Math.hypot(...d); return [d[0]/l, d[1]/l]; })();
function packerGeo(st){
  const s = 1 - st.slide, Q = [lerp(GU0[0], GU1[0], s), lerp(GU0[1], GU1[1], s)];
  const th = (320 - 160*st.blade)*Math.PI/180, dB = [Math.cos(th), Math.sin(th)];
  return { Q, dB, th };
}
function buildGate(st){
  const { Q, dB, th } = packerGeo(st), u = slideU, nP = [-u[1], u[0]];
  const op = { y0: 5, y1: 45, z0: 27.6, z1: 40.6 };
  // the hopper's view through the loading opening: dark, with the refuse lying in it
  use('gate', 12, { shell: true });
  gPr(GATE_PROF, 'y', 1, 49, GRN, { ink: 2.6, deco: () => {
    let s = onF([-1,0,0], () => {
      let d = dpoly([[8.95, op.y0, op.z0], [8.95, op.y1, op.z0], [8.95, op.y1, op.z1], [8.95, op.y0, op.z1]], '#1d211c', 1.2);
      d += dpoly([[8.93, op.y0, op.z1 - 2.2], [8.93, op.y1, op.z1 - 2.2], [8.93, op.y1, op.z1], [8.93, op.y0, op.z1]], '#2c3328', 0);
      if (st.hop > .05) d += lumps((a, b) => [8.92, a, b], op.y0 + 1, op.y1 - 1, op.z0 + .3, op.z0 + 1 + 4*st.hop, Math.round(30*st.hop), 91);
      for (const [ya, yb] of [[1.6, 4.4], [45.6, 48.4]]){
        d += dpoly([[8.95, ya, 36], [8.95, yb, 36], [8.95, yb, 40], [8.95, ya, 40]], '#e0453a', .5);
        d += dpoly([[8.95, ya, 33], [8.95, yb, 33], [8.95, yb, 35.6], [8.95, ya, 35.6]], AMB, .5);
        d += dpoly([[8.95, ya, 30.6], [8.95, yb, 30.6], [8.95, yb, 32.6], [8.95, ya, 32.6]], '#f3f1e8', .5);
      }
      return d; });
    // red-and-white rear marking on the sloping upper face
    const nU = norm([-13, 0, 4]);
    s += onF(nU, () => { let d = ''; const pt = (t, y) => [9 + 4*t - nU[0]*-.05, y, 42 + 13*t + .02];
      for (let i = 0; i < 10; i++){ const ya = 2 + i*4.6, yb = ya + 4.6; d += dpoly([pt(.08, ya), pt(.08, yb), pt(.22, yb), pt(.22, ya)], i % 2 ? '#f4f1ea' : RFL, 0); }
      return d; });
    // side faces: panel seams and a reflective stripe
    for (const sg of [-1, 1]){ const yy = sg > 0 ? 49.05 : .95;
      s += onF([0, sg, 0], () => { let d = dline([[36, yy, 17], [36, yy, 62], [24, yy, 62.5], [16, yy, 54], [12.5, yy, 42], [12.5, yy, 24], [17, yy, 17.4], [36, yy, 17]], .9, GRN.d);
        for (let x = 13; x < 38; x += 5) d += dpoly([[x, yy, 28], [x + 2.5, yy, 28], [x + 2.5, yy, 29.3], [x, yy, 29.3]], Math.round(x/5) % 2 ? RFL : '#f4f1ea', 0);
        return d; }); }
    return s; } });
  // hinge lugs on the gate and the hinge pins
  for (const yy of [4.5, 45.5]){ gB(38.6, yy - 2.2, 63.5, 41.2, yy - 1, 66, GRND, .4, { ink: .8, shell: false }); gR([HINGE[0], yy - 2.6, HINGE[1]], [HINGE[0], yy + 2.6, HINGE[1]], .6, ALU, .4, { shell: false }); }
  // tailgate lift cylinders: from brackets on the box sides to lugs on the gate sides
  for (const yy of [-.4, 50.4]){
    use('body', 12, { shell: false });
    gB(44, yy < YC ? yy - .6 : 48.8, 30, 47.5, yy < YC ? 1.2 : yy + .6, 33, GRND, .4, { ink: .8, shell: false });
    use('gate', 12, { shell: false });
    gCyl(wAt('body', [45.6, yy, 31.5]), wAt('gate', [33, yy, 55]), 1.15, 13, BLU, { world: true, shell: false });
    gB(32, yy < YC ? yy - .6 : 49, 53.8, 34.6, yy < YC ? 1 : yy + .6, 56.4, GRND, .4, { ink: .8, shell: false });
  }
  /* packer inside */
  use('gate', 9);
  const G0 = [GU0[0] - 2*u[0], GU0[1] - 2*u[1]], G1 = [GU1[0] + 19*u[0], GU1[1] + 19*u[1]];
  for (const [y0, y1] of [[1.6, 3.6], [46.4, 48.4]])                                   // guides on the inner side walls
    gPr([[G0[0], G0[1]], [G1[0], G1[1]], [G1[0] + 1.6*nP[0], G1[1] + 1.6*nP[1]], [G0[0] + 1.6*nP[0], G0[1] + 1.6*nP[1]]], 'y', y0, y1, CHS, { w: .5, ink: 1 });
  const sl = [[Q[0], Q[1]], [Q[0] + 18*u[0], Q[1] + 18*u[1]], [Q[0] + 18*u[0] + nP[0], Q[1] + 18*u[1] + nP[1]], [Q[0] + nP[0], Q[1] + nP[1]]];
  gPr(sl, 'y', 3.6, 46.4, GRND, { w: .7, ink: 1.8 });                                   // slide plate (滑板)
  for (const yy of [12, 38]) gPr([[Q[0] + nP[0], Q[1] + nP[1]], [Q[0] + 18*u[0] + nP[0], Q[1] + 18*u[1] + nP[1]], [Q[0] + 18*u[0] + 2.4*nP[0], Q[1] + 18*u[1] + 2.4*nP[1]], [Q[0] + 2.4*nP[0], Q[1] + 2.4*nP[1]]], 'y', yy - .7, yy + .7, GRN, { w: .5, ink: .9 });
  const BL = 12.5, nb = [-dB[1], dB[0]];
  const bl = [[Q[0], Q[1]], [Q[0] + BL*dB[0], Q[1] + BL*dB[1]], [Q[0] + BL*dB[0] + nb[0]*1.1, Q[1] + BL*dB[1] + nb[1]*1.1], [Q[0] + nb[0]*1.1, Q[1] + nb[1]*1.1]];
  gPr(bl, 'y', 4.2, 45.8, GRN, { w: .7, ink: 1.8 });                                    // sweep blade (刮板)
  gR([Q[0], 3.6, Q[1]], [Q[0], 46.4, Q[1]], .9, ALU, .5);                                // blade pivot
  // slide cylinders (top of the gate -> slide plate), sweep cylinders (slide plate -> blade crank)
  for (const yy of [6.5, 43.5]) gCyl([36.6, yy, 63.2], [Q[0] + 4*u[0], yy, Q[1] + 4*u[1]], 1.2, 14, BLU);
  const ca = th + 1.75, crank = [Q[0] + 3.6*Math.cos(ca), Q[1] + 3.6*Math.sin(ca)];
  for (const yy of [16, 34]){ gCyl([Q[0] + 16*u[0] + 2*nP[0], yy, Q[1] + 16*u[1] + 2*nP[1]], [crank[0], yy, crank[1]], 1.05, 7, BLU);
    gPr([[Q[0], Q[1]], [crank[0], crank[1]], [crank[0] + .6, crank[1] + .6]], 'y', yy - .6, yy + .6, CHS, { w: .4, ink: .7 }); }
  /* refuse in the hopper and on its way into the box */
  if (st.hop > .02){
    use('gate', 8);
    const t = st.pk, tip = [Q[0] + BL*.6*dB[0], Q[1] + BL*.6*dB[1]];
    const c = t < .5 ? [lerp(17, tip[0] + 2, t*2), YC, lerp(14.2, tip[1] - 1, t*2)] : [lerp(tip[0] + 2, 41, (t - .5)*2), YC, lerp(tip[1] - 1, 34, (t - .5)*2)];
    heap(c, Math.round(16*st.hop), 5.5, 17, 1.2);
  }
}
