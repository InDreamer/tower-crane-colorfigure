
/* ================= 2 回转与塔顶: lower support + slewing ring (fixed), upper support + 2 motors (turn), tower top, cab, safety gear on the tower top ================= */
const TOPZ = [90.6, 99, 107, 114];                      // tower top: foot plates, two brace levels, the head
const legX = z => 6 - (z - TOPZ[0])*(6 - 1.6)/(TOPZ[3] - TOPZ[0]);       // a leg's offset from the axis at height z
const MOTX = [-3, 3], MOTD = 9.5, MOTY = -Math.sqrt(MOTD*MOTD - 9);      // the two slewing motors: x and y (the pinions mesh with the ring teeth at distance MOTD)
const RING_R = 7.4, TEETH = 20;
function buildSlewUnit(st){
  /* fixed part: four posts on the mast chords, the lower support plate, the two races of the slewing ring, the ring's gear teeth */
  use('lo', 5);
  for (const [sx, sy] of CORNERS) gB(sx*SEC_W - .9, sy*SEC_W - .9, ZLO, sx*SEC_W + .9, sy*SEC_W + .9, ZLO + 1.8, YEL, .6, { ink: 1.2 });
  gB(-9.2, -9.2, ZLO + 1.8, 9.2, 9.2, ZLO + 3, YEL, .7, { ink: 1.8, deco: () => onF([0, 0, 1], () => { let s = ''; for (const [bx, by] of [[-8, -8], [8, -8], [8, 8], [-8, 8], [0, -8.6], [0, 8.6]]) s += dpoly(on(PZ(ZLO + 3.02), ellUV(bx, by, .45, .45, 8)), STL.d, .3); return s; }) });
  const ring = (z0, z1, m) => gPr(ellUV(0, 0, RING_R, RING_R, 24), 'z', z0, z1, m, { w: .6, ink: 1.8 });
  ring(ZLO + 3, ZLO + 4, STL); ring(ZLO + 4, ZLO + 5, ALU);
  for (let i = 0; i < TEETH; i++){
    const a = (i + .5)/TEETH*2*Math.PI, d = [Math.cos(a), Math.sin(a)], n = [-d[1], d[0]], r0 = RING_R - .1, r1 = RING_R + .8, hw = .5;
    gPr([[r0, -hw], [r1, -hw*.8], [r1, hw*.8], [r0, hw]].map(([r, w]) => [d[0]*r + n[0]*w, d[1]*r + n[1]*w]), 'z', ZLO + 3.1, ZLO + 3.9, DKS, { w: .4, ink: .8 });
  }
  /* turning part: upper support (base plate, body, top plate), the motor ear on its -y side, two reducers + pinions + motors */
  use('su', 5);
  gB(-7.4, -7.4, 85, 7.4, 7.4, 86.4, YEL, .7, { ink: 1.8 });
  gB(-6.2, -6.2, 86.4, 6.2, 6.2, 88.6, YEL, .7, { ink: 1.8, deco: () =>
    onF([0, 1, 0], () => { let s = ''; for (let x = -4.8; x < 5; x += 1.6) s += dline([[x, 6.22, 87], [x, 6.22, 88]], .5, YEL.d); return s; })
    + onF([-1, 0, 0], () => dpoly([[-6.22, -2, 86.9], [-6.22, 2, 86.9], [-6.22, 2, 88.1], [-6.22, -2, 88.1]], DKS.m, .5)) });
  gB(-7.4, -7.4, 88.6, 7.4, 7.4, 90, YEL, .7, { ink: 1.8 });
  gB(-6.5, -12.4, 87, 6.5, -7.4, 88.5, YEL, .7, { ink: 1.6 });
  for (const x of MOTX){
    gPr(Array.from({ length: 8 }, (_, k) => [x + 1.3*Math.cos(k*Math.PI/4 + pinionAng(st)), MOTY + 1.3*Math.sin(k*Math.PI/4 + pinionAng(st))]), 'z', 83, 84, DKS, { w: .6, ink: 1.4 });      // pinion on the ring teeth: it rolls round the ring as the unit turns
    gR([x, MOTY, 84], [x, MOTY, 87], 1.5, STL, .7, { sides: 16 });                                    // planetary reducer under the ear
    gR([x, MOTY, 88.5], [x, MOTY, 92.2], 1.5, MOT, .8, { sides: 16 });                                // motor on top
    gR([x, MOTY, 92.2], [x, MOTY, 93.1], 1.2, DKS, .6, { sides: 14 });                                // fan cover
    gB(x + 1.4, MOTY - .8, 90, x + 2.4, MOTY + .8, 91.4, MOT, .5, { ink: .9 });                        // terminal box
  }
  // the guard over the pinions and reducers where they mesh with the ring (fades in see-through: the ring gear and pinions show)
  use('su', 5, { shell: true });
  gB(-5.2, -11.8, ZLO + 3, 5.2, -7.4, 87, YEL, .7, { ink: 1.6, deco: () => onF([0, -1, 0], () => { let s = ''; for (let z = 83.9; z < 86.6; z += .8) s += dline([[-4.4, -11.82, z], [4.4, -11.82, z]], .5, YEL.d); return s; }) });
}

