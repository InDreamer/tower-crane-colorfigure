/* 后装压缩式垃圾车 — exploded, working Colorfigure.
   x = length (front bumper toward +x, tailgate at low x), y = width (+y = the truck's left / driver side, the side
   seen at the default view), z = up. 1 unit = 5 cm: 8.9 m long, 2.5 m wide, 3.25 m to the warning lights.

   HOW A REAR-LOADING COMPACTOR REALLY WORKS (checked against body specs and patents)
   - Power: the engine drives the gearbox; a PTO (取力器) on the gearbox side turns a gear pump. The pump draws oil from
     the tank on the frame rail and sends it along the frame to the multi-way valve (控制阀组) on the tailgate side;
     the valve sends it to one pair of cylinders at a time and the return oil flows back to the tank.
   - Bin lifter (挂桶式上料机构), bolted to the tailgate below the loading sill: the worker rolls a 100-1100 L bin in, its lip
     drops onto the comb and the clamp closes; the lift cylinders raise the carriage on the arms; the tip cylinders turn
     the arms about the pivot shaft over the sill, the lid falls open and the refuse drops into the hopper (进料口).
   - Packer in the tailgate (填装器): a slide plate (滑板) runs in two inclined guides, driven by two long slide
     cylinders; a sweep blade / scraper (刮板) hangs from its lower edge on two sweep cylinders. Cycle: blade opens,
     slide goes down, blade closes sweeping the hopper, slide goes up carrying the load into the body.
   - The ejector (推板) inside the body is held by a telescopic cylinder against the load and gives way under back
     pressure, so the load is packed hard between blade and ejector ("推实") and the ejector creeps forward as the body
     fills. Full: two lift cylinders raise the tailgate on its top hinges, the ejector runs to the rear and pushes the
     load out, then returns; the tailgate closes on its rubber seal (密封条).

   PARTS (each fixed to the one named after it)
   1 CHASSIS  cab-over cab (doors, windows, windscreen, wipers, grille, lamps, mirrors on arms, steps, roof beacon)
              on the frame . engine (block, head, cover, sump, manifolds, turbo, fan, radiator, alternator, filters) on
              the rails . gearbox + bell housing + PTO behind it . propshaft (2 pieces + centre bearing on a cross
              member) to the first drive axle, inter-axle shaft to the second . front beam axle on leaf springs .
              tandem drive axles (diffs, hubs) on a bogie spring with a trunnion on the rails . ladder frame (2 rails,
              cross members) . 10 wheels (rims, hubs, nuts, tread) . bumper, fuel tank, muffler, battery box, air tanks
   2 BODY     subframe on the rails . floor, roof, front wall, 2 side panels with ribs and chords . ejector + guide
              shoes + telescopic cylinder from the front wall . tailgate on 2 top hinges, 2 lift cylinders from the body
              sides . slide plate in guides, 2 slide cylinders . sweep blade, 2 sweep cylinders . seal round the rear
              opening . mudguards + flaps on the body underside . reflective stripes, lamps
   3 LIFTER   2 mount plates bolted to the tailgate under the sill + pivot shaft . 2 arms on the shaft . carriage with
              comb and clamp sliding on the arms . 2 lift cylinders (arm foot to carriage) . 2 tip cylinders (mount
              plate to the crank on the shaft) . a bin (5 styles: wheelie, 4-wheel cart, drum, dome, pedal; 100-1100 L;
              four waste-sorting colours; src/e_bins.js)
   4 HYDRAULIC gear pump on the PTO . oil tank on brackets on the left rail (breather, sight glass, return filter) .
              valve block with levers on the tailgate's left side . hoses pump -> valve -> every cylinder pair, return
              -> tank, clipped along the rails, under the body floor and over the tailgate hinge
   5 OTHER    control box on the body's front left . operation panel at the tailgate's rear left . loading-sill frame
              (进料口) . safety: 2 beacons on the tailgate, roof beacon, emergency stops, side guard rails between the
              axles on brackets from the rails */

