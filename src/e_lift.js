
/* ================= 3 上料机构: mount plates + pivot shaft, tipping arms, carriage with comb and clamp, cylinders, bin ================= */
// build with an extra local transform in front of the current frame (a lid on its hinge)
function withXf(xf, nf, fn){ const T0 = CX.T, N0 = CX.N; CX.T = p => T0(xf(p)); CX.N = n => N0(nf(n)); fn(); CX.T = T0; CX.N = N0; }
function useWorld(n){ use('ch', n); CX.T = p => p; CX.N = q => q; CX.off = [0, 0, 0]; }
function buildLifter(st){
  /* 连接架: two plates bolted under the sill, the pivot shaft through them */
  use('lift', 17);
  const plate = [[4, 30], [7.5, 30], [10, 20], [6, 16]];
  for (const [y0, y1] of [[11.4, 12.6], [37.4, 38.6]]) gPr(plate, 'y', y0, y1, ORG, { w: .6, ink: 1.4 });
  gR([7, 12.6, 18.5], [7, 37.4, 18.5], .9, ORG, .6);
  gR([PIV[0], 9.6, PIV[1]], [PIV[0], 40.4, PIV[1]], .85, ALU, .6);
  /* 翻斗装置: two arms on the shaft, foot beam, cranks for the tip cylinders */
  use('arm', 15);
  for (const [y0, y1] of [[14, 15.4], [34.6, 36]]) gB(4, y0, 6, 5.6, y1, 29.4, ORG, .7, { ink: 1.6 });
  gB(4, 15.4, 6, 5.6, 34.6, 7.6, ORG, .6, { ink: 1.2 });
  for (const [y0, y1] of [[10, 11.2], [38.8, 40]]) gPr([[6.3, 28.6], [4.8, 29.3], [1.9, 24.6], [3.3, 23.6]], 'y', y0, y1, ORG, { w: .5, ink: 1 });
  /* 挂桶提升装置: carriage on shoes round the arms, comb teeth, clamp bar on two posts */
  use('carr', 14);
  gB(2.6, 13.4, 14, 4, 36.6, 19.6, ORG, .7, { ink: 1.6, deco: () => onF([-1,0,0], () => dline([[2.55, 14, 16.8], [2.55, 36, 16.8]], .6, ORG.d)) });
  for (const [y0, y1] of [[12.6, 14], [36, 37.4]]) gB(3.2, y0, 14.4, 6, y1, 19.2, ORG, .5, { ink: 1 });
  for (const y of [19.5, 23, 27, 30.5]) gB(2.6, y - .6, 19.6, 3.6, y + .6, 20.6, ORG, .4, { ink: .8 });
  const cz = 21.8 + 2.6*(1 - st.clamp);
  for (const y of [18.6, 31.4]) gR([3.1, y, 19.6], [3.1, y, cz + .4], .3, ALU, .4);
  gB(1.7, 18.2, cz, 3.9, 31.8, cz + .8, ORG, .5, { ink: 1 });
  /* 液压油缸: lift cylinders (arm foot -> carriage), tip cylinders (mount plate -> crank) */
  use('arm', 16);
  for (const y of [17, 33]) gCyl(wAt('arm', [4.8, y, 7.6]), wAt('carr', [4.8, y, 14]), .85, 6.4, BLU, { world: true });
  for (const y of [10.6, 39.4]) gCyl(wAt('lift', [7.2, y, 16.6]), wAt('arm', [2.6, y, 24.1]), 1.05, 9, BLU, { world: true });
  /* the bin (style / size / type: src/e_bins.js): its body, rim, lifting lip, lid on its back hinge, wheels or feet, handle */
  use('bin', 14);
  buildBin(st, binSpec(st), binMat(st), binTypeOf(st.binType).id);
  /* a swap in progress: the bin that was just taken off slides away beside the new one (the state already holds the new bin) */
  if (st.swapT > 0 && st.swapOld){ use('olb', 14); buildBin({ ...st, lidA: 0, binFull: 1 }, binSpec(st.swapOld), binMat(st.swapOld), binTypeOf(st.swapOld.binType).id); }
  /* refuse falling from the bin's mouth into the hopper while it is upside down */
  if (st.pour > 0 && st.pour < 1){
    const bs = binSpec(st), M = FT.bin([bs.pourX, YC, bs.pourZ]), H = FT.gate([15, YC, 22]), kv = Math.cbrt(bs.L/240), cnt = Math.round(9*Math.sqrt(bs.L/240));
    useWorld(8);
    for (let i = 0; i < cnt; i++){ const t = (st.clock*1.8 + i/cnt) % 1, k = Math.min(1, st.pour*3)*(1 - Math.max(0, st.pour - .8)*5);
      if (k <= 0) continue;
      const p = [lerp(M[0], H[0], t), M[1] + (rnd(i + 5) - .5)*bs.pourSpread, lerp(M[2], H[2], t) - 6*t*(1 - t)*0 - 2*t*t], h = (.8 + .8*rnd(i))*kv;
      gB(p[0] - h, p[1] - h, p[2] - h, p[0] + h, p[1] + h, p[2] + h, matOf(GAR[i % GAR.length]), .3, { ink: .5 }); }
  }
}


