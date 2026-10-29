/* 塔式起重机 QTZ80 (塔帽式 hammerhead, 小车变幅 trolley jib, 上回转 top-slewing, 自升 self-climbing) — exploded, working Colorfigure.
   x = along the jib at slew 0 (jib toward +x, counter-jib toward -x), y = across (+y = the side seen at the default view,
   where the cab hangs), z = up, ground z = 0. The tower axis is x = 0, y = 0. Proportions are compressed from the real
   crane (56 m jib, ~40 m free-standing): 4 standard sections (up to 6 after climbing), the jib about 1.2 x the tower's
   height; trolley, hook block and cab drawn larger so a small child can see them. Read-outs map the jib linearly to
   56 m at the tip.

   HOW A QTZ TOWER CRANE REALLY WORKS (checked against QTZ80 / TC5610 manuals and specs; conflicts with the reference
   image are noted at the end)
   - Base: a cross base (十字底架) of two box beams on 4 concrete ballast blocks (压重); the fixed base section (基础节)
     stands bolted on its centre. Nothing below the slewing ring ever turns.
   - Mast: standard sections (标准节), each a square lattice of 4 square-tube main chords, one diagonal per face per bay
     and horizontals, bolted to the next section at the chord ends (fish plates + 4 bolts per corner). A ladder runs up
     one inside face with hoops; a rest platform with railing sits every couple of sections.
   - Climbing (顶升, hydraulic: the only hydraulic motion on the crane): the climbing frame (顶升套架) is a lattice
     sleeve round the top sections, hung from the lower slewing support, with a working platform. One hydraulic
     cylinder (顶升油缸) on its rear face pushes on the climbing lugs of the section below; the pump station (液压泵站:
     motor, pump, tank, valve) on the platform feeds it through hoses. Before climbing the trolley goes to the balance
     radius and slewing is braked. The cylinder extends: the frame and everything above rise by one section height; a
     new section, rolled in through the frame's open front face on the introduction beam (引进梁), is bolted on; the
     cylinder retracts.
   - Slewing (回转机构): lower support (下支座) on the mast top; slewing ring (回转支承) with its toothed race on the lower
     support and the other race carrying the upper support (上支座); on the upper support 2 electric slewing motors
     with vertical planetary reducers whose pinions mesh with the ring gear. Everything above turns together.
   - Tower top (塔顶 / 塔帽): a 4-leg tapered lattice pinned on the upper support. Tie bars (拉杆) run from its apex to
     the jib (2 bars, to a point about 2/3 along) and to the counter-jib. A guide sheave near the apex leads the hoist
     rope from the counter-jib to the jib.
   - Jib (主臂 / 起重臂): triangular lattice, one top chord and two bottom chords that are also the trolley rails,
     pinned to the upper support at its root, bolted sections, a tip section with the rope anchor and a sheave.
     The trolley winch (变幅机构) sits in the jib root section: one drum, two rope ends: one to the trolley's inner end,
     the other out round the tip sheave and back to its outer end; the drum turning pulls the trolley in or out.
   - Trolley (小车): a frame on 4 wheels on the bottom chords, 2 sheaves for the hoist rope, a broken-rope safety
     device (断绳保护) and a hanging maintenance basket. No motor on it (the jib-root winch drives it).
   - Hoist (起升机构) on the counter-jib: motor -> brake -> gearbox -> drum, under a cover. The hoist rope (起重钢丝绳)
     runs from the drum to the guide sheave at the tower top, along the jib to the trolley, down round the hook block's
     sheave and back up (2 falls, 2倍率), then along to the anchor at the jib tip. Winding the drum shortens the falls:
     the hook rises without the trolley moving.
   - Counter-jib (反向臂 / 平衡臂): a flat frame with walkway and railings, pinned to the upper support and held by its
     tie bars. The counterweight blocks (平衡重) hang at its tail; the electric cabinet (电控柜) stands on it.
   - Hook block (吊钩组): sheave between two side plates painted in yellow-black stripes, the hook on a swivel with a
     safety latch.
   - Cab (驾驶室): on a bracket at the side of the upper support, turning with it; seat, control console, windows.
   - Safety: moment limiter (力矩限制器) on the tower top's main chord, load and height limiters at the hoist drum,
     anemometer (风速仪) on the tower top, red obstruction lights (障碍灯) on the apex and the jib tip.
   - Hoist, slewing and trolley are electric; while they run, the ropes run and the drums and motors turn.
   - Load chart (simplified QTZ80): 6 t up to about 13 m radius, then the rated moment is constant down to about
     1.0 t at the 56 m tip. The moment limiter stops the trolley going out and the hook going up when the load is
     over the chart.

   PARTS (each fixed to the one named after it; 1-12 are the reference image's numbers, 13+ are added real parts)
   1 TOWER    ① 基础节: cross base, 4 ballast blocks, the fixed base section . ⑩ 塔身节 x4 (chords cut at the
              section joints, diagonals, horizontals, fish plates) . ㉒ 爬梯与平台: ladder with hoops, rest platforms
   2 SLEW     ⑤ 回转机构: lower support, slewing ring with gear teeth, upper support, 2 motors + reducers + pinions .
              ⑪ 塔顶: 4-leg tapered lattice, apex sheave . ⑥ 驾驶室: on its bracket, seat and console inside
   3 JIB      ⑦ 主臂: root section, middle sections, tip section . ④ 变幅机构: winch in the jib root . ⑧ 小车:
              frame, wheels, sheaves, broken-rope device, basket . ⑭ 起重臂拉杆 x2: apex to the jib
   4 COUNTER  ③ 反向臂: frame, walkway, railings . ② 平衡重 x4 blocks . ⑬ 起升机构: motor, brake, gearbox, drum,
              cover . ⑱ 电控柜 . ㉓ 平衡臂拉杆 x2: apex to the counter-jib
   5 ROPES    ⑫ 起重钢丝绳: drum -> apex sheave -> jib -> trolley -> hook block -> trolley -> jib tip anchor .
              ㉔ 变幅钢丝绳: winch drum -> trolley inner end; drum -> tip sheave -> trolley outer end . ⑨ 吊钩组:
              side plates (yellow-black), sheave, swivel, hook, latch
   6 CLIMB+SAFETY ⑮ 顶升套架: sleeve lattice, platform, introduction beam . ⑯ 顶升油缸 . ⑰ 液压泵站: motor, pump,
              tank, hoses to the cylinder . ⑲ 力矩限制器 . ⑳ 风速仪 . ㉑ 障碍灯 (apex, jib tip)
   Details: load-chart plates on the jib, walkway railings, platform railings, gusset plates at the lattice joints.

   WHERE THE REFERENCE IMAGE IS WRONG (the real crane wins)
   - its subtitle says 动臂 (luffing jib): a QTZ crane has a flat jib with a trolley;
   - its ④ 变幅机构 sits on the counter-jib: that is the hoist (⑬ 起升机构); the trolley winch is in the jib root;
   - its ⑫ points at the tie bars: those are rigid bars (⑭ ㉓); the hoist rope runs along the jib to the hook;
   - it shows a slewing ring at the mast foot too: only the top slews; the base has none;
   - it shows a motor on the trolley: the standard QTZ80 trolley is rope-driven from the jib root.         */