const CJKF = "ui-monospace,Menlo,'PingFang SC','Microsoft YaHei','Noto Sans CJK SC','WenQuanYi Zen Hei',monospace";
const CABW = { l:'#fbfaf5', m:'#e4e4dd', d:'#bfc2bc' };
const GRN  = { l:'#80c556', m:'#5fa43c', d:'#376a22' };
const GRND = { l:'#5fa43c', m:'#4a8a2e', d:'#2a5218' };
const ORG  = { l:'#f7a83e', m:'#df842b', d:'#9c5414' };
const BLU  = { l:'#6d8cf0', m:'#4766cf', d:'#28388a' };
const CHS  = { l:'#62666c', m:'#43464b', d:'#25272b' };
const TYRE = { l:'#4c4c4f', m:'#323235', d:'#1b1b1d' };
const RIM  = { l:'#f1f2f0', m:'#c9ccca', d:'#8e9391' };
const RED  = { l:'#f0614f', m:'#cf4131', d:'#88251a' };
const ENG  = { l:'#5c6066', m:'#46494e', d:'#2d2f33' };
const ALU  = { l:'#e9ecec', m:'#c3c9cb', d:'#8b9497' };
const RUB  = { l:'#3d3d40', m:'#2a2a2c', d:'#161617' };
const AMB = '#f6b73c', GLASS = '#bfe0ea';
let RFL = '#e8463a';     // reflective red: a skin (src/g_skin.js) may repaint it, like the CABW / GRN / GRND / ORG palettes above
const SYSC = ['', '#3b7be0', '#45a33a', '#ef8a1c', '#5a50d4', '#e0463a'];
const SYSN = ['', '驾驶室与底盘', '垃圾箱', '上料机构', '液压系统', '其他部件'];
const PNAME = ['', '驾驶室', '发动机', '变速箱', '传动轴', '前后桥', '车架', '车轮/轮胎', '箱体', '压缩装置', '推板', '侧板', '后门', '密封条',
  '挂桶提升装置', '翻斗装置', '液压油缸', '连接架', '液压泵', '液压油箱', '控制阀组', '油管', '电控系统', '操作面板', '进料口', '安全装置'];
const SYS_OF = n => n <= 7 ? 1 : n <= 13 ? 2 : n <= 17 ? 3 : n <= 21 ? 4 : 5;

/* ---------- key dimensions (1 unit = 5 cm) ---------- */
const YC = 25;
const RAIL_Y = [16.4, 33.6], RAIL_T = 1.4, RZ0 = 16, RZ1 = 21.5;   // frame rails (outer faces), web thickness, bottom, top
const WR = 10.5, AX_F = 150, AX_R = [62, 89];    // wheel radius, front axle, the two rear axles
const BX0 = 40, BX1 = 134, BZ0 = 23, BZ1 = 63;   // body box (floor bottom .. roof top)
const HINGE = [40, 64.5];                        // tailgate hinge (x, z)
const PIV = [5.5, 28];                           // lifter pivot shaft (x, z)
const EJ0 = 48, EJ1 = 112;                       // ejector x when empty / full
const GATE_PROF = [[40,64.5],[22,65],[13,55],[9,42],[9,26],[10.5,19],[15,14.5],[26,13],[36,15],[40,19]];
const CAB_PROF = [[141,27],[171,27],[172.5,30],[172.5,41],[171.8,44],[168.3,56],[165.8,60],[143,60],[141,58]];
const GU0 = [23, 28], GU1 = [30, 46];            // slide guide: lower / upper position of the blade pivot

/* ---------- small vector helpers ---------- */
const vadd = (a, b) => [a[0]+b[0], a[1]+b[1], a[2]+b[2]], vsc = (a, k) => [a[0]*k, a[1]*k, a[2]*k];
const lerp = (a, b, t) => a + (b - a)*t, clamp01 = t => Math.max(0, Math.min(1, t));
const sstep = t => { t = clamp01(t); return t*t*(3 - 2*t); };
// rotate p's (x, z) about c = [x, z] by a radians (x right, z up: positive = counter-clockwise seen from -y)
const rotXZ = (p, c, a) => { const s2 = Math.sin(a), c2 = Math.cos(a), dx = p[0] - c[0], dz = p[2] - c[1];
  return [c[0] + dx*c2 - dz*s2, p[1], c[1] + dx*s2 + dz*c2]; };
const rotN = (n, a) => { const s2 = Math.sin(a), c2 = Math.cos(a); return [n[0]*c2 - n[2]*s2, n[1], n[0]*s2 + n[2]*c2]; };

/* ---------- frames: every part is modelled where it sits on the assembled truck, in one of these frames ----------
   ch   frame rails and all that hangs on them        cab   the cab
   body subframe, box, ejector                        gate  tailgate (turns on the top hinges)
   lift lifter mount (on the tailgate)                arm   the tipping arms (turn on the pivot shaft)
   carr carriage + comb (slides up the arms)          bin   the bin (hooked: rides the carriage)
   olb  the bin just swapped out (slides away; only while a swap shows)                                                  */
