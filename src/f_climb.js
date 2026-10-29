
/* ================= 6 顶升与安全: climbing frame around the mast under the lower support, hydraulic cylinder on its -x face, pump station on a platform strip ================= */
const CF_R = 8.2, CF_W = .5, CF_RINGS = [60.6, 70, 78.8], CF_TOP = 81.8;   // post centre offset, half section, ring heights, the lower support's underside
const CYL_X = -10.4, CYL_R = 1.1, CYL_Z0 = 66, CYL_Z1 = 77.9, DECK_Y0 = 8.7, DECK_Y1 = 11.7, DECK_Z = 70.5;      // the cylinder: barrel Z0..Z1 hangs from the frame, its rod points down to a lug arm on the mast
const LUG_Z = 57.2, LUG_X0 = -9.6, LUG_X1 = -5.38, RAIL_Y = [3.2, 4.2];             // top of the lug arms (with 4 sections: on the mast's mid-level cross plates); the introduction beam's rails
function buildClimbFrame(st){
  use('cf', 15);
  const zs = [57.6, ...CF_RINGS.flatMap(z => [z - .5, z + .5]), CF_TOP];
  for (let i = 0; i < zs.length; i += 2) for (const [sx, sy] of CORNERS)
    gB(sx*CF_R - CF_W, sy*CF_R - CF_W, zs[i], sx*CF_R + CF_W, sy*CF_R + CF_W, zs[i + 1], YEL, .6, { ink: 1.5 });
  // the +x face is a window for the section coming in (only the lowest ring stays; a header beam closes the top)
  CF_RINGS.forEach((z, zi) => { for (const s of [-1, 1]){
    gB(-CF_R + CF_W, s*CF_R - CF_W, z - .5, CF_R - CF_W, s*CF_R + CF_W, z + .5, YEL, .6, { ink: 1.3 });
    if (s < 0 || !zi) gB(s*CF_R - CF_W, -CF_R + CF_W, z - .5, s*CF_R + CF_W, CF_R - CF_W, z + .5, YEL, .6, { ink: 1.3 });
  } });
  gB(CF_R - CF_W, -CF_R + CF_W, CF_TOP - .9, CF_R + CF_W, CF_R - CF_W, CF_TOP, YEL, .6, { ink: 1.3 });
  // zig-zag diagonals on the four faces between rings
  FACES.forEach(([nx, ny], fi) => {
    if (!fi) return;
    const tv = [-ny, nx, 0], f = [nx*CF_R, ny*CF_R], node = (t, z) => [f[0] + tv[0]*t, f[1] + tv[1]*t, z];
    for (let i = 0; i < 2; i++){ const up = (i + fi) % 2 ? -1 : 1; strut(node(-up*CF_R, CF_RINGS[i] + .5), node(up*CF_R, CF_RINGS[i + 1] - .5), tv, CF_W, .35, YEL, { ink: .8 }); }
  });
  // guide rollers between the two outer rings and the mast chords
  const ob = SEC_W + CHR, ib = SEC_W - CHR, rb = CF_R - CF_W, rg = (a, b) => [Math.min(a, b), Math.max(a, b)];
  for (const z of [CF_RINGS[0], CF_RINGS[2]]) for (const [sx, sy] of CORNERS){
    if (sx > 0 && z === CF_RINGS[2]) continue;                                 // (the window: the new section's chords pass here)
    const [xa, xb] = rg(sx*ib, sx*ob), [ya, yb] = rg(sy*ib, sy*ob), [xc, xd] = rg(sx*ob, sx*rb), [yc, yd] = rg(sy*ob, sy*rb);
    gB(xa, yc, z - .4, xb, yd, z + .4, DKS, .5, { ink: .9 });
    gB(xc, ya, z - .4, xd, yb, z + .4, DKS, .5, { ink: .9 });
  }
  // platform strips on the +y and -y faces with a kick plate, top rail and posts
  for (const s of [-1, 1]){
    const y0 = s > 0 ? DECK_Y0 : -DECK_Y1, y1 = s > 0 ? DECK_Y1 : -DECK_Y0, yr = s*(DECK_Y1 - .25);
    gB(-CF_R + CF_W, y0, DECK_Z - .9, CF_R - CF_W, y1, DECK_Z, STL, .5, { ink: 1.1, deco: () => onF([0, 0, 1], () => { let q = '';
      for (let x = -7.2; x < 7.5; x += .9) q += dline([[x, y0 + .15, DECK_Z + .02], [x, y1 - .15, DECK_Z + .02]], .3, STL.d); return q; }) });
    gB(-CF_R + CF_W, yr - .15, DECK_Z, CF_R - CF_W, yr + .15, DECK_Z + .5, YEL, .4, { ink: .8 });
    gB(-CF_R + CF_W, yr - .15, DECK_Z + 1.5, CF_R - CF_W, yr + .15, DECK_Z + 1.9, YEL, .4, { ink: .8 });
    for (const x of [-7.2, -2.5, 2.5, 7.2]) gB(x - .15, yr - .15, DECK_Z + .5, x + .15, yr + .15, DECK_Z + 1.5, YEL, .4, { ink: .7 });
    gB(CF_R - CF_W - .3, y0, DECK_Z, CF_R - CF_W, y1, DECK_Z + 1.9, YEL, .3, { ink: .7 });
  }
  // the introduction beam: two rails out of the +x window on the lowest ring; they run out for the section coming in and back after it
  const rl = 4 + 34*(st.ext || 0);
  for (const sg of [-1, 1]){
    const y0 = sg > 0 ? RAIL_Y[0] : -RAIL_Y[1], y1 = sg > 0 ? RAIL_Y[1] : -RAIL_Y[0];
    gB(CF_R - CF_W, y0, CF_RINGS[0] + .5, CF_R + CF_W, y1, CF_RINGS[0] + 1.8, YEL, .5, { ink: 1 });                          // post on the ring
    gB(CF_R - CF_W, y0, CF_RINGS[0] + 1.8, CF_R + rl, y1, CF_RINGS[0] + 3.4, STL, .5, { ink: 1.1 });
  }
}
// the cylinder hangs from the frame (a bracket on top, a clamp on the middle ring); its rod comes out of the bottom and rests on a lug arm of the mast:
// the frame rises, the arm stays, so the rod gets longer (ext 0..1 = one section). The arms (on the mast sections) stay below the frame always
function buildClimbCyl(st){
  use('cf', 16);
  gB(CYL_X - CYL_R - .1, -1.4, CYL_Z1, -CF_R - CF_W, 1.4, CYL_Z1 + 1.8, STL, .5, { ink: 1.1 });
  gB(-CF_R - CF_W - .6, -.8, 69.5, -CF_R - CF_W, .8, 70.5, STL, .4, { ink: .8 });
  const zf = LUG_Z - SEC_H*(st.ext || 0);                                                                                // the rod's foot, in the frame's coordinates
  gB(CYL_X - 1.3, -1.3, zf - .6, CYL_X + 1.3, 1.3, zf, DKS, .5, { ink: 1 });                                            // the rod's shoe: it stands on a lug arm
  gR([CYL_X, 0, zf], [CYL_X, 0, CYL_Z0 + 2.4], CYL_R*.45, ALU, .6, { sides: 12 });                                      // piston rod (its top end is inside the barrel)
  gR([CYL_X, 0, CYL_Z0 + 2.4], [CYL_X, 0, CYL_Z0 + 3.2], CYL_R*.85, DKS, .6, { sides: 14 });                              // piston head
  use('cf', 16, { shell: true });
  gR([CYL_X, 0, CYL_Z0], [CYL_X, 0, CYL_Z1], CYL_R, HYD, .8, { sides: 14 });                                              // barrel: fades in see-through
  use('cf', 16);
  for (const z of [CYL_Z0 + .9, CYL_Z1 - .7]) gB(CYL_X - CYL_R - .55, -.45, z - .3, CYL_X - CYL_R, .45, z + .3, STL, .4, { ink: .7 });   // hose ports
  // the lug arms on the mast (part 10; the two sections under the frame): a short beam from the mast's cross plate for the rod's shoe to stand on (it stops short of the rod, so the rod can pass it)
  for (const j of [st.nsec - 3, st.nsec - 2]){
    if (j < 0) continue;
    use('s' + j, 10, j === 1 ? {} : { pull: [0, 0, 0] });
    gB(LUG_X0, -.9, 7.4, LUG_X1, .9, 8.6, STL, .6, { ink: 1.2 });
  }
}
function buildPump(st){
  use('cf', 17, { xo: [0, 16, 0] });
  const fl = st.pump || 0, yc = 10.1;
  gB(-7, 9.2, DECK_Z, -5.6, 11, 75, STL, .6, { ink: 1.3, deco: () => onF([-1, 0, 0], () => dline([[-7.02, 9.6, 72.5], [-7.02, 10.6, 72.5]], .5, STL.d)) });   // valve block
  gB(-5, 9.3, DECK_Z, -2.6, 10.9, 71.2, DKS, .5, { ink: .9 });
  gR([-5.6, yc, 72.2], [-2, yc, 72.2], 1, MOT, .7, { sides: 18 });                      // motor
  gR([-2, yc, 72.2], [-.6, yc, 72.2], 1.2, DKS, .6, { sides: 16 });                     // pump
  gB(0, 9.2, DECK_Z, 6, 11.1, 74.2, HYD, .7, { ink: 1.5, deco: () => onF([0, 1, 0], () => dline([[.6, 11.12, 71.4], [5.4, 11.12, 71.4]], .5, HYD.d) + dpoly(on(([u, v]) => [u, 11.13, v], ellUV(3, 72.6, .8, .8, 10)), '#d8ecf8', .4)) });   // tank with a sight glass
  gR([4.6, yc, 74.2], [4.6, yc, 74.8], .5, DKS, .5, { sides: 10 });                      // filler cap
  use('cf', 17, { shell: true, xo: [0, 16, 0] });
  gB(-7.2, 8.8, DECK_Z, -.5, 11.3, 75.4, HYD, .7, { ink: 1.5, deco: () => onF([0, 1, 0], () => { let s = ''; for (let x = -6.4; x < -1; x += .9) s += dline([[x, 11.32, 71.6], [x, 11.32, 74.6]], .5, HYD.d); return s; }) });   // housing over valve, motor and pump
  use('cf', 17, { xo: [0, 16, 0] });
  const hw = .3, hs = { n: 17, wd: hw };
  const P = (p, n) => ({ fr: 'cf', p, n: n || 17 });
  gHose([P([-7, yc, 72]), P([-12.6, yc, 72]), P([-12.6, 0, 72]), P([-12.6, 0, CYL_Z0 + .9]), P([CYL_X - CYL_R - .55, 0, CYL_Z0 + .9], 16)], fl, 1, hw, { n: 17, seg: 'h1' });
  gHose([P([-7, yc, 74]), P([-13.7, yc, 74]), P([-13.7, 0, 74]), P([-13.7, 0, CYL_Z1 - .7]), P([CYL_X - CYL_R - .55, 0, CYL_Z1 - .7], 16)], fl, -1, hw, { n: 17, seg: 'h2' });
}
function buildClimb(st){ buildClimbFrame(st); buildClimbCyl(st); buildPump(st); }