const CJKF = "ui-monospace,Menlo,'PingFang SC','Microsoft YaHei','Noto Sans CJK SC','WenQuanYi Zen Hei',monospace";
// the three repaintable zones (src/g_skin.js rewrites them in place): tower + jib yellow, cab white, motor blue
const YEL  = { l:'#ffd34d', m:'#f3b11b', d:'#b6760b' };
const CABW = { l:'#fbfaf5', m:'#e4e4dd', d:'#bfc2bc' };
const MOT  = { l:'#5d9be8', m:'#2f6fcb', d:'#1b3f86' };
// fixed materials: ballast, counterweights, ropes, hook block stripes, hydraulics, steel, rubber, reflective
const CONC = { l:'#d6d7d3', m:'#b2b4b0', d:'#7e817f' };
const CWT  = { l:'#a8afb4', m:'#838b91', d:'#555c61' };
const ROPE = { l:'#a3aab1', m:'#6b727a', d:'#464b52' };      // ropes: mid steel grey (core), inked outline; the tie bars (BAR) are lighter and flat
const BAR  = { l:'#e3e6ea', m:'#bcc2c9', d:'#8a919a' };      // tie bars: light galvanised steel
const HKY  = { l:'#ffdc50', m:'#f6b900', d:'#b98600' };
const HKB  = { l:'#4b4b4e', m:'#2a2a2c', d:'#111112' };
const HYD  = { l:'#78a2ea', m:'#4d78cf', d:'#2b4a96' };
const STL  = { l:'#a7adb2', m:'#7d848b', d:'#4c5157' };
const DKS  = { l:'#5f656b', m:'#454a50', d:'#2a2d31' };
const RED  = { l:'#f0614f', m:'#cf4131', d:'#88251a' };
const ALU  = { l:'#e9ecec', m:'#c3c9cb', d:'#8b9497' };
const RUB  = { l:'#3d3d40', m:'#2a2a2c', d:'#161617' };
const AMB = '#f6b73c', GLASS = '#bfe0ea';
const SYSC = ['', '#45a33a', '#ef8a1c', '#d9a514', '#3b7be0', '#8a4fd0', '#e0463a'];
const SYSN = ['', '塔身与基础', '回转与塔顶', '起重臂', '平衡臂', '钢丝绳与吊钩', '顶升与安全'];
const PNAME = ['', '基础节', '平衡重', '反向臂', '变幅机构', '回转机构', '驾驶室', '主臂', '小车', '吊钩组', '塔身节', '塔顶', '起重钢丝绳',
  '起升机构', '起重臂拉杆', '顶升套架', '顶升油缸', '液压泵站', '电控柜', '力矩限制器', '风速仪', '障碍灯', '爬梯与平台', '平衡臂拉杆', '变幅钢丝绳'];