/* ----- one bin from its spec (src/e_bins.js): the style's geometry, the waste type's colour and markings ----- */
function buildBin(st, bs, mat, type){ (bs.kind === 'drum' ? buildDrum : buildBox)(st, bs, mat, type); }
// a waste type's label, drawn in the plane of a face: mark(P3, cu, vc) with P3(u, v) -> local point, centred on (cu, vc), sc = size
const binMark = (type, mat, sc) => (P3, cu, vc) => {
  const tri = (r, k = 1) => [P3(cu, vc + r*1.15*k), P3(cu - r, vc - r*.8*k), P3(cu + r, vc - r*.8*k)];
  const plate = (hu, hv, col) => dpoly(on(([u, v]) => P3(u, v), rrUV(cu - hu, vc - hv, cu + hu, vc + hv, .5, 2)), col, .4);
  if (type === 'other') return plate(2.4*sc, 1.5*sc, '#c8cdd2') + dline([P3(cu - 1.6*sc, vc), P3(cu + 1.6*sc, vc)], .5, mat.d);
  if (type === 'recycle') return plate(3.2*sc, 2.4*sc, '#f4f1ea') + dline([...tri(1.6*sc), tri(1.6*sc)[0]], .8, mat.m);
  if (type === 'hazard') return dpoly(tri(3*sc), '#f3c21e', .6) + dline([P3(cu, vc + .9*sc), P3(cu, vc - .3*sc)], 1, '#2a2a2a') + dline([P3(cu, vc - 1.1*sc), P3(cu, vc - 1.1*sc + .05)], 1.1, '#2a2a2a');
  return '';
};
// the marking on a closed lid's top at height z, ending at x1 (the lid's front): lo(x) / hi(x) = the lid's y limits there
function binLidMark(type, mat, z, x1, lo, hi){
  const strip = (xa, xb, col) => dpoly([[xa, lo(xa), z], [xb, lo(xb), z], [xb, hi(xb), z], [xa, hi(xa), z]], col, 0), cut = (x) => dline([[x, lo(x), z], [x, hi(x), z]], .6, mat.d);
  if (type === 'hazard'){ let d = ''; for (let i = 0; i < 6; i++) d += strip(x1 - 6.4 + i, x1 - 5.4 + i, i % 2 ? '#2a2a2c' : '#f3c21e'); return d; }
  if (type === 'recycle') return strip(x1 - 2.8, x1 - 1.6, '#f4f1ea');
  if (type === 'other') return cut(x1 - 3) + cut(x1 - 4.2);
  return '';
}
const binOpen = (st, hg, fn) => { const la = st.lidA*115*Math.PI/180; withXf(p => rotXZ(p, hg, la), n => rotN(n, la), fn); };      // fn builds what hangs on the lid's back hinge

