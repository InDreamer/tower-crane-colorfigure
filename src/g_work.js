/* ================= 工作: the load chart, where the load and the hook are, the ten steps of a lift and the five of a climb ================= */
const TROL_MIN = 32, TROL_MAX = 90, HOOK_MIN = 20, HOOK_MAX = 76;          // trolley radius and hook sheave height limits (the hook can go lower by what the crane has climbed)
const REST_Z = 62, TROL_REST = 40, BAL_ANG = Math.PI/2;                        // where the hook and the trolley wait, and where the jib turns to for a climb (out of the way of the section coming in)
const rad = d => d*Math.PI/180, TAU = 2*Math.PI;
const hookMin = st => HOOK_MIN - (st.nsec - NSEC_MIN)*SEC_H;
const ru0 = st => (st.nsec - NSEC_MIN + st.climb)*SEC_H;                       // how far the top has climbed (the hook height is measured in the turning frame)
// ----- the load (a spec, so other styles can use the same code) and where it can sit
const SHK_Z = 23.2, HOOK_DROP = HZ0 - SHK_Z, liftDZ = () => LOAD.h + LOAD.v + HOOK_DROP;     // the hook's shackle underside; the hook sheave sits liftDZ above a load standing on a surface (its top LOAD.v under the shackle)
const PAD_H = 1.5, ROOF_Z = 24, CARRY_Z = 32;                                  // pad top, the top slab, the lift height of the load's underside
// pick pad at slew -45 deg, 52 out (on the front-left at the default view, clear of the mast and the cab); the building at +80 deg, 45 out (on the far side, in the open)
const SPOT = {};
for (const [k, a, r, z] of [['pad', -45, 52, PAD_H], ['roof', 80, 45, ROOF_Z]]) SPOT[k] = { a: rad(a), r, x: r*Math.cos(rad(a)), y: r*Math.sin(rad(a)), z, yaw: rad(a + 90) };
const otherSpot = k => k === 'pad' ? 'roof' : 'pad';
const loadW = st => st.loadT ?? LOAD.t;
// the hook's shackle (where the slings start) in the world, and where the load is: on its spot, or hanging from the shackle
function hookAnchor(st){ const q = rotZ([st.trolley + HK_C[0], 0, 0], st.slew); return [q[0], q[1], SHK_Z - HZ0 + st.hookZ + ru0(st)]; }
function loadPose(st){
  if (st.hooked){ const a = hookAnchor(st); return { p: [a[0], a[1], a[2] - LOAD.v - LOAD.h], yaw: st.slew + rad(90) }; }
  const s = SPOT[st.at || 'pad']; return { p: [s.x, s.y, s.z], yaw: s.yaw };
}
// ----- load chart (simplified QTZ80): rated load in tonnes at radius r metres
const ratedT = r => r <= 13 ? 6 : 78/r - .00905*(r - 13);
const trolRated = st => ratedT(radiusM(st.trolley));
function maxTrolley(w){ if (ratedT(radiusM(TROL_MAX)) >= w) return TROL_MAX; if (ratedT(radiusM(TROL_MIN)) < w) return TROL_MIN;
  let a = TROL_MIN, b = TROL_MAX; for (let i = 0; i < 40; i++){ const m = (a + b)/2; if (ratedT(radiusM(m)) >= w) a = m; else b = m; } return a; }
const momentRatio = st => st.hooked ? loadW(st)/trolRated(st) : 0;
// what the hook carries right now (it counts up as the load leaves its surface)
function hangT(st){
  if (!st.hooked) return 0;
  const p = loadPose(st).p, sp = Object.values(SPOT).find(s => Math.hypot(p[0] - s.x, p[1] - s.y) < 16);
  return loadW(st)*clamp01((sp ? p[2] - sp.z : 99)/3.5);
}
const readouts = st => ({ t: hangT(st), r: radiusM(st.trolley), h: hookAnchor(st)[2]*MAXR/RADIUS_X });
// ----- the rope on the drums and sheaves: angles follow the rope that has run (rope length / radius), + = paying out
const WR_H = HOIST.R + ROPE_R, WR_T = DRM2[2] + ROPE_R, RING_PITCH = RING_R + .8, PIN_R = 1.3;
const drumAngH = st => 2*(REST_Z - st.hookZ)/WR_H;           // hoist drum: two falls, so the rope runs twice the hook's travel
const drumAngT = st => (st.trolley - TROL_REST)/WR_T;        // trolley winch drum
const sheaveAngH = st => (REST_Z - st.hookZ)/HS_R;           // the hook sheave (rolls on the rope: the hook's travel / its radius)
const pinionAng = st => st.slew*RING_PITCH/PIN_R;            // a pinion rolling round the fixed ring gear
// the state of the working cycle (the rest of the state is in i_ui)
const workState = () => ({ hookZ: REST_Z, at: 'pad', hooked: false, loadT: null, sl: 0, released: false, flowH: 0, flowT: 0, dirH: 1, dirT: 1, over: 0, ext: 0, sx: null, bolt: 0, autoMode: 'work' });