// the reference image numbers its parts by where they are, not by system, so the system is looked up
const SYS_TAB = [0, 1, 4, 4, 3, 2, 2, 3, 3, 5, 1, 2, 5, 4, 3, 6, 6, 6, 4, 6, 6, 6, 1, 4, 5];
const SYS_OF = n => SYS_TAB[n] || 0;
const NPART = PNAME.length - 1, NSYS = SYSN.length - 1;
const SYS_IDS = Array.from({ length: NSYS }, (_, i) => i + 1);      // 1..NSYS
const zeros = () => new Array(NSYS + 1).fill(0);                     // one slot per system (slot 0 unused)

/* ---------- key dimensions (abstract units; the mast is 10 across, a standard section 16 high) ---------- */
const SEC_H = 16, SEC_W = 5, CHR = .7;               // mast section: height, chord centre offset, chord half thickness
const ZB = 8, ZM = 16, NSEC_MIN = 4, NSEC_MAX = 6;   // base section bottom, first standard section bottom, section counts
const GAP1 = 11, GAPT = 29;                          // exploded: extra gap per section; the gap above the top section is the climbing frame's room
const ZLO = 80;                                      // lower support bottom with 4 sections (frames add more after climbing)
const JX0 = 7.4, JBAY = 10, JNB = 10, JX1 = JX0 + JBAY*JNB;   // jib: root, bay length, bays (the last is the tip bay), tip
const JZB = 86.2, JZT = 93.2, JY = 4.2;              // jib bottom bar top, top chord underside, bottom node half width
const CJX1 = -47.4, CJ_BAY = 8;                      // counter-jib tail; bays of 8 from the upper support
const APZ = 118.5;                                   // apex sheave centre height
const HZ0 = 45;                                      // hook sheave centre height the hook block is modelled at
const RZ = 83.8;                                     // hoist rope run under the jib (top of the trolley sheaves)
const MAXR = 56, RADIUS_X = JX1;                     // read-out: the tip is 56 m out
const radiusM = x => x/RADIUS_X*MAXR;

/* ---------- small vector helpers ---------- */
const vadd = (a, b) => [a[0]+b[0], a[1]+b[1], a[2]+b[2]], vsc = (a, k) => [a[0]*k, a[1]*k, a[2]*k];
const lerp = (a, b, t) => a + (b - a)*t, clamp01 = t => Math.max(0, Math.min(1, t));
const sstep = t => { t = clamp01(t); return t*t*(3 - 2*t); };
// rotate p's (x, z) about c = [x, z] by a radians (x right, z up: positive = counter-clockwise seen from -y)
const rotXZ = (p, c, a) => { const s2 = Math.sin(a), c2 = Math.cos(a), dx = p[0] - c[0], dz = p[2] - c[1];
  return [c[0] + dx*c2 - dz*s2, p[1], c[1] + dx*s2 + dz*c2]; };