/* box kind (wheelie, cart4, dome, pedal): tapered body, rim collar, lip bar, a lid of the style's kind on its back hinge, wheels, push bar / grips / pedal */
function buildBox(st, bs, mat, type){
  const { collar: co, lid, lip, mouth, handle } = bs, hb = bs.bhy, ht = bs.thy, sc = Math.min(1.6, ht/5.6), rr = bs.rr || 0, mark = binMark(type, mat, sc);
  const fx = z => bs.bx1 + (bs.tx1 - bs.bx1)*(z - bs.zb)/(bs.zt - bs.zb) + .05;      // the front face's x at height z
  const along = (z, k) => (z - bs.zb)/(bs.zt - bs.zb)*k;
  const ring = (x0, x1, h, z) => rr ? rrUV(x0, YC - h, x1, YC + h, rr, 2).map(([x, y]) => [x, y, z]) : [[x0, YC - h, z], [x1, YC - h, z], [x1, YC + h, z], [x0, YC + h, z]];
  // a slab between two heights: a box, or (rounded plan) a rounded prism
  const slab = (x0, x1, h, z0, z1, w, o) => rr ? gPr(rrUV(x0, YC - h, x1, YC + h, rr, 2), 'z', z0, z1, mat, { ...o, w }) : gB(x0, YC - h, z0, x1, YC + h, z1, mat, w, o);
  // what each type shows (kitchen: only the drain groove every bin has): a label on the faces, a marking on the closed lid
  const markFaces = () => {
    if (type === 'kitchen') return '';
    const xc = (bs.tx0 + bs.tx1)/2 + 1;
    return onF([-1,0,0], () => mark((u, v) => [bs.bx0 + (bs.tx0 - bs.bx0)*along(v, 1) - .05, u, v], YC, 11))
      + [-1, 1].map(sg => onF([0, sg, 0], () => mark((u, v) => [u, YC + sg*(hb + (ht - hb)*along(v, 1) + .05), v], xc, 11))).join('')
      + onF([1,0,0], () => mark((u, v) => [fx(v), u, v], YC, 11));
  };
  const lidTop = (ya, yb) => binLidMark(type, mat, lid.z1 + .03, lid.x1, () => ya, () => yb);
  { const A = ring(bs.bx0, bs.bx1, hb, bs.zb).map(wpt), Bt = ring(bs.tx0, bs.tx1, ht, bs.zt).map(wpt);
    push(solid(A, Bt, mat, .8) + onF([1,0,0], () => dline([[bs.tx1 - .25, YC - (ht - 1.6), 6], [bs.tx1 - .25, YC + (ht - 1.6), 6]], .6, mat.d) + '') + markFaces() + hullInk([...A, ...Bt], 2), [...A, ...Bt], { planes: planesOf(A, Bt) }); }
  const mouthPoly = () => (rr ? rrUV(mouth.x0, YC - mouth.hy, mouth.x1, YC + mouth.hy, Math.max(.6, rr - .5), 2).map(([x, y]) => [x, y, mouth.z])
    : [[mouth.x0, YC - mouth.hy, mouth.z], [mouth.x1, YC - mouth.hy, mouth.z], [mouth.x1, YC + mouth.hy, mouth.z], [mouth.x0, YC + mouth.hy, mouth.z]]);
  slab(co.x0, co.x1, co.hy, co.z0, co.z1, .6, { ink: 1.3, deco: () => onF([0,0,1], () => st.lidA > .05
    ? dpoly(mouthPoly(), '#1f2a1c', .5)
      + (st.binFull > .1 ? lumps((u, v) => [u, v, mouth.lz], mouth.lx0, mouth.lx1, YC - mouth.lhy, YC + mouth.lhy, Math.round(26*st.binFull*mouth.area/BIN_MOUTH0), 211) : '')
    : '') });
  gB(lip.x0, YC - lip.hy, lip.z0, lip.x1, YC + lip.hy, lip.z1, mat, .4, { ink: .9 });
  const hg = lid.hinge;
  if (bs.lidKind === 'flaps') binOpen(st, hg, () => { for (const sg of [-1, 1]){      // two flaps side by side, a gap between, a grip ridge on each front edge
    const y0 = sg > 0 ? YC + .3 : YC - lid.hy, y1 = sg > 0 ? YC + lid.hy : YC - .3;
    gB(lid.x0, y0, lid.z0, lid.x1, y1, lid.z1, mat, .6, type === 'kitchen' ? { ink: 1.3 } : { ink: 1.3, deco: () => onF([0,0,1], () => lidTop(y0 + .6, y1 - .6)) });
    gB(lid.x1 - 1.2, y0 + 1.2, lid.z1, lid.x1 - .3, y1 - 1.2, lid.z1 + .5, mat, .4, { ink: .9 }); }
    gB(lid.x0, YC - .3, lid.z0, lid.x1, YC + .3, lid.z1 - .2, CHS, .3, { ink: .8 }); });         // the dark seam between them
  else if (bs.lidKind === 'dome') binOpen(st, hg, () => {                    // a faceted dome (stacked frustums, each convex) with posting hatches in its skirt
    const D = bs.dome, xm = (lid.x0 + lid.x1)/2, len = lid.x1 - lid.x0, prof = rrUV(lid.x0, YC - lid.hy, lid.x1, YC + lid.hy, D.r, 2);
    const lv = [[0, 1], [D.sk, 1], ...[30, 55, 72, 84, 90].map(a => [D.sk + D.dh*Math.sin(a*Math.PI/180), Math.max(.12, Math.cos(a*Math.PI/180))])];   // the skirt, then an elliptic dome
    const ha = xm - .22*len, hb2 = xm + .22*len, hz0 = lid.z0 + 1, hz1 = lid.z0 + D.sk - 1.2;
    const hatches = () => [-1, 1].map(sg => onF([0, sg, 0], () => dpoly(on(([u, v]) => [u, YC + sg*(lid.hy + .04), v], rrUV(ha, hz0, hb2, hz1, .7, 2)), '#1f2a1c', .4))).join('');
    const at = ([dz, k]) => prof.map(([x, y]) => wpt([xm + (x - xm)*k, YC + (y - YC)*k, lid.z0 + dz]));
    for (let i = 0; i < lv.length - 1; i++){ const A = at(lv[i]), Bt = at(lv[i + 1]);
      push(solid(A, Bt, mat, .6) + (i === 0 ? hatches() : '') + hullInk([...A, ...Bt], 1.3), [...A, ...Bt], { planes: planesOf(A, Bt) }); }
    for (const sg of [-1, 1]) gB(ha - .3, sg > 0 ? YC + lid.hy - .1 : YC - lid.hy - .7, hz1, hb2 + .3, sg > 0 ? YC + lid.hy + .7 : YC - lid.hy + .1, hz1 + .5, mat, .4, { ink: .9 });   // the hood over each hatch
  });
  else binOpen(st, hg, () => slab(lid.x0, lid.x1, lid.hy, lid.z0, lid.z1, .6, type === 'kitchen' ? { ink: 1.3 } : { ink: 1.3, deco: () => onF([0,0,1], () => lidTop(YC - lid.hy + .6, YC + lid.hy - .6)) }));
  for (const w of bs.wheelList){
    for (const [y0, y1] of [[YC - w.y1, YC - w.y0], [YC + w.y0, YC + w.y1]]) gR([w.x, y0, w.z], [w.x, y1, w.z], w.r, TYRE, .6, { sides: 16 });
    if (w.axle) gR([w.x, YC - w.y0, w.z], [w.x, YC + w.y0, w.z], .35, ALU, .4);
    if (w.fork) for (const sg of [-1, 1]) gB(w.x - 1.2, sg > 0 ? YC + hb : YC - w.y1, 2*w.r - .3, w.x + 1.2, sg > 0 ? YC + w.y1 : YC - hb, 2*w.r + .4, CHS, .4, { ink: .8 });   // castor fork plate
  }
  if (!bs.noHandle) gR([handle.x, YC - handle.hy, handle.z], [handle.x, YC + handle.hy, handle.z], .45, mat, .4);
  if (bs.side) for (const sg of [-1, 1]){                                 // a grip bar along each side, on two stubs
    const z = bs.zt - 3, hw = hb + (ht - hb)*along(z, 1), xa = bs.tx0 + 2.4, xb = bs.tx1 - 2.6, yo = YC + sg*(hw + 1);
    gR([xa, yo, z], [xb, yo, z], .5, mat, .5, { sides: 10 });
    for (const x of [xa + .6, xb - .6]) gB(x - .5, sg > 0 ? YC + hw - .05 : YC - hw - .55, z - .45, x + .5, sg > 0 ? YC + hw + .55 : YC - hw + .05, z + .45, mat, .3, { ink: .7 }); }
  if (bs.pedal){                                                          // foot pedal on the back wall, a lift rod up to the lid's hinge
    const xw = z => bs.bx0 + (bs.tx0 - bs.bx0)*along(z, 1), rx = z => xw(z) - 1, zl = 2.2, zh = bs.zt - .4;
    gB(rx(zl) - 3.4, YC - 2, .3, rx(zl) + .5, YC + 2, 1.2, CHS, .5, { ink: 1 });
    gR([rx(zl), YC, 1.2], [rx(zh + 1), YC, zh + 1], .4, ALU, .5, { sides: 10 });
    for (const z of [zl, zh]) gB(xw(z) - .6, YC - .7, z - .5, xw(z) + .1, YC + .7, z + .5, CHS, .3, { ink: .7 });
  }
}