const FT = {}, FN = {}, FT0 = {};
function makeFrames(st, e, T, N){
  const ga = -st.gate*68*Math.PI/180, ta = -st.tip*135*Math.PI/180, lh = st.lift*7;
  const cabO = vsc([30, 0, 46], e[1]), bodyO = vsc([0, 0, 56], e[2]), liftO = vsc([-38, 0, 6], e[3]);
  T.ch = p => p; N.ch = n => n;
  T.cab = p => vadd(p, cabO); N.cab = n => n;
  T.body = p => vadd(p, bodyO); N.body = n => n;
  T.gate = p => T.body(rotXZ(p, HINGE, ga)); N.gate = n => rotN(n, ga);
  T.lift = p => vadd(T.gate(p), liftO); N.lift = N.gate;
  T.arm = p => T.lift(rotXZ(p, PIV, ta)); N.arm = n => rotN(rotN(n, ta), ga);
  T.carr = p => T.arm([p[0], p[1], p[2] + lh]); N.carr = N.arm;
  // the bin hangs by its lifting lip: a bin whose lip sits lower than the comb (120 L) is raised by bin.dz while it hooks on
  const bx = -8*(1 - st.hook), dz = binSpec(st).dz;
  // a swap (st.swapT 1 -> 0, only a picture: the state already holds the new bin): the new bin slides in from behind, the old one (frame 'olb') slides off sideways
  const sw = st.swapT > 0 ? st.swapT : 0, ou = 1 - sw;
  T.bin = p => st.hook >= 1 ? T.carr([p[0], p[1], p[2] + dz]) : vadd(vadd([p[0] + bx - 20*sw*sw*(1 - st.hook), p[1], p[2] + dz*st.hook], bodyO), liftO);
  N.bin = n => st.hook >= 1 ? N.carr(n) : n;
  T.olb = p => vadd(vadd([p[0] - 8, p[1] + 46*ou*ou, p[2]], bodyO), liftO); N.olb = n => n;
}
// FT: where every frame is now; FT0: the same with nothing taken apart (the hydraulic system, taken apart, keeps its
// hoses in their assembled shape; left in place, its pieces follow whatever they are fixed to)
function setFrames(st){ makeFrames(st, st.E, FT, FN); makeFrames(st, [0, 0, 0, 0, 0, 0], FT0, {}); }

/* ---------- parts: built in local (assembled) coordinates through the current context, then sorted once ---------- */
let PARTS = [], CX = null, GST = null;
// sub-part pull directions (a separated system's part, clicked)
const PULL = { 1:[16,0,10], 2:[0,40,4], 3:[0,36,2], 4:[0,30,0], 5:[0,0,0], 6:[0,-34,0], 7:[0,0,0], 8:[0,0,12], 9:[0,46,6], 10:[0,62,0],
  11:[0,0,0], 12:[-18,0,0], 13:[-12,0,0], 14:[-12,0,0], 15:[-8,0,10], 16:[0,0,0], 17:[0,0,-6], 18:[0,16,0], 19:[0,14,0], 20:[0,14,0],
  21:[0,0,-6], 22:[0,10,0], 23:[-6,10,0], 24:[-14,0,0], 25:[0,0,0] };