const rotN = (n, a) => { const s2 = Math.sin(a), c2 = Math.cos(a); return [n[0]*c2 - n[2]*s2, n[1], n[0]*s2 + n[2]*c2]; };
// rotate about the vertical axis through the tower (positive = counter-clockwise seen from above). (core.js owns the name rotXY, so this is rotZ)
const rotZ = (p, a) => { const s2 = Math.sin(a), c2 = Math.cos(a); return [p[0]*c2 - p[1]*s2, p[0]*s2 + p[1]*c2, p[2]]; };

/* ---------- frames: every part is modelled where it sits on the assembled crane, in one of these frames ----------
   g     ground: cross base, base section                 s0..s5  standard mast sections (local z 0..16 from the section's foot)
   lo    mast top: lower support, slewing ring (rides up with the climb, never turns)
   cf    climbing frame (hangs from the lower support)    up      everything that turns: slew about z, then the climb
   su    upper support, motors, pinions   top  tower top   cab  cab and bracket   jib  jib and its tie bars
   cj    counter-jib and its tie bars     cw   counterweights (drop out of cj)
   trol  trolley (in jib: x = st.trolley; local x is 0 at its centre)       hook  hook block (local z = hook sheave height at HZ0)
   load  the load: on its spot or on the hook      pad plat  the pick pad and the building: scenery fixed to the ground      */
const FT = {}, FN = {}, FT0 = {};
const SU_LIFT = 12, TOP_LIFT = 26, CAB_OUT = 18, CAB_UP = 6, JIB_OUT = 26, JIB_UP = 6, CJ_OUT = -26, CJ_UP = 6, CW_DROP = 18, CF_DOWN = 34;
function makeFrames(st, e, T, N){
  const sl = st.slew, ns = st.nsec, ru = (ns - NSEC_MIN + st.climb)*SEC_H + (ns*GAP1 + GAPT)*e[1];
  const id = n => n, zlift = (p, dz) => [p[0], p[1], p[2] + dz];
  T.g = id; N.g = id;
  for (let i = 0; i < NSEC_MAX; i++){ const dz = ZM + SEC_H*i + (i + 1)*GAP1*e[1]; T['s' + i] = p => zlift(p, dz); N['s' + i] = id; }
  T.lo = p => zlift(p, ru); N.lo = id;
  T.cf = p => zlift(p, ru - CF_DOWN*e[6]*(1 - .88*e[1])); N.cf = id;
  T.up = p => { const q = rotZ(p, sl); q[2] += ru; return q; }; N.up = n => rotZ(n, sl);
  const upOff = (k, o) => { T[k] = p => T.up(vadd(p, o)); N[k] = N.up; };      // a shift in the turning frame turns with it
  upOff('su', [0, 0, SU_LIFT*e[2]]); upOff('top', [0, 0, TOP_LIFT*e[2]]); upOff('cab', vsc([0, CAB_OUT, CAB_UP], e[2]));
  upOff('jib', vsc([JIB_OUT, 0, JIB_UP], e[3])); upOff('cj', vsc([CJ_OUT, 0, CJ_UP], e[4]));
  upOff('cw', vadd(vsc([CJ_OUT, 0, CJ_UP], e[4]), [0, 0, -CW_DROP*e[4]]));
  T.trol = p => T.jib([p[0] + st.trolley, p[1], p[2]]); N.trol = N.up;
  T.hook = p => T.trol([p[0], p[1], p[2] + st.hookZ - HZ0]); N.hook = N.up;
  // the load: on its spot, or on the hook (loadPose); the pad and the building are fixed to the ground; a section on its way in rolls in along +x
  const ld = loadPose(st);
  T.load = p => vadd(rotZ(p, ld.yaw), ld.p); N.load = n => rotZ(n, ld.yaw); T.pad = id; N.pad = id; T.plat = id; N.plat = id;
  if (st.sx != null){ const i = st.nsec, dz = ZM + SEC_H*i + (i + 1)*GAP1*e[1]; T['s' + i] = p => [p[0] + st.sx, p[1], p[2] + dz]; }
}
// FT: where every frame is now; FT0: the same with nothing taken apart (the ropes, taken apart, keep their assembled
// shape; left in place, their pieces follow whatever they are fixed to)
function setFrames(st){ makeFrames(st, st.E, FT, FN); makeFrames(st, zeros(), FT0, {}); }