/* drum kind: a 16-sided steel drum stacked from non-overlapping prisms (chime, body, two hoops, top rim), a lid with a knob on a back hinge,
   a lug on the rim carrying the lip bar over the lid, label plates for the waste type */
function buildDrum(st, bs, mat, type){
  const { lid, lip, plate, mouth } = bs, R = bs.R, zt = bs.zt, cx = bs.cx, n = bs.n, [h1, h2] = bs.hoops, cs = Math.cos(Math.PI/n);
  const ring = r => Array.from({ length: n }, (_, i) => { const t = (i + .5)/n*2*Math.PI; return [cx + r*Math.cos(t), YC + r*Math.sin(t)]; });      // flat facets face +-x, +-y
  const seg = (r, z0, z1, o = {}) => gPr(ring(r), 'z', z0, z1, mat, { w: .4, ink: 1.4, ...o });
  seg(R + .2, 0, 1);
  seg(R, 1, h1 - .5); seg(R + .5, h1 - .5, h1 + .5, { ink: 1.2 });       // rolling hoop
  seg(R, h1 + .5, h2 - .5); seg(R + .5, h2 - .5, h2 + .5, { ink: 1.2 });
  seg(R, h2 + .5, zt - 1);
  seg(R + .3, zt - 1, zt, { deco: () => onF([0,0,1], () => st.lidA > .05
    ? dpoly(ring(R - .55).map(([x, y]) => [x, y, zt + .02]), '#1f2a1c', .5)
      + (st.binFull > .1 ? lumps((u, v) => [u, v, mouth.lz], mouth.lx0, mouth.lx1, YC - mouth.lhy, YC + mouth.lhy, Math.round(26*st.binFull*mouth.area/BIN_MOUTH0), 211) : '')
    : '') });
  gB(plate.x0, YC - plate.hy, plate.z0, plate.x1, YC + plate.hy, plate.z1, mat, .5, { ink: 1 });
  gB(lip.x0, YC - lip.hy, lip.z0, lip.x1, YC + lip.hy, lip.z1, mat, .4, { ink: .9 });
  const rc = (R + .3)*cs;
  gB(cx - rc - .8, YC - 1.2, zt - 1, cx - rc, YC + 1.2, zt + .8, mat, .4, { ink: .8 });             // hinge lug behind the rim
  const lr = Math.sqrt(Math.max(0, (lid.r*cs - .5)*(lid.r*cs - .5))), half = x => Math.sqrt(Math.max(0, lr*lr - (x - cx)*(x - cx)));
  binOpen(st, lid.hinge, () => {
    gPr(ring(lid.r), 'z', lid.z0, lid.z1, mat, { w: .5, ink: 1.3, ...(type === 'kitchen' ? {} : { deco: () => onF([0,0,1], () => binLidMark(type, mat, lid.z1 + .03, cx + 3.2, x => YC - half(x), x => YC + half(x))) }) });
    gR([cx, YC, lid.z1], [cx, YC, lid.knob], .6, mat, .4, { r1: .42, sides: 10 });
  });
  if (type !== 'kitchen'){                                                // label plates on the back and side facets
    const k = R/5.8, sc = .42*k, vc = (h2 + .5 + zt - 1)/2, pw = 1.5*k, z0 = vc - 1.35*k, z1 = vc + 1.65*k, mk = binMark(type, mat, sc), t = .2, a = bs.ap;
    gB(cx - a - t, YC - pw, z0, cx - a + .02, YC + pw, z1, mat, .3, { ink: .8, deco: () => onF([-1,0,0], () => mk((u, v) => [cx - a - t - .03, u, v], YC, vc)) });
    for (const sg of [-1, 1]) gB(cx - pw, sg > 0 ? YC + a - .02 : YC - a - t, z0, cx + pw, sg > 0 ? YC + a + t : YC - a + .02, z1, mat, .3,
      { ink: .8, deco: () => onF([0, sg, 0], () => mk((u, v) => [u, YC + sg*(a + t + .03), v], cx, vc)) });
  }
}
