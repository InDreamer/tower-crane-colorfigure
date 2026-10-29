
/* ================= 3 起重臂: jib lattice, trolley winch, trolley, tie bars to the tower top; red light at the tip ================= */
const JNODE = i => JX0 + JBAY*i;                         // x of jib node i (0 = root, JNB = tip)
const TIE_Z = 97.2, TIE_X = 70, TIE_Y = 2.7, APEX_Y = 2.7, APEX_Z = 115.2;      // where the jib tie bars land on the top chord, and leave the tower top
function buildJibLattice(){
  use('jib', 7, { lat: true });
  for (const sg of [-1, 1]){
    const y0 = Math.min(sg*1.6, sg*4.8), y1 = Math.max(sg*1.6, sg*4.8);
    for (let i = 0; i < JNB; i++) gB(JNODE(i), y0, 85.2, JNODE(i + 1), y1, JZB, YEL, .6, { ink: 1.3, deco: i === 1 || i === 6 ? () => onF([0, sg, 0], () => dline([[JNODE(i) + 1, sg*4.82, 85.7], [JNODE(i + 1) - 1, sg*4.82, 85.7]], .5, YEL.d)) : null });
    for (let i = 0; i < JNB; i++){
      const up = i % 2 === 0, xa = JNODE(i), xb = JNODE(i + 1), lo = [up ? xa : xb, sg*JY, 86], hi = [up ? xb : xa, 0, 94];
      const sep = norm([0, -sg*JY, 8]);
      strut(up ? lo : hi, up ? hi : lo, sep, .7, .4, YEL, { ink: .9 });
    }
  }
  // top chord, cut at every second node (where two diagonals meet), with a gusset plate over each of those nodes
  const tn = [1, 3, 5, 7, 9];
  gB(JNODE(1), -.8, JZT, JNODE(3), .8, 94.8, YEL, .6, { ink: 1.4 });
  for (let k = 1; k < tn.length; k++) gB(JNODE(tn[k]), -.8, JZT, k === tn.length - 1 ? JX1 : JNODE(tn[k] + 2), .8, 94.8, YEL, .6, { ink: 1.4 });
  for (const i of tn) gB(JNODE(i) - 1.1, -1.5, 94.8, JNODE(i) + 1.1, 1.5, 95.1, YEL, .5, { ink: .9 });
  // the tip: end plate, the sheave for the trolley rope hung from the top chord, a cross member and the hook-rope anchor lug
  gPr([[-4.8, 85.2], [4.8, 85.2], [.8, 94.8], [-.8, 94.8]], 'x', JX1, JX1 + .8, YEL, { w: .6, ink: 1.4 });
  gB(105.6, -1.6, 85.2, 106.8, 1.6, JZB, YEL, .5, { ink: 1 });
  gB(105.6, -.5, 83, 106.8, .5, 85.2, STL, .5, { ink: .9 });
  for (const sg of [-1, 1]) gB(103.6, sg > 0 ? .6 : -1, 87.4, 105.6, sg > 0 ? 1 : -.6, JZT, YEL, .5, { ink: .9 });
  // the guide sheave bracket at the root (cross beam on the bars, two cheeks) for the hoist rope
  gB(9.9, -3.2, JZB, 10.9, 3.2, 87, YEL, .5, { ink: 1.1 });
  for (const sg of [-1, 1]) gB(9.8, sg > 0 ? .6 : -1, 83.8, 10.8, sg > 0 ? 1 : -.6, JZB, YEL, .5, { ink: .9 });
  // load-chart plates on the outer faces of the bottom bars
  for (const sg of [-1, 1]) gB(22, sg > 0 ? 4.8 : -5.05, 85.3, 30, sg > 0 ? 5.05 : -4.8, 86.1, CABW, .5, { ink: .9, deco: () => onF([0, sg, 0], () =>
    dline([[22.4, sg*5.06, 85.4], [29.6, sg*5.06, 85.4], [29.6, sg*5.06, 86], [22.4, sg*5.06, 86], [22.4, sg*5.06, 85.4]], .5, RED.m)
    + gTxt([26, sg*5.07, 85.9], [sg > 0 ? 1 : -1, 0, 0], [0, 0, -1], '6t 56m', 1.2, RED.d, 800)) });
}
// trolley winch (part 4) on its base plate in the jib root bays: motor -> brake -> gearbox, drum with flanges on two pedestals
function buildTrolleyWinch(st){
  use('jib', 4);
  gB(11.2, -2.6, JZB, 25.2, 2.6, 86.8, DKS, .6, { ink: 1.4 });
  gR([11.6, 0, 88.1], [15.4, 0, 88.1], 1.3, MOT, .8, { sides: 16 });
  gR([15.4, 0, 88.1], [16, 0, 88.1], 1.7, DKS, .6, { sides: 16 });
  gB(11.6, -1.5, 89.5, 15.4, 1.5, 90.1, STL, .5, { ink: .9 });
  gB(16, -1.6, 86.8, 19.4, 1.6, 90, STL, .7, { ink: 1.4, deco: () => onF([0, 1, 0], () => dline([[16.4, 1.62, 88], [19, 1.62, 88]], .5, STL.d)) });
  const th = drumAngT(st);                                                     // the drum turns with the rope: out = counter-clockwise
  gR([22.2, -1.3, 88.6], [22.2, 1.3, 88.6], 1.2, STL, .8, { sides: 18, deco: () => [-1, 1].map(sg => onF([0, sg, 0], () => { let s = '';
    for (let k = 0; k < 6; k++){ const a = k/6*2*Math.PI + th; s += dline([[22.2 + .3*Math.cos(a), sg*1.32, 88.6 + .3*Math.sin(a)], [22.2 + 1.05*Math.cos(a), sg*1.32, 88.6 + 1.05*Math.sin(a)]], k ? .4 : .9, k ? STL.d : HKY.m); } return s; })).join('') });
  for (const sg of [-1, 1]){
    gR([22.2, sg*1.3, 88.6], [22.2, sg*1.5, 88.6], 1.6, DKS, .6, { sides: 18 });
    gB(21, sg > 0 ? 1.5 : -2.3, 86.8, 23.4, sg > 0 ? 2.3 : -1.5, 88.6, STL, .5, { ink: 1 });
  }
}
// the tie bars (part 14): two bars from the tower top head to a lug plate on the jib top chord, each in two lengths joined by a sleeve
function buildJibBars(){
  use('jib', 14);
  gB(TIE_X - 1, -3.3, 94.8, TIE_X + 1, 3.3, 95.6, YEL, .5, { ink: 1.1 });
  for (const sg of [-1, 1]){
    const a = [.4, sg*APEX_Y, APEX_Z], b = [TIE_X, sg*TIE_Y, TIE_Z];
    gB(TIE_X - .6, sg > 0 ? 2.3 : -3.1, 95.6, TIE_X + .6, sg > 0 ? 3.1 : -2.3, 97.0, YEL, .5, { ink: .9 });
    tieBar(a, b);
  }
  use('jib', 7);                                           // the red light on the jib tip belongs to the jib; the tower top carries the numbered one (21)
  gB(105.8, -.8, 94.8, 107.2, .8, 95.3, DKS, .4, { ink: .8 });
  gR([106.5, 0, 95.3], [106.5, 0, 96.7], .7, RED, .6, { sides: 12 }); gR([106.5, 0, 96.7], [106.5, 0, 97.3], .4, RED, .5, { sides: 10 });
}
// the trolley (part 8), local x = 0 at its centre; wheels stand on the bars' top (z 86.2), sheaves hang under the frame, basket on one end.
// Modelled at 1.3 x the real proportions (x, y about the centre, z about the bars' top) so a small child can see it
const TK = 1.3, TROL_R = 1.1*TK, TROL_SX = 4.45, TROL_HL = 4.2*TK;   // trolley scale; sheave radius; sheave offset from the centre (the falls are at x = -2.67 and +2.67, straight above the hook sheave); half length
const TROL_AZ = JZB + (87.4 - JZB)*TK;                    // height the trolley ropes are tied at
function buildTrolley(){
  use('trol', 8);
  const X = v => v*TK, Z = v => JZB + (v - JZB)*TK;
  const B = (x0, y0, z0, x1, y1, z1, col, sh, o) => gB(X(x0), X(y0), Z(z0), X(x1), X(y1), Z(z1), col, sh, o);
  B(-4.2, -1.2, 85.2, 4.2, 1.2, 89, STL, .7, { ink: 1.6, deco: () => onF([0, 1, 0], () => dline([[X(-3.8), X(1.22), Z(87)], [X(3.8), X(1.22), Z(87)]], .5, STL.d)) });
  for (const x of [-3, 3]) for (const sg of [-1, 1]){
    gR([X(x), sg > 0 ? 1.6 : -2.51, Z(87.1)], [X(x), sg > 0 ? 2.51 : -1.6, Z(87.1)], .9*TK, DKS, .6, { sides: 14, deco: () => onF([0, sg, 0], () => dpoly(on(([u, v]) => [u, sg*2.53, v], ellUV(X(x), Z(87.1), .35*TK, .35*TK, 8)), STL.l, .3)) });
  }
  for (const sx of [-TROL_SX, TROL_SX]){
    const cz = RZ - TROL_R;
    gR([sx, -.45*TK, cz], [sx, .45*TK, cz], TROL_R, STL, .7, { sides: 18, deco: () => [-1, 1].map(sg => onF([0, sg, 0], () => dpoly(on(([u, v]) => [u, sg*.47*TK, v], ellUV(sx, cz, .45*TK, .45*TK, 10)), DKS.m, .3))).join('') });
    for (const sg of [-1, 1]) gB(sx - .5*TK, sg > 0 ? .55*TK : -.9*TK, cz - .9*TK, sx + .5*TK, sg > 0 ? .9*TK : -.55*TK, Z(85.2), DKS, .5, { ink: .8 });
  }
  B(-1.2, 1.2, 86.2, 1.2, 1.9, 88.4, RED, .5, { ink: 1, deco: () => onF([0, 1, 0], () => dpoly([[X(-.8), X(1.92), Z(86.6)], [X(.8), X(1.92), Z(86.6)], [X(.8), X(1.92), Z(87.2)], [X(-.8), X(1.92), Z(87.2)]], '#f4f1e8', .4)) });   // broken-rope safety device
  for (const sg of [-1, 1]) B(4.2, sg > 0 ? .6 : -1, 80.7, 4.7, sg > 0 ? 1 : -.6, 85.2, STL, .4, { ink: .8 });                      // basket hangers
  B(4.2, -1.6, 80.2, 9.2, 1.6, 80.7, STL, .5, { ink: .9 });
  for (const sg of [-1, 1]){ B(8.7, sg > 0 ? 1.1 : -1.6, 80.7, 9.2, sg > 0 ? 1.6 : -1.1, 83, STL, .4, { ink: .7 }); B(4.7, sg > 0 ? 1.1 : -1.6, 82.7, 9.2, sg > 0 ? 1.6 : -1.1, 83, STL, .4, { ink: .7 }); }
  B(8.7, -1.6, 82.7, 9.2, 1.6, 83, STL, .4, { ink: .7 });
}
function buildJib(st){ buildJibLattice(); buildTrolleyWinch(st); buildJibBars(); buildTrolley(); }