/* ---------- parts: built in local (assembled) coordinates through the current context, then sorted once ---------- */
let PARTS = [], CX = null, GST = null;
const OFF = {};                                       // the offset each part was last built with (a hose end follows the part it is on)
// sub-part pull directions (a separated system's part, clicked)
const PULL = { 1:[0,-36,0], 2:[-16,0,0], 3:[0,0,-14], 4:[0,0,22], 5:[0,-30,0], 6:[0,30,0], 7:[0,0,18], 8:[0,0,-16], 9:[0,0,-26], 10:[0,36,0],
  11:[0,0,20], 12:[0,-18,0], 13:[0,0,22], 14:[0,0,16], 15:[0,0,-24], 16:[-16,0,0], 17:[0,14,0], 18:[0,0,18], 19:[16,0,0], 20:[0,0,16],
  21:[0,0,16], 22:[-30,0,0], 23:[0,0,16], 24:[0,0,16] };       // (part 10: only the second mast section comes out)
const SYS_OFF = [0, 0, 0, 0, 0, [55, -75, -10], 0];     // a system's whole-group shift when taken apart (ropes and hook slide out toward -y and +x, clear of the mast and the jib)
const KEEP = [0, 0, 0, 0, 0, 1, 0];                       // systems that keep their assembled shape when taken apart
// the position of a local point in frame fr for the part now being built (this part's offsets, and the assembled-shape blend of a KEEP system)
function frameAt(fr, p){
  const k = CX.keep;
  if (!k) return FT[fr](p);
  const a = FT0[fr](p), b = FT[fr](p);
  return [0, 1, 2].map(i => a[i] + (b[i] - a[i])*(1 - k));
}
// set the context for the parts that follow: frame, part number (1..NPART decides the system), options
//   o.shell this piece is a cover that fades in see-through; o.lat it is lattice that fades a little (ropes inside show)
//   o.xo   extra shift of this piece when its system is taken apart (the hook drops further than the ropes)
//   o.pull this piece's own pull direction when its part is clicked
const SLEWS = new Set(['up', 'su', 'top', 'cab', 'jib', 'cj', 'cw', 'trol', 'hook', 'load']);      // frames that turn with the slew: their shifts turn with them
function use(fr, n, o = {}){
  const st = GST, sys = SYS_OF(n), rz = SLEWS.has(fr) ? v => rotZ(v, st.slew) : v => v;
  let off = [0, 0, 0];
  if (SYS_OFF[sys]) off = vadd(off, rz(vsc(SYS_OFF[sys], st.E[sys])));
  if (o.xo) off = vadd(off, rz(vsc(o.xo, st.E[sys])));
  const pv = o.pull || PULL[n], pk = st.pull[n] || 0;
  if (pk && pv) off = vadd(off, rz(vsc(pv, pk)));
  const keep = KEEP[sys] && st.E[sys] > 0 ? st.E[sys] : 0;
  OFF[n] = off;
  CX = { fr, n, sys, off, keep, shell: !!o.shell, lat: !!o.lat, T: null, N: FN[fr] };
  CX.T = p => vadd(frameAt(fr, p), off);
}
const wpt = p => CX.T(p);
// a point in another frame, with this part's offsets (or those of part n: a hose end sits on the part it is fixed to)
const wAt = (fr, p, n) => vadd(frameAt(fr, p), n && (!CX.keep || SYS_OF(n) === CX.sys) ? OFF[n] || [0, 0, 0] : CX.off);   // a KEEP system's ropes move as one group: only ends on its own parts follow them
const wpd = (pts, close = true) => pd(pts.map(wpt), close);
const fvis = n => vis(CX.N(n));
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
  const part = { svg, pts: wp, planes: o.planes, box: bboxOf(wp), sys: CX.sys, n: CX.n, fr: CX.fr, shell: o.shell ?? CX.shell, lat: CX.lat, rank: o.rank ?? ((o.shell ?? CX.shell) ? 1 : 0) };
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
// flat bar between two local points: half width hy across local y, half thickness ht in the other direction (a plate on edge: tie bars, eye plates)
function gFlat(a, b, hy, ht, m, w = .5, o = {}){
  const A = wpt(a), Bp = wpt(b), L = Math.hypot(...sub(Bp, A)); if (L < 1e-9) return null;
  const d = sub(Bp, A).map(v => v/L), uy = norm(sub(wpt([0, 1, 0]), wpt([0, 0, 0]))), u = norm(sub(uy, vsc(d, dot(d, uy)))), v = cross(d, u);
  const ring = e => [[1,1],[-1,1],[-1,-1],[1,-1]].map(([cu, cv]) => [0,1,2].map(q => e[q] + hy*cu*u[q] + ht*cv*v[q])), R0 = ring(A), R1 = ring(Bp);
  return push(solid(R0, R1, m, w, o.sh || tone) + (o.deco ? o.deco() : '') + hullInk([...R0, ...R1], o.ink ?? 1), [...R0, ...R1], { ...o, planes: planesOf(R0, R1) });
}
// a tie bar (parts 14, 23) from a to b: flat steel bar in two lengths, an eye plate with pin heads at each end and a bolted splice sleeve
// at the joint; BAR is light galvanised steel so it never reads as a (dark, thin) rope
function tieBar(a, b, o = {}){
  const L = Math.hypot(...sub(b, a)), d = sub(b, a).map(v => v/L), m = vadd(a, vsc(d, L*(o.mid ?? .5))), ey = 2.4, sl = 1.7, hy = .85, ht = .42, sg = a[1] < 0 ? -1 : 1;
  const e1 = vadd(a, vsc(d, ey)), e2 = vadd(b, vsc(d, -ey));
  gFlat(a, e1, 1.1, .55, DKS, .5, { ink: .9 }); gFlat(b, e2, 1.1, .55, DKS, .5, { ink: .9 });
  gFlat(e1, vadd(m, vsc(d, -sl)), hy, ht, BAR, .5, { ink: 1.1 }); gFlat(vadd(m, vsc(d, sl)), e2, hy, ht, BAR, .5, { ink: 1.1 });
  gFlat(vadd(m, vsc(d, -sl)), vadd(m, vsc(d, sl)), 1.25, .7, DKS, .5, { ink: 1.2 });
  for (const [p, s] of [[a, 1.1], [b, 1.1], [vadd(m, vsc(d, -sl*.55)), 1.25], [vadd(m, vsc(d, sl*.55)), 1.25]]) for (const q of [-1, 1])
    gR([p[0], p[1] + q*s, p[2]], [p[0], p[1] + q*(s + .4), p[2]], .6, STL, .4, { sides: 10, ink: .8 });
}
// hydraulic cylinder: barrel from a toward b (length bl), chromed rod for the rest
function gCyl(a, b, rb, bl, m, o = {}){
  if (!o.world){ a = wpt(a); b = wpt(b); }
  const L = Math.hypot(...sub(b, a)); if (L < 1e-9) return [];
  const d = sub(b, a).map(v => v/L), bl2 = Math.max(0, Math.min(bl, L - .6)), e = vadd(a, vsc(d, bl2)), ow = { ...o, world: true };
  const p1 = gR(a, e, rb, m, .8, ow), p2 = gR(vadd(a, vsc(d, Math.max(0, bl2 - .4))), b, rb*.45, ALU, .6, ow);
  return [p1, p2].filter(Boolean);
}
// a line of thin square-section pieces along points (a point may be {fr, p[, n]} to sit in another frame), cut so it sorts with
// solids: hoses (part 17: dark blue, a bright oil dash while it flows) and ropes (parts 12, 24: steel grey, a light dash while
// it runs). o = { n: part number, col, flow: dash colour, dash: dash pattern, seg: a shared id for several lines }
function gHose(pts, flow, dir = 1, wd = .55, o = {}){
  const n = o.n ?? 17, col = o.col ?? '#2f3a5c', fc = o.flow ?? '#86c8ff', dash = o.dash ?? '2.2 2.4', sys = SYS_OF(n);
  const W = pts.map(p => p.fr ? wAt(p.fr, p.p, p.n) : wpt(p));
  let acc = 0;
  const hoseId = o.seg ?? PARTS.length;          // pieces of one line share an id (and are never ordered against their neighbour)
  for (let i = 0; i < W.length - 1; i++){
    const a = W[i], b = W[i+1], d2 = pd([a, b], false), ln = Math.hypot(...sub(b, a));
    if (ln < 1e-6) continue;
    let s = `<path d="${d2}" fill="none" stroke="${INK}" style="stroke-width:${f(wd*2 + .45)}" stroke-linecap="round"/><path d="${d2}" fill="none" stroke="${col}" style="stroke-width:${f(wd*2)}" stroke-linecap="round"/>`;
    if (o.hi) s += `<path d="${d2}" fill="none" stroke="${o.hi}" style="stroke-width:${f(wd*.55)}" stroke-dasharray="${f(wd*3)} ${f(wd*3.4)}" stroke-dashoffset="${f(-acc)}"/>`;      // the lay of the strands
    if (flow > 0) s += `<path d="${d2}" fill="none" stroke="${fc}" style="stroke-width:${f(wd*1.1)}" stroke-dasharray="${dash}" stroke-dashoffset="${f(acc - dir*GST.clock*16)}" stroke-linecap="round" opacity="${f(flow)}"/>`;
    acc += ln;
    // a piece is a thin square-section rod: a real convex solid, so it sorts like every other part
    const d = norm(sub(b, a)), u = norm(cross(d, Math.abs(d[2]) < .9 ? [0,0,1] : [1,0,0])), v = cross(d, u), hw = wd + (o.pad ?? .22), ring = e => [[1,1],[-1,1],[-1,-1],[1,-1]].map(([cu, cv]) => [0,1,2].map(k => e[k] + hw*(cu*u[k] + cv*v[k])));
    const A = ring(a), B = ring(b), pp = [...A, ...B];
    PARTS.push({ svg: s, pts: pp, planes: planesOf(A, B), box: bboxOf(pp), sys, n, shell: false, rank: 0, hose: true, seg: hoseId });
  }
}
// build with an extra local transform in front of the current frame (a part turning on its own pin)
function withXf(xf, nf, fn){ const T0 = CX.T, N0 = CX.N; CX.T = p => T0(xf(p)); CX.N = n => N0(nf(n)); fn(); CX.T = T0; CX.N = N0; }
// text lying on a local plane (origin p, reading direction u, down direction v as local vectors)
const gTxt = (p, u, v, str, size, col = INK, wt = 800) => { const o = P(...wpt(p));
  return `<text transform="${txM(o, Dv(...CX.N(u)), Dv(...CX.N(v)))}" font-size="${size}" fill="${col}" text-anchor="middle" font-family="${CJKF}" font-weight="${wt}">${str}</text>`; };
// decoration on a local plane face: draws fn() only while the face (local normal n) faces the viewer
const onF = (n, fn) => fvis(n) ? fn() : '';
const dpoly = (pts, col, w = .6) => shape(pts.map(wpt), col, w);
const dline = (pts, w = .6, col = INK) => `<path d="${wpd(pts, false)}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
// a rod between two points of a lattice face with its ends pulled back from the chords it joins: hw = the chord's half thickness
// across the face, r = this member's radius; the end disc then stops just off the chord's surface
function strut(a, b, sep, hw, r, m, o = {}){
  const L = Math.hypot(...sub(b, a)), u = sub(b, a).map(v => v/L), c = Math.abs(dot(u, sep)) || 1, t = (hw + r*.55)/c;
  if (L < 2*t + .2) return null;
  return gR(vadd(a, vsc(u, t)), vadd(b, vsc(u, -t)), r, m, o.w ?? .5, { sides: o.sides || 4, ...o });
}
const rnd = i => { const x = Math.sin(i*127.1 + 311.7)*43758.5453; return x - Math.floor(x); };