// set the context for the parts that follow: frame, part number (1..25 decides the system), options
//   o.xo   other-parts system: where this piece moves when its system is taken apart
//   o.pull this piece's own pull direction when its part is clicked (wheels, side panels: outward)
function use(fr, n, o = {}){
  const st = GST, sys = SYS_OF(n);
  let off = [0, 0, 0];
  if (sys === 4) off = vadd(off, vsc([0, 40, -4], st.E[4]));
  if (sys === 5 && o.xo) off = vadd(off, vsc(o.xo, st.E[5]));
  const pv = o.pull || PULL[n], pk = st.pull[n] || 0;
  if (pk && pv) off = vadd(off, vsc(pv, pk));
  const k4 = st.E[4], tf = sys === 4 && k4 > 0 ? (p => { const a = FT0[fr](p), b = FT[fr](p); return [0,1,2].map(i => a[i] + (b[i] - a[i])*(1 - k4)); }) : FT[fr];
  CX = { fr, n, sys, off, tf, shell: !!o.shell, wheel: !!o.wheel, T: p => vadd(tf(p), off), N: FN[fr] };
}
const wpt = p => CX.T(p);
const wAt = (fr, p) => { const k4 = GST.E[4]; if (CX.sys !== 4 || !k4) return vadd(FT[fr](p), CX.off); const a = FT0[fr](p), b = FT[fr](p); return vadd([0,1,2].map(i => a[i] + (b[i] - a[i])*(1 - k4)), CX.off); };              // a point in another frame, with this part's offsets
const wpd = (pts, close = true) => pd(pts.map(wpt), close);
const fvis = n => vis(CX.N(n));
const side = y => y > YC ? 1 : -1;
function bboxOf(pts){ const a = [1e9,1e9,1e9], b = [-1e9,-1e9,-1e9];
  for (const p of pts) for (let i = 0; i < 3; i++){ if (p[i] < a[i]) a[i] = p[i]; if (p[i] > b[i]) b[i] = p[i]; } return [a, b]; }
// outward face planes of a convex solid between two rings (used to order a part against things outside it)
function planesOf(A, B){
  const n = A.length, cen = avg(A.concat(B)), pl = [];
  const add = (nr, p) => { if (!isFinite(nr[0])) return; if (dot(nr, sub(p, cen)) < 0) nr = nr.map(v => -v); pl.push([nr, dot(nr, p)]); };
  for (let i = 0; i < n; i++) add(norm(cross(sub(A[(i+1) % n], A[i]), sub(B[i], A[i]))), A[i]);
  add(polyN(A), A[0]); add(polyN(B), B[0]);
  return pl;
}
function push(svg, wp, o = {}){
  const part = { svg, pts: wp, planes: o.planes, box: bboxOf(wp), sys: CX.sys, n: CX.n, shell: o.shell ?? CX.shell, wheel: CX.wheel, rank: o.rank ?? ((o.shell ?? CX.shell) ? 1 : 0) };
  PARTS.push(part); return part;
}
const polyN = p => { let nx = 0, ny = 0, nz = 0;
  for (let i = 0; i < p.length; i++){ const a = p[i], b = p[(i+1) % p.length]; nx += (a[1]-b[1])*(a[2]+b[2]); ny += (a[2]-b[2])*(a[0]+b[0]); nz += (a[0]-b[0])*(a[1]+b[1]); }
  return norm([nx, ny, nz]); };
