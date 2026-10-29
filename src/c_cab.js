
/* ================= 1 驾驶室: cab-over cab on four mounts; windows, doors, lamps, mirrors ================= */
// text lying on a local plane (origin p, reading direction u, down direction v as local vectors)
const gTxt = (p, u, v, str, size, col = INK, wt = 800) => { const o = P(...wpt(p));
  return `<text transform="${txM(o, Dv(...CX.N(u)), Dv(...CX.N(v)))}" font-size="${size}" fill="${col}" text-anchor="middle" font-family="${CJKF}" font-weight="${wt}">${str}</text>`; };
function buildCab(st){
  use('cab', 1);
  // seats, dashboard and steering wheel: inside the shell, seen in see-through
  for (const [y0, y1] of [[29, 42], [8, 21]]){
    gB(146, y0, 27, 154, y1, 33, RUB, .5, { ink: .9 });
    gB(144, y0, 33, 146.5, y1, 45, RUB, .5, { ink: .9 });
  }
  gB(164, 4, 34, 169.5, 46, 41, ENG, .5, { ink: 1 });
  gR([163, 36, 41.5], [164.5, 36, 39.6], 1, ENG, .5);
  gR([162.8, 36, 42.2], [163.3, 36, 41.6], 4, RUB, .6, { sides: 18 });
  const wsN = norm([12, 0, 3.5]);
  const wsP = (t, y, e = .05) => [171.8 - 3.5*t + wsN[0]*e, y, 44 + 12*t + wsN[2]*e];
  gPr(CAB_PROF, 'y', 2, 48, CABW, { shell: true, ink: 2.6, deco: () => {
    let s = '';
    // front: grille, headlamps, turn lamps, badge
    s += onF([1,0,0], () => {
      let d = dpoly([[172.55, 13, 31.5], [172.55, 37, 31.5], [172.55, 37, 40], [172.55, 13, 40]], '#3a3d42', .8);
      for (let z = 33; z < 40; z += 1.6) d += dline([[172.6, 13.6, z], [172.6, 36.4, z]], .7, '#8d9499');
      for (const [ya, yb] of [[3.5, 10.5], [39.5, 46.5]]){
        d += dpoly(on(([u, v]) => [172.55, u, v], rrUV(ya, 31.4, yb, 36.4, 1.2, 3)), '#d9e7ee', .8);
        d += dpoly(on(([u, v]) => [172.6, u, v], ellUV((ya + yb)/2 + (ya < YC ? 1.2 : -1.2), 33.9, 1.6, 1.6, 12)), '#fff8d8', .5);
        d += dpoly(on(([u, v]) => [172.55, u, v], rrUV(ya, 37, yb, 38.8, .6, 2)), AMB, .6);
      }
      d += dpoly(on(([u, v]) => [172.6, u, v], ellUV(25, 41.6 - 1.2, 1.3, 1.3, 12)), '#c8ccce', .6);
      return d; });
    // windscreen with its wipers
    s += onF(wsN, () => {
      const gl = [wsP(.07, 4), wsP(.07, 46), wsP(.93, 45), wsP(.93, 5)];
      let d = dpoly(gl, GLASS, 1.1) + dpoly([wsP(.55, 7, .07), wsP(.85, 14, .07), wsP(.85, 19, .07), wsP(.55, 9, .07)], '#ffffff', 0).replace('<path', '<path opacity=".45"');
      d += dline([wsP(.1, 9, .1), wsP(.32, 21, .1)], .9) + dline([wsP(.1, 28, .1), wsP(.32, 40, .1)], .9);
      return d; });
    // both sides: door, door window, quarter window, handle, steps in the skirt
    for (const sg of [-1, 1]){ const yy = sg > 0 ? 48.05 : 1.95;
      s += onF([0, sg, 0], () => {
        let d = dline([[150, yy, 28], [150, yy, 57], [166.2, yy, 57], [168, yy, 49], [169.6, yy, 41], [169.6, yy, 28]], 1);
        d += dpoly([[152, yy, 44], [166, yy, 44], [166, yy, 52], [165, yy, 55.5], [152, yy, 55.5]], GLASS, .9);
        d += dpoly([[143.5, yy, 46], [148.5, yy, 46], [148.5, yy, 55.5], [143.5, yy, 55.5]], GLASS, .8);
        d += dpoly([[153, yy + sg*.05, 40.5], [156.5, yy + sg*.05, 40.5], [156.5, yy + sg*.05, 41.6], [153, yy + sg*.05, 41.6]], '#9aa1a4', .5);
        d += dline([[141.5, yy, 31], [171.5, yy, 31]], .5, '#9aa1a4');
        return d; });
    }
    // rear wall: small rear window
    s += onF([-1,0,0], () => dpoly([[140.95, 19, 48], [140.95, 31, 48], [140.95, 31, 55], [140.95, 19, 55]], GLASS, .8));
    s += onF([0,0,1], () => dpoly([[148, 18, 60.05], [156, 18, 60.05], [156, 32, 60.05], [148, 32, 60.05]], CABW.m, .6));   // roof hatch
    return s; } });
  // lower front skirt (steps behind its sides, the air intake slots in front)
  gB(161, 2, 20, 172.5, 48, 27, CABW, .8, { shell: true, ink: 2, deco: () => {
    let s = onF([1,0,0], () => { let d = ''; for (let z = 21.3; z < 26; z += 1.4) d += dpoly([[172.55, 15, z], [172.55, 35, z], [172.55, 35, z + .7], [172.55, 15, z + .7]], '#3a3d42', 0); return d; });
    for (const sg of [-1, 1]){ const yy = sg > 0 ? 48.05 : 1.95;
      s += onF([0, sg, 0], () => dpoly([[162.5, yy, 21.5], [169.5, yy, 21.5], [169.5, yy, 23.4], [162.5, yy, 23.4]], '#2c2e32', .6)
        + dpoly([[162.5, yy, 24.6], [169.5, yy, 24.6], [169.5, yy, 26.3], [162.5, yy, 26.3]], '#2c2e32', .6)); }
    return s; } });
  // sun visor and the roof marker lamps
  gPr([[166, 59.6], [170.6, 57.4], [170.9, 58.1], [166.4, 60.3]], 'y', 3, 47, CABW, { w: .6, ink: 1.2 });
  for (const yy of [17, 25, 33]) gB(163.4, yy - 1.1, 60, 165, yy + 1.1, 60.9, matOf(AMB), .4, { ink: .7 });
  // mirrors on their arms, grab handles by the doors
  for (const sg of [-1, 1]){ const ye = sg > 0 ? 48 : 2, yo = ye + sg*4.4, ya = Math.min(ye + sg*2.4, yo), yb = Math.max(ye + sg*2.4, yo);
    gR([168.4, ye, 51], [170.4, ye + sg*3.4, 52.4], .35, RUB, .4);
    gR([169.2, ye, 41], [170.4, ye + sg*3.4, 40], .35, RUB, .4);
    gB(169.6, ya, 41.2, 171.2, yb, 52.6, RUB, .6, { ink: 1.1, deco: () => onF([1,0,0], () => '') + onF([-1,0,0], () =>
      dpoly([[169.55, ya + .4, 41.8], [169.55, yb - .4, 41.8], [169.55, yb - .4, 52], [169.55, ya + .4, 52]], '#cfe3ec', .5)) });
    gB(169.8, ya + .3, 37, 171, yb - .3, 40, RUB, .5, { ink: .8 });
    gR([167, ye + sg*.5, 30], [167, ye + sg*.5, 44], .35, ALU, .4);
  }
}
