
/* ================= 1 塔身与基础: cross base on four ballast blocks, base section, standard mast sections, ladder + platforms ================= */
const FACES = [[1, 0], [0, 1], [-1, 0], [0, -1]];       // outward normals of the four mast faces
const CORNERS = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
// one vertical chord piece (square tube) at corner (cx, cy)
const chordP = (cx, cy, z0, z1, m = YEL) => gB(cx - CHR, cy - CHR, z0, cx + CHR, cy + CHR, z1, m, .6, { ink: 1.1 });
// a prism over a rotated rectangle in plan: from s0 to s1 along direction angle a (degrees) through the origin, half width hw, z0..z1
function rotBar(a, s0, s1, hw, z0, z1, m, o = {}){
  const t = a*Math.PI/180, d = [Math.cos(t), Math.sin(t)], n = [-d[1], d[0]];
  return gPr([[s0, -hw], [s1, -hw], [s1, hw], [s0, hw]].map(([s, w]) => [d[0]*s + n[0]*w, d[1]*s + n[1]*w]), 'z', z0, z1, m, { w: .7, ink: 1.6, ...o });
}
// the lattice of one mast level between local z foot..zb: 4 chords (cut at the mid node zm when given), a horizontal on
// every face at zm, one diagonal per face per bay (zig-zag); every diagonal stops off the chord surface
function mastLevel(foot, zb, zm){
  const zs = zm ? [foot, zm, zb] : [foot, zb];
  for (const [sx, sy] of CORNERS) for (let i = 0; i < zs.length - 1; i++) chordP(sx*SEC_W, sy*SEC_W, zs[i], zs[i+1]);
  FACES.forEach(([nx, ny], fi) => {
    const tv = [-ny, nx, 0], f = [nx*SEC_W, ny*SEC_W], node = (t, z) => [f[0] + tv[0]*t, f[1] + tv[1]*t, z];
    for (let i = 0; i < zs.length - 1; i++){
      const lo = zs[i] + (i ? 1.4 : .6), hi = zs[i+1] - (i < zs.length - 2 ? 1.4 : .6), up = (i + fi) % 2 ? -1 : 1;
      strut(node(-up*SEC_W, lo), node(up*SEC_W, hi), tv, CHR, .4, YEL, { ink: .8 });
    }
    if (zm){ const hx = nx ? .38 : SEC_W - CHR, hy = nx ? SEC_W - CHR : .38;
      gB(f[0] - hx, f[1] - hy, zm - .38, f[0] + hx, f[1] + hy, zm + .38, YEL, .5, { ink: .8 }); }
  });
}
// the ladder (inside the -x face: rails, rungs, a cage hoop) from z0 to z1; mid: it is fixed to the mid horizontal there
function buildLadder(z0, z1, mid){
  const X0 = -4.05, X1 = -3.75, zh = z0 + (z1 - z0)*.62;
  for (const y of [-1.15, .85]) gB(X0, y, z0, X1, y + .3, z1, ALU, .5, { ink: .8 });
  for (let z = z0 + 1.1; z < z1 - .4; z += 2.5) gB(X0 + .05, -.85, z - .16, X1 - .05, .85, z + .16, ALU, .4, { ink: .7 });
  gB(X1, -1.2, zh, -2.6, -1.0, zh + .22, ALU, .4, { ink: .7 }); gB(X1, 1.0, zh, -2.6, 1.2, zh + .22, ALU, .4, { ink: .7 });
  gB(-2.8, -1.2, zh, -2.6, 1.2, zh + .22, ALU, .4, { ink: .7 });
  if (mid) gB(-4.62, -1.2, mid - .3, X0, 1.2, mid + .3, ALU, .4, { ink: .7 });     // standoff: ladder to the horizontal
}
// a rest platform inside a level, floor top at zt, a hatch for the ladder, railing along the open edge
function buildPlatform(zt){
  const z0 = zt - .4, grate = (x0, x1) => () => onF([0, 0, 1], () => { let s = ''; for (let x = x0 + .3; x < x1; x += .8) s += dline([[x, -1.4, zt + .02], [x, 1.4, zt + .02]], .35, STL.d); return s; });
  gB(-4.3, 1.5, z0, 1.4, 4.3, zt, STL, .5, { ink: 1 }); gB(-4.3, -4.3, z0, 1.4, -1.5, zt, STL, .5, { ink: 1 });
  gB(-2.4, -1.5, z0, 1.4, 1.5, zt, STL, .5, { ink: 1, deco: grate(-2.4, 1.4) });
  for (const y of [-4.1, 0, 4.1]) gB(1.0, y - .15, zt, 1.2, y + .15, zt + 2.2, YEL, .4, { ink: .7 });          // railing posts along the open edge
  gB(1.0, -4.25, zt + 2.0, 1.2, 4.25, zt + 2.3, YEL, .4, { ink: .8 });
}
// concrete ballast blocks, the crossed box beams along the diagonals, foot plates and inclined struts under the mast corners
function buildBase(){
  for (const [sx, sy] of CORNERS){
    const cx = sx*12.4, cy = sy*12.4;
    gB(cx - 4.5, cy - 4.5, 0, cx + 4.5, cy + 4.5, 5, CONC, .8, { ink: 2.2, deco: () =>
      onF([sx, 0, 0], () => dline([[cx + sx*4.52, cy - 4.5, 2.5], [cx + sx*4.52, cy + 4.5, 2.5]], .6, CONC.d))
      + onF([0, sy, 0], () => dline([[cx - 4.5, cy + sy*4.52, 2.5], [cx + 4.5, cy + sy*4.52, 2.5]], .6, CONC.d))
      + onF([0, 0, 1], () => { let s = ''; for (const [bx, by] of [[-3, -3], [3, -3], [3, 3], [-3, 3]]) s += dpoly(on(PZ(5.02), ellUV(cx + bx, cy + by, .5, .5, 8)), CONC.d, .3); return s; }) });
  }
  rotBar(45, -22, 22, 2.6, 5, 8, YEL);
  for (const sg of [-1, 1]) rotBar(135, sg*2.6, sg*22, 2.6, 5, 8, YEL, { ink: 1.5 });
  for (const [sx, sy] of CORNERS){
    gB(sx*SEC_W - 1.6, sy*SEC_W - 1.6, 8, sx*SEC_W + 1.6, sy*SEC_W + 1.6, 8.9, YEL, .6, { ink: 1.2 });
    gR([sx*10.4, sy*10.4, 8.2], [sx*6, sy*6, 13.4], .6, YEL, .6, { sides: 4 });
  }
  mastLevel(8.9, ZM, 0);                                // the base section: one bay
}
// a standard section (local z 0..16): flange collars at the foot joint, then the two-bay lattice
function buildSection(){
  for (const [sx, sy] of CORNERS){
    const e = CHR + .3;
    gB(sx*SEC_W - e, sy*SEC_W - e, 0, sx*SEC_W + e, sy*SEC_W + e, 1.2, YEL, .6, { ink: 1.1, deco: () =>
      onF([sx, 0, 0], () => dline([[sx*(SEC_W + e) + .02*sx, sy*SEC_W - .5, .6], [sx*(SEC_W + e) + .02*sx, sy*SEC_W + .5, .6]], .9, STL.d))
      + onF([0, sy, 0], () => dline([[sx*SEC_W - .5, sy*(SEC_W + e) + .02*sy, .6], [sx*SEC_W + .5, sy*(SEC_W + e) + .02*sy, .6]], .9, STL.d)) });
  }
  mastLevel(1.2, SEC_H, SEC_H/2);
}
// the flash on the bolted joint of the new section: red plates over the four corner collars, only while the bolts are going in
function buildBoltPlates(st){
  const e = CHR + .3, m = st.bolt > .5 ? RED : { l: mix(RED.l, STL.l, .5), m: mix(RED.m, STL.m, .5), d: mix(RED.d, STL.d, .5) };
  for (const [sx, sy] of CORNERS){
    gB(sx*(SEC_W + e), sy*SEC_W - .9, -1.2, sx*(SEC_W + e) + sx*.35, sy*SEC_W + .9, 1.1, m, .4, { ink: .9 });
    gB(sx*SEC_W - .9, sy*(SEC_W + e), -1.2, sx*SEC_W + .9, sy*(SEC_W + e) + sy*.35, 1.1, m, .4, { ink: .9 });
  }
}
function buildTower(st){
  use('g', 1); buildBase();
  const nb = st.nsec + (st.sx != null ? 1 : 0);              // (the section coming in is drawn too)
  for (let i = 0; i < nb; i++){ use('s' + i, 10, i === 1 ? {} : { pull: [0, 0, 0] }); buildSection(); }
  if (st.sx != null && st.bolt > 0){ use('s' + st.nsec, 10, { pull: [0, 0, 0] }); buildBoltPlates(st); }
  use('g', 22); buildLadder(9.5, 15.6, 0); buildPlatform(15);
  for (let i = 0; i < nb; i++){ use('s' + i, 22); buildLadder(.3, 15.6, 8); if (i % 2) buildPlatform(15); }
}