// a convex solid between two world rings: side faces + the end caps that face the viewer, each shaded by its true normal
function solid(A, B, m, w = .8, sh = tone){
  const n = A.length, cen = avg(A.concat(B)); let s = '';
  for (let i = 0; i < n; i++){
    const a0 = A[i], a1 = A[(i+1) % n], b1 = B[(i+1) % n], b0 = B[i];
    let nr = norm(cross(sub(a1, a0), sub(b0, a0))); if (!isFinite(nr[0])) continue;
    if (dot(nr, sub(avg([a0, a1, b1, b0]), cen)) < 0) nr = nr.map(v => -v);
    if (vis(nr)) s += shape([a0, a1, b1, b0], sh(nr, m), w);
  }
  const cn = polyN(A), nA = dot(cn, sub(avg(A), avg(B))) > 0 ? cn : cn.map(v => -v), nB = nA.map(v => -v);
  if (vis(nA)) s += shape(A, sh(nA, m), w);
  if (vis(nB)) s += shape(B, sh(nB, m), w);
  return s;
}
// box in local coords (any frame; rotated frames are fine)
function gB(x0, y0, z0, x1, y1, z1, m, w = .8, o = {}){
  const A = [[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0]].map(wpt), Bt = [[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]].map(wpt);
  return push(solid(A, Bt, m, w, o.sh || tone) + (o.deco ? o.deco() : '') + hullInk([...A, ...Bt], o.ink ?? 1.4), [...A, ...Bt], { ...o, planes: planesOf(A, Bt) });
}
// prism: a convex profile swept along an axis. axis 'y': profile (x, z); 'x': profile (y, z); 'z': profile (x, y)
function gPr(prof, axis, c0, c1, m, o = {}){
  const mk = c => prof.map(([u, v]) => wpt(axis === 'y' ? [u, c, v] : axis === 'x' ? [c, u, v] : [u, v, c]));
  const A = mk(c0), Bt = mk(c1);
  return push(solid(A, Bt, m, o.w ?? .8, o.sh || tone) + (o.deco ? o.deco() : '') + hullInk([...A, ...Bt], o.ink ?? 2), [...A, ...Bt], { ...o, planes: planesOf(A, Bt) });
}
// cylinder / rod between two local points (radius r, o.r1 at b)
function gR(a, b, r, m, w = .7, o = {}){
  const A = o.world ? a : wpt(a), Bp = o.world ? b : wpt(b);
  if (Math.hypot(...sub(Bp, A)) < 1e-9) return null;
  const r1 = o.r1 ?? r, sides = o.sides || 14, d = norm(sub(Bp, A)), u = norm(cross(d, Math.abs(d[2]) < .9 ? [0,0,1] : [1,0,0])), v = cross(d, u), pts = [];
  for (const [e, rr] of [[A, r], [Bp, r1]]) for (let i = 0; i < sides; i++){ const t = i/sides*2*Math.PI, c = Math.cos(t)*rr, s = Math.sin(t)*rr; pts.push([0,1,2].map(k => e[k] + u[k]*c + v[k]*s)); }
  return push(rod(A, Bp, r, m, o.sh || toneI, w, r1, sides) + (o.deco ? o.deco() : ''), pts, { ...o, planes: planesOf(pts.slice(0, sides), pts.slice(sides)) });
}
// hydraulic cylinder: barrel from a toward b (length bl), chromed rod for the rest
function gCyl(a, b, rb, bl, m, o = {}){
  if (!o.world){ a = wpt(a); b = wpt(b); }
  const L = Math.hypot(...sub(b, a)); if (L < 1e-9) return [];
  const d = sub(b, a).map(v => v/L), bl2 = Math.max(0, Math.min(bl, L - .6)), e = vadd(a, vsc(d, bl2)), ow = { ...o, world: true };
  const p1 = gR(a, e, rb, m, .8, ow), p2 = gR(vadd(a, vsc(d, Math.max(0, bl2 - .4))), b, rb*.45, ALU, .6, ow);
  return [p1, p2].filter(Boolean);
}
// hose along points (a point may be {fr, p} to sit in another frame), cut into pieces so it sorts with solids;
// while oil flows a bright dash runs along it (dir -1: the other way)
function gHose(pts, flow, dir = 1, wd = .55){
  const W = pts.map(p => p.fr ? wAt(p.fr, p.p) : wpt(p));
  let acc = 0;
  const hoseId = PARTS.length;                 // pieces of one hose share an id (and are never ordered against their neighbour)
  for (let i = 0; i < W.length - 1; i++){
    const a = W[i], b = W[i+1], d2 = pd([a, b], false), ln = Math.hypot(...sub(b, a));
    if (ln < 1e-6) continue;
    let s = `<path d="${d2}" fill="none" stroke="${INK}" style="stroke-width:${f(wd*2 + .45)}" stroke-linecap="round"/><path d="${d2}" fill="none" stroke="#2f3a5c" style="stroke-width:${f(wd*2)}" stroke-linecap="round"/>`;
    if (flow > 0) s += `<path d="${d2}" fill="none" stroke="#86c8ff" style="stroke-width:${f(wd*1.1)}" stroke-dasharray="2.2 2.4" stroke-dashoffset="${f(acc - dir*GST.clock*16)}" stroke-linecap="round" opacity="${f(flow)}"/>`;
    acc += ln;
    // a hose piece is a thin square-section rod: a real convex solid, so it sorts like every other part
    const d = norm(sub(b, a)), u = norm(cross(d, Math.abs(d[2]) < .9 ? [0,0,1] : [1,0,0])), v = cross(d, u), hw = wd + .22, ring = e => [[1,1],[-1,1],[-1,-1],[1,-1]].map(([cu, cv]) => [0,1,2].map(k => e[k] + hw*(cu*u[k] + cv*v[k])));
    const A = ring(a), B = ring(b), pts = [...A, ...B];
    PARTS.push({ svg: s, pts, planes: planesOf(A, B), box: bboxOf(pts), sys: 4, n: 21, shell: false, rank: 0, hose: true, seg: hoseId });
  }
}
// decoration on a local plane face: draws fn() only while the face (local normal n) faces the viewer
const onF = (n, fn) => fvis(n) ? fn() : '';
const dpoly = (pts, col, w = .6) => shape(pts.map(wpt), col, w);
const dline = (pts, w = .6, col = INK) => `<path d="${wpd(pts, false)}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