/* ----- the cab: white shell with big windows, on a bracket at the +y side of the upper support; seat and console inside ----- */
const CAB_PROF = [[-1, 86.2], [8, 86.2], [8, 93.2], [7, 95.2], [-1, 95.2]];
function buildCab(){
  use('cab', 6);
  for (const x of [-.6, 5.8]) gB(x, 7.4, 85, x + 1.8, 12.6, 86.2, YEL, .6, { ink: 1.2 });
  for (const x of [.3, 7.2]) gR([x, 7.5, 88.9], [x, 12.2, 86.3], .45, YEL, .5, { sides: 4 });
  // seat, control console with two joysticks (seen in see-through)
  gB(2.4, 11.6, 86.2, 4.6, 14.4, 87.4, RUB, .5, { ink: .9 }); gB(1.8, 11.6, 87.4, 2.6, 14.4, 90.4, RUB, .5, { ink: .9 });
  gB(5.4, 10.4, 86.2, 6.6, 15.6, 88.4, DKS, .6, { ink: 1, deco: () => onF([0, 0, 1], () => dpoly([[5.6, 12.6, 88.42], [6.4, 12.6, 88.42], [6.4, 14.2, 88.42], [5.6, 14.2, 88.42]], '#1d2a26', .4)) });
  for (const y of [11.2, 14.8]){ gR([6, y, 88.4], [6, y, 89.8], .25, DKS, .4, { sides: 8 }); gR([6, y, 89.8], [6, y, 90.4], .5, RED, .4, { sides: 8 }); }
  const sl = norm([2, 0, 1]);
  gPr(CAB_PROF, 'y', 9, 17, CABW, { shell: true, ink: 2.4, deco: () => {
    let s = '';
    s += onF([1, 0, 0], () => dpoly([[8.04, 9.7, 86.9], [8.04, 16.3, 86.9], [8.04, 16.3, 93], [8.04, 9.7, 93]], GLASS, 1)
      + dpoly([[8.06, 10.4, 91], [8.06, 12.4, 91], [8.06, 12.4, 92.6], [8.06, 10.4, 92.6]], '#ffffff', 0).replace('<path', '<path opacity=".45"')
      + dline([[8.05, 13, 86.9], [8.05, 13, 93]], .7));
    s += onF(sl, () => dpoly([[7.9, 9.7, 93.3], [7.9, 16.3, 93.3], [7.1, 16.3, 94.9], [7.1, 9.7, 94.9]], GLASS, .9));
    for (const sg of [-1, 1]){ const yy = sg > 0 ? 17.04 : 8.96;
      s += onF([0, sg, 0], () => dpoly([[1.4, yy, 87.4], [7, yy, 87.4], [7, yy, 93.6], [7.1, yy, 94.6], [1.4, yy, 94.6]], GLASS, .9)
        + dline([[1.4, yy, 86.6], [1.4, yy, 94.8]], .8) + dline([[-.6, yy, 88], [-.6, yy, 94], [0.8, yy, 94], [0.8, yy, 88], [-.6, yy, 88]], .6)
        + dpoly([[1.8 + (sg > 0 ? 0 : 3.8), yy + sg*.05, 90.4], [2.9 + (sg > 0 ? 0 : 3.8), yy + sg*.05, 90.4], [2.9 + (sg > 0 ? 0 : 3.8), yy + sg*.05, 90.8], [1.8 + (sg > 0 ? 0 : 3.8), yy + sg*.05, 90.8]], STL.l, .4)); }
    s += onF([-1, 0, 0], () => dpoly([[-1.04, 10, 89], [-1.04, 16, 89], [-1.04, 16, 94], [-1.04, 10, 94]], GLASS, .8));
    s += onF([0, 0, 1], () => dpoly([[0, 10, 95.22], [3, 10, 95.22], [3, 16, 95.22], [0, 16, 95.22]], CABW.d, .5));
    return s; } });
  gB(1, 11, 95.2, 5.4, 15, 96.4, ALU, .5, { ink: 1, deco: () => onF([1, 0, 0], () => { let s = ''; for (let y = 11.6; y < 14.8; y += .8) s += dline([[5.42, y, 95.4], [5.42, y, 96.2]], .4, STL.d); return s; }) });   // air conditioner
}

