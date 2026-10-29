
/* ================= 1 驾驶室与底盘: frame, axles, springs, wheels, engine, gearbox, shafts (cab in c_cab.js) ================= */
// one tyre on its rim: centre (x, yc), outer face toward sgn; tread chevrons on the part of the tread facing the viewer
function wheel(x, yc, sgn, rimOut){
  const tw = 2.7, z = WR;
  use('ch', 7, { pull: [0, 12*sgn, 0], wheel: true });
  gR([x, yc - tw, z], [x, yc + tw, z], WR, TYRE, 1, { sides: 26, sh: tone, deco: () => {
    let s = '';
    for (let i = 0; i < 30; i++){ const a = i/30*2*Math.PI, c2 = Math.cos(a), s2 = Math.sin(a);
      if (!fvis([c2, 0, s2])) continue;
      const r = WR + .02, P1 = (dy, da) => [x + r*Math.cos(a + da), yc + dy, z + r*Math.sin(a + da)];
      s += dline([P1(-tw + .3, 0), P1(-.2, .07), P1(tw - .3, 0)], .55, '#111');
    }
    // the sidewall facing the viewer: a rim (outer) or the dark back of the rim (inner)
    for (const sg of [-1, 1]){ if (!fvis([0, sg, 0])) continue;
      const yy = yc + sg*(tw + .02), out = sg === sgn && rimOut;
      s += dpoly(on(([u, v]) => [u, yy, v], ellUV(x, z, WR*.86, WR*.86, 26)), mix(TYRE.m, '#000', .1), .4);
      if (!out) s += dpoly(on(([u, v]) => [u, yy, v], ellUV(x, z, 6.2, 6.2, 22)), '#26272a', .5);
    }
    return s; } });
  if (!rimOut) return;
  const yo = yc + sgn*tw;
  gR([x, yo + sgn*.02, z], [x, yo + sgn*.5, z], 6.4, RIM, .8, { sides: 22, deco: () => {
    if (!fvis([0, sgn, 0])) return '';
    const yy = yo + sgn*.52; let s = '';
    for (let i = 0; i < 8; i++){ const a = i/8*2*Math.PI;   // hand holes in the disc
      s += dpoly(on(([u, v]) => [u, yy, v], ellUV(x + 4.3*Math.cos(a), z + 4.3*Math.sin(a), .9, .9, 8)), '#5d6264', .3); }
    return s; } });
  gR([x, yo + sgn*.5, z], [x, yo + sgn*1.6, z], 2.6, RIM, .7, { r1: 2.1, sides: 14, deco: () => {
    if (!fvis([0, sgn, 0])) return ''; let s = '';
    for (let i = 0; i < 8; i++){ const a = i/8*2*Math.PI, yy = yo + sgn*.55;
      s += dpoly(on(([u, v]) => [u, yy, v], ellUV(x + 3.3*Math.cos(a), z + 3.3*Math.sin(a), .38, .38, 6)), '#3b3f42', 0); }
    return s; } });
}
function leafPack(x0, x1, y0, y1, zb, leaves, up){
  for (let i = 0; i < leaves; i++){ const sh = (x1 - x0)*i*.13, z0 = up ? zb + i*.9 : zb - (i + 1)*.9;
    gB(x0 + sh, y0, z0, x1 - sh, y1, z0 + .85, CHS, .5, { ink: .8 }); }
}
const RAIL_CUTS = [24, 50, 75.5, 104, 138, 160.5, 167, 172];   // where the rails are joined: at cross members, and either side of the radiator
function buildChassis(st){
  /* frame: two C rails (web + flanges opening inward), cross members, cab mounts, bumper */
  use('ch', 6);
  for (const [yo, sg] of [[RAIL_Y[0], 1], [RAIL_Y[1], -1]]){
    const yi = yo + sg*.6, yf = yo + sg*1.6;
    // a rail is built in lengths that meet at the cross members: one 150-unit slab would cut across engine, gearbox and
    // body in the sort (a long part cannot be put in front of some neighbours and behind others)
    for (let i = 0; i < RAIL_CUTS.length - 1; i++){ const x0 = RAIL_CUTS[i], x1 = RAIL_CUTS[i+1];
      gB(x0, Math.min(yo, yi), RZ0, x1, Math.max(yo, yi), RZ1, CHS, .7, { ink: 1.6 });
      gB(x0, Math.min(yi, yf), RZ1 - .5, x1, Math.max(yi, yf), RZ1, CHS, .5, { ink: .9 });
      gB(x0, Math.min(yi, yf), RZ0, x1, Math.max(yi, yf), RZ0 + .5, CHS, .5, { ink: .9 }); }
  }
  for (const xc of [27, 50, 75.5, 104, 138, 167]) gB(xc - 1, 17, 17.5, xc + 1, 33, 20.5, CHS, .6, { ink: 1 });
  for (const xc of [143, 168]) for (const y of [17.2, 31.4]) gB(xc - 1.3, y, RZ1, xc + 1.3, y + 1.4, 27, RUB, .5, { ink: .8 });   // cab mounts
  // front bumper on the rail ends, with fog lamps, tow pin and the front plate
  gB(171.6, 1, 12, 175.6, 49, 20, CHS, .8, { ink: 2, deco: () => onF([1,0,0], () => {
    let s = '';
    for (const yy of [5, 45]) s += dpoly(on(([u, v]) => [175.65, u, v], ellUV(yy, 16, 1.6, 1.3, 12)), '#f6efc8', .5);
    s += dpoly([[175.65, 19.2, 13.2], [175.65, 30.8, 13.2], [175.65, 30.8, 17.6], [175.65, 19.2, 17.6]], '#f2c230', .6);
    const tp = P(...wpt([175.7, 25, 14.6])), U = Dv(...CX.N([0,-1,0])), V = Dv(...CX.N([0,0,-1]));
    s += `<text transform="${txM(tp, U, V)}" font-size="2.6" fill="${INK}" text-anchor="middle" font-family="${CJKF}" font-weight="800">粤B·D8246</text>`;
    return s; }) });
  /* front axle: beam, king pins, tie rod, steering arm; leaf springs with hangers */
  use('ch', 5);
  gB(AX_F - 1, 8.5, 8.6, AX_F + 1, 41.5, 10.8, CHS, .7, { ink: 1.4 });
  for (const y of [8.6, 41.4]) gR([AX_F, y, 7.6], [AX_F, y, 13.2], 1.1, CHS, .6);
  gR([AX_F - 3, 9.5, 9], [AX_F - 3, 40.5, 9], .45, CHS, .5);
  for (const yy of [4.5, 45.5]) gR([AX_F, yy + (yy < YC ? 2.9 : -2.9), WR], [AX_F, yy < YC ? 8.6 : 41.4, WR], 1.3, CHS, .5);
  for (const [y0, y1] of [[16.6, 19], [31, 33.4]]){
    leafPack(140, 160, y0, y1, 14.9, 4, false);
    for (const xh of [140.5, 159.5]) gB(xh - .7, y0, 14.9, xh + .7, y1, RZ0, CHS, .5, { ink: .8 });
    for (const xu of [148.6, 151.4]) gB(xu - .3, y0 - .2, 10.8, xu + .3, y1 + .2, 14.3, ALU, .4, { ink: .6 });   // U-bolts
  }
  /* tandem drive axles: housings, diffs, hub drums; bogie springs and trunnions */
  for (const ax of AX_R){
    gR([ax, 7.5, WR], [ax, 42.5, WR], 1.5, CHS, .7, { sides: 12 });
    gR([ax - 3.4, YC, 11], [ax + 2.4, YC, 11], 4.3, CHS, .8, { sides: 18, r1: 3.6 });
    gR([ax + 2.4, YC, 11.3], [ax + 5, YC, 11.6], 1.9, CHS, .6, { r1: 1.5 });
    for (const yy of [9.6, 40.4]) gR([ax, yy - 1.6, WR], [ax, yy + 1.6, WR], 4.2, ENG, .6, { sides: 16 });
  }
  for (const [y0, y1] of [[16.6, 19], [31, 33.4]]){
    leafPack(63, 88, y0, y1, 12.1, 3, true);
    gB(73.5, y0 - .4, 14.8, 77.5, y1 + .4, RZ0, CHS, .6, { ink: 1 });                       // trunnion bracket
    gR([75.5, y0 - .8, 15.2], [75.5, y1 + .8, 15.2], .9, ALU, .5);
  }
  /* wheels: singles in front, duals on both drive axles */
  for (const yy of [4.5, 45.5]) wheel(AX_F, yy, side(yy), true);
  for (const ax of AX_R) for (const sg of [-1, 1]){ wheel(ax, YC + sg*21.8, sg, true); wheel(ax, YC + sg*15.8, sg, false); }
  /* engine on its mounts between the rails, under the cab */
  use('ch', 2);
  gB(142, 20, 13.4, 154, 30, 16.5, ENG, .6, { ink: 1 });                                    // sump
  gB(140, 19, 16.5, 156, 31, 28.5, ENG, .7, { ink: 1.8, deco: () => onF([0,1,0], () => { let s = '';
    for (let xx = 142; xx < 155; xx += 2.6) s += dline([[xx, 31.02, 18], [xx, 31.02, 27]], .4, '#24262a'); return s; }) });   // block ribs
  gB(140.5, 19.5, 28.5, 155.5, 30.5, 31, ENG, .6, { ink: 1 });                                // cylinder head
  gB(141, 20.5, 31, 155, 29.5, 32.8, ALU, .6, { ink: 1, deco: () => onF([0,0,1], () => { let s = '';
    for (let xx = 143; xx < 154; xx += 2.2) s += dpoly(on(PZ(32.82), ellUV(xx, 25, .5, .5, 8)), '#7b8487', 0); return s; }) });   // valve cover + bolts
  gB(142, 30.6, 25, 154, 32, 28, ALU, .5, { ink: .9 });                                      // intake manifold
  gB(142, 18, 24, 154, 19, 27, matOf('#9a6a48'), .5, { ink: .9 });                           // exhaust manifold
  gR([139, 13.6, 27], [139, 18.2, 27], 2.2, matOf('#9a6a48'), .6);                            // turbo
  gR([154.5, 33.2, 26], [151, 33.2, 26], 1.6, ALU, .5);                                       // alternator
  gR([146, 32.4, 22.2], [146, 32.4, 24.8], 1.1, matOf('#e2c33a'), .5);                        // oil filter
  for (const y of [18, 31]) gB(144, y, 20, 147, y + 1, RZ1 + .4, RUB, .4, { ink: .6 });       // engine mounts
  gR([156.4, YC, 23], [157.3, YC, 23], 6.2, ENG, .6, { sides: 20, deco: () => { let s = '';  // fan
    for (const sg of [-1, 1]) if (fvis([sg, 0, 0])) for (let i = 0; i < 6; i++){ const a = i/6*2*Math.PI, xx = sg > 0 ? 157.32 : 156.38;
      s += dline([[xx, YC + 1.2*Math.cos(a), 23 + 1.2*Math.sin(a)], [xx, YC + 5.6*Math.cos(a + .35), 23 + 5.6*Math.sin(a + .35)]], .7, '#8c9396'); } return s; } });
  gB(158, 18.5, 15, 160.4, 31.5, 34, ENG, .7, { ink: 1.4, deco: () => onF([1,0,0], () => { let s = '';   // radiator core
    for (let z = 16; z < 33.5; z += 1.1) s += dline([[160.42, 19, z], [160.42, 31, z]], .3, '#202226'); return s; }) });
  // exhaust: turbo down pipe outside the right rail to the muffler, tail pipe out to the side
  gR([138, 15, 25], [134, 11, 18.6], .8, matOf('#9a6a48'), .5);
  gR([137.5, 9, 15], [123.5, 9, 15], 3.6, ALU, .8, { sides: 16 });
  gR([123.5, 9, 14], [121.5, 4, 12.5], .8, ALU, .5);
  /* gearbox: bell housing, case, tail housing, shift tower, PTO on its left side */
  use('ch', 3);
  gR([140, YC, 22], [136, YC, 20.5], 7, ENG, .8, { r1: 5.2, sides: 18 });
  gB(124, 20, 15.5, 136, 30, 25, ENG, .7, { ink: 1.6 });
  gB(129, 23, 25, 133, 27, 28, ENG, .5, { ink: .8 });
  gR([124, YC, 19], [121.5, YC, 18.5], 2, ENG, .5);
  gB(124, 30, 15.5, 129, 31.6, 20, ALU, .5, { ink: .9 });                                     // PTO
  /* propshaft: gearbox -> centre bearing (on the x 104 cross member) -> first diff; inter-axle shaft -> second diff */
  use('ch', 4);
  const sh1 = [121.4, YC, 18.4], cb = [104, YC, 16.6], d1 = [AX_R[1] + 5, YC, 11.6], d1r = [AX_R[1] - 3.4, YC, 11], d2 = [AX_R[0] + 5, YC, 11.6];
  gR(sh1, cb, .95, ALU, .6, { sides: 12 });
  gR(cb, d1, .95, ALU, .6, { sides: 12 });
  gR(d1r, d2, .85, ALU, .6, { sides: 12 });
  for (const p of [sh1, d1, d2, d1r]) gB(p[0] - .7, p[1] - 1.3, p[2] - 1.3, p[0] + .7, p[1] + 1.3, p[2] + 1.3, CHS, .4, { ink: .7 });   // U-joint yokes
  gB(102.8, 22.5, 15.4, 105.2, 27.5, 17.8, RUB, .4, { ink: .8 });                             // centre bearing
  gB(103.4, 22.5, 17.8, 104.6, 27.5, 17.5 + 0.01, CHS);
  /* fuel tank (right) and battery box (left) on brackets from the rails; front fenders over the front wheels */
  use('ch', 6);
  gPr(rrUV(5, 9.5, 15.5, 20, 2.6, 4), 'x', 101, 121, ALU, { ink: 1.8, deco: () => { let s = '';
    for (const xx of [105, 117]) if (fvis([0,-1,0]) || fvis([0,0,1])) s += dline([[xx, 5.05, 12], [xx, 5.05, 17.5], [xx, 7.6, 20.05], [xx, 15.4, 20.05]], .9, '#4a4f52');
    if (fvis([0,0,1])) s += dpoly(on(PZ(20.06), ellUV(111, 10, 1.2, 1.2, 10)), '#3b3f42', .4);
    return s; } });
  for (const xx of [105, 117]) gB(xx - .8, 15.5, 15, xx + .8, RAIL_Y[0], 20.5, CHS, .4, { ink: .8 });
  gB(124, 34.4, 12, 135, 43, 19.5, CHS, .7, { ink: 1.6, deco: () => onF([0,1,0], () =>
    dpoly([[126, 43.05, 13.5], [133, 43.05, 13.5], [133, 43.05, 18], [126, 43.05, 18]], '#55595e', .5)) });
  for (const xx of [126, 133]) gB(xx - .6, RAIL_Y[1], 17, xx + .6, 34.4, 19.5, CHS, .4, { ink: .7 });
  for (const yy of [4.5, 45.5]){ const y0 = yy - 3.4, y1 = yy + 3.4;
    for (let i = 0; i < 6; i++){ const a0 = (15 + i*25)*Math.PI/180, a1 = (15 + (i + 1)*25)*Math.PI/180, r0 = 11.7, r1 = 12.3;
      const q = [[AX_F + r0*Math.cos(a0), WR + r0*Math.sin(a0)], [AX_F + r1*Math.cos(a0), WR + r1*Math.sin(a0)], [AX_F + r1*Math.cos(a1), WR + r1*Math.sin(a1)], [AX_F + r0*Math.cos(a1), WR + r0*Math.sin(a1)]];
      gPr(q, 'y', y0, y1, CHS, { w: .5, ink: .9 }); }
    gB(AX_F - .8, yy < YC ? y1 : RAIL_Y[1], 19.5, AX_F + .8, yy < YC ? RAIL_Y[0] : y0, 21, CHS, .4, { ink: .7 });   // fender stay
  }
}