/* ----- the steps. begin(st) fixes where it starts and where it ends (st.s0, st.tg); each seg is one move: d seconds (or a function of the state),
   act = what is working (their labels light), flow 'H' / 'T' = the hoist / trolley rope runs, pump = oil in the hoses, f(st, t) puts the crane at t = 0..1 ----- */
const angTo = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const secs = (d, per) => Math.max(2.5, Math.min(4, 2.5 + Math.abs(d)/per*1.5));      // every move takes 2.5 to 4 s
const TROL_AT = s => SPOT[s].r - HK_C[0];                                              // the trolley radius that puts the hook over the spot
const pickZ = (st, z) => z + liftDZ() - ru0(st);                                        // the hookZ at which the hook sits at a load standing on height z
const carryZ = st => pickZ(st, CARRY_Z);
const near = (a, b, e = .05) => Math.abs(a - b) < e;
const mv = (...ks) => (st, t) => { for (const k of ks) st[k] = t >= 1 ? st.tg[k] : lerp(st.s0[k], st.tg[k], sstep(t)); };
const slewD = st => secs(deg(st.tg.slew - st.s0.slew), 90), trolD = st => secs(st.tg.trolley - st.s0.trolley, 50), hookD = st => secs(st.tg.hookZ - st.s0.hookZ, 40);
const deg = r => r*180/Math.PI;
const STEPS = {
  slewTo: { name: '回转', begin: st => { st.tg = { slew: st.s0.slew + angTo(st.s0.slew, SPOT[st.at].a) }; }, segs: [{ d: slewD, act: 'slew', f: mv('slew') }] },
  out: { name: '小车变幅', begin: st => { const want = TROL_AT(st.at), lim = st.hooked ? maxTrolley(loadW(st)) : TROL_MAX;      // (with a load on the hook the limiter stops the trolley)
    st.tg = { trolley: Math.min(want, lim) }; return want > lim ? '太重了，小车往里开一点' : null; }, segs: [{ d: trolD, act: 'trolley', flow: 'T', f: mv('trolley') }] },
  lower: { name: '落钩', begin: st => { st.tg = { hookZ: pickZ(st, SPOT[st.at].z) }; }, segs: [{ d: hookD, act: 'hoist', flow: 'H', f: mv('hookZ') }] },
  hook: { name: '挂钩', begin: st => { st.tg = {}; }, segs: [{ d: 2.5, act: 'hook', f: (st, t) => { st.sl = sstep(t); } }], end: st => { st.hooked = true; st.sl = 1; } },
  hoist: { name: '起升', begin: st => { st.tg = { hookZ: carryZ(st) }; }, segs: [{ d: hookD, act: 'hoist', flow: 'H', f: mv('hookZ') }] },
  slewBack: { name: '回转', begin: st => { st.tg = { slew: st.s0.slew + angTo(st.s0.slew, SPOT[otherSpot(st.at)].a) }; }, segs: [{ d: slewD, act: 'slew', f: mv('slew') }] },
  in: { name: '小车变幅', begin: st => { const want = TROL_AT(otherSpot(st.at)), lim = maxTrolley(loadW(st));      // the limiter stops the trolley where the chart says
    st.tg = { trolley: Math.min(want, lim) }; return want > lim ? '太重了，小车往里开一点' : null; }, segs: [{ d: trolD, act: 'trolley', flow: 'T', f: mv('trolley') }] },
  set: { name: '下降放下', begin: st => { st.tg = { hookZ: pickZ(st, SPOT[otherSpot(st.at)].z) }; }, segs: [{ d: hookD, act: 'hoist', flow: 'H', f: mv('hookZ') }] },
  unhook: { name: '摘钩', begin: st => { st.tg = {}; }, segs: [{ d: 2.5, act: 'hook', f: (st, t) => { st.sl = 1 - sstep(t); } }], end: st => { st.hooked = false; st.sl = 0; st.at = otherSpot(st.at); st.released = true; } },
  home: { name: '升钩回位', begin: st => { st.tg = { hookZ: REST_Z, trolley: TROL_REST }; }, segs: [{ d: st => Math.max(hookD(st), trolD(st)), act: ['hoist', 'trolley'], flow: 'HT', f: mv('hookZ', 'trolley') }] },
  // ----- the climb
  balance: { name: '配平', begin: st => { st.tg = { trolley: TROL_MIN, slew: st.s0.slew + angTo(st.s0.slew, BAL_ANG) }; }, segs: [{ d: st => Math.max(slewD(st), trolD(st)), act: ['slew', 'trolley'], flow: 'T', f: mv('slew', 'trolley') }] },
  jack: { name: '顶升', begin: st => { st.tg = {}; }, segs: [{ d: 4, act: 'climb', pump: 1, f: (st, t) => { st.climb = st.ext = sstep(t); } }] },
  insert: { name: '引进标准节', begin: st => { st.tg = {}; st.sx = INS_X; }, segs: [{ d: 3.6, act: 'insert', f: (st, t) => { st.sx = lerp(INS_X, 0, sstep(t)); } }] },
  bolt: { name: '螺栓连接', begin: st => { st.tg = {}; }, segs: [{ d: 2.5, act: 'bolt', f: (st, t) => { st.bolt = Math.sin(Math.PI*t); } }],
    end: st => { st.nsec++; st.climb = 0; st.sx = null; st.bolt = 0; } },
  retract: { name: '缩回油缸', begin: st => { st.tg = {}; }, segs: [{ d: 4, act: 'climb', pump: 1, f: (st, t) => { st.ext = 1 - sstep(t); } }] },
};
const INS_X = 36;
const WORK_ORDER = ['slewTo', 'out', 'lower', 'hook', 'hoist', 'slewBack', 'in', 'set', 'unhook', 'home'], CLIMB_ORDER = ['balance', 'jack', 'insert', 'bolt', 'retract'];
const STEP_ORDER = [...WORK_ORDER, ...CLIMB_ORDER];
const climbing = st => st.climb > 0 || st.ext > 0 || st.sx != null;
const aligned = (st, k) => near(angTo(st.slew, SPOT[k].a), 0, .002), atRadius = (st, k) => near(st.trolley, TROL_AT(k)), atPick = (st, k) => near(st.hookZ, pickZ(st, SPOT[k].z));
// why a step can't run yet (the hint names the step that has to come first), or null if it can
function whyNot(st, id){
  if (!Object.hasOwn(STEPS, id)) return '未知步骤：请选择有效的工作步骤';
  const at = st.at || 'pad', to = otherSpot(at);
  if (WORK_ORDER.includes(id) && climbing(st)) return '正在顶升，等顶升做完';
  switch (id){
    case 'slewTo': return st.hooked ? '先放下吊物、摘钩，再回转到吊物处' : null;
    case 'out': return st.hooked ? (st.hookZ < carryZ(st) - .05 ? '先起升，再开小车' : !aligned(st, at) ? '先回转到吊物处，再开小车' : null) : !aligned(st, at) ? '先回转到吊物处，再开小车' : null;
    case 'lower': return st.hooked ? '吊物已经挂好了，先起升' : !aligned(st, at) ? '先回转到吊物处，再落钩' : !atRadius(st, at) ? '先把小车开到吊物上方，再落钩' : null;
    case 'hook': return st.hooked ? '吊物已经挂好了' : !aligned(st, at) || !atRadius(st, at) ? '先把吊钩开到吊物上方，再挂钩' : !atPick(st, at) ? '先落钩，再挂钩' : null;
    case 'hoist': return !st.hooked ? '先挂钩，再起升' : loadW(st) > ratedT(radiusM(TROL_AT(at))) + 1e-9 ? '太重了，起重机吊不动，换轻一点的' : loadW(st) > trolRated(st) + 1e-9 ? '太重了，小车往里开一点' : null;       // (over the chart where the load lies: no radius helps)
    case 'slewBack': return !st.hooked ? '先挂钩，再回转' : st.hookZ < carryZ(st) - .05 ? '先起升，再回转' : null;
    case 'in': return !st.hooked ? '先挂钩，再开小车' : st.hookZ < carryZ(st) - .05 ? '先起升，再开小车' : !aligned(st, to) ? '先回转到放料处，再开小车' : null;
    case 'set': return !st.hooked ? '先挂钩，再下降' : !aligned(st, to) || !near(st.trolley, Math.min(TROL_AT(to), maxTrolley(loadW(st)))) ? '先把吊物开到放料处上方，再下降' : null;
    case 'unhook': return !st.hooked ? '吊钩上没有吊物' : !atPick(st, to) ? '先放下吊物，再摘钩' : null;
    case 'home': return st.hooked ? '先放下吊物、摘钩，再升钩' : null;
    case 'balance': return st.hooked ? '先放下吊物，再顶升' : st.nsec >= NSEC_MAX && !climbing(st) ? '已经最高了' : climbing(st) ? '已经在顶升了，接着做下一步' : null;
    case 'jack': return st.hooked ? '先放下吊物，再顶升' : st.nsec >= NSEC_MAX ? '已经最高了' : climbing(st) ? '已经顶起来了，接着引进标准节' : !near(st.trolley, TROL_MIN) || !aligned2(st, BAL_ANG) ? '先配平，再顶升' : null;
    case 'insert': return !(near(st.climb, 1, 1e-6) && st.sx == null) ? '先顶升，再引进标准节' : null;
    case 'bolt': return !(st.sx != null && near(st.sx, 0, 1e-6)) ? '先引进标准节，再连接螺栓' : null;
    case 'retract': return !(st.climb === 0 && near(st.ext, 1, 1e-6) && st.sx == null) ? '先螺栓连接，再缩回油缸' : null;
  }
  return null;
}
const aligned2 = (st, a) => near(angTo(st.slew, a), 0, .002);
// the next step of the cycle the 工作 / 顶升 button is running, worked out from where the crane stands (so it also follows steps done by hand)
function nextAuto(st){
  const at = st.at || 'pad', to = otherSpot(at);
  if (st.autoMode === 'climb'){
    if (st.sx != null) return 'bolt';
    if (st.ext > 0) return st.climb > 0 ? 'insert' : 'retract';
    return near(st.trolley, TROL_MIN) && aligned2(st, BAL_ANG) ? 'jack' : 'balance';
  }
  if (st.hooked) return st.hookZ < carryZ(st) - .05 && !aligned(st, to) ? 'hoist' : !aligned(st, to) ? 'slewBack' : !atRadius(st, to) ? 'in' : !atPick(st, to) ? 'set' : 'unhook';
  if (st.released) return 'home';                                          // (the hook has just let go of the load: it goes home)
  return !aligned(st, at) ? 'slewTo' : !atRadius(st, at) ? 'out' : !atPick(st, at) ? 'lower' : 'hook';
}
const lastStep = st => st.autoMode === 'climb' ? 'retract' : 'home';
// run a step's beginning (st.s0 / st.tg and the flow directions); returns a message if the limiter cut the move short
function beginStep(st, id){
  st.s0 = { slew: st.slew, trolley: st.trolley, hookZ: st.hookZ };
  const msg = STEPS[id].begin(st);
  st.dirH = st.tg.hookZ != null && st.tg.hookZ < st.s0.hookZ ? 1 : -1; st.dirT = st.tg.trolley != null && st.tg.trolley > st.s0.trolley ? 1 : -1;
  return msg;
}
function endStep(st, id){
  const s = STEPS[id]; if (s.end) s.end(st);
  st.slew = ((st.slew + Math.PI) % TAU + TAU) % TAU - Math.PI;
  if (id !== 'unhook') st.released = false;
  st.act = null; st.pump = 0; st.flowH = st.flowT = 0;
}
// what a move shows while it runs
function applySeg(st, seg){
  st.act = seg.act || null; st.pump = seg.pump ? 1 : 0;
  st.flowH = seg.flow && seg.flow.includes('H') ? 1 : 0; st.flowT = seg.flow && seg.flow.includes('T') ? 1 : 0;
}
// jump to the middle of a step (the URL's ?step=<id>&t=<0..1>): every step of its cycle before it is done, it is t of the way through
function scrub(st, id, t){
  const order = CLIMB_ORDER.includes(id) ? CLIMB_ORDER : WORK_ORDER;
  for (const k of order){
    const last = k === id; beginStep(st, k); const S = STEPS[k], ds = S.segs.map(s => typeof s.d === 'function' ? s.d(st) : s.d), tot = ds.reduce((a, b) => a + b, 0);
    let left = last ? t*tot : tot;
    for (let i = 0; i < S.segs.length; i++){ const u = ds[i] > 0 ? clamp01(left/ds[i]) : 1; applySeg(st, S.segs[i]); S.segs[i].f(st, u); left -= ds[i]; }
    if (last){ if (t >= 1) endStep(st, k); return; }
    endStep(st, k);
  }
}
// which part numbers are working right now (their labels light up)
const ACT = { slew: [5], trolley: [4, 8, 24], hoist: [13, 12, 9], hook: [9], climb: [15, 16, 17], insert: [15, 10], bolt: [15, 10] };
function activeParts(st){
  const a = new Set(); for (const k of [].concat(st.act || [])) for (const n of ACT[k] || []) a.add(n);
  if (momentRatio(st) > .9 || st.over > 0) a.add(19);
  return a;
}
