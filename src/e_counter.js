
/* ================= 4 平衡臂: counter-jib frame with deck + railings, counterweights, hoist winch, electric cabinet, tie bars ================= */
const CNODE = k => -7.4 - CJ_BAY*k;                       // x of counter-jib node k (0 = at the upper support, 5 = tail)
const CJN = 5, CJ_TIE = [-39.4, 5.8, 91.2];               // tie bar landing: node 4, on the top chord's inner edge
const HOIST = { x: -24, z: 93, R: 2.4 };                  // hoist drum: centre x and z, radius (its axis is y)
function buildCounterFrame(){
  use('cj', 3);
  for (const sg of [-1, 1]){
    const y0 = sg > 0 ? 5.4 : -6.8, y1 = sg > 0 ? 6.8 : -5.4;
    for (let k = 0; k < CJN; k++){
      gB(CNODE(k + 1), y0, 85.4, CNODE(k), y1, 86.6, YEL, .6, { ink: 1.2 });
      gB(CNODE(k + 1), y0, 87.4, CNODE(k), y1, 88.6, YEL, .6, { ink: 1.2 });
      strut([CNODE(k + (k % 2 ? 0 : 1)), sg*6.1, 86.1], [CNODE(k + (k % 2 ? 1 : 0)), sg*6.1, 87.9], [0, 0, 1], .6, .35, YEL, { ink: .8 });
    }
    // railing: posts at nodes 0, 2, 5 and a top rail between them
    for (const k of [0, 2, 5]) gB(CNODE(k) - (k ? .3 : .6), sg*6.4 - .15, 88.6, CNODE(k) + (k ? .3 : 0), sg*6.4 + .15, 90.3, YEL, .4, { ink: .8 });
    for (const [a, b] of [[0, 2], [2, 5]]) gB(CNODE(b), sg*6.4 - .15, 89.9, CNODE(a), sg*6.4 + .15, 90.3, YEL, .4, { ink: .8 });
  }
  for (let k = 0; k <= CJN; k++) gB(k ? CNODE(k) - .4 : -8.2, -5.4, 87.6, k ? CNODE(k) + .4 : CNODE(0), 5.4, 88.6, YEL, .5, { ink: 1 });
  for (let k = 0; k < CJN; k++) gB(CNODE(k + 1), -5.4, 88.6, CNODE(k), 5.4, 89, STL, .5, { ink: 1.1, deco: () => onF([0, 0, 1], () => { let s = '';
    for (let x = CNODE(k + 1) + .8; x < CNODE(k) - .4; x += .9) s += dline([[x, -5.3, 89.02], [x, 5.3, 89.02]], .3, STL.d); return s; }) });
  for (const x of [-39.4, -43.4, -47.4]) gB(x - .4, -5.4, 85.4, x + .4, 5.4, 86.4, YEL, .5, { ink: 1 });          // tail cross members under the counterweights
}
function buildCounterweights(){
  use('cw', 2);
  for (const [xa, xb] of [[-47.4, -42.4], [-42.4, -37.4]]) for (const [y0, y1] of [[-4.6, -.2], [.2, 4.6]])
    gB(xa, y0, 72, xb, y1, 85.4, CWT, .8, { ink: 1.8, deco: () => onF([1, 0, 0], () => dline([[xb + .02, y0 + .4, 78.7], [xb + .02, y1 - .4, 78.7]], .6, CWT.d))
      + onF([0, 1, 0], () => dline([[xa + .4, y1 + .02, 78.7], [xb - .4, y1 + .02, 78.7]], .6, CWT.d)) + onF([0, -1, 0], () => dline([[xa + .4, y0 - .02, 78.7], [xb - .4, y0 - .02, 78.7]], .6, CWT.d))
      + onF([0, 0, -1], () => '') });
}
// hoist winch (13): drum wound with rope between two flanges, gearbox, brake, motor, on a base plate on the deck; the hood over the drum fades in see-through
function buildHoist(st){
  use('cj', 13);
  const { x, z, R } = HOIST, WR = R + ROPE_R, W0 = -1.9, WN = 5, WW = 3.2/WN;   // wraps: the rope turns on radius R + ROPE_R
  gB(x - 4.6, -4.2, 89, x + 4.6, 5, 89.8, DKS, .6, { ink: 1.4 });
  for (const [ya, yb] of [[-2.2, W0], [W0 + WN*WW, 1.6]]) gR([x, ya, z], [x, yb, z], R, STL, .8, { sides: 22 });          // drum hubs
  for (let i = 0; i < WN; i++) gR([x, W0 + i*WW, z], [x, W0 + (i + 1)*WW, z], WR, i % 2 ? DKS : ROPE, .7, { sides: 22, ink: 1.1 });   // the rope lying on the drum, turn by turn
  // the flanges' faces carry spokes that turn with the drum (a yellow one to follow): -the rope paid out, so a lowering hook turns it clockwise
  const th = -drumAngH(st);
  for (const [ya, yb] of [[-2.6, -2.2], [1.6, 2]]) gR([x, ya, z], [x, yb, z], 3, DKS, .6, { sides: 22, deco: () => { const sg = ya < 0 ? -1 : 1, yy = sg < 0 ? ya - .02 : yb + .02;
    return onF([0, sg, 0], () => { let s = ''; for (let k = 0; k < 8; k++){ const a = k/8*2*Math.PI + th; s += dline([[x + .5*Math.cos(a), yy, z + .5*Math.sin(a)], [x + 2.4*Math.cos(a), yy, z + 2.4*Math.sin(a)]], k ? .4 : 1, k ? STL.m : HKY.m); } return s; }); } });
  gB(x - 1.2, -3.2, 89.8, x + 1.2, -2.6, z, STL, .5, { ink: .9 });
  gB(x - 2.4, 2, 89.8, x + 2.4, 3.6, 96, STL, .7, { ink: 1.4, deco: () => onF([0, 1, 0], () => dline([[x - 2, 3.62, 92], [x + 2, 3.62, 92]], .5, STL.d)) });
  gR([x, 3.6, z], [x, 4.1, z], 2, DKS, .6, { sides: 18 });
  gR([x, 4.1, z], [x, 6, z], 1.9, MOT, .8, { sides: 18 });
  gB(x - 1.6, 4.1, 89.8, x + 1.6, 6, 91.1, STL, .5, { ink: .9 });
  gB(x - 2.4, 3.8, 94.9, x + 2.4, 6.2, 95.5, STL, .5, { ink: .9 });
  use('cj', 13, { shell: true });
  gB(x - 3.2, -2.6, 89.8, x + 3.2, 2, z + 3.4, YEL, .7, { ink: 1.7, deco: () => onF([0, -1, 0], () => { let s = ''; for (let q = -2.2; q < 2.4; q += 1.1) s += dline([[x + q, -2.62, 90.6], [x + q, -2.62, z + 2.6]], .5, YEL.d); return s; }) });
  use('cj', 18, { shell: true });
  gB(-13.8, -3.4, 89, -9.2, 3.4, 94.2, matOf('#d6d9d6'), .7, { ink: 1.6, deco: () => onF([1, 0, 0], () =>
    dline([[-9.18, -3, 89.6], [-9.18, 3, 89.6], [-9.18, 3, 93.6], [-9.18, -3, 93.6], [-9.18, -3, 89.6]], .6, '#8a9190') + dline([[-9.18, 0, 89.6], [-9.18, 0, 93.6]], .6, '#8a9190')
    + dpoly([[-9.18, 1.8, 91], [-9.18, 2.6, 91], [-9.18, 2.6, 92.2], [-9.18, 1.8, 92.2]], RED.m, .4) + dpoly(on(([u, v]) => [-9.18, u, v], ellUV(-1.6, 92.3, .45, .45, 8)), '#43c25c', .3))
    + onF([0, 1, 0], () => { let s = ''; for (let z2 = 90.4; z2 < 93.4; z2 += .6) s += dline([[-13, 3.42, z2], [-10, 3.42, z2]], .4, '#8a9190'); return s; }) });
  // inside the cabinet: a back plate with a breaker row, three contactors and a terminal strip
  use('cj', 18);
  gB(-13.6, -3, 89.3, -13.1, 3, 93.9, DKS, .5, { ink: .9 });
  for (let k = 0; k < 6; k++) gB(-13.1, -2.6 + k*.9, 92.6, -12.5, -2.1 + k*.9, 93.6, k % 3 ? STL : RED, .4, { ink: .7 });
  for (let k = 0; k < 3; k++) gB(-13.1, -2.6 + k*2, 90.4, -11.9, -1.2 + k*2, 91.8, HYD, .5, { ink: .8 });
  gB(-13.1, -2.8, 89.5, -12.3, 2.8, 90, ALU, .4, { ink: .7 });
}
// the counter-jib tie bars (23): from the tower top head to lugs on the top chords
function buildCounterBars(){
  use('cj', 23);
  for (const sg of [-1, 1]){
    const a = [-.4, sg*APEX_Y, APEX_Z], b = [CJ_TIE[0], sg*CJ_TIE[1], CJ_TIE[2]];
    gB(CJ_TIE[0] - .6, sg > 0 ? 5.4 : -6.2, 88.6, CJ_TIE[0] + .6, sg > 0 ? 6.2 : -5.4, 91.0, YEL, .5, { ink: .9 });
    tieBar(a, b);
  }
}
function buildCounter(st){ buildCounterFrame(); buildCounterweights(); buildHoist(st); buildCounterBars(); }