/* ----- tower top: 4 tapering legs on foot plates, two brace levels, a head with the guide sheave and the lugs of the tie bars ----- */
function buildTopFrame(){
  use('top', 11);
  for (const [sx, sy] of CORNERS){
    gB(sx*6 - 1.4, sy*6 - 1.4, 90, sx*6 + 1.4, sy*6 + 1.4, TOPZ[0], YEL, .6, { ink: 1.2 });
    for (let i = 0; i < 3; i++){ const a = legX(TOPZ[i]), b = legX(TOPZ[i+1]); gR([sx*a, sy*a, TOPZ[i]], [sx*b, sy*b, TOPZ[i+1]], .65, YEL, .6, { sides: 4 }); }
  }
  FACES.forEach(([nx, ny], fi) => {
    const tv = [-ny, nx, 0];
    for (let i = 0; i < 3; i++){
      const za = TOPZ[i], zb = TOPZ[i+1], xa = legX(za), xb = legX(zb), up = (i + fi) % 2 ? -1 : 1;
      const node = (t, z, x) => [nx*x + tv[0]*t, ny*x + tv[1]*t, z];
      strut(node(-up*xa, za + (i ? .9 : .5), xa), node(up*xb, zb - .9, xb), tv, .65, .35, YEL, { ink: .8 });
      if (i > 0){ const h = xa - .65; gB(nx ? nx*xa - .3 : -h, ny ? ny*xa - .3 : -h, za - .3, nx ? nx*xa + .3 : h, ny ? ny*xa + .3 : h, za + .3, YEL, .5, { ink: .8 }); }
    }
  });
  gB(-2.4, -2.4, TOPZ[3], 2, 2.4, 116.4, YEL, .7, { ink: 1.6 });      // head (a little narrower on the +x side: the hoist rope runs down past it)
  for (const sg of [-1, 1]){
    gB(-2.2, sg*.65 - (sg < 0 ? .4 : 0), 116.4, 2.2, sg*.65 + (sg > 0 ? .4 : 0), 120.6, YEL, .5, { ink: 1.2 });          // cheek plates
    gB(-.8, sg*2.4 - (sg < 0 ? .6 : 0), 114.2, .8, sg*2.4 + (sg > 0 ? .6 : 0), 116.2, YEL, .5, { ink: 1 });            // tie-bar lugs on the head
    gR([0, sg*1.05, APZ], [0, sg*1.35, APZ], .6, STL, .5, { sides: 10 });                                              // axle ends
  }
  gR([0, -.5, APZ], [0, .5, APZ], 1.7, STL, .8, { sides: 22, deco: () => [-1, 1].map(sg => onF([0, sg, 0], () =>
    dpoly(on(([u, v]) => [u, sg*.52, v], ellUV(0, APZ, 1.0, 1.0, 16)), DKS.m, .4) + dpoly(on(([u, v]) => [u, sg*.54, v], ellUV(0, APZ, .35, .35, 8)), ALU.m, .3))).join('') });
}
/* ----- safety gear on the tower top: moment limiter on a leg (19), anemometer (20), the red obstruction light on the apex (21) ----- */
function buildTopSafety(st){
  use('top', 19);
  const zl = 96.4, xl = legX(zl);
  gB(xl - .8, -xl - .65 - 1.6, zl - 1.3, xl + .8, -xl - .65, zl + 1.9, STL, .6, { ink: 1.2, deco: () => onF([1, 0, 0], () =>
    dpoly(on(([u, v]) => [xl + .82, u, v], ellUV(-xl - 1.45, zl + .8, .5, .5, 10)), '#f4f1e8', .5) + dline([[xl + .83, -xl - 1.45, zl + .8], [xl + .83, -xl - 1.2, zl + 1.0]], .6, RED.m)) });
  gR([xl, -xl - 1.2, zl - 1.3], [xl, -xl - 1.2, zl - 2.6], .3, ALU, .4, { sides: 6 });                              // sensing spring rod
  use('top', 20);
  const ax = -1.7, ay = 1.7, zt = 124.2, spin = st.clock*2.4;
  gB(ax - .7, ay - .7, 116.4, ax + .7, ay + .7, 117, STL, .4, { ink: .8 });
  gR([ax, ay, 117], [ax, ay, zt], .22, ALU, .5, { sides: 6 });
  for (let k = 0; k < 3; k++){ const a = spin + k*2*Math.PI/3, tx = ax + 1.7*Math.cos(a), ty = ay + 1.7*Math.sin(a);
    gR([ax, ay, zt], [tx, ty, zt], .12, ALU, .3, { sides: 4 });
    gR([tx, ty, zt - .45], [tx, ty, zt + .45], .45, k ? STL : RED, .4, { sides: 8 }); }
  use('top', 21);
  gB(1.1, -2.3, 116.4, 2.3, -1.1, 117, DKS, .4, { ink: .8 });
  gR([1.7, -1.7, 117], [1.7, -1.7, 118.2], .7, RED, .6, { sides: 12 }); gR([1.7, -1.7, 118.2], [1.7, -1.7, 118.8], .4, RED, .5, { sides: 10 });
}
function buildSlew(st){ buildSlewUnit(st); buildCab(); buildTopFrame(); buildTopSafety(st); }
