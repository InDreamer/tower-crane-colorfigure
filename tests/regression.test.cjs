const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const ctx = vm.createContext({ console, addEventListener() {}, document: { getElementById() { return null; } } });
vm.runInContext(read('core.js'), ctx);
for (const f of ['a_base', 'b_tower', 'c_slew', 'd_jib', 'e_counter', 'f_rope', 'f_climb', 'f_loads', 'f_site', 'g_skin', 'g_work', 'h_scene']) vm.runInContext(read(`src/${f}.js`), ctx);
vm.runInContext(read('src/i_ui.js').split('ui = mountFigure({')[0], ctx);
const api = vm.runInContext(`({
  mix, shape, setCam, P, vis, rotV, hull, makeFrames, whyNot, nextAuto, assembled, stateParams, setFrames,
  setOrigin(rc, rcz, ox, oy) { RC = rc; RCZ = rcz; OX = ox; OY = oy; },
  get advanceStep() { return typeof advanceStep === 'undefined' ? null : advanceStep; },
  get axes() { return typeof projectionAxes === 'undefined' ? null : projectionAxes; },
  loadPose, ratedT, maxTrolley, hangT, readouts, hookAnchor, momentRatio, climbing, drumAngH, drumAngT, sheaveAngH, pinionAng, scrub, beginStep, endStep, applySeg, STEPS, WORK_ORDER, CLIMB_ORDER, SPOT, LOAD, ropeNodes, ropeLine, activeParts, lastStep, workState, BLD, loadStyle, hookMin, ruOf: ru0, TROL_AT, pickZ, carryZ, LD_STYLES, LD_RIGS, LD_SIZES, ldNorm, ldParams, ldWhyNot, ldNearest, ldLabel, ldStyle, applyLoad, ldTones, ldStored, ldStore, liftDZ, SWAP_DX, get LSEL() { return LSEL; }, SHK_Z, PAD_H, ROOF_Z, CARRY_Z, STEP_SECS: id => id,
  bboxOf, polysOverlap, orderParts, sepOrder, lblPoint, partFade, LBL, PULL, SYS_OFF, setCamera: setCam,
  applySkin, skinOf, SKINS, lookParams, hexOf, urlHex, lumOf, hsvHex, hexHsv, tuneOf, zoneTones, applyPaint, paintOf, paintNorm, paintParams, paintStored, paintStore, setZone, setSkin, skinDot, skinChoices,
  setUi(st) { ui = { st, flash() {}, invalidate() {} }; }, GST: () => GST,
  get palettes() { return { YEL: { ...YEL }, CABW: { ...CABW }, MOT: { ...MOT } }; },
  consts: () => ({ NPART, NSYS, SYS_TAB, SYSC, SYSN, PNAME, SEC_H, GAP1, GAPT, JZB, JX0, JX1, JBAY, APZ, HZ0, RZ, TROL_SX, TROL_R, TROL_HL, TROL_AZ, TK, HKS, HS_R, HK_PW, GX, GZ, GR, TIPX, TIPZ, TIPR, ANCX, ANCZ, ROPE_R, DRM2, HOIST, TROL_MIN, TROL_MAX, HOOK_MIN, HOOK_MAX, HK_C, REST_Z, TROL_REST, NSEC_MIN, NSEC_MAX, CF_DOWN, PULL: { ...PULL }, SYS_OF: Array.from({ length: NPART + 1 }, (_, n) => SYS_OF(n)) }),
  makeState: () => ({
    p: zeros(), tgt: zeros(), dl: zeros(), E: zeros(),
    sel: -1, subSel: 0, pull: {}, slew: 0, slew0: 0, trolley: TROL_REST, nsec: NSEC_MIN, climb: 0, ...workState(),
    pump: 0, act: null, clock: 0, busy: false, auto: false, autoWait: 0, cur: null, xr: 0, xrT: 0, ld: ldNorm(LD_DEFAULT), swap: null
  }),
  cylinder(a,b,barrel) {
    GST = this.makeState(); setFrames(GST); PARTS = []; use('g', 16);
    return { returned: gCyl(a,b,1,barrel,HYD,{world:true}), parts: PARTS };
  },
  rodPart(a,b,r,r1,sides) {
    GST = this.makeState(); setFrames(GST); PARTS = []; use('g', 16);
    return gR(a,b,r,HYD,.7,{world:true,r1,sides});
  },
  rod(a, b, r) { GST = this.makeState(); setFrames(GST); PARTS = []; use('g', 16); return gR(a, b, r, HYD, .7, { world: true }); },
  // the whole scene's parts, built for a view; patch overrides state fields; every solid remembers the frame it was built in (hose pieces: none)
  sceneAt(yaw, pitch, patch = {}) {
    const st = Object.assign(this.makeState(), patch), op = push;
    GST = st; st.E = st.p.map(v => ease(clamp01(v))); setFrames(st); PARTS = []; setCam(yaw, pitch);
    push = (svg, wp, o) => { const p = op(svg, wp, o); p.fr = CX.fr; return p; };
    try { buildTower(st); buildSlew(st); buildJib(st); buildCounter(st); buildRopes(st); buildClimb(st); buildSite(st); } finally { push = op; }
    const parts = PARTS, ordered = orderParts(parts);
    return { parts, ordered, stats: { ...ORDER_STATS }, view: { R: CAM_R, D: CAM_D, V: CAM_V, s0: P(0, 0, 0), k: CAM_K } };
  },
  get orderStats() { return ORDER_STATS; },
  harness(st) {
    const callbacks = [];
    const flashes = [];
    ui = { st, animate: fn => callbacks.push(fn), flash(t) { flashes.push(t); }, invalidate() {} }; loopOn = false;
    return {
      flashes,
      toggleAuto, explodeAll, collapseAll, doStep, restore4, setLoad, setLoadColor, ldChoices,
      tick(dt) { for (const fn of [...callbacks]) if (fn(dt) === false) callbacks.splice(callbacks.indexOf(fn), 1); },
      get count() { return callbacks.length; }
    };
  }
})`, ctx);
const J = v => JSON.parse(JSON.stringify(v));            // plain objects: values made inside the vm have another Object
const C = api.consts(), N = Array.from({ length: C.NPART }, (_, i) => i + 1);
const ALL_OUT = [0, 1, 1, 1, 1, 1, 1];
const dot3 = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
const avg3 = ps => [0, 1, 2].map(i => ps.reduce((s, p) => s + p[i], 0)/ps.length);

test('mix supports shorthand on either side and clamps interpolation', () => {
  assert.equal(api.mix('#fff', '#000', .5), '#808080');
  assert.equal(api.mix('#323235', '#000', .1), '#2d2d30');
  assert.equal(api.mix('#fff', '#000000', -1), '#ffffff');
  assert.equal(api.mix('#ffffff', '#000', 2), '#000000');
});

test('shape combines fill and outline into one path', () => {
  const points = [[0,0,0], [1,0,0], [0,1,0]];
  const filled = api.shape(points, '#abcdef', 0);
  const outlined = api.shape(points, '#abcdef', 2);
  assert.equal((filled.match(/<path/g) || []).length, 1);
  assert.doesNotMatch(filled, /stroke=/);
  assert.equal((outlined.match(/<path/g) || []).length, 1);
  assert.match(outlined, /fill="#abcdef"/);
  assert.match(outlined, /stroke="#231e16"/);
  assert.match(outlined, /stroke-linecap="round"/);
  assert.match(outlined, /stroke-linejoin="round"/);
});

// how deep two convex solids sit in each other: exact separating-axis test (face planes and edge x edge directions), 0 = apart or touching,
// otherwise the smallest overlap over all axes
const EDGES = new WeakMap();
function edgesOf(p) {
  let e = EDGES.get(p); if (e) return e;
  const n = p.pts.length/2, seen = new Set(), out = [], add = d => { const l = Math.hypot(...d); if (l < 1e-9) return; d = d.map(x => x/l); if (d[0] < -1e-9 || Math.abs(d[0]) < 1e-9 && (d[1] < -1e-9 || Math.abs(d[1]) < 1e-9 && d[2] < 0)) d = d.map(x => -x);
    const k = d.map(x => Math.round(x*1e4)).join(','); if (!seen.has(k)) { seen.add(k); out.push(d); } };
  for (let i = 0; i < n; i++) { const a = p.pts[i], b = p.pts[(i + 1) % n], c = p.pts[n + i], d = p.pts[n + (i + 1) % n];
    add([b[0] - a[0], b[1] - a[1], b[2] - a[2]]); add([d[0] - c[0], d[1] - c[1], d[2] - c[2]]); add([c[0] - a[0], c[1] - a[1], c[2] - a[2]]); }
  EDGES.set(p, out); return out;
}
function depthOf(p, q) {
  let best = Infinity;
  const test = ax => { const l = Math.hypot(...ax); if (l < 1e-7) return true; ax = ax.map(x => x/l);
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (const v of p.pts) { const t = dot3(ax, v); if (t < a0) a0 = t; if (t > a1) a1 = t; }
    for (const v of q.pts) { const t = dot3(ax, v); if (t < b0) b0 = t; if (t > b1) b1 = t; }
    const o = Math.min(a1, b1) - Math.max(a0, b0); if (o <= 0) return false; if (o < best) best = o; return true; };
  for (const [n] of p.planes) if (!test(n)) return 0;
  for (const [n] of q.planes) if (!test(n)) return 0;
  for (const a of edgesOf(p)) for (const b of edgesOf(q)) if (!test([a[1]*b[2] - a[2]*b[1], a[2]*b[0] - a[0]*b[2], a[0]*b[1] - a[1]*b[0]])) return 0;
  return best;
}
const boxHit = (p, q) => p.box[0].every((v, i) => v < q.box[1][i] && q.box[0][i] < p.box[1][i]);

test('the header tables agree with the code: 24 parts in 6 systems, colours, names and every part has a system', () => {
  assert.equal(C.NPART, 24); assert.equal(C.NSYS, 6);
  assert.deepEqual(J(C.SYSC), ['', '#45a33a', '#ef8a1c', '#d9a514', '#3b7be0', '#8a4fd0', '#e0463a']);
  assert.equal(C.PNAME.length, 25); assert.equal(C.SYS_TAB.length, 25); assert.equal(C.SYSN.length, 7);
  for (const n of N) { assert.ok(C.SYS_OF[n] >= 1 && C.SYS_OF[n] <= 6, `part ${n}`); assert.ok(C.PNAME[n].length >= 2); assert.ok(C.PULL[n], `pull ${n}`); }
  for (let k = 1; k <= 6; k++) assert.ok(N.some(n => C.SYS_OF[n] === k), `system ${k} has parts`);
  const s = api.makeState(); for (const key of ['p', 'tgt', 'dl', 'E']) assert.equal(s[key].length, C.NSYS + 1, key);
});

test('slewing parts turn with st.slew while the mast, base and climbing frame do not; the mast does not move with the slew either', () => {
  const st = api.makeState(), a = {}, an = {}, b = {}, bn = {}, rot = (p, t) => [p[0]*Math.cos(t) - p[1]*Math.sin(t), p[0]*Math.sin(t) + p[1]*Math.cos(t), p[2]];
  api.makeFrames(st, [0, 0, 0, 0, 0, 0, 0], a, an); st.slew = Math.PI/2; api.makeFrames(st, [0, 0, 0, 0, 0, 0, 0], b, bn);
  const p = [20, 5, 90], n = [1, 0, 0];
  for (const fr of ['g', 's0', 's1', 's2', 's3', 'lo', 'cf']) { assert.deepEqual(J(b[fr](p)), J(a[fr](p)), fr); assert.deepEqual(J(bn[fr](n)), J(an[fr](n)), fr); }
  for (const fr of ['up', 'su', 'top', 'cab', 'jib', 'cj', 'cw', 'trol', 'hook']) {
    const w = J(b[fr](p)), want = J(a[fr](p)), r = rot(want, Math.PI/2);
    assert.ok(w.every((x, i) => Math.abs(x - r[i]) < 1e-9), `${fr} turns about the tower axis`);
    assert.ok(Math.abs(bn[fr](n)[1] - 1) < 1e-9, `${fr}: normals turn too`);
  }
  // the whole scene: jib points turn by 90 degrees about z, mast and base points do not move
  const s0 = api.sceneAt(35, 35.264), s1 = api.sceneAt(35, 35.264, { slew: Math.PI/2 });
  assert.equal(s0.parts.length, s1.parts.length);
  s0.parts.forEach((q, i) => {
    const r = s1.parts[i], turns = [3, 7, 8, 9, 11, 13, 6, 2, 4, 12, 24].includes(q.n);
    if (q.n === 1 || q.n === 10 || q.n === 15 || q.n === 16 || q.n === 22) q.pts.forEach((v, k) => v.forEach((x, c) => assert.ok(Math.abs(x - r.pts[k][c]) < 1e-9, `part ${q.n} stays`)));
    if (turns) { const w = rot(avg3(q.pts), Math.PI/2), m = avg3(r.pts); assert.ok(w.every((x, c) => Math.abs(x - m[c]) < 1e-7), `part ${q.n} turns`); }
  });
});

test('nsec 4..6: the tower gains one section at a time, everything above rides up 16, nothing overlaps, and the extras build', () => {
  let prevTop = null;
  for (const nsec of [4, 5, 6]) {
    const { parts } = api.sceneAt(35, 35.264, { nsec }), at = n => parts.filter(p => p.n === n);
    const minZ = ps => Math.min(...ps.map(p => p.box[0][2]));
    const top = minZ(at(11));
    if (prevTop !== null) assert.ok(Math.abs(top - prevTop - C.SEC_H) < 1e-9, `top rises one section (${nsec})`);
    prevTop = top;
    assert.ok(Math.abs(top - (90 + (nsec - 4)*C.SEC_H)) < 1e-6, `tower top foot at ${top}`);
    const secs = new Set(parts.filter(p => p.n === 10).map(p => Math.floor((p.box[0][2] - 16 + 1e-6)/C.SEC_H)));
    assert.deepEqual([...secs].sort(), Array.from({ length: nsec }, (_, i) => i), `${nsec} sections`);
    assert.ok(Math.abs(minZ(at(15).filter(p => p.box[1][2] > 70)) - 57.6 - (nsec - 4)*C.SEC_H) < 40, 'climbing frame rides up');
    for (const n of N) assert.ok(at(n).length, `part ${n} at nsec ${nsec}`);
    // sections do not overlap: different sections' pieces never penetrate
    const m = at(10);
    for (let i = 0; i < m.length; i++) for (let j = i + 1; j < m.length; j++) {
      if (m[i].box[1][2] <= m[j].box[0][2] + 1e-6 || m[j].box[1][2] <= m[i].box[0][2] + 1e-6) continue;
      assert.ok(depthOf(m[i], m[j]) < .2, `sections ${nsec}: pieces ${i} and ${j} interpenetrate`);
    }
  }
});

test('state guards reject unknown steps; every step in the order exists', () => {
  const st = api.makeState();
  assert.ok(api.whyNot(st, 'unknown')); assert.ok(api.whyNot(st, '__proto__')); assert.ok(api.whyNot(st, undefined)); assert.ok(api.whyNot(st, 'constructor'));
  for (const id of [...api.WORK_ORDER, ...api.CLIMB_ORDER]) assert.ok(api.STEPS[id] && api.STEPS[id].name && api.STEPS[id].segs.length, id);
  assert.equal(api.whyNot(st, 'slewTo'), null);
  assert.equal(api.WORK_ORDER.length, 10);
});

// run one step to its end through the harness's clock; returns how long it took
function runStep(st, h, id, dt = .05) {
  assert.equal(h.doStep(id), true, `${id} refused: ${api.whyNot(st, id)}`);
  let t = 0; while (st.cur || st.busy) { h.tick(dt); t += dt; assert.ok(t < 30, `${id} never ends`); }
  return t;
}
// press 工作 / 顶升 and run until it stops by itself; log: [{ id, t0, t1 }] for each step; each(st, id) is called on every tick
function runAuto(st, h, mode, each = null, dt = .05) {
  h.toggleAuto(mode); const log = []; let t = 0, cur = null;
  for (let i = 0; i < 4000 && (st.auto || st.cur || st.pending); i++) {
    h.tick(dt); t += dt;
    const id = st.cur && st.cur.id;
    if (id && (!cur || cur.id !== id || cur.t1 !== null)) { cur = { id, t0: t - dt, t1: null }; log.push(cur); }
    if (!id && cur && cur.t1 === null) cur.t1 = t - dt;
    if (each) each(st, id);
  }
  return log;
}
const atSpot = (st, k) => { const lp = api.loadPose(st), s = api.SPOT[k]; return Math.hypot(lp.p[0] - s.x, lp.p[1] - s.y) < 1e-6 && Math.abs(lp.p[2] - s.z) < 1e-6; };

test('the 工作 button runs one whole lift in ten steps, then the next one carries the load back, and the hook ends at rest each time', () => {
  const st = api.makeState(), h = api.harness(st);
  assert.equal(api.nextAuto(st), 'slewTo'); assert.equal(st.at, 'pad'); assert.ok(atSpot(st, 'pad'));
  const L1 = runAuto(st, h, 'work');
  assert.deepEqual(L1.map(l => l.id), ['slewTo', 'out', 'lower', 'hook', 'hoist', 'slewBack', 'in', 'set', 'unhook', 'home']);
  assert.equal(st.auto, false); assert.equal(st.cur, null); assert.equal(st.act, null); assert.equal(st.pump, 0); assert.equal(st.flowH, 0); assert.equal(st.flowT, 0);
  assert.equal(st.at, 'roof'); assert.equal(st.hooked, false); assert.equal(st.sl, 0); assert.ok(atSpot(st, 'roof'), 'the load sits on the building');
  assert.ok(Math.abs(st.hookZ - C.REST_Z) < 1e-9 && Math.abs(st.trolley - C.TROL_REST) < 1e-9, `hook and trolley at rest: ${st.hookZ} ${st.trolley}`);
  const L2 = runAuto(st, h, 'work');
  assert.deepEqual(L2.map(l => l.id), L1.slice(1).map(l => l.id), 'the second lift starts with the jib already over the load, so the first turn is skipped');
  assert.equal(st.at, 'pad'); assert.ok(atSpot(st, 'pad')); assert.ok(Math.abs(st.hookZ - C.REST_Z) < 1e-9 && Math.abs(st.trolley - C.TROL_REST) < 1e-9);
  // every step takes 2.5 to 4 s and there are 0.8 s between two steps
  for (const L of [L1, L2]) L.forEach((l, i) => { const d = l.t1 - l.t0; assert.ok(d >= 2.45 && d <= 4.1, `${l.id} takes ${d.toFixed(2)} s`);
    if (i) assert.ok(Math.abs(l.t0 - L[i - 1].t1 - .8) < .12, `pause before ${l.id}: ${(l.t0 - L[i - 1].t1).toFixed(2)}`); });
  if (process.env.ORDER_REPORT) console.log('step seconds', JSON.stringify(Object.fromEntries(L1.map(l => [l.id, +(l.t1 - l.t0).toFixed(2)]))));
});

test('while a lift runs: the shackle hangs under the trolley, the load follows the hook, an unhooked load stays put, nothing goes into the pad or the building, a slew is slow', () => {
  const st = api.makeState(), h = api.harness(st), frames = s => { const a = {}, b = {}; api.makeFrames(s, [0, 0, 0, 0, 0, 0, 0], a, b); return a; };
  let lowest = 1e9, steps = 0, maxRate = 0, prevSlew = null;
  const each = (s, id) => {
    steps++; if (id === 'slewBack' || id === 'slewTo'){ if (prevSlew !== null) maxRate = Math.max(maxRate, Math.abs(s.slew - prevSlew)/.05); prevSlew = s.slew; } else prevSlew = null;
    const a = api.hookAnchor(s), q = frames(s).hook([C.HK_C[0], 0, api.SHK_Z]);
    assert.ok(Math.hypot(a[0] - q[0], a[1] - q[1]) < 1e-9 && Math.abs(a[2] - q[2]) < 1e-9, `the shackle is where the hook frame puts it (${id})`);
    const lp = api.loadPose(s);
    if (s.hooked) assert.ok(Math.hypot(lp.p[0] - a[0], lp.p[1] - a[1]) < 1e-9 && Math.abs(a[2] - lp.p[2] - api.LOAD.v - api.LOAD.h) < 1e-9, 'a hooked load hangs under the shackle');
    else assert.ok(atSpot(s, s.at), 'an unhooked load stays where it is');
    for (const k of ['pad', 'roof']) { const sp = api.SPOT[k]; if (Math.hypot(lp.p[0] - sp.x, lp.p[1] - sp.y) < 1.5) lowest = Math.min(lowest, lp.p[2] - sp.z); }
  };
  runAuto(st, h, 'work', each); runAuto(st, h, 'work', each);
  assert.ok(steps > 400); assert.ok(lowest > -1e-9, `the load goes ${lowest} into a surface`);
  assert.ok(maxRate < 1.0, `the fastest turn is ${maxRate.toFixed(2)} rad/s (a 125 degree turn takes 4 s)`);
});

// the state in the middle of a step: every step of its cycle before it done, t of the way through it
const midStep = (id, t, patch = {}) => { const st = Object.assign(api.makeState(), patch); api.scrub(st, id, t); return st; };

test('the load sits exactly on the surface at the end of the set-down (gap under 0.05, nothing inside), at both spots, and gets heavy as it leaves the ground', () => {
  for (const to of ['roof', 'pad']) {
    const st = midStep('set', 1, { at: to === 'roof' ? 'pad' : 'roof' });
    assert.equal(st.hooked, true);
    const lp = api.loadPose(st), sp = api.SPOT[to];
    assert.ok(Math.abs(lp.p[2] - sp.z) < .05 && lp.p[2] - sp.z > -1e-9, `gap ${lp.p[2] - sp.z}`);
    assert.ok(Math.hypot(lp.p[0] - sp.x, lp.p[1] - sp.y) < 1e-6);
    const sc = api.sceneAt(35, 35.264, st), L = sc.parts.filter(p => p.fr === 'load' && !p.hose), S = sc.parts.filter(p => p.fr === (to === 'pad' ? 'pad' : 'plat'));
    assert.ok(L.length >= 12 && S.length >= 1); let deep = 0; for (const p of L) for (const q of S) if (boxHit(p, q)) deep = Math.max(deep, depthOf(p, q));
    assert.ok(deep < .05, `load against the surface: ${deep}`);
  }
  const w = [0, .1, .25, .5, 1].map(t => api.hangT(midStep('hoist', t)));
  assert.equal(w[0], 0); assert.ok(w.every((v, i) => !i || v >= w[i - 1] - 1e-12)); assert.ok(Math.abs(w[4] - api.LOAD.t) < 1e-9, `${w}`);
  assert.ok(w[1] > 0 && w[1] < api.LOAD.t, 'it ramps up while it leaves the ground');
});

test('advanceStep keeps the elapsed time across segments, in one big tick or many small ones', () => {
  assert.equal(typeof api.advanceStep, 'function');
  api.STEPS.__t = { name: 't', begin: s => { s.tg = {}; }, segs: [{ d: 1, act: 'slew', f: (s, t) => { s.slew = t; } }, { d: s => 2, act: ['trolley'], flow: 'T', f: (s, t) => { s.trolley = 40 + t*10; } }] };
  try {
    const a = api.makeState(), b = api.makeState();
    for (const st of [a, b]) { api.beginStep(st, '__t'); st.cur = { id: '__t', i: 0, t: 0 }; st.busy = true; }
    api.advanceStep(a, 1.5);
    for (let i = 0; i < 30; i++) api.advanceStep(b, .05);
    for (const key of ['slew', 'trolley', 'busy', 'flowT', 'flowH']) { if (typeof a[key] === 'number') assert.ok(Math.abs(a[key] - b[key]) < 1e-8, key); else assert.equal(a[key], b[key], key); }
    assert.equal(a.slew, 1); assert.ok(a.trolley > 40 && a.trolley < 50, 'in the second segment'); assert.equal(a.flowT, 1);
    const done = api.advanceStep(a, 10); assert.equal(done, '__t'); api.advanceStep(b, 10);
    for (const st of [a, b]) { assert.equal(st.cur, null); assert.equal(st.busy, false); assert.equal(st.act, null); assert.equal(st.pump, 0); assert.equal(st.flowT, 0); assert.equal(st.trolley, 50); }
  } finally { delete api.STEPS.__t; }
});


test('assembly waits for pulled-out parts to return', () => {
  const st = api.makeState(); st.subSel = 3; st.pull[3] = 1;
  assert.equal(api.assembled(st), false);
  st.subSel = 0;
  assert.equal(api.assembled(st), false);
  st.pull[3] = 0;
  assert.equal(api.assembled(st), true);
  st.p[4] = .5; assert.equal(api.assembled(st), false);
});

test('zero and short cylinders contain no non-finite coordinates', () => {
  const zero = api.cylinder([0,0,0], [0,0,0], 13);
  assert.equal(zero.returned.length, 0);
  const short = api.cylinder([0,0,0], [0,0,.2], 13);
  for (const p of short.parts) for (const pt of p.pts) for (const n of pt) assert.ok(Number.isFinite(n));
  assert.ok(short.parts.every(p => p.box[0][2] >= -1e-9));
});


test('projection and visibility match the original math across views', () => {
  const cross = (a,b) => a.reduce((sum, x, i) => sum + x*b[i], 0);
  const basis = (yaw,pitch) => {
    const t = yaw*Math.PI/180, p = pitch*Math.PI/180;
    return { R:[Math.sin(t),-Math.cos(t),0],
      U:[-Math.sin(p)*Math.cos(t),-Math.sin(p)*Math.sin(t),Math.cos(p)],
      V:[Math.cos(p)*Math.cos(t),Math.cos(p)*Math.sin(t),Math.sin(p)] };
  };
  const base = basis(45, Math.atan(1/Math.SQRT2)*180/Math.PI);
  const rc = [86,25], rcz = 36, ox = 17, oy = 22;
  api.setOrigin(rc,rcz,ox,oy);
  for (const yaw of [45,135,225,315]) for (const pitch of [6,35.264,78]) {
    api.setCam(yaw,pitch); const b = basis(yaw,pitch);
    for (const p of [[3,-8,2],[-4,9,12],[0,0,0]]) {
      const q = [p[0]-rc[0],p[1]-rc[1],p[2]-rcz], xy = api.P(...p);
      const expected = [Math.sqrt(1.5)*cross(q,b.R) + (rc[0]-rc[1])*Math.cos(Math.PI/6) + ox,
        -Math.sqrt(1.5)*cross(q,b.U) + (rc[0]+rc[1])*Math.sin(Math.PI/6) - rcz + oy];
      assert.ok(xy.every((n,i) => Math.abs(n - expected[i]) < 1e-10));
    }
    for (const n of [[1,0,0], [0,-1,0], [.1,.2,.3], b.R.map((v,i) => v + b.V[i]*1e-8)]) {
      const r = [0,1,2].map(i => base.R[i]*cross(n,b.R) + base.U[i]*cross(n,b.U) + base.V[i]*cross(n,b.V));
      assert.equal(api.vis(n), r[0]+r[1]+r[2] > 1e-6);
    }
  }
  api.setCam(NaN, Infinity);
  const expected = basis(45, Math.atan(1/Math.SQRT2)*180/Math.PI);
  const q = [3-rc[0],4-rc[1],5-rcz];
  assert.ok(Math.abs(api.P(3,4,5)[0] - (Math.sqrt(1.5)*cross(q,expected.R) + (rc[0]-rc[1])*Math.cos(Math.PI/6) + ox)) < 1e-10);
  api.setOrigin([0,0],0,0,0);
});

test('cylinder support matches rendered 14 and 26 sided rings in four views', () => {
  const dot = (a,b) => a.reduce((sum,n,i) => sum + n*b[i], 0);
  const cross = (a,b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const unit = a => { const l = Math.hypot(...a); return a.map(n => n/l); };
  const a = [1,2,3], b = [5,8,12], d = unit(b.map((n,i) => n-a[i]));
  const u = unit(cross(d, Math.abs(d[2]) < .9 ? [0,0,1] : [1,0,0])), v = cross(d,u);
  for (const sides of [14,26]) {
    const part = api.rodPart(a,b,2,1.2,sides);
    const expected = [];
    for (const [end,r] of [[a,2],[b,1.2]]) for (let i = 0; i < sides; i++) {
      const t = i/sides*2*Math.PI, c = Math.cos(t)*r, s = Math.sin(t)*r;
      const p = end.map((x,k) => x + u[k]*c + v[k]*s);
      expected.push(p);
      assert.ok(part.planes.every(([n,dist]) => dot(n,p) <= dist + 1e-8));
      assert.ok(p.every((n,k) => n >= part.box[0][k] - 1e-8 && n <= part.box[1][k] + 1e-8));
    }
    assert.equal(part.pts.length, expected.length);
    for (let i = 0; i < expected.length; i++)
      assert.ok(expected[i].every((n,k) => Math.abs(n - part.pts[i][k]) < 1e-10));
    for (const yaw of [45,135,225,315]) {
      api.setCam(yaw,35.264);
      const projected = part.pts.map(p => api.P(...p)), axes = api.axes(api.hull(projected));
      for (const p of expected.map(p => api.P(...p))) for (const axis of axes) {
        const d = p[0]*axis.nx + p[1]*axis.ny;
        assert.ok(d >= axis.min - 1e-7 && d <= axis.max + 1e-7, `yaw ${yaw}, ${sides} sides`);
      }
    }
  }
  assert.equal(api.rodPart(a,a,1,1,14), null);
});

test('cached SAT matches uncached overlap and box ordering is stable in four quadrants', () => {
  const rect = (x,y,w,h) => [[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
  const a = rect(0,0,10,10);
  for (const [b,expected] of [[rect(20,0,2,2),false], [rect(8,4,5,5),true], [rect(2,2,3,3),true], [rect(10,0,4,4),false]]) {
    assert.equal(api.polysOverlap(a,b), expected);
    assert.equal(api.polysOverlap(a,b,api.axes(a),api.axes(b)), expected);
  }
  const box = (id,lo,hi) => ({id, box:[lo,hi], pts:
    [lo[0],hi[0]].flatMap(x => [lo[1],hi[1]].flatMap(y => [lo[2],hi[2]].map(z => [x,y,z]))), rank:0});
  for (const yaw of [45,135,225,315]) {
    api.setCam(yaw,35.264);
    for (const [lo,hi] of [[[20,0,0],[25,5,5]], [[4,4,4],[12,12,12]], [[2,2,2],[4,4,4]], [[10,0,0],[20,10,10]]]) {
      const p = box('a',[0,0,0],[10,10,10]), q = box('b',lo,hi);
      const result = Array.from(api.orderParts([p,q]), p => p.id);
      assert.deepEqual(Array.from(api.orderParts([p,q]), p => p.id), result);
      assert.deepEqual([...result].sort(), ['a','b']);
      if (api.polysOverlap(p.hl,q.hl) && api.sepOrder(p,q))
        assert.equal(result[0], api.sepOrder(p,q) < 0 ? 'a' : 'b');
    }
  }
});

test('pausing auto during assembly cancels pending work and manual explode cancels wait', () => {
  const st = api.makeState(); st.sel = 1; st.subSel = 2; st.pull[2] = 1; st.p[1] = st.tgt[1] = 1;
  const h = api.harness(st); h.toggleAuto('work');
  assert.equal(st.pending, 'slewTo'); assert.equal(st.cur, null);
  h.toggleAuto();
  for (let i = 0; i < 100; i++) h.tick(.05);
  assert.equal(st.pending, null); assert.equal(st.cur, null); assert.equal(st.auto, false);
  st.auto = true; st.autoWait = .25; h.explodeAll();
  for (let i = 0; i < 100; i++) h.tick(.05);
  assert.equal(st.auto, false); assert.equal(st.cur, null); assert.equal(st.pending, null);
  assert.deepEqual(J(st.tgt), ALL_OUT);
});

test('pending work waits until pulled parts have actually returned', () => {
  const st = api.makeState(); st.subSel = 2; st.pull[2] = 1;
  const h = api.harness(st);
  assert.equal(h.doStep('slewTo'), false);
  assert.equal(st.pending, 'slewTo');
  assert.equal(st.cur, null);
  h.tick(.2);
  assert.ok(st.pull[2] > .001);
  assert.equal(st.cur, null);
  h.tick(.2);
  assert.ok(st.pull[2] > .001);
  assert.equal(st.cur, null);
  h.tick(.2);
  assert.ok(st.pull[2] < .001);
  assert.equal(st.pending, null);
  assert.equal(st.cur.id, 'slewTo');
});

test('explode and collapse run every system out and back, one after another, and end exactly assembled', () => {
  const st = api.makeState(), h = api.harness(st);
  h.explodeAll();
  assert.deepEqual(J(st.tgt), ALL_OUT);
  const ORD = [5, 3, 4, 2, 6, 1];                       // ropes and hook first, the mast last
  for (let i = 1; i < ORD.length; i++) assert.ok(st.dl[ORD[i]] > st.dl[ORD[i - 1]], `staggered: system ${ORD[i]} after ${ORD[i - 1]}`);
  for (let i = 0; i < 200; i++) h.tick(.05);
  assert.deepEqual(J(st.p), ALL_OUT);
  h.collapseAll();
  for (let i = 0; i < 200; i++) h.tick(.05);
  assert.deepEqual(J(st.p), [0, 0, 0, 0, 0, 0, 0]);
  assert.equal(api.assembled(st), true);
});

test('frames: nothing moves when nothing is taken apart; taking a system apart moves only what it should', () => {
  const st = api.makeState(), a = {}, an = {}, b = {}, bn = {}, z = [0, 0, 0, 0, 0, 0, 0], p = [3, 4, 50];
  api.makeFrames(st, z, a, an);
  const frs = Object.keys(a);
  for (const fr of ['g', 's0', 's1', 's2', 's3', 's4', 's5', 'lo', 'cf', 'up', 'su', 'top', 'cab', 'jib', 'cj', 'cw', 'trol', 'hook', 'load', 'pad', 'plat']) assert.ok(frs.includes(fr), fr);
  const move = e => { const o = {}, on = {}; api.makeFrames(st, e, o, on); return frs.filter(fr => J(o[fr](p)).some((x, i) => Math.abs(x - a[fr](p)[i]) > 1e-9)); };
  assert.deepEqual(move(z), []);
  assert.deepEqual(move([0, 1, 0, 0, 0, 0, 0]).sort(), ['cab', 'cf', 'cj', 'cw', 'hook', 'jib', 'lo', 'su', 'top', 's0', 's1', 's2', 's3', 's4', 's5', 'trol', 'up'].sort());
  assert.deepEqual(move([0, 0, 1, 0, 0, 0, 0]).sort(), ['cab', 'su', 'top'].sort());
  assert.deepEqual(move([0, 0, 0, 1, 0, 0, 0]).sort(), ['hook', 'jib', 'trol']);
  assert.deepEqual(move([0, 0, 0, 0, 1, 0, 0]).sort(), ['cj', 'cw']);
  assert.deepEqual(move([0, 0, 0, 0, 0, 0, 1]), ['cf']);
  assert.deepEqual(move([0, 0, 0, 0, 0, 1, 0]), []);                // the ropes and hook have no frame of their own: their pieces slide as parts
  // sections spread by (i + 1)*GAP1 and everything above rides up by (nsec + 1)*GAP1 (a roomy gap above the top section: the climbing frame hangs there)
  api.makeFrames(st, [0, 1, 0, 0, 0, 0, 0], b, bn);
  for (let i = 0; i < 4; i++) assert.ok(Math.abs(b['s' + i](p)[2] - a['s' + i](p)[2] - (i + 1)*C.GAP1) < 1e-9, `section ${i}`);
  assert.ok(Math.abs(b.up(p)[2] - a.up(p)[2] - (4*C.GAP1 + C.GAPT)) < 1e-9);
  // the trolley rides the jib and the hook hangs under the trolley, whatever the state
  st.trolley = 70; st.hookZ = 30; api.makeFrames(st, z, a, an);
  assert.deepEqual(J(a.trol([0, 0, 85])), [70, 0, 85]);
  assert.deepEqual(J(a.hook([0, 0, 45])), [70, 0, 30]);
});


test('build from outside the project exactly embeds sorted UTF-8 sources', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'crane-build-test-'));
  try {
    const before = read('crane.html');
    execFileSync('python3', [path.join(root, 'mk.py')], { cwd });
    const html = read('crane.html');
    assert.equal(html, before);
    assert.equal(fs.existsSync(path.join(cwd, 'crane.html')), false);
    assert.match(html, /<title>塔式起重机 · 结构拆解图<\/title>/);
    assert.doesNotMatch(html, /truck/i);
    const scripts = [...html.matchAll(/<script>\n([\s\S]*?)<\/script>/g)];
    const names = fs.readdirSync(path.join(root, 'src')).filter(name => name.endsWith('.js')).sort();
    assert.deepEqual(names, ['a_base.js', 'b_tower.js', 'c_slew.js', 'd_jib.js', 'e_counter.js', 'f_climb.js', 'f_loads.js', 'f_rope.js', 'f_site.js', 'g_skin.js', 'g_work.js', 'h_scene.js', 'i_ui.js']);
    assert.equal(scripts.length, 2);
    assert.equal(scripts[0][1], read('core.js') + '\n');
    assert.equal(scripts[1][1], names.map(name => read(path.join('src', name))).join(''));
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

/* ---------- painter's order: ground truth by ray casting, independent of the ordering code ---------- */
// Of every pair that overlaps on screen and does not interpenetrate (all sample rays agree which one is in front),
// the pairs drawn in the wrong order, and the screen area where that happens.
function rayErrors(scene) {
  const { parts, ordered, view } = scene, { R, D, V, s0, k } = view, pos = new Map(ordered.map((p, i) => [p, i]));
  const tmax = (p, a, b) => {
    let t0 = -1e18, t1 = 1e18;
    for (const [n, d] of p.planes) {
      const nv = dot3(n, V), num = d - a*dot3(n, R) - b*dot3(n, D);
      if (nv > 1e-9) t1 = Math.min(t1, num/nv); else if (nv < -1e-9) t0 = Math.max(t0, num/nv); else if (num < 0) return null;
    }
    return t0 > t1 + 1e-7 ? null : t1;
  };
  const clip = (S, C) => {
    let out = S;
    for (let i = 0; i < C.length && out.length; i++) {
      const a = C[i], b = C[(i+1) % C.length], inp = out, side = p => (b[0]-a[0])*(p[1]-a[1]) - (b[1]-a[1])*(p[0]-a[0]);
      out = [];
      for (let j = 0; j < inp.length; j++) {
        const p = inp[j], q = inp[(j+1) % inp.length], sp = side(p), sq = side(q);
        if (sp >= 0) out.push(p);
        if ((sp >= 0) !== (sq >= 0)) { const t = sp/(sp - sq); out.push([p[0] + (q[0]-p[0])*t, p[1] + (q[1]-p[1])*t]); }
      }
    }
    return out;
  };
  const wrong = [];
  let area = 0;
  for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
    const p = parts[i], q = parts[j];
    if (p.sb[3] <= q.sb[1] || q.sb[3] <= p.sb[1] || p.sb[2] <= q.sb[0] || q.sb[2] <= p.sb[0]) continue;
    if (p.seg !== undefined && p.seg === q.seg && Math.abs(i - j) === 1) continue;       // neighbouring pieces of one hose
    if (!api.polysOverlap(p.hl, q.hl)) continue;
    const poly = clip(p.hl, q.hl);
    if (poly.length < 3) continue;
    let ar = 0; for (let t = 0; t < poly.length; t++) { const a = poly[t], b = poly[(t+1) % poly.length]; ar += a[0]*b[1] - b[0]*a[1]; }
    ar = Math.abs(ar)/2; if (ar < .05) continue;
    const m = poly.reduce((s, v) => [s[0] + v[0]/poly.length, s[1] + v[1]/poly.length], [0, 0]);
    let pf = 0, qf = 0;
    for (const v of [m, ...poly.filter((_, t) => t % Math.max(1, Math.floor(poly.length/6)) === 0).map(v => [m[0] + (v[0]-m[0])*.7, m[1] + (v[1]-m[1])*.7])]) {
      const a = (v[0] - s0[0])/k, b = (v[1] - s0[1])/k, tp = tmax(p, a, b), tq = tmax(q, a, b);
      if (tp === null || tq === null) continue;
      if (tp - tq > .2) pf++; else if (tp - tq < -.2) qf++;
    }
    if (pf && qf || !pf && !qf) continue;                                                   // interpenetrating or level: no true order
    if (pos.get(p) < pos.get(q) ? pf : qf) { wrong.push(`${Math.min(p.n, q.n)}-${Math.max(p.n, q.n)}`); area += ar; }
  }
  return { wrong, area };
}
const ORDER_VIEWS = [20, 35, 110, 125, 200, 330].flatMap(yaw => [20, 35.264, 60].map(pitch => [yaw, pitch]));

test('every part is a convex solid whose face planes enclose its own points, ropes and hoses included', () => {
  const states = [{}, { p: [1,1,1,1,1,1,1] }, { slew: 1.2, trolley: 70, hookZ: 30, nsec: 6, climb: .5, pump: 1 }];
  for (const patch of states) {
    const { parts } = api.sceneAt(35, 35.264, patch);
    assert.ok(parts.length > 300 && parts.length < 900, `${parts.length} parts`);      // (was < 800 before the site: pad, building, load and slings add about 50)
    for (const p of parts) {
      assert.ok(p.planes && p.planes.length >= 4, `part ${p.n} has planes`);
      for (const [n, d] of p.planes) for (const v of p.pts) assert.ok(dot3(n, v) <= d + 1e-6, `part ${p.n} point outside its plane`);
    }
    const hoses = parts.filter(p => p.hose);
    assert.ok(hoses.length > 40);
    assert.ok(hoses.every(p => p.seg !== undefined && p.pts.length === 8));
  }
});

test('every part 1..24 appears, belongs to its system, and no system is empty, assembled and taken apart', () => {
  for (const patch of [{}, { p: [1,1,1,1,1,1,1] }]) {
    const { parts } = api.sceneAt(110, 28, patch);
    for (const n of N) assert.ok(parts.some(p => p.n === n), `part ${n} (${C.PNAME[n]}) is drawn`);
    for (const p of parts.filter(p => p.n)) { assert.ok(p.n >= 1 && p.n <= C.NPART, `part number ${p.n}`); assert.equal(p.sys, C.SYS_OF[p.n], `part ${p.n} is in system ${C.SYS_OF[p.n]}`); }
    for (let k = 1; k <= C.NSYS; k++) assert.ok(parts.some(p => p.sys === k), `system ${k}`);
  }
});

test('a crossing pair that no box separates is ordered by the view ray, in every direction', () => {
  // two rods crossing in plan: the second is the higher one at the crossing, though their boxes overlap in x, y and z
  for (const pitch of [20, 35.264, 60]) for (let yaw = 0; yaw < 360; yaw += 30) {
    api.setCam(yaw, pitch);
    const low = api.rod([0, 0, 0], [20, 20, 6], 1), high = api.rod([0, 20, 7], [20, 0, 5], 1);
    assert.equal(api.sepOrder(low, high), 0, 'boxes overlap');
    const ord = api.orderParts([high, low]);
    assert.equal(ord[0], low, `yaw ${yaw} pitch ${pitch}: the higher rod is drawn last`);
  }
});

test('ordering returns each part once and is deterministic', () => {
  for (const [yaw, pitch] of [[35, 35.264], [200, 20]]) {
    const a = api.sceneAt(yaw, pitch), b = api.sceneAt(yaw, pitch, {});
    assert.equal(a.ordered.length, a.parts.length);
    assert.equal(new Set(a.ordered).size, a.parts.length);
    assert.deepEqual(a.ordered.map(p => a.parts.indexOf(p)), b.ordered.map(p => b.parts.indexOf(p)));
  }
});

test('assembled, exploded and slewed scenes have almost no visibly wrong pairs from any side', () => {
  const scenes = { assembled: {}, exploded: { p: [1,1,1,1,1,1,1] }, working: { slew: 1, trolley: 70, hookZ: 30, nsec: 5, climb: .4, pump: 1 },
    xr: { xr: 1 }, sel2: { p: [0,0,1,0,0,0,0], sel: 2 }, sub13: { p: [0,0,0,0,1,0,0], sel: 4, subSel: 13, pull: { 13: 1 } } };
  let pairs = 0, area = 0, views = 0, worst = 0, worstArea = 0, dropped = 0, tiebreak = 0;
  const byScene = {};
  for (const [name, patch] of Object.entries(scenes)) for (const [yaw, pitch] of ORDER_VIEWS.filter(([, p]) => name === 'assembled' || p === 35.264)) {
    const scene = api.sceneAt(yaw, pitch, patch), e = rayErrors(scene);
    views++; pairs += e.wrong.length; area += e.area; dropped += scene.stats.dropped; tiebreak += scene.stats.tiebreak;
    worst = Math.max(worst, e.wrong.length); worstArea = Math.max(worstArea, e.area);
    (byScene[name] = byScene[name] || []).push(e.wrong.length);
  }
  if (process.env.ORDER_REPORT) console.log('per view', JSON.stringify(byScene));
  if (process.env.ORDER_REPORT) console.log('wrong pairs per view', JSON.stringify(Object.fromEntries(Object.entries(byScene).map(([k, v]) => [k, +(v.reduce((a, b) => a + b, 0)/v.length).toFixed(1)]))), 'worst', worst, 'area', +(area/views).toFixed(1), 'dropped', +(dropped/views).toFixed(1), 'tiebreak', +(tiebreak/views).toFixed(1));
  assert.ok(pairs/views < 18, `average wrong pairs ${pairs/views}`);
  assert.ok(area/views < 60, `average wrong area ${area/views}`);
  assert.ok(worst <= 35 && worstArea < 260, `worst view: ${worst} pairs, area ${worstArea}`);
  assert.ok(dropped/views < 30, `average arcs dropped to break cycles ${dropped/views}`);
  assert.ok(tiebreak/views < 40, `average arcs left to the tie-break ${tiebreak/views}`);
});

test('turning the view in small steps changes the order of few overlapping pairs', () => {
  // the order of pairs that overlap on screen is what shows: before the fix ~24 of them swapped per 5 degrees
  let prev = null, swaps = 0, steps = 0;
  for (let yaw = 0; yaw < 180; yaw += 5) {
    const { parts, ordered } = api.sceneAt(yaw, 35.264), pos = new Map(ordered.map((p, i) => [p, i]));
    const cur = new Map();
    for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
      const p = parts[i], q = parts[j];
      if (p.sb[3] <= q.sb[1] || q.sb[3] <= p.sb[1] || p.sb[2] <= q.sb[0] || q.sb[2] <= p.sb[0] || !api.polysOverlap(p.hl, q.hl)) continue;
      cur.set(i*1000 + j, pos.get(p) < pos.get(q));
    }
    if (prev) { steps++; for (const [key, v] of cur) if (prev.has(key) && prev.get(key) !== v) swaps++; }
    prev = cur;
  }
  assert.ok(swaps/steps < 21, `average swaps per step ${swaps/steps}`);
});


/* ---------- the crane's own geometry ---------- */
// the polyline vertices of one rope (its hose pieces in build order): each piece is two rings of four points
function ropeVerts(parts, pick) {
  const pcs = parts.filter(pick), v = [];
  pcs.forEach((p, i) => { const a = avg3(p.pts.slice(0, 4)), b = avg3(p.pts.slice(4)); if (i === 0) v.push(a); else assert.ok(Math.hypot(a[0] - v[v.length - 1][0], a[1] - v[v.length - 1][1], a[2] - v[v.length - 1][2]) < 1e-6, 'rope pieces join end to start'); v.push(b); });
  return v;
}
const onCircle = (v, c) => Math.abs(Math.hypot(v[0] - c[0], v[2] - c[1]) - c[2]) < 1e-6 && Math.abs(v[1]) < 1e-9;
const STATES = [{}, { trolley: 32, hookZ: 76 }, { trolley: 90, hookZ: 20 }, { trolley: 63, hookZ: 33 }];

test('every rope end touches a drum, a sheave or an anchor, and every vertex lies on what the rope turns on', () => {
  const e = C.ROPE_R;
  for (const patch of STATES) {
    const T = patch.trolley ?? 40, HZ = patch.hookZ ?? C.REST_Z, { parts } = api.sceneAt(35, 35.264, patch);
    const circ = {
      drum: [C.HOIST.x, C.HOIST.z, C.HOIST.R + e], apex: [0, C.APZ, 1.7 + e], guide: [C.GX, C.GZ, C.GR + e],
      t1: [T - C.TROL_SX, C.RZ - C.TROL_R, C.TROL_R + e], hook: [T, HZ, C.HS_R + e], t2: [T + C.TROL_SX, C.RZ - C.TROL_R, C.TROL_R + e] };
    const v = ropeVerts(parts, p => p.hose && p.n === 12), key = JSON.stringify(patch);
    assert.ok(v.length > 25, `hoist rope has ${v.length} vertices`);
    assert.ok(onCircle(v[0], circ.drum), `${key}: the rope starts on the drum`);
    const last = v[v.length - 1];
    assert.ok(Math.hypot(last[0] - C.ANCX, last[1], last[2] - (C.ANCZ + e)) < 1e-6, `${key}: ends at the anchor lug`);
    assert.ok(last[0] === C.ANCX && last[2] >= 83 && last[2] <= 85.2, 'the end sits on the lug face');
    const count = {};
    v.slice(0, -1).forEach((p, i) => { const hit = Object.entries(circ).filter(([, c]) => onCircle(p, c)).map(([k]) => k); assert.ok(hit.length >= 1, `${key}: vertex ${i} ${p} is on nothing`); for (const k of hit) count[k] = (count[k] || 0) + 1; });
    for (const k of Object.keys(circ)) assert.ok(count[k] >= (k === 'drum' ? 1 : 2), `${key}: the rope touches the ${k} (${count[k]})`);
    // the sheaves are really there: a solid of that size and place for each circle
    const solid = (n, c, r) => parts.some(p => p.n === n && Math.abs((p.box[0][0] + p.box[1][0])/2 - c[0]) < 1e-6 && Math.abs((p.box[0][2] + p.box[1][2])/2 - c[1]) < 1e-6 && Math.abs(p.box[1][0] - p.box[0][0] - 2*r) < 1e-6 && p.box[1][1] - p.box[0][1] < 5);
    assert.ok(solid(13, circ.drum, C.HOIST.R), 'hoist drum'); assert.ok(solid(11, circ.apex, 1.7), 'apex sheave'); assert.ok(solid(7, circ.guide, C.GR), 'guide sheave');
    assert.ok(solid(8, circ.t1, C.TROL_R) && solid(8, circ.t2, C.TROL_R), 'trolley sheaves'); assert.ok(solid(9, circ.hook, C.HS_R), 'hook sheave');
    // the trolley ropes: bottom of the drum to the trolley's inner end; top of the drum over the tip sheave back to its outer end
    const d2 = [C.DRM2[0], C.DRM2[1], C.DRM2[2] + e], tip = [C.TIPX, C.TIPZ, C.TIPR + e];
    const A = ropeVerts(parts, p => p.hose && p.seg === 'tA'), B = ropeVerts(parts, p => p.hose && p.seg === 'tB');
    assert.ok(onCircle(A[0], d2) && A[0][2] < d2[1], 'A starts at the drum bottom');
    assert.ok(Math.hypot(A[A.length - 1][0] - (T - C.TROL_HL), A[A.length - 1][2] - C.TROL_AZ) < 1e-6, 'A ends on the trolley inner end');
    assert.ok(onCircle(B[0], d2) && B[0][2] > d2[1], 'B starts at the drum top');
    assert.ok(Math.hypot(B[B.length - 1][0] - (T + C.TROL_HL), B[B.length - 1][2] - C.TROL_AZ) < 1e-6, 'B ends on the trolley outer end');
    assert.ok(B.filter(p => onCircle(p, tip)).length >= 4, 'B turns on the tip sheave');
    assert.ok(solid(7, [C.TIPX, C.TIPZ], C.TIPR), 'tip sheave'); assert.ok(solid(4, [C.DRM2[0], C.DRM2[1]], C.DRM2[2]), 'trolley winch drum');
    const tr = parts.filter(p => p.n === 8 && !p.hose);
    assert.ok(tr.some(p => Math.abs(p.box[0][0] - (T - C.TROL_HL)) < 1e-9 && Math.abs(p.box[1][0] - (T + C.TROL_HL)) < 1e-9 && p.box[0][2] <= C.TROL_AZ && p.box[1][2] >= C.TROL_AZ), 'the trolley body has both ends the ropes are tied to');
  }
});

test('the hook block hangs vertically under the trolley sheaves; the falls are vertical', () => {
  for (const patch of STATES) {
    const T = patch.trolley ?? 40, HZ = patch.hookZ ?? C.REST_Z, { parts } = api.sceneAt(110, 20, patch);
    const plates = parts.filter(p => p.n === 9 && Math.abs(p.box[1][0] - p.box[0][0] - C.HK_PW[0]*2) < 1e-9 && Math.abs(p.box[1][1] - p.box[0][1] - .6*C.HKS) < 1e-9);
    assert.equal(plates.length, 2, 'two plates');
    for (const p of plates) { assert.ok(Math.abs((p.box[0][0] + p.box[1][0])/2 - T) < 1e-9, 'plate centred under the trolley'); assert.ok(Math.abs(p.box[0][2] - (HZ - C.HK_PW[1])) < 1e-9 && Math.abs(p.box[1][2] - (HZ + C.HK_PW[2])) < 1e-9, 'at the hook height'); }
    assert.ok(Math.abs(plates[0].box[0][1] + plates[1].box[1][1]) < 1e-9 || Math.abs(plates[0].box[1][1] + plates[1].box[0][1]) < 1e-9, 'plates symmetric about the rope plane');
    const hoists = parts.filter(p => p.hose && p.n === 12), falls = hoists.filter(p => { const a = avg3(p.pts.slice(0, 4)), b = avg3(p.pts.slice(4)); return Math.abs(a[2] - b[2]) > 4 && Math.abs(a[0] - b[0]) < C.TROL_SX; });
    assert.equal(falls.length, 2, `${JSON.stringify(patch)}: two falls`);
    for (const f of falls) { const a = avg3(f.pts.slice(0, 4)), b = avg3(f.pts.slice(4)); assert.ok(Math.abs(a[0] - b[0])/Math.abs(a[2] - b[2]) < .03, 'vertical within a hair'); assert.ok(a[0] > T - C.TROL_SX && a[0] < T + C.TROL_SX && b[0] > T - C.TROL_SX && b[0] < T + C.TROL_SX, 'between the sheaves of the trolley and the hook'); }
    // the hook is lower than the sheave and nothing of it is above the trolley
    const hk = parts.filter(p => p.n === 9 && !p.hose); assert.ok(Math.max(...hk.map(p => p.box[1][2])) <= HZ + C.HK_PW[2] + 1e-9); assert.ok(Math.min(...hk.map(p => p.box[0][2])) < HZ - 8*C.HKS);
  }
});

test('the trolley wheels sit on the jib bottom chords at every trolley position', () => {
  for (let T = C.TROL_MIN; T <= C.TROL_MAX; T += 6.6) {
    const { parts } = api.sceneAt(35, 35.264, { trolley: T }), wheels = parts.filter(p => p.n === 8 && Math.abs(p.box[1][0] - p.box[0][0] - 1.8*C.TK) < .01 && Math.abs(p.box[1][2] - p.box[0][2] - 1.8*C.TK) < .1 && Math.abs(p.box[1][1] - p.box[0][1] - .7*C.TK) < 1e-9);
    assert.equal(wheels.length, 4, 'four wheels');
    const bars = parts.filter(p => p.n === 7 && !p.hose && Math.abs(p.box[1][2] - C.JZB) < 1e-9 && p.box[0][2] < C.JZB - .5);
    assert.ok(bars.length >= 10, 'bottom chord pieces');
    for (const w of wheels) {
      assert.ok(Math.abs(w.box[0][2] - C.JZB) < .05, `wheel bottom at the chord top: ${w.box[0][2]}`);
      const cx = (w.box[0][0] + w.box[1][0])/2; assert.ok([T - 3*C.TK, T + 3*C.TK].some(x => Math.abs(x - cx) < 1e-9), 'wheel x');
      assert.ok(bars.some(b => b.box[0][0] < w.box[1][0] && w.box[0][0] < b.box[1][0] && b.box[0][1] <= w.box[0][1] + 1e-9 && b.box[1][1] >= w.box[1][1] - 1e-9), `wheel at x ${cx.toFixed(1)} has a chord under it`);
    }
    // the trolley's sheaves and basket hang below the chord, the body above it
    for (const p of parts.filter(q => q.n === 8 && q.box[0][2] > C.JZB)) assert.ok(p.box[0][0] >= T - 4.7*C.TK && p.box[1][0] <= T + 4.7*C.TK);
  }
});

test('mounted parts sit on each other without going into each other', () => {
  const { parts } = api.sceneAt(35, 35.264);
  const pairs = [[6, 5], [13, 3], [18, 3], [2, 3], [4, 7], [8, 7], [11, 5], [19, 11], [20, 11], [21, 11], [16, 15], [17, 15], [23, 3], [14, 7], [13, 18], [5, 5]];
  for (const [a, b] of pairs) {
    const A = parts.filter(p => p.n === a && !p.hose && !p.shell), B = parts.filter(p => p.n === b && !p.hose && !p.shell), bad = [];
    for (const p of A) for (const q of B) { if (p === q || !boxHit(p, q)) continue; const d = depthOf(p, q); if (d > .3) bad.push(d.toFixed(2) + ' ' + JSON.stringify(p.box.map(r => r.map(x => +x.toFixed(1)))) + ' vs ' + JSON.stringify(q.box.map(r => r.map(x => +x.toFixed(1))))); }
    assert.equal(bad.length, 0, `parts ${a} and ${b}: ${bad.slice(0, 3).join(' | ')}`);
  }
});

test('nothing in the whole crane interpenetrates by more than a hair', () => {
  // allowed: the cab shell around its own insides, and clevis joints where a tie bar ends inside its lug plate or sleeve (up to a bar's width)
  const JOINT = new Set(['11-14', '11-23', '14-14', '23-23']);
  for (const patch of [{}, { slew: 1.1, trolley: 75, hookZ: 30, nsec: 5, climb: .6 }]) {
    const { parts } = api.sceneAt(35, 35.264, patch), bad = {};
    for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
      const p = parts[i], q = parts[j];
      if (p.shell || q.shell || !boxHit(p, q)) continue;
      if (p.hose && q.hose && p.seg === q.seg) continue;
      const k = `${Math.min(p.n, q.n)}-${Math.max(p.n, q.n)}`, d = depthOf(p, q); if (d <= (JOINT.has(k) ? 1 : .5)) continue;
      (bad[k] = bad[k] || []).push(d);
    }
    assert.deepEqual(Object.keys(bad), [], `deep overlaps ${Object.entries(bad).map(([k, v]) => `${k}:${v.length}(${Math.max(...v).toFixed(2)})`).join(' ')}`);
  }
});

/* ---------- 涂装: the paint ---------- */
const HEX = /^#[0-9a-f]{6}$/;
const ORIGINAL_PAINT = {          // the reference crane's colours (yellow lattice, white cab, blue motors)
  YEL: { l:'#ffd34d', m:'#f3b11b', d:'#b6760b' }, CABW: { l:'#fbfaf5', m:'#e4e4dd', d:'#bfc2bc' }, MOT: { l:'#5d9be8', m:'#2f6fcb', d:'#1b3f86' } };
const svgOf = p => p.svg.replace(/\bk\d+\b/g, 'k');            // clip ids count up with every build
const sceneSvg = scene => scene.parts.map(svgOf).join('');
test.afterEach(() => { api.applySkin('classic'); });

test('the default skin is the reference paint, value for value, and nothing else is repainted', () => {
  assert.deepEqual(J(api.palettes), ORIGINAL_PAINT);
  assert.equal(api.applySkin('classic'), 'classic');
  assert.deepEqual(J(api.palettes), ORIGINAL_PAINT);
  assert.equal(api.SKINS[0].id, 'classic');
  assert.ok(api.SKINS.length >= 1);
  assert.equal(new Set(api.SKINS.map(s => s.id)).size, api.SKINS.length);
  assert.deepEqual(J(api.paintOf('classic')), { tower: '#f3b11b', cab: '#e4e4dd', motor: '#2f6fcb' });
  assert.equal(api.skinDot({ skin: 'classic', paint: {} }), '#f3b11b');
});

test('every skin has complete valid palettes, repaints the scene and can be taken off again', () => {
  const classic = sceneSvg(api.sceneAt(35, 35.264));
  for (const sk of api.SKINS) {
    assert.equal(api.applySkin(sk.id), sk.id);
    const pal = J(api.palettes);
    for (const key of ['YEL', 'CABW', 'MOT']) for (const tone of ['l', 'm', 'd']) assert.match(pal[key][tone], HEX, `${sk.id} ${key}.${tone}`);
    assert.match(sk.dot, HEX);
    assert.ok(sk.name.length >= 2);
    for (const [yaw, patch] of [[35, {}], [200, { slew: 2 }], [120, { p: [1,1,1,1,1,1,1] }]]) {
      const scene = api.sceneAt(yaw, 35.264, patch), svg = sceneSvg(scene);
      assert.ok(scene.parts.length > 300, `${sk.id}: renders`);
      assert.doesNotMatch(svg, /NaN|undefined/);
    }
    const svg = sceneSvg(api.sceneAt(35, 35.264));
    if (sk.id === 'classic') assert.equal(svg, classic);
    else assert.notEqual(svg, classic, `${sk.id} looks different`);
    assert.deepEqual(J(vm.runInContext('SYSC', ctx)), ['', '#45a33a', '#ef8a1c', '#d9a514', '#3b7be0', '#8a4fd0', '#e0463a']);
  }
  api.applySkin('classic');
  assert.equal(sceneSvg(api.sceneAt(35, 35.264)), classic);
});

test('an unknown skin falls back to the reference paint; ?skin is validated', () => {
  api.applyPaint({ tower: '#7b3fe4', cab: '#e8348c', motor: '#a8e63c' });
  for (const bad of ['', 'nope', undefined, null, '__proto__', 'CLASSIC', 7]) {
    assert.equal(api.applySkin(bad), 'classic', String(bad));
    assert.deepEqual(J(api.palettes), ORIGINAL_PAINT);
    api.applyPaint({ tower: '#7b3fe4', cab: '#e8348c', motor: '#a8e63c' });
  }
  const look = qs => { const st = api.makeState(); api.lookParams(st, new URLSearchParams(qs)); return st; };
  assert.equal(look('skin=classic').skin, 'classic');
  assert.equal(look('skin=bad').skin, 'classic');
  assert.deepEqual(J(api.palettes), ORIGINAL_PAINT);
  assert.equal(look('').skin, 'classic');
});

const lum = c => api.lumOf(c);
const CUSTOM_SAMPLES = ['#000000', '#010101', '#111111', '#ffffff', '#fefefe', '#f4f4f4', '#808080', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff',
  '#7b3fe4', '#e8348c', '#a8e63c', '#5fa43c', '#331a00', '#0a0a2a', '#fffff0', '#102030', '#d0d0d0', '#f8f8f8',
  ...Array.from({ length: 36 }, (_, i) => [api.hsvHex(i*10, 1, 1), api.hsvHex(i*10, .15, 1), api.hsvHex(i*10, 1, .15), api.hsvHex(i*10, .5, .5)]).flat()];

test('hex parsing normalises #rgb / #rrggbb with or without # and rejects everything else', () => {
  for (const [input, want] of [['#ff8800', '#ff8800'], ['FF8800', '#ff8800'], ['#F80', '#ff8800'], ['f80', '#ff8800'], [' #AbCdEf ', '#abcdef'], ['#000', '#000000']])
    assert.equal(api.hexOf(input), want, input);
  for (const bad of ['', '#', '#12', '#1234', '#12345', '#1234567', 'ff880', 'gg0000', '#ff 880', 'rgb(1,2,3)', 'red', null, undefined, 12, {}, ['#fff']])
    assert.equal(api.hexOf(bad), null, String(bad));
  // URL colours are the full six digits only (a 3-digit ?lift=100 stays the mechanism's state)
  assert.equal(api.urlHex('ff8800'), '#ff8800');
  assert.equal(api.urlHex('#FF8800'), '#ff8800');
  for (const bad of ['f80', '100', '1', '#12345', '1234567', 'xyzxyz', '', null]) assert.equal(api.urlHex(bad), null, String(bad));
});

test('HSV and hex convert both ways without drifting', () => {
  assert.equal(api.hsvHex(0, 1, 1), '#ff0000');
  assert.equal(api.hsvHex(120, 1, 1), '#00ff00');
  assert.equal(api.hsvHex(240, 1, 1), '#0000ff');
  assert.equal(api.hsvHex(360, 1, 1), '#ff0000');
  assert.equal(api.hsvHex(77, 0, 1), '#ffffff');
  assert.equal(api.hsvHex(77, .5, 0), '#000000');
  assert.deepEqual(J(api.hexHsv('#808080')), { h: 0, s: 0, v: 128/255 });
  for (let i = 0; i < 20000; i++) {
    const hex = '#' + (Math.floor(Math.random()*0x1000000)).toString(16).padStart(6, '0'), c = api.hexHsv(hex);
    assert.ok(c.h >= 0 && c.h < 360 && c.s >= 0 && c.s <= 1 && c.v >= 0 && c.v <= 1, hex);
    assert.equal(api.hsvHex(c.h, c.s, c.v), hex);
  }
});


test('derived tri-tones are valid hex and ordered light > mid > dark by luminance, for extreme colours too', () => {
  for (const c of CUSTOM_SAMPLES) for (const z of ['tower', 'cab', 'motor']) {
    const tones = J(api.zoneTones(z, c));
    assert.equal(tones.length, 1);
    for (const t of tones) {
      for (const k of ['l', 'm', 'd']) assert.match(t[k], HEX, `${c} ${z}.${k}`);
      assert.ok(lum(t.l) - lum(t.m) > .03, `${c} ${z}: light ${t.l} vs mid ${t.m}`);
      assert.ok(lum(t.m) - lum(t.d) > .03, `${c} ${z}: mid ${t.m} vs dark ${t.d}`);
    }
  }
  // the extremes are spread wide enough to read, not just ordered
  const black = J(api.zoneTones('tower', '#000000'))[0], white = J(api.zoneTones('tower', '#ffffff'))[0];
  assert.ok(lum(black.l) - lum(black.m) > .25, `black: ${JSON.stringify(black)}`);
  assert.ok(lum(white.m) - lum(white.d) > .25, `white: ${JSON.stringify(white)}`);
  assert.ok(lum(black.m) > 0 && lum(white.m) < 1);
  // an ordinary colour keeps its own value as the mid tone
  for (const c of ['#7b3fe4', '#e8348c', '#a8e63c', '#4c9be0']) assert.equal(J(api.zoneTones('tower', c))[0].m, c);
  // a colour that is some preset's own zone colour keeps that preset's hand-tuned tones
  assert.deepEqual(J(api.zoneTones('tower', '#f3b11b')), [ORIGINAL_PAINT.YEL]);
  assert.deepEqual(J(api.zoneTones('cab', '#e4e4dd')), [ORIGINAL_PAINT.CABW]);
  assert.deepEqual(J(api.zoneTones('motor', '#2f6fcb')), [ORIGINAL_PAINT.MOT]);
});

test('paintOf gives each preset its zone colours; applying them back reproduces the preset', () => {
  for (const sk of api.SKINS) {
    const p = J(api.paintOf(sk.id));
    assert.deepEqual(p, { tower: sk.YEL.m, cab: sk.CABW.m, motor: sk.MOT.m });
    for (const v of Object.values(p)) assert.match(v, HEX);
    api.applySkin(sk.id); const preset = J(api.palettes);
    assert.equal(api.applyPaint(p), 'custom');
    assert.deepEqual(J(api.palettes), preset, sk.id);
  }
  assert.deepEqual(J(api.paintOf('nope')), J(api.paintOf('classic')));
  assert.deepEqual(J(api.paintOf(undefined)), { tower: '#f3b11b', cab: '#e4e4dd', motor: '#2f6fcb' });
});

test('a custom paint repaints only the tower, cab and motors; each zone changes its own parts and nothing else', () => {
  const SYSC0 = J(vm.runInContext('SYSC', ctx)), others = () => J(vm.runInContext('({ CONC, CWT, ROPE, HKY, HKB, HYD, STL, DKS, RED, ALU, RUB, AMB, GLASS, INK })', ctx)), others0 = others();
  const PAINTED = new Set([1, 3, 4, 5, 6, 7, 8, 10, 11, 13, 14, 15, 17, 18, 19, 20, 21, 22, 23]);       // the parts that carry the yellow, the white or the blue somewhere
  for (const [yaw, patch] of [[35, {}], [120, { slew: 1 }], [200, { p: [1, 1, 1, 1, 1, 1, 1] }], [300, { nsec: 6, trolley: 80, hookZ: 30 }]]) {
    api.applySkin('classic');
    const ps = api.sceneAt(yaw, 35.264, patch).parts, classic = ps.map(svgOf);
    assert.equal(api.applyPaint({ tower: '#7b3fe4', cab: '#e8348c', motor: '#a8e63c' }), 'custom');
    const custom = api.sceneAt(yaw, 35.264, patch).parts.map(svgOf);
    assert.equal(custom.length, classic.length);
    let changed = 0;
    custom.forEach((svg, i) => {
      assert.doesNotMatch(svg, /NaN|undefined/);
      if (svg === classic[i]) return;
      changed++;
      assert.ok(PAINTED.has(ps[i].n), `part ${ps[i].n} changed but it is not painted with the crane's paint`);
    });
    assert.ok(changed > 150, `${yaw}: ${changed} parts repainted`);
    assert.ok(changed < classic.length - 60, `${yaw}: ropes, ballast, steel and the rest keep their colour (${changed} of ${classic.length})`);
    assert.deepEqual(J(vm.runInContext('SYSC', ctx)), SYSC0);
    assert.deepEqual(others(), others0);
  }
  // the three zones are independent: change only the cab and only the cab's parts change; the motors likewise
  const base = { tower: '#7b3fe4', cab: '#e8348c', motor: '#a8e63c' };
  const scene = p => { api.applyPaint(p); const sc = api.sceneAt(35, 35.264); return { svg: sc.parts.map(svgOf), ns: sc.parts.map(q => q.n), pal: J(api.palettes) }; };
  const a = scene(base);
  for (const [z, key, other, own] of [['cab', 'CABW', ['YEL', 'MOT'], [6, 7]], ['motor', 'MOT', ['YEL', 'CABW'], [4, 5, 13, 17]], ['tower', 'YEL', ['CABW', 'MOT'], [...PAINTED]]]) {
    const b = scene({ ...base, [z]: '#33aaff' });
    for (const k of other) assert.deepEqual(b.pal[k], a.pal[k], `${z}: ${k} untouched`);
    assert.notDeepEqual(b.pal[key], a.pal[key]);
    let n = 0;
    b.svg.forEach((svg, i) => { if (svg !== a.svg[i]) { n++; assert.ok(own.includes(b.ns[i]), `${z}: part ${b.ns[i]} should not change`); } });
    assert.ok(n >= (z === 'tower' ? 150 : 3), `${z}: ${n} parts changed`);
  }
  // and back to a preset: the scene is the preset's again, value for value
  api.applySkin('classic'); assert.deepEqual(J(api.palettes), ORIGINAL_PAINT);
});

test('every colour renders a whole scene (no NaN, valid fills), even pure black and white', () => {
  for (const c of ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff']) {
    api.applyPaint({ tower: c, cab: c, motor: c });
    const svg = sceneSvg(api.sceneAt(35, 35.264));
    assert.doesNotMatch(svg, /NaN|undefined/);
    for (const m of svg.matchAll(/fill="(#[^"]*)"/g)) assert.match(m[1], /^#[0-9a-f]{6}$/, c);
  }
});

test('?tower ?cab ?motor make a custom paint on top of ?skin; invalid values fall back silently', () => {
  const look = qs => { const st = api.makeState(); api.lookParams(st, new URLSearchParams(qs)); return J({ skin: st.skin, paint: st.paint, pal: api.palettes }); };
  const base = { tower: '#f3b11b', cab: '#e4e4dd', motor: '#2f6fcb' };
  assert.deepEqual(look('tower=ff8800').paint, { ...base, tower: '#ff8800' });
  assert.equal(look('tower=ff8800').skin, 'custom');
  assert.deepEqual(look('tower=%23FF8800&cab=%2333aaff&motor=123456').paint, { tower: '#ff8800', cab: '#33aaff', motor: '#123456' });
  assert.deepEqual(look('motor=%232244AA').paint, { ...base, motor: '#2244aa' });
  assert.deepEqual(look('skin=classic&cab=ffffff').paint, { ...base, cab: '#ffffff' });
  assert.deepEqual(look('skin=nope&cab=ffffff').paint, { ...base, cab: '#ffffff' });
  assert.equal(look('tower=ff8800').pal.YEL.m, '#ff8800');
  assert.equal(look('cab=ffffff').pal.YEL.m, '#f3b11b');            // unnamed zones keep the base paint
  // invalid: the zone keeps the base colour; with nothing valid at all it is the plain preset
  assert.deepEqual(look('tower=zzzzzz&cab=ffffff').paint, { ...base, cab: '#ffffff' });
  for (const q of ['tower=zz', 'tower=', 'tower=12345', 'tower=1234567', 'tower=%23', 'tower=f80', 'cab=null', 'motor=0.5', 'tower=red&cab=rgb(1,2,3)']) {
    const r = look(q); assert.equal(r.skin, 'classic', q); assert.deepEqual(r.paint, base, q); assert.deepEqual(r.pal, ORIGINAL_PAINT, q);
  }
  assert.equal(look('').skin, 'classic');
  assert.equal(look('').paint.tower, '#f3b11b');
});

test('the picker edits: first edit turns the crane custom, a preset afterwards resets the picker colours, storage is only written on commit', () => {
  const writes = []; ctx.localStorage = { getItem: () => null, setItem: (k, v) => writes.push([k, v]) };
  try {
    const st = api.makeState(); api.lookParams(st, new URLSearchParams('skin=classic')); api.setUi(st);
    assert.deepEqual([st.skin, st.paint.tower], ['classic', '#f3b11b']);
    assert.equal(api.skinDot(st), '#f3b11b');
    api.setZone('cab', '#336699');
    assert.deepEqual([st.skin, J(st.paint)], ['custom', { tower: '#f3b11b', cab: '#336699', motor: '#2f6fcb' }]);
    assert.equal(api.palettes.CABW.m, '#336699');
    assert.equal(api.palettes.YEL.m, '#f3b11b');
    assert.deepEqual(J(api.palettes).MOT, ORIGINAL_PAINT.MOT);        // the zones that were not edited keep the preset's own tones
    api.setZone('tower', '#102030'); assert.equal(api.skinDot(st), '#102030');
    for (let i = 0; i < 50; i++) api.setZone('tower', api.hsvHex(i*7, 1, 1));
    assert.equal(writes.length, 0, 'dragging does not write storage');
    api.paintStore(st); assert.equal(writes.length, 1);
    assert.equal(writes[0][0], 'tower-crane.paint');
    assert.deepEqual(JSON.parse(writes[0][1]), { skin: 'custom', paint: J(st.paint) });
    api.setSkin('classic', true);
    assert.deepEqual([st.skin, J(st.paint)], ['classic', J(api.paintOf('classic'))]);
    assert.equal(writes.length, 2);
    assert.deepEqual(JSON.parse(writes[1][1]), { skin: 'classic', paint: J(api.paintOf('classic')) });
    assert.deepEqual(J(api.palettes), ORIGINAL_PAINT);
    // the preset list has a heading and a chip each; none is current while custom
    const items = api.skinChoices(st); assert.deepEqual(J(items[0]), { heading: '预设' }); assert.equal(items.length, api.SKINS.length + 1);
    assert.equal(items.filter(c => c.current).length, 1);
    api.setZone('motor', '#ffffff'); assert.equal(api.skinChoices(st).filter(c => c.current).length, 0);
  } finally { delete ctx.localStorage; }
});

test('storage round trip, garbage and blocked storage', () => {
  const mem = {}, fake = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } };
  const look = qs => { const st = api.makeState(); api.lookParams(st, new URLSearchParams(qs)); return J({ skin: st.skin, paint: st.paint, yel: api.palettes.YEL.m }); };
  ctx.localStorage = fake;
  try {
    // custom colours survive a round trip
    const st = api.makeState(); st.skin = 'custom'; st.paint = { tower: '#ff8800', cab: '#33aaff', motor: '#123456' };
    api.paintStore(st);
    assert.deepEqual(J(api.paintStored()), { skin: 'custom', paint: st.paint });
    assert.deepEqual(look(''), { skin: 'custom', paint: st.paint, yel: '#ff8800' });
    assert.equal(look('skin=classic').skin, 'classic');                  // the URL wins over storage
    assert.deepEqual(look('tower=00ff00').paint, { tower: '#00ff00', cab: '#e4e4dd', motor: '#2f6fcb' });
    // a preset round trip
    st.skin = 'classic'; api.paintStore(st); assert.deepEqual(look(''), { skin: 'classic', paint: J(api.paintOf('classic')), yel: '#f3b11b' });
    // garbage in the key is ignored; a half-valid custom paint is repaired zone by zone
    for (const junk of ['', 'not json {', 'null', '[]', '7', '"classic"', '{"skin":"nope"}', '{"skin":42}', '{}', '{"skin":"__proto__"}', 'undefined']) {
      for (const k in mem) delete mem[k];
      mem['tower-crane.paint'] = junk; const r = look(''); assert.equal(r.skin, 'classic', junk); assert.equal(r.yel, '#f3b11b', junk);
      assert.equal(api.paintStored(), null, junk);
    }
    mem['tower-crane.paint'] = '{"skin":"custom","paint":{"tower":"#ABCDEF","cab":"zz","motor":7}}';
    assert.deepEqual(look('').paint, { tower: '#abcdef', cab: '#e4e4dd', motor: '#2f6fcb' });
    mem['tower-crane.paint'] = '{"skin":"custom","paint":"x"}';
    assert.deepEqual([look('').skin, look('').paint.tower], ['custom', '#f3b11b']);
    // a stored preset takes the picker colours of that preset, whatever paint the entry carries
    mem['tower-crane.paint'] = '{"skin":"classic","paint":{"tower":"#ff0000"}}';
    assert.deepEqual(look('').paint, J(api.paintOf('classic')));
  } finally { delete ctx.localStorage; }
  // blocked storage (the accessor throws) and a storage whose calls throw: everything still works, nothing throws
  Object.defineProperty(ctx, 'localStorage', { get() { throw new Error('blocked'); }, configurable: true });
  try {
    assert.equal(api.paintStored(), null);
    assert.doesNotThrow(() => api.paintStore({ skin: 'custom', paint: { tower: '#ff8800', cab: '#ffffff', motor: '#000000' } }));
    assert.equal(look('').skin, 'classic');
    assert.equal(look('tower=ff8800').skin, 'custom');
  } finally { delete ctx.localStorage; }
  ctx.localStorage = { getItem() { throw new Error('boom'); }, setItem() { throw new Error('full'); } };
  try {
    assert.equal(api.paintStored(), null); assert.doesNotThrow(() => api.paintStore({ skin: 'classic', paint: {} })); assert.equal(look('skin=classic').skin, 'classic');
  } finally { delete ctx.localStorage; }
  assert.equal(api.paintStored(), null);                                // no storage at all
});

test('?slew ?trolley ?hookZ ?nsec ?climb are validated like the colours: a bad value keeps the default, a good one is clamped', () => {
  const look = qs => { const st = api.makeState(); api.stateParams(st, new URLSearchParams(qs)); return st; };
  const d = look('');
  assert.deepEqual([d.slew, d.trolley, d.hookZ, d.nsec, d.climb], [0, 40, C.REST_Z, 4, 0]);
  assert.ok(Math.abs(look('slew=90').slew - Math.PI/2) < 1e-12);
  assert.ok(Math.abs(look('slew=-45').slew + Math.PI/4) < 1e-12);
  assert.equal(look('trolley=70').trolley, 70);
  assert.equal(look('trolley=5').trolley, C.TROL_MIN); assert.equal(look('trolley=500').trolley, C.TROL_MAX);
  assert.equal(look('hookZ=10').hookZ, C.HOOK_MIN); assert.equal(look('hookZ=999').hookZ, C.HOOK_MAX); assert.equal(look('hookZ=33').hookZ, 33);
  assert.equal(look('nsec=5').nsec, 5); assert.equal(look('nsec=6').nsec, 6);
  assert.equal(look('climb=.5').climb, .5); assert.equal(look('climb=7').climb, 1); assert.equal(look('climb=-3').climb, 0);
  for (const q of ['slew=', 'slew=abc', 'slew=NaN', 'slew=Infinity', 'trolley=', 'trolley=x', 'hookZ=--1', 'nsec=3', 'nsec=7', 'nsec=4.5', 'nsec=', 'nsec=abc', 'climb=', 'climb=x']) {
    const s = look(q); assert.deepEqual([s.slew, s.trolley, s.hookZ, s.nsec, s.climb], [0, 40, C.REST_Z, 4, 0], q);
  }
  // every accepted state builds a whole scene with no NaN
  for (const patch of [{ slew: Math.PI*1.5, trolley: C.TROL_MAX, hookZ: C.HOOK_MIN, nsec: 6, climb: 1 }, { trolley: C.TROL_MIN, hookZ: C.HOOK_MAX, nsec: 5 }]) {
    const svg = sceneSvg(api.sceneAt(60, 30, patch)); assert.doesNotMatch(svg, /NaN|undefined/);
  }
});



/* ---------- stage 2: taking apart, pulling parts, see-through, labels ---------- */
const ALL1 = [1, 1, 1, 1, 1, 1, 1], ACCESSORY = new Set([19, 20, 21]);        // small gear that sits on other systems (tower top) and rides with its carrier
const bboxBy = (parts, key, skip = () => false) => { const bb = {};
  for (const p of parts) { if (skip(p)) continue; const b = bb[key(p)] = bb[key(p)] || [[1e9, 1e9, 1e9], [-1e9, -1e9, -1e9]]; for (let k = 0; k < 3; k++) { b[0][k] = Math.min(b[0][k], p.box[0][k]); b[1][k] = Math.max(b[1][k], p.box[1][k]); } }
  return bb; };
const apart = (a, b) => [0, 1, 2].some(k => a[1][k] <= b[0][k] || b[1][k] <= a[0][k]);

test('fully taken apart, no two systems share any space (the tower-top gear rides with its carrier), at every mast height', () => {
  for (const patch of [{ p: ALL1 }, { p: ALL1, nsec: 6 }, { p: ALL1, nsec: 5, climb: 1 }, { p: ALL1, slew: 1.3, trolley: 80, hookZ: 30 }]) {
    const { parts } = api.sceneAt(35, 35.264, patch), bb = bboxBy(parts, p => p.sys, p => ACCESSORY.has(p.n)), ks = Object.keys(bb);
    assert.equal(ks.length, 6, 'six systems');
    for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) assert.ok(apart(bb[ks[i]], bb[ks[j]]), `${JSON.stringify(patch)}: systems ${ks[i]} and ${ks[j]} overlap: ${JSON.stringify(bb[ks[i]])} ${JSON.stringify(bb[ks[j]])}`);
    // and the tower-top gear stays with a system's own pieces: it never goes into another system's solids
    const acc = parts.filter(p => ACCESSORY.has(p.n) && !p.hose), others = parts.filter(p => !ACCESSORY.has(p.n) && !p.hose && !p.shell);
    for (const a of acc) for (const o of others) if (boxHit(a, o)) assert.ok(depthOf(a, o) <= .5, `${a.n} in ${o.n}`);
  }
});

test('the climbing frame slides down the mast when it comes out alone, and waits in its own gap when the mast is apart too', () => {
  const lone = api.sceneAt(35, 35.264, { p: [0, 0, 0, 0, 0, 0, 1], sel: 6 }), all = api.sceneAt(35, 35.264, { p: ALL1 }), home = api.sceneAt(35, 35.264);
  const zmin = s => Math.min(...s.parts.filter(p => p.n === 15).map(p => p.box[0][2]));
  assert.ok(Math.abs(zmin(home) - zmin(lone) - C.CF_DOWN) < 1e-9, 'alone it slides CF_DOWN down');
  const mastTop = Math.max(...all.parts.filter(p => p.n === 10).map(p => p.box[1][2]));
  assert.ok(zmin(all) > mastTop, `in the roomy gap above the top section: ${zmin(all)} vs ${mastTop}`);
});

test('every part has a real pull, and pulling a part moves only that part (the ropes group, the mast: one section)', () => {
  const base = api.sceneAt(35, 35.264, { p: ALL1 }), mv = (a, b) => [0, 1, 2].map(k => b.box[0][k] - a.box[0][k]);
  for (let n = 1; n <= C.NPART; n++) {
    const pv = C.PULL[n]; assert.ok(Math.hypot(...pv) >= 14, `part ${n} has a clear pull: ${pv}`);
    const one = api.sceneAt(35, 35.264, { p: ALL1, sel: C.SYS_OF[n], subSel: n, pull: { [n]: 1 } });
    assert.equal(one.parts.length, base.parts.length);
    let moved = 0;
    base.parts.forEach((a, i) => { const b = one.parts[i], d = mv(a, b), still = d.every(x => Math.abs(x) < 1e-9);
      if (a.n === n && !a.hose) { if (!still) { moved++; assert.ok(d.every((x, k) => Math.abs(x - pv[k]) < 1e-9), `part ${n} piece moves exactly its pull`); } }
      else if (!a.hose) assert.ok(still, `pulling ${n} moved a piece of part ${a.n}`); });
    if (n === 12 || n === 24) moved = base.parts.filter((a, i) => a.n === n && a.hose && mv(a, one.parts[i]).some(x => Math.abs(x) > 1e-9)).length;
    assert.ok(moved > 0, `part ${n}: something moved`);
  }
  // part 10: just one section comes out, the others stay
  const sec = (s, i) => s.parts.filter(p => p.n === 10 && p.fr === 's' + i);
  const pulled = api.sceneAt(35, 35.264, { p: ALL1, sel: 1, subSel: 10, pull: { 10: 1 } });
  assert.ok(sec(pulled, 1).length > 0 && sec(pulled, 1).every((p, k) => Math.abs(p.box[0][1] - sec(base, 1)[k].box[0][1] - 36) < 1e-9), 'section 1 moves 36 sideways');
  for (const i of [0, 2, 3]) assert.ok(sec(pulled, i).every((p, k) => Math.abs(p.box[0][1] - sec(base, i)[k].box[0][1]) < 1e-9), `section ${i} stays`);
});

test('collapsing goes back in the opposite order to taking apart', () => {
  const st = api.makeState(), h = api.harness(st);
  st.p = ALL1.slice(); st.tgt = ALL1.slice(); st.tgt[0] = 0; st.p[0] = 0;
  h.collapseAll();
  const ORD = [1, 6, 2, 4, 3, 5];
  for (let i = 1; i < ORD.length; i++) assert.ok(st.dl[ORD[i]] > st.dl[ORD[i - 1]], `system ${ORD[i]} after ${ORD[i - 1]}`);
  for (let i = 0; i < 200; i++) h.tick(.05);
  assert.equal(api.assembled(st), true);
});

test('the ropes and hook come apart as one group: same shape, shifted sideways, only the hook drops further', () => {
  for (const patch of [{}, { trolley: 70, hookZ: 30, slew: .8 }]) {
    const a = api.sceneAt(35, 35.264, patch), b = api.sceneAt(35, 35.264, { ...patch, p: [0, 0, 0, 0, 0, 1, 0] });
    const ra = a.parts.filter(p => p.hose && (p.n === 12 || p.n === 24)), rb = b.parts.filter(p => p.hose && (p.n === 12 || p.n === 24));
    assert.equal(ra.length, rb.length); assert.ok(ra.length > 40);
    const drop = 8*C.HKS, so = api.SYS_OFF[5]; let exact = 0;
    assert.deepEqual([so[0], so[1], so[2]], [55, -75, -10], 'the group goes out sideways (-y, +x) so no rope crosses the mast');
    ra.forEach((p, i) => { const q = rb[i], d = [0, 1, 2].map(k => q.box[0][k] - p.box[0][k]);
      const sl = patch.slew || 0, ex = so[0]*Math.cos(sl) - so[1]*Math.sin(sl), ey = so[0]*Math.sin(sl) + so[1]*Math.cos(sl);       // the group shifts sideways of the jib, so the shift turns with the slew
      const pure = Math.abs(d[2] - so[2]) < 1e-9;      // a piece between a fixed sheave and the dropped hook is stretched: its square section tilts a hair
      assert.ok(Math.abs(d[0] - ex) < (pure ? 1e-9 : 1e-4) && Math.abs(d[1] - ey) < (pure ? 1e-9 : 1e-4), `rope piece ${i} shifts as the group only (not toward other systems): ${d}`);
      assert.ok(d[2] <= so[2] + 1e-9 && d[2] >= so[2] - drop - 1e-9, `... and down by the group shift plus at most the hook drop: ${d[2]}`);
      if (pure) exact++; });
    assert.ok(exact > ra.length*.6, `most rope pieces are just shifted: ${exact} of ${ra.length}`);
    // the other systems did not move at all
    const rest = x => x.parts.filter(p => p.n && !(p.n === 9 || p.n === 12 || p.n === 24));       // (the apart rope group also carries its sheave stubs)
    const ro = rest(a), rr = rest(b); assert.equal(ro.length, rr.length);
    ro.forEach((p, i) => assert.deepEqual(J(p.box), J(rr[i].box), `part ${p.n}`));
  }
});

test('see-through fades only the covers (and the lattice a little); a picked sub-part shows its own covers', () => {
  const { parts } = api.sceneAt(35, 35.264), st = api.makeState();
  const covers = new Set(parts.filter(p => p.shell).map(p => p.n)), lattice = new Set(parts.filter(p => p.lat).map(p => p.n));
  assert.deepEqual([...covers].sort((a, b) => a - b), [5, 6, 13, 16, 17, 18], 'cab, slewing guard, hoist hood, cylinder barrel, pump housing, electric cabinet');
  assert.deepEqual([...lattice], [7], 'the jib lattice');
  for (const p of parts) assert.equal(api.partFade(p, st), 1, 'nothing fades while see-through is off');
  st.xr = 1;
  for (const p of parts) { const f = api.partFade(p, st); if (p.shell) assert.ok(Math.abs(f - .2) < 1e-9, `cover ${p.n}`); else if (p.lat) assert.ok(f > .4 && f < .5, 'lattice'); else assert.equal(f, 1, `part ${p.n} stays solid`); }
  st.xr = 0; st.subSel = 13; st.pull[13] = 1;
  for (const p of parts) { const f = api.partFade(p, st); if (p.shell && p.n === 13) assert.ok(f < .5); else assert.equal(f, 1); }
});

test('see-through shows what is inside: console and seat, rope on the drum, ring gear and pinions, piston rod, pump and tank, contactors', () => {
  const { parts } = api.sceneAt(35, 35.264), inside = (n, pred) => parts.filter(p => p.n === n && !p.shell && !p.hose && pred(p));
  const has = (n, pred, what) => assert.ok(inside(n, pred).length > 0, `${what} (part ${n})`);
  const covered = (n, p) => parts.filter(q => q.n === n && q.shell).some(s => [0, 1, 2].every(k => p.box[0][k] >= s.box[0][k] - 1e-6 && p.box[1][k] <= s.box[1][k] + 1e-6));
  assert.ok(inside(6, p => covered(6, p)).length >= 4, 'seat, backrest, console and joysticks stand inside the cab shell');
  assert.ok(inside(13, p => covered(13, p)).length >= 5, 'five turns of rope wound on the drum, under the hood');
  assert.ok(inside(5, p => covered(5, p)).length >= 4, 'two pinions and two reducers under the slewing guard');
  assert.ok(inside(5, p => p.box[1][2] - p.box[0][2] < 1 && p.box[1][2] <= 84).length >= 20, 'the ring gear teeth are there');
  assert.ok(inside(18, p => covered(18, p)).length >= 8, 'breakers, contactors and the terminal strip inside the cabinet');
  assert.ok(inside(17, p => covered(17, p)).length >= 4, 'valve block, motor and pump under the pump housing');
  has(17, p => !covered(17, p) && p.box[1][0] - p.box[0][0] > 5, 'the tank stays in view');
  has(16, p => p.box[1][2] - p.box[0][2] > 10 && p.box[1][0] - p.box[0][0] < 1.1, 'the piston rod runs the length of the cylinder');
});

test('labels sit on their parts in every state: assembled, taken apart, one system out, a part pulled, slewed and climbed', () => {
  const states = [{}, { p: ALL1 }, { slew: 1.2, trolley: 70, hookZ: 30, nsec: 6, climb: .5 }, { p: ALL1, slew: 2.4, trolley: 50, hookZ: 60, nsec: 5 }];
  for (let n = 1; n <= C.NPART; n++) states.push({ p: ALL1.map((v, i) => i === C.SYS_OF[n] ? 1 : 0), sel: C.SYS_OF[n] }, { p: ALL1.map((v, i) => i === C.SYS_OF[n] ? 1 : 0), sel: C.SYS_OF[n], subSel: n, pull: { [n]: 1 } });
  const bad = [];
  for (const patch of states) {
    const { parts } = api.sceneAt(35, 35.264, patch);
    for (let n = 1; n <= C.NPART; n++) {
      const w = api.lblPoint(n), pcs = parts.filter(p => p.n === n && p.planes), tol = .35;
      if (!pcs.some(p => p.planes.every(([nr, d]) => nr[0]*w[0] + nr[1]*w[1] + nr[2]*w[2] - d <= tol))) bad.push(`${n}@${JSON.stringify(patch).slice(0, 60)}`);
    }
  }
  assert.deepEqual(bad.slice(0, 12), [], `${bad.length} label anchors are off their part`);
});


/* ---------- stage 3: the working cycle, the climb, hints, flow, the load chart, the read-outs ---------- */
const WO = ['slewTo', 'out', 'lower', 'hook', 'hoist', 'slewBack', 'in', 'set', 'unhook', 'home'], CO = ['balance', 'jack', 'insert', 'bolt', 'retract'];
const W = (st, id) => api.whyNot(st, id);
const after = (id, patch = {}) => midStep(id, 1, patch);           // the crane just after this step (all those before it done too)
const zero7 = [0, 0, 0, 0, 0, 0, 0];
const frameUp = st => { const a = {}, b = {}; api.makeFrames(st, zero7, a, b); return a.up([0, 0, 0]); };

test('every wrong-order press names the step that has to come first', () => {
  const s0 = api.makeState();
  assert.equal(W(s0, 'out'), '先回转到吊物处，再开小车'); assert.equal(W(s0, 'lower'), '先回转到吊物处，再落钩');
  assert.equal(W(s0, 'hook'), '先把吊钩开到吊物上方，再挂钩'); assert.equal(W(s0, 'hoist'), '先挂钩，再起升'); assert.equal(W(s0, 'slewBack'), '先挂钩，再回转');
  assert.equal(W(s0, 'in'), '先挂钩，再开小车'); assert.equal(W(s0, 'set'), '先挂钩，再下降'); assert.equal(W(s0, 'unhook'), '吊钩上没有吊物');
  const s1 = after('slewTo'); assert.equal(W(s1, 'lower'), '先把小车开到吊物上方，再落钩'); assert.equal(W(s1, 'out'), null);
  const s2 = after('out'); assert.equal(W(s2, 'hook'), '先落钩，再挂钩'); assert.equal(W(s2, 'lower'), null);
  const s3 = after('lower'); assert.equal(W(s3, 'hook'), null);
  const s4 = after('hook');
  assert.equal(W(s4, 'hoist'), null); assert.equal(W(s4, 'slewBack'), '先起升，再回转'); assert.equal(W(s4, 'in'), '先起升，再开小车'); assert.equal(W(s4, 'unhook'), '先放下吊物，再摘钩');
  assert.equal(W(s4, 'hook'), '吊物已经挂好了'); assert.ok(W(s4, 'lower')); assert.ok(W(s4, 'slewTo')); assert.ok(W(s4, 'home'));
  const s5 = after('hoist'); assert.equal(W(s5, 'slewBack'), null); assert.equal(W(s5, 'set'), '先把吊物开到放料处上方，再下降'); assert.equal(W(s5, 'in'), '先回转到放料处，再开小车');
  const s6 = after('slewBack'); assert.equal(W(s6, 'in'), null); assert.equal(W(s6, 'set'), '先把吊物开到放料处上方，再下降');
  const s7 = after('in'); assert.equal(W(s7, 'set'), null); assert.equal(W(s7, 'unhook'), '先放下吊物，再摘钩');
  const s8 = after('set'); assert.equal(W(s8, 'unhook'), null); assert.equal(W(s8, 'home'), '先放下吊物、摘钩，再升钩');
  const s9 = after('unhook'); assert.equal(W(s9, 'home'), null); assert.equal(s9.at, 'roof'); assert.equal(s9.hooked, false);
  // the climb
  assert.equal(W(s0, 'jack'), '先配平，再顶升'); assert.equal(W(s0, 'insert'), '先顶升，再引进标准节'); assert.equal(W(s0, 'bolt'), '先引进标准节，再连接螺栓'); assert.equal(W(s0, 'retract'), '先螺栓连接，再缩回油缸');
  assert.equal(W(s0, 'balance'), null); const c1 = after('balance'); assert.equal(W(c1, 'jack'), null);
  assert.equal(W(after('jack'), 'insert'), null); assert.equal(W(after('insert'), 'bolt'), null); assert.equal(W(after('bolt'), 'retract'), null);
  assert.equal(W(after('jack'), 'retract'), '先螺栓连接，再缩回油缸');
  // a load on the hook: no climbing; the highest mast: no climbing; climbing: no lifting
  for (const id of ['balance', 'jack']) assert.equal(W(s4, id), '先放下吊物，再顶升');
  for (const id of ['balance', 'jack']) assert.equal(W(Object.assign(api.makeState(), { nsec: 6 }), id), '已经最高了');
  for (const id of ['jack', 'insert', 'bolt', 'retract']) for (const w of WO) assert.equal(W(midStep(id, .5), w), '正在顶升，等顶升做完', `${w} while ${id}`);
  assert.equal(W(after('bolt'), 'slewTo'), '正在顶升，等顶升做完');
  assert.equal(W(after('retract'), 'slewTo'), null, 'after the climb the crane works again');
  // too heavy
  const hv = after('hook', { loadT: 4 }); assert.equal(W(hv, 'hoist'), '太重了，起重机吊不动，换轻一点的');
  const hv2 = after('hook', { loadT: 2.8 }); hv2.trolley = 56; assert.equal(W(hv2, 'hoist'), '太重了，小车往里开一点', 'light enough for the pad, but the trolley is further out than the chart allows'); hv2.trolley = api.TROL_AT('pad'); assert.equal(W(hv2, 'hoist'), null);
  // the button flashes the hint and starts nothing
  const st = api.makeState(), h = api.harness(st);
  assert.equal(h.doStep('hoist'), false); assert.deepEqual(J(h.flashes), ['先挂钩，再起升']); assert.equal(st.cur, null); assert.equal(st.busy, false);
  const st2 = Object.assign(api.makeState(), { hooked: true, sl: 1 }), h2 = api.harness(st2);
  assert.equal(h2.doStep('jack'), false); assert.equal(h2.flashes[0], '先放下吊物，再顶升');
});

test('every move runs only the winches it needs: rope flow, labels and oil follow the step', () => {
  const EXPECT = { slewTo: ['slew', 0, 0, 0], out: ['trolley', 0, 1, 0], lower: ['hoist', 1, 0, 0], hook: ['hook', 0, 0, 0], hoist: ['hoist', 1, 0, 0], slewBack: ['slew', 0, 0, 0], in: ['trolley', 0, 1, 0],
    set: ['hoist', 1, 0, 0], unhook: ['hook', 0, 0, 0], home: ['hoist,trolley', 1, 1, 0], balance: ['slew,trolley', 0, 1, 0], jack: ['climb', 0, 0, 1], insert: ['insert', 0, 0, 0], bolt: ['bolt', 0, 0, 0], retract: ['climb', 0, 0, 1] };
  for (const [order, mode] of [[WO, 'work'], [CO, 'climb']]) order.forEach((id, i) => {
    const st = i ? after(order[i - 1]) : api.makeState(), h = api.harness(st), [act, fH, fT, pump] = EXPECT[id];
    assert.equal(h.doStep(id), true, id);
    let prev = { hookZ: st.hookZ, trolley: st.trolley, slew: st.slew }, ticks = 0, seen = { H: 0, T: 0, P: 0 };
    while (st.cur) {
      h.tick(.05); ticks++;
      const mvH = Math.abs(st.hookZ - prev.hookZ) > 1e-12, mvT = Math.abs(st.trolley - prev.trolley) > 1e-12;
      if (st.cur) { assert.equal(st.flowH > 0, !!fH, `${id}: hoist rope flow`); assert.equal(st.flowT > 0, !!fT, `${id}: trolley rope flow`); assert.equal(st.pump > 0, !!pump, `${id}: oil`);
        assert.equal([].concat(st.act).join(','), act, `${id}: working`); if (fH) assert.ok(mvH, `${id}: hoist rope runs only while the hook moves`); if (fT) assert.ok(mvT, `${id}: trolley rope runs only while the trolley moves`); }
      if (!fH) assert.ok(!mvH, `${id} must not move the hook`); if (!fT && id !== 'balance') assert.ok(!mvT, `${id} must not move the trolley`);
      prev = { hookZ: st.hookZ, trolley: st.trolley, slew: st.slew };
    }
    assert.equal(st.flowH, 0); assert.equal(st.flowT, 0); assert.equal(st.pump, 0); assert.equal(st.act, null);
  });
  // what is drawn: the flowing dashes are on the hoist rope (12) or the trolley ropes (24) or the oil hoses (17), only while that one runs
  const flowOf = (patch, n, mark) => api.sceneAt(35, 35.264, patch).parts.filter(p => p.hose && p.n === n).some(p => p.svg.includes(mark));
  for (const [patch, n12, n24, n17] of [[{}, 0, 0, 0], [{ flowH: 1 }, 1, 0, 0], [{ flowT: 1 }, 0, 1, 0], [{ pump: 1 }, 0, 0, 1]]) {
    assert.equal(flowOf(patch, 12, '#cfd4da'), !!n12, JSON.stringify(patch)); assert.equal(flowOf(patch, 24, '#cfd4da'), !!n24, JSON.stringify(patch)); assert.equal(flowOf(patch, 17, '#86c8ff'), !!n17, JSON.stringify(patch));
  }
  // the flow's direction follows the rope: lowering and hoisting run it the other way round
  const dash = patch => api.sceneAt(35, 35.264, { flowH: 1, ...patch }).parts.find(p => p.hose && p.n === 12 && p.svg.includes('#cfd4da')).svg.match(/stroke-dashoffset="([-\d.]+)" stroke-linecap="round" opacity/)[1];
  const a1 = api.makeState(); a1.clock = 0; const d0 = dash({ dirH: 1, clock: 0 }), d1 = dash({ dirH: 1, clock: 1 }), e1 = dash({ dirH: -1, clock: 1 });
  assert.ok(+d1 < +d0 && +e1 > +d0, 'dash offset moves one way for dirH 1 and the other for -1');
});

test('the lit labels: the parts that work are lit during their step, and the moment gauge (19) lights amber above 90% and red when a move is refused', () => {
  const lit = (patch) => [...api.activeParts(Object.assign(api.makeState(), patch))].sort((a, b) => a - b);
  assert.deepEqual(lit({}), []);
  assert.deepEqual(lit({ act: 'slew' }), [5]); assert.deepEqual(lit({ act: 'trolley' }), [4, 8, 24]); assert.deepEqual(lit({ act: 'hoist' }), [9, 12, 13]);
  assert.deepEqual(lit({ act: ['hoist', 'trolley'] }), [4, 8, 9, 12, 13, 24]); assert.deepEqual(lit({ act: 'climb' }), [15, 16, 17]);
  const hang = (t, patch = {}) => Object.assign(api.makeState(), { hooked: true, sl: 1, trolley: 51.8, slew: -Math.PI/4, loadT: t, ...patch });
  assert.ok(!lit(hang(1.5)).includes(19)); assert.ok(lit(hang(2.6)).includes(19), 'above 90% of the chart');
  assert.ok(lit({ over: 2 }).includes(19)); assert.ok(!lit({ over: 0 }).includes(19));
});

test('the load chart: 6 t up to 13 m, 1.0 t at 56 m, smooth and falling; the trolley stops where the chart says', () => {
  assert.equal(api.ratedT(5), 6); assert.equal(api.ratedT(13), 6); assert.ok(Math.abs(api.ratedT(13.0001) - 6) < 1e-3, 'no jump at 13 m');
  assert.ok(Math.abs(api.ratedT(56) - 1) <= .05, `${api.ratedT(56)} t at 56 m`); assert.ok(Math.abs(api.ratedT(26) - (78/26 - .00905*13)) < 1e-12);
  let prev = 99; for (let r = 0; r <= 60; r += .25) { const v = api.ratedT(r); assert.ok(v <= prev + 1e-12, `falling at ${r}`); prev = v; }
  for (const w of [1.2, 2, 3, 4.5, 5.9]) { const x = api.maxTrolley(w), r = x/C.JX1*56; if (x > C.TROL_MIN + 1e-9 && x < C.TROL_MAX - 1e-9) assert.ok(Math.abs(api.ratedT(r) - w) < 1e-6, `${w} t: trolley stops at ${x}`); }
  assert.equal(api.maxTrolley(.3), C.TROL_MAX); assert.equal(api.maxTrolley(9), C.TROL_MIN);
  // the default load (2 t) never gets near the chart at the pad (27 m out): 2.76 t allowed
  assert.ok(api.ratedT(api.TROL_AT('pad')/C.JX1*56) > 2.7);
});

test('the limiter refuses a hoist that is too heavy for the radius and cuts a trolley move short, with the message and the red label', () => {
  // 4 t on the hook at the pad: the chart allows 2.95 t there, and no trolley position helps (the load lies at that radius)
  const st = midStep('hook', 1, { loadT: 4 }), h = api.harness(st);
  assert.equal(h.doStep('hoist'), false); assert.deepEqual(J(h.flashes), ['太重了，起重机吊不动，换轻一点的']); assert.ok(st.over > 0, 'the gauge flashes red'); assert.ok(api.activeParts(st).has(19));
  assert.equal(st.cur, null); assert.equal(st.hookZ, api.pickZ(st, api.PAD_H), 'the hook did not move');
  for (let i = 0; i < 60; i++) h.tick(.05); assert.equal(st.over, 0, 'the red goes out again');
  // 3.2 t lifted at the pad (as a test state), then the trolley goes out: it stops where the chart gives 3.2 t
  const s2 = midStep('hoist', 1, { loadT: 3.2 }); s2.trolley = 30; s2.hookZ = api.carryZ(s2); const h2 = api.harness(s2);
  assert.equal(W(s2, 'out'), null); assert.equal(h2.doStep('out'), true); assert.deepEqual(J(h2.flashes), ['太重了，小车往里开一点']); assert.ok(s2.over > 0);
  while (s2.cur) h2.tick(.05);
  assert.ok(s2.trolley < api.TROL_AT('pad') - 1e-6 && Math.abs(api.ratedT(s2.trolley/C.JX1*56) - 3.2) < 1e-6, `the trolley stopped at ${s2.trolley}`);
  // a light load goes all the way
  const s3 = midStep('hoist', 1); s3.trolley = 30; s3.hookZ = api.carryZ(s3); const h3 = api.harness(s3); assert.equal(h3.doStep('out'), true); assert.deepEqual(J(h3.flashes), []);
  while (s3.cur) h3.tick(.05); assert.ok(Math.abs(s3.trolley - api.TROL_AT('pad')) < 1e-9);
});

test('the read-outs: radius in metres at the tip scale, height of the hook, the weight only while the load hangs free', () => {
  const s0 = api.makeState(), r0 = api.readouts(s0);
  assert.ok(Math.abs(r0.r - 40/C.JX1*56) < 1e-9); assert.equal(r0.t, 0);
  assert.ok(Math.abs(r0.h - (api.SHK_Z - C.HZ0 + C.REST_Z)*56/C.JX1) < 1e-9, `${r0.h}`);
  const sp = after('lower'), rp = api.readouts(sp); assert.equal(rp.t, 0); assert.ok(Math.abs(rp.h - (api.SHK_Z - C.HZ0 + sp.hookZ)*56/C.JX1) < 1e-9);
  assert.equal(api.readouts(after('hook')).t, 0, 'still on the ground');
  const up = midStep('hoist', 1); assert.ok(Math.abs(api.readouts(up).t - 2) < 1e-9); assert.ok(Math.abs(api.readouts(up).h - (api.CARRY_Z + api.LOAD.v + api.LOAD.h)*56/C.JX1) < 1e-9);
  const mid = midStep('hoist', .1); assert.ok(api.readouts(mid).t > 0 && api.readouts(mid).t < 2);
  assert.ok(Math.abs(api.readouts(midStep('hoist', 1, { loadT: 3.3 })).t - 3.3) < 1e-9);
  assert.equal(api.readouts(after('set')).t, 0, 'the weight is gone again when the load stands on the building');
  assert.ok(api.readouts(midStep('set', .5)).t > 0);
  assert.equal(api.readouts(after('unhook')).t, 0);
  // the height is measured from the ground, so it grows by one section when the crane climbs
  assert.ok(Math.abs(api.readouts(Object.assign(api.makeState(), { nsec: 5 })).h - api.readouts(s0).h - 16*56/C.JX1) < 1e-9);
});

test('drums, the hook sheave and the pinions turn with the rope that runs over them', () => {
  const len = pts => pts.reduce((s, q, i) => i ? s + Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1]) : 0, 0);
  const xz = st => nodes => api.ropeLine(nodes, st).map(q => q.fr === 'trol' ? [q.p[0] + st.trolley, q.p[2]] : q.fr === 'hook' ? [q.p[0] + st.trolley, q.p[2] + st.hookZ - C.HZ0] : [q.p[0], q.p[2]]);
  const L = st => { const n = api.ropeNodes(st); return { H: len(xz(st)(n.hoist)), A: len(xz(st)(n.A)), B: len(xz(st)(n.B)) }; };
  const WH = C.HOIST.R + C.ROPE_R, WT = C.DRM2[2] + C.ROPE_R;
  for (const [z0, z1] of [[62, 36.5], [62, 59], [45, 70]]) {
    const a = Object.assign(api.makeState(), { hookZ: z0 }), b = Object.assign(api.makeState(), { hookZ: z1 });
    assert.ok(Math.abs((L(b).H - L(a).H) - 2*(z0 - z1)) < .02, 'two falls: the rope runs twice the hook travel (the falls lean a hair, so within 0.02)');
    assert.ok(Math.abs((api.drumAngH(b) - api.drumAngH(a))*WH - (L(b).H - L(a).H)) < .02, `hoist drum ${z0} -> ${z1}`);
    assert.ok(Math.abs((api.sheaveAngH(b) - api.sheaveAngH(a))*C.HS_R - (z0 - z1)) < 1e-9, 'hook sheave');
    assert.ok(Math.abs(L(b).A - L(a).A) < 1e-6 && Math.abs(L(b).B - L(a).B) < 1e-6, 'the trolley ropes do not care about the hook');
  }
  for (const [t0, t1] of [[40, 80], [90, 33]]) {
    const a = Object.assign(api.makeState(), { trolley: t0 }), b = Object.assign(api.makeState(), { trolley: t1 });
    assert.ok(Math.abs((api.drumAngT(b) - api.drumAngT(a))*WT - (L(b).A - L(a).A)) < .25, `trolley drum ${t0} -> ${t1}`);
    assert.ok(Math.abs((L(b).B - L(a).B) + (L(b).A - L(a).A)) < .25, 'one trolley rope pays out what the other takes in');
    assert.ok(Math.abs(L(b).H - L(a).H) < .05, 'the hoist rope is the same length wherever the trolley is (to 0.05: the falls lean a hair)');
  }
  // the pinions roll round the ring: their turn against the turning unit is slew x ring pitch / pinion radius
  assert.ok(Math.abs(api.pinionAng(Object.assign(api.makeState(), { slew: 1 })) - 8.2/1.3) < 1e-12);
  for (const slew of [0, .7, -1.3]) {
    const { parts } = api.sceneAt(35, 35.264, { slew }), pin = parts.filter(p => p.n === 5 && p.fr === 'su' && p.box[1][2] - p.box[0][2] < 1.01 && p.box[0][2] > 82.9 && p.box[1][2] < 84.1 && p.pts.length === 16);
    assert.equal(pin.length, 2, 'two pinions');
    for (const p of pin) { const q = p.pts[0], u = [q[0]*Math.cos(-slew) - q[1]*Math.sin(-slew), q[0]*Math.sin(-slew) + q[1]*Math.cos(-slew)], mx = [-3, 3].reduce((m, x) => Math.abs(x - u[0]) < Math.abs(m - u[0]) ? x : m);
      const ang = Math.atan2(u[1] + Math.sqrt(9.5*9.5 - 9), u[0] - mx), want = api.pinionAng(Object.assign(api.makeState(), { slew })), d = ((ang - want) % (2*Math.PI) + 3*Math.PI) % (2*Math.PI) - Math.PI;
      assert.ok(Math.abs(d) < 1e-6, `pinion tooth at ${ang}, wanted ${want} (slew ${slew})`); }
  }
  // the spokes drawn on the drums move: the same drum looks different at another rope length
  const svgOfN = (n, patch) => api.sceneAt(35, 35.264, patch).parts.filter(p => p.n === n && !p.hose).map(svgOf).join('');
  assert.notEqual(svgOfN(13, { hookZ: 62 }), svgOfN(13, { hookZ: 50 })); assert.equal(svgOfN(13, { hookZ: 62 }), svgOfN(13, { hookZ: 62 }));
  assert.notEqual(svgOfN(4, { trolley: 40 }), svgOfN(4, { trolley: 60 }));
});

test('the hook hangs vertically under the trolley while the crane slews, and the slings go from the shackle to the four lifting points on the load', () => {
  const centre = slew => { const ps = api.sceneAt(35, 35.264, { slew, trolley: 60 }).parts.filter(p => p.n === 9 && !p.hose && p.fr === 'hook'); assert.ok(ps.length > 10);
    const q = ps.flatMap(p => p.pts); return [q.reduce((s, v) => s + v[0], 0)/q.length, q.reduce((s, v) => s + v[1], 0)/q.length]; };
  const c0 = centre(0);
  for (const slew of [1.1, -2.4, 3]) { const c = centre(slew), e = [c0[0]*Math.cos(slew) - c0[1]*Math.sin(slew), c0[0]*Math.sin(slew) + c0[1]*Math.cos(slew)];
    assert.ok(Math.hypot(c[0] - e[0], c[1] - e[1]) < 1e-6, `the hook block stays under the trolley at slew ${slew}`); }
  const hs = Object.assign(api.makeState(), { slew: 1.1 }); { const a = api.hookAnchor(hs), x = C.HK_C[0] + hs.trolley; assert.ok(Math.abs(a[0] - x*Math.cos(1.1)) < 1e-9 && Math.abs(a[1] - x*Math.sin(1.1)) < 1e-9); }
  const st = midStep('hoist', 1), sc = api.sceneAt(35, 35.264, st), sl = sc.parts.filter(p => p.hose && p.n === 9);
  assert.equal(new Set(sl.map(p => p.seg)).size, 4, 'four legs'); const a = api.hookAnchor(st), lp = api.loadPose(st);
  for (const p of sl) { const c = p.pts.reduce((s, q) => [s[0] + q[0]/8, s[1] + q[1]/8, s[2] + q[2]/8], [0, 0, 0]); assert.ok(c[2] < a[2] + .5 && c[2] > lp.p[2] + api.LOAD.h - .5, 'a leg runs between the shackle and the top of the load'); }
  assert.equal(api.sceneAt(35, 35.264, after('unhook')).parts.filter(p => p.hose && p.n === 9).length, 0, 'no slings when it is not hooked');
  assert.equal(api.sceneAt(35, 35.264, { }).parts.filter(p => p.hose && p.n === 9).length, 0);
  // half way into the hook step the legs are half out
  const half = api.sceneAt(35, 35.264, midStep('hook', .5)).parts.filter(p => p.hose && p.n === 9);
  assert.equal(half.length, 4, 'legs while attaching');
});

test('the climb: 4 -> 5 -> 6 sections, one press each, then refused (the sixth is the highest); the top of the crane moves smoothly and never jumps, the oil flows only while the cylinder works', () => {
  const st = api.makeState(), h = api.harness(st); let nsec = 4;
  const logs = [];
  for (let run = 0; run < 2; run++) {
    let prevZ = frameUp(st)[2], worst = 0, pumpOk = true, prevHook = null, hookJump = 0, jump = 0, prevNs = st.nsec;
    const each = (s, id) => {
      const z = frameUp(s)[2], dz = Math.abs(z - prevZ); prevZ = z; if (s.nsec !== prevNs) { jump = Math.max(jump, dz); prevNs = s.nsec; } else worst = Math.max(worst, dz);
      pumpOk = pumpOk && ((s.pump > 0) === (id === 'jack' || id === 'retract'));
      const hk = api.hookAnchor(s)[2]; if (prevHook !== null) hookJump = Math.max(hookJump, Math.abs(hk - prevHook)); prevHook = hk;
    };
    logs.push(runAuto(st, h, 'climb', each)); nsec++;
    assert.equal(st.nsec, nsec); assert.equal(st.climb, 0); assert.equal(st.ext, 0); assert.equal(st.sx, null); assert.equal(st.bolt, 0); assert.equal(st.pump, 0);
    assert.ok(worst < .6, `the unit rises at most ${worst} per tick`); assert.ok(jump < .6, `no jump when the section count changes (${jump})`); assert.ok(pumpOk, 'oil only in jack and retract');
    assert.ok(hookJump < .7, `the hook hangs on the rising crane smoothly (${hookJump})`);
    assert.ok(Math.abs(frameUp(st)[2] - (nsec - 4)*C.SEC_H) < 1e-9, 'one section higher');
    for (const l of logs[run]) assert.ok(l.t1 - l.t0 >= 2.45 && l.t1 - l.t0 <= 4.1, `${l.id} takes ${(l.t1 - l.t0).toFixed(2)} s`);
  }
  assert.deepEqual(logs[0].map(l => l.id), CO); assert.deepEqual(logs[1].map(l => l.id), CO.slice(1), 'already balanced: straight to the jack');
  assert.equal(st.nsec, 6);
  assert.equal(W(st, 'balance'), '已经最高了'); assert.equal(W(st, 'jack'), '已经最高了');
  assert.equal(h.doStep('balance'), false); assert.equal(h.flashes[h.flashes.length - 1], '已经最高了');
  h.toggleAuto('climb'); for (let i = 0; i < 40; i++) h.tick(.05); assert.equal(st.auto, false); assert.equal(st.cur, null);
});

test('restoring 4 sections is instant, only allowed when nothing moves and nothing hangs', () => {
  const st = Object.assign(api.makeState(), { nsec: 6 }), h = api.harness(st);
  h.restore4(); assert.equal(st.nsec, 4); assert.equal(st.climb, 0); assert.equal(st.ext, 0); assert.equal(st.sx, null); assert.ok(st.hookZ <= C.HOOK_MAX && st.hookZ >= C.HOOK_MIN);
  const busy = Object.assign(api.makeState(), { nsec: 5, busy: true }), hb = api.harness(busy); hb.restore4(); assert.equal(busy.nsec, 5); assert.ok(hb.flashes.length);
  const hooked = Object.assign(api.makeState(), { nsec: 5, hooked: true, sl: 1 }), hh = api.harness(hooked); hh.restore4(); assert.equal(hooked.nsec, 5); assert.ok(hh.flashes.length);
  const four = api.makeState(), hf = api.harness(four); hf.restore4(); assert.equal(four.nsec, 4);
});

test('the hook can go as low as the crane has climbed: the limits follow the section count', () => {
  for (const ns of [4, 5, 6]) { const st = Object.assign(api.makeState(), { nsec: ns }); assert.equal(api.hookMin(st), C.HOOK_MIN - (ns - 4)*C.SEC_H); }
  // at the pad the hook (hook sheave) needs z = 36.5 on four sections and still has to reach it on six (hookZ is relative to the top)
  for (const ns of [4, 5, 6]) { const st = Object.assign(api.makeState(), { nsec: ns }); assert.ok(api.pickZ(st, api.PAD_H) >= api.hookMin(st) && api.carryZ(st) <= C.HOOK_MAX, `nsec ${ns}`); }
  const lowest = Object.assign(api.makeState(), { nsec: 6, at: 'pad' }); lowest.slew = api.SPOT.pad.a; lowest.trolley = api.TROL_AT('pad');
  const h = api.harness(lowest); assert.equal(h.doStep('lower'), true); while (lowest.cur) h.tick(.05);
  const world = api.hookAnchor(lowest); assert.ok(Math.abs(world[2] - (api.PAD_H + api.LOAD.h + api.LOAD.v)) < 1e-9, 'the shackle ends the right height above the pad whatever the mast');
});

test('?at ?hooked ?loadT ?step&t: bad values keep the default, good ones put the crane in that state', () => {
  const look = qs => { const st = api.makeState(); api.stateParams(st, new URLSearchParams(qs)); return st; };
  assert.equal(look('at=roof').at, 'roof'); assert.equal(look('at=moon').at, 'pad'); assert.equal(look('at=').at, 'pad');
  const hk = look('hooked=1'); assert.equal(hk.hooked, true); assert.equal(hk.sl, 1); assert.equal(look('hooked=0').hooked, false); for (const q of ['hooked=2', 'hooked=', 'hooked=yes']) assert.equal(look(q).hooked, false, q);
  assert.equal(look('loadT=3').loadT, 3); assert.equal(look('loadT=.2').loadT, .2); assert.equal(look('loadT=8').loadT, 8);
  for (const q of ['loadT=.1', 'loadT=9', 'loadT=0', 'loadT=-2', 'loadT=abc', 'loadT=', 'loadT=NaN', 'loadT=Infinity']) assert.equal(look(q).loadT, null, q);
  assert.ok(Math.abs(api.readouts(look('hooked=1&loadT=3&hookZ=60&slew=-45&trolley=51.8')).t - 3) < 1e-9);
  assert.equal(look('nsec=6&hookZ=-20').hookZ, C.HOOK_MIN - 2*C.SEC_H); assert.equal(look('hookZ=-20').hookZ, C.HOOK_MIN);
  // ?step=<id>&t=<0..1>: in the middle of that step, the steps before it done
  const m = look('step=hoist&t=.5'); assert.equal(m.hooked, true); assert.equal(m.sl, 1); assert.equal(m.cur, null);
  assert.ok(m.hookZ > api.pickZ(m, api.PAD_H) && m.hookZ < api.carryZ(m), `${m.hookZ}`); assert.ok(Math.abs(m.slew - api.SPOT.pad.a) < 1e-9); assert.ok(Math.abs(m.trolley - api.TROL_AT('pad')) < 1e-9);
  assert.deepEqual([look('step=hoist').hookZ, look('step=hoist&t=.5').hookZ], [m.hookZ, m.hookZ], 'without t it is half way');
  const e = look('step=set&t=1'); assert.equal(e.hooked, true); assert.ok(Math.abs(e.hookZ - api.pickZ(e, api.ROOF_Z)) < 1e-9);
  const u = look('step=unhook&t=1'); assert.equal(u.hooked, false); assert.equal(u.at, 'roof');
  const j = look('step=jack&t=.5'); assert.ok(Math.abs(j.climb - .5) < 1e-9); assert.equal(j.trolley, C.TROL_MIN); assert.ok(Math.abs(j.slew - Math.PI/2) < 1e-9);
  const ins = look('step=insert&t=.5'); assert.ok(ins.sx > 0 && ins.sx < 36); assert.equal(ins.climb, 1);
  for (const q of ['step=bogus', 'step=hoist&t=2', 'step=hoist&t=-1', 'step=hoist&t=abc', 'step=__proto__', 'step=constructor']) { const s = look(q); assert.equal(s.hooked, false, q); assert.equal(s.hookZ, C.REST_Z, q); }
  for (const q of ['step=hoist&t=.3', 'step=jack&t=.7', 'step=insert&t=.2', 'step=bolt&t=.5', 'step=retract&t=.4', 'step=home&t=.5', 'step=slewBack&t=.8']) assert.doesNotMatch(sceneSvg(api.sceneAt(60, 30, look(q))), /NaN|undefined/, q);
});

test('the site: a pick pad and a building under construction beside the crane, no label, no system, not taken apart, one weight', () => {
  const sc = api.sceneAt(30, 28, {}), scen = sc.parts.filter(p => !p.n);
  assert.ok(scen.length > 20); for (const p of scen) { assert.equal(p.sys, 0); assert.ok(['pad', 'plat', 'load'].includes(p.fr), p.fr); }
  const by = fr => scen.filter(p => p.fr === fr);
  assert.ok(by('pad').length >= 1 && by('plat').length >= 12 && by('load').length >= 20);
  // the load: 12 rods and two straps of four plates, 22 long
  const rods = by('load').filter(p => p.pts.length === 16); assert.equal(rods.length, 12);
  // the building: the top slab at z 24, the pad 1.5 high; the load sits on the pad
  const top = Math.max(...by('plat').map(p => p.box[1][2])); assert.ok(top > api.ROOF_Z && top < api.ROOF_Z + 6, 'the rebar stubs stand over the top slab');
  assert.ok(Math.abs(Math.max(...by('pad').map(p => p.box[1][2])) - api.PAD_H) < 1e-9);
  assert.ok(Math.abs(Math.min(...by('load').map(p => p.box[0][2])) - api.PAD_H) < 1e-9, 'the load rests on the pad');
  // clear of the crane's cross base
  const crane = sc.parts.filter(p => p.n), cb = api.bboxOf(crane.filter(p => p.box[1][2] < 30).flatMap(p => p.pts));
  for (const p of [...by('pad'), ...by('plat')]) assert.ok(p.box[0][0] > cb[1][0] + 0 || p.box[1][0] < cb[0][0] || p.box[0][1] > cb[1][1] || p.box[1][1] < cb[0][1], 'clear of the cross base');
  // it fades out while anything is taken apart and does not take part in the zoom
  assert.equal(api.sceneAt(30, 28, { p: [0, 0, 0, 0, 0, 1, 0] }).parts.filter(p => !p.n).length, 0, 'gone while apart');
  const half = api.sceneAt(30, 28, { p: [0, 0, 0, 0, 0, .2, 0] }).parts.filter(p => !p.n); assert.ok(half.length > 0 && half.every(p => /opacity="0\.[0-9]+"/.test(p.svg)), 'fading');
});

test('working poses (hanging load, slings, a section coming in) are convex, finite, and nothing goes into anything', () => {
  const JOINT = new Set(['11-14', '11-23', '14-14', '23-23']);
  const poses = [['lower', .5], ['hook', .5], ['hook', 1], ['hoist', .5], ['slewBack', .5], ['in', .5], ['set', .6], ['set', 1], ['unhook', .5], ['home', .5], ['jack', .5], ['insert', .5], ['bolt', .5], ['retract', .5]];
  for (const [id, t] of poses) {
    const st = midStep(id, t), { parts } = api.sceneAt(35, 35.264, st), bad = {}, tag = `${id} ${t}`;
    for (const p of parts) { assert.ok(p.planes && p.planes.length >= 4, `${tag}: part ${p.n} has planes`); for (const [n, d] of p.planes) for (const v of p.pts) assert.ok(dot3(n, v) <= d + 1e-6, `${tag}: part ${p.n} point outside its plane`); }
    for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
      const p = parts[i], q = parts[j];
      if (p.shell || q.shell || !boxHit(p, q)) continue;
      if (p.hose && q.hose && p.seg === q.seg) continue;
      if (p.hose && q.hose && p.n === 9 && q.n === 9) continue;                 // (the four legs meet at the shackle)
      const k = `${p.n}-${q.n}`, k2 = `${Math.min(p.n, q.n)}-${Math.max(p.n, q.n)}`, d = depthOf(p, q); if (d <= (JOINT.has(k2) ? 1 : .5)) continue;
      (bad[k2] = bad[k2] || []).push(d);
    }
    assert.deepEqual(Object.keys(bad), [], `${tag}: deep overlaps ${Object.entries(bad).map(([k, v]) => `${k}:${v.length}(${Math.max(...v).toFixed(2)})`).join(' ')}`);
    assert.doesNotMatch(sceneSvg({ parts }), /NaN|undefined/, tag);
  }
});

test('almost no visibly wrong pairs in the working poses: hanging load, slings, climbing, a section coming in', () => {
  const poses = { lower: ['lower', .5], hook: ['hook', .6], hoist: ['hoist', .5], carry: ['slewBack', .5], set: ['set', .7], jack: ['jack', .5], insert: ['insert', .5], bolt: ['bolt', .5] };
  let pairs = 0, area = 0, views = 0, worst = 0, worstArea = 0; const by = {};
  for (const [name, [id, t]] of Object.entries(poses)) for (const [yaw, pitch] of ORDER_VIEWS.filter(([, p]) => p === 35.264)) {
    const e = rayErrors(api.sceneAt(yaw, pitch, midStep(id, t)));
    views++; pairs += e.wrong.length; area += e.area; worst = Math.max(worst, e.wrong.length); worstArea = Math.max(worstArea, e.area); (by[name] = by[name] || []).push(e.wrong.length);
  }
  if (process.env.ORDER_REPORT) console.log('working poses: wrong pairs per view', JSON.stringify(Object.fromEntries(Object.entries(by).map(([k, v]) => [k, +(v.reduce((a, b) => a + b, 0)/v.length).toFixed(1)]))), 'average', +(pairs/views).toFixed(1), 'worst', worst, 'area', +(area/views).toFixed(1), 'worst area', +worstArea.toFixed(1));
  assert.ok(pairs/views < 18, `average wrong pairs ${pairs/views}`); assert.ok(area/views < 60, `average wrong area ${area/views}`); assert.ok(worst <= 35 && worstArea < 260, `worst view: ${worst} pairs, area ${worstArea}`);
});

/* ================= stage 4: the six paint presets and the swappable loads ================= */
test('six paint presets in the order 经典黄 橙色 红白 绿色 蓝白 粉色; each is complete, distinct, readable (light > mid > dark) and ?skin takes every id', () => {
  assert.deepEqual(J(api.SKINS.map(s => s.id)), ['classic', 'orange', 'redwhite', 'green', 'bluewhite', 'pink']);
  assert.deepEqual(J(api.SKINS.map(s => s.name)), ['经典黄', '橙色', '红白', '绿色', '蓝白', '粉色']);
  const towers = new Set(api.SKINS.map(s => s.YEL.m)); assert.equal(towers.size, 6, 'six different tower colours');
  for (const sk of api.SKINS) {
    for (const key of ['YEL', 'CABW', 'MOT']) { const t = sk[key]; assert.ok(api.lumOf(t.l) > api.lumOf(t.m) && api.lumOf(t.m) > api.lumOf(t.d), `${sk.id} ${key} light > mid > dark`); }
    assert.equal(sk.dot, sk.YEL.m, `${sk.id}: the dot is the tower colour`);
    const st = api.makeState(); api.lookParams(st, new URLSearchParams('skin=' + sk.id)); assert.equal(st.skin, sk.id); assert.equal(st.paint.tower, sk.YEL.m);
    assert.deepEqual(J(api.palettes).YEL, J(sk.YEL));
  }
  api.applySkin('classic'); assert.deepEqual(J(api.palettes), ORIGINAL_PAINT);
  // the paint never reaches the ballast, ropes, hook stripes, hydraulics or the system colours
  const pick = svg => (svg.match(/#[0-9a-f]{6}/gi) || []).length;
  const base = api.sceneAt(35, 35.264).parts.filter(p => p.n === 2 || p.n === 12).map(p => p.svg).join('');
  api.applySkin('pink'); const pink = api.sceneAt(35, 35.264).parts.filter(p => p.n === 2 || p.n === 12).map(p => p.svg).join('');
  api.applySkin('classic'); assert.equal(pink, base, 'counterweights and the lifting rope keep their colours'); assert.ok(pick(base) > 10);
});

test('load styles: six, in order, three sizes each, the weights, exactly two heavy sizes; riggings with reasons; the table is complete', () => {
  assert.deepEqual(J(api.LD_STYLES.map(s => s.id)), ['hopper', 'rebar', 'beam', 'panel', 'pallet', 'pipes']);
  assert.deepEqual(J(api.LD_STYLES.map(s => s.name)), ['混凝土料斗', '钢筋捆', '工字钢梁', '预制墙板', '砖托盘', '钢管束']);
  assert.deepEqual(J(api.LD_RIGS.map(r => r[1])), ['两肢吊索', '四肢吊索', '吊带']);
  const heavy = [];
  for (const sty of api.LD_STYLES) {
    assert.deepEqual(Object.keys(sty.sizes), ['s', 'm', 'l'], sty.id); assert.match(sty.col, /^#[0-9a-f]{6}$/); assert.ok(sty.rigs.includes(sty.rig), `${sty.id}: the default rig is allowed`);
    const ts = Object.values(sty.sizes).map(z => z.t); assert.ok(ts[0] < ts[1] && ts[1] < ts[2], `${sty.id}: weights grow with the size`);
    for (const r of api.LD_RIGS.map(r => r[0])) if (!sty.rigs.includes(r)) assert.ok(sty.why[r] && sty.why[r].length > 6, `${sty.id}: a disabled rig says why`);
    for (const k of ['s', 'm', 'l']) { api.applyLoad({ style: sty.id, size: k }); const L = api.LOAD;
      assert.ok(L.w <= 26 && L.d <= 12 && L.h <= 12 && L.w >= 6, `${sty.id} ${k}: ${L.w} x ${L.d} x ${L.h}`); if (L.t > 3.5) heavy.push(`${sty.id}-${k}`); else assert.ok(L.t <= 2.8, `${sty.id} ${k} regular`); }
  }
  assert.deepEqual(heavy, ['hopper-l', 'panel-l']);
  api.applyLoad({ style: 'rebar', size: 'm', rig: 'four' });
  const pad = api.ratedT(api.TROL_AT('pad')/C.JX1*56), roof = api.ratedT(api.TROL_AT('roof')/C.JX1*56);
  assert.ok(pad > 2.8 && pad < 4 && roof > 3.2 && roof < 4.5, `chart at the pad ${pad.toFixed(2)} t, on the roof ${roof.toFixed(2)} t`);
  assert.equal(api.SPOT.pad.r, 52);
});

test('load choices are validated: unknown style / size / rig / colour fall back, a rig the style can not use falls back to its own; the URL and the browser store', () => {
  const D = { style: 'rebar', size: 'm', rig: 'four', color: null };
  for (const bad of [null, undefined, 7, 'x', [], {}, { style: '__proto__' }, { style: 'nope', size: 'q' }]) assert.deepEqual(J(api.ldNorm(bad)), D, String(JSON.stringify(bad)));
  assert.deepEqual(J(api.ldNorm({ style: 'hopper', size: 'x', rig: 'belt', color: 'zz' })), { style: 'hopper', size: 'm', rig: 'four', color: null });
  assert.deepEqual(J(api.ldNorm({ style: 'panel', size: 'constructor', rig: 'belt' })), { style: 'panel', size: 'm', rig: 'two', color: null });
  assert.deepEqual(J(api.ldNorm({ style: 'beam', size: 'l', rig: 'belt', color: '#ABC' })), { style: 'beam', size: 'l', rig: 'belt', color: '#aabbcc' });
  const P = qs => J(api.ldParams(new URLSearchParams(qs)));
  assert.equal(P(''), null); assert.equal(P('yaw=3'), null);
  assert.deepEqual(P('loadStyle=pipes&loadSize=l&rig=belt&loadColor=ff8800'), { style: 'pipes', size: 'l', rig: 'belt', color: '#ff8800' });
  assert.deepEqual(P('loadStyle=pipes&loadSize=9&rig=nope&loadColor=ff88'), { style: 'pipes', size: 'm', rig: 'two', color: null });
  assert.deepEqual(P('rig=belt'), { style: 'rebar', size: 'm', rig: 'belt', color: null });
  assert.deepEqual(P('loadStyle=hopper&rig=two'), { style: 'hopper', size: 'm', rig: 'four', color: null });
  for (const bad of ['loadStyle=%00', 'loadStyle=constructor', 'loadSize=__proto__&loadStyle=beam']) assert.equal(P(bad).style, bad.includes('beam') ? 'beam' : 'rebar', bad);
  // a style swap keeps about the same weight: the nearest size of the new style
  assert.equal(api.ldNearest(api.ldStyle('hopper'), 2.7), 'm'); assert.equal(api.ldNearest(api.ldStyle('panel'), 4.6), 'l'); assert.equal(api.ldNearest(api.ldStyle('beam'), 1.1), 's');
  // storage: missing / blocked storage is fine (this context has none), junk is dropped
  assert.equal(api.ldStored(), null); api.ldStore({ style: 'beam' });
  const fake = (v, throws) => ({ getItem: () => { if (throws) throw new Error('blocked'); return v; }, setItem: () => { if (throws) throw new Error('blocked'); } });
  const run = fn => { ctx.localStorage = fake(...fn); try { return J(vm.runInContext('ldStored()', ctx)); } finally { delete ctx.localStorage; } };
  assert.deepEqual(run(['{"style":"panel","size":"l","rig":"four","color":"#112233"}']), { style: 'panel', size: 'l', rig: 'four', color: '#112233' });
  for (const junk of ['{', 'null', '7', '{"style":"nope"}', '"x"', '[]']) assert.equal(run([junk]), null, junk);
  assert.equal(run([null, true]), null);
  ctx.localStorage = fake(null, true); try { vm.runInContext('ldStore({style:"beam"})', ctx); } finally { delete ctx.localStorage; }
});

test('the load follows the choice: weight, size, the stats label, and the 吊重 read-out use the chosen weight', () => {
  api.applyLoad({ style: 'beam', size: 'l', rig: 'belt' });
  assert.equal(api.LOAD.t, 2.8); assert.equal(api.ldLabel(), '工字钢梁 2.8t 吊带');
  const st = midStep('hoist', 1); assert.ok(Math.abs(api.readouts(st).t - 2.8) < 1e-9);
  api.applyLoad({ style: 'rebar', size: 'm', rig: 'four' }); assert.equal(api.ldLabel(), '钢筋捆 2.0t 四肢吊索');
  assert.ok(api.ldLabel().length <= 16, 'the label fits at 360 px (13 px type)');
  for (const sty of api.LD_STYLES) for (const k of ['s', 'm', 'l']) { api.applyLoad({ style: sty.id, size: k }); assert.ok(api.ldLabel().length <= 16, api.ldLabel()); }
  api.applyLoad({ style: 'rebar', size: 'm', rig: 'four' });
});

test('swapping: refused while hooked or while a step runs (with the message), a colour goes through; the state changes at once and the swap picture slides', () => {
  const st = api.makeState(), h = api.harness(st);
  assert.equal(api.ldWhyNot(st), null);
  assert.equal(h.setLoad({ style: 'pipes' }), true); assert.equal(st.ld.style, 'pipes'); assert.equal(api.LOAD.kind, 'pipes'); assert.equal(api.LOAD.size, 'm'); assert.ok(st.swap && st.swap.from.style === 'rebar' && st.swap.t === 0, 'the picture will slide the old one away');
  assert.deepEqual(J(h.flashes), []);
  // a swap does not touch the rest of the state
  assert.equal(st.hooked, false); assert.equal(st.at, 'pad');
  const hk = midStep('hook', 1), h2 = api.harness(hk); assert.equal(hk.hooked, true);
  assert.equal(h2.setLoad({ style: 'beam' }), false); assert.deepEqual(J(h2.flashes), ['先摘钩，再换吊物']); assert.equal(api.LOAD.kind, 'pipes');
  assert.equal(h2.setLoad({ size: 'l' }), false); assert.equal(h2.setLoad({ rig: 'belt' }), false);
  h2.setLoadColor('#ff0000', false); assert.equal(hk.ld.color, '#ff0000'); assert.equal(api.LOAD.color, '#ff0000', 'colour changes while hooked');
  const run = api.makeState(), h3 = api.harness(run); h3.doStep('slewTo'); assert.equal(run.busy, true);
  assert.equal(h3.setLoad({ style: 'beam' }), false); assert.deepEqual(J(h3.flashes), ['正在工作，等这一步做完']);
  h3.setLoadColor('#00ff00', false); assert.equal(api.LOAD.color, '#00ff00');
  api.applyLoad({ style: 'rebar', size: 'm', rig: 'four' });
  // the slide: the old load goes off the pad while the new one comes in, over 0.5 s; during it both are drawn, afterwards one
  const s = api.makeState(); s.ld = api.applyLoad({ style: 'beam', size: 's', rig: 'two' }); s.swap = { from: { style: 'rebar', size: 'm', rig: 'four', color: null }, t: .5 };
  const loads = sc => sc.parts.filter(p => p.fr === 'load' && !p.hose), mid = loads(api.sceneAt(35, 35.264, s)), n1 = loads(api.sceneAt(35, 35.264, Object.assign(api.makeState(), { ld: s.ld }))).length;
  assert.ok(mid.length > n1, 'both loads are drawn during the swap'); assert.ok(mid.some(p => /opacity/.test(p.svg)), 'faded');
  s.swap = null; assert.equal(loads(api.sceneAt(35, 35.264, s)).length, n1);
  assert.equal(api.LOAD.kind, 'beam', 'the swap picture leaves the new load in place'); api.applyLoad({ style: 'rebar', size: 'm', rig: 'four' });
});

test('recolouring touches only the load: nothing else in the scene changes, and a colour is the style default until one is set', () => {
  const nonLoad = sc => sc.parts.filter(p => p.fr !== 'load' || p.hose).map(p => p.svg).join('').replace(/\bk\d+\b/g, 'k');       // (clip ids count up from scene to scene)
    for (const sty of api.LD_STYLES) {
    api.applyLoad({ style: sty.id, size: 'm' }); const st = midStep('hoist', .6), a = api.sceneAt(35, 35.264, st), la = a.parts.filter(p => p.fr === 'load' && !p.hose).map(p => p.svg).join('');
    api.applyLoad({ style: sty.id, size: 'm', color: '#e8348c' }); const b = api.sceneAt(35, 35.264, st), lb = b.parts.filter(p => p.fr === 'load' && !p.hose).map(p => p.svg).join('');
    assert.equal(nonLoad(a), nonLoad(b), `${sty.id}: only the load is recoloured`); assert.notEqual(la, lb, `${sty.id}: the load looks different`);
    api.applyLoad({ style: sty.id, size: 'm', color: sty.col }); assert.equal(api.sceneAt(35, 35.264, st).parts.filter(p => p.fr === 'load' && !p.hose).map(p => p.svg).join('') === la, sty.pal ? false : true, `${sty.id}: the default colour is the same as following the default`);
  }
  api.applyLoad({ style: 'rebar', size: 'm', rig: 'four' });
  // extreme colours still shade (light > mid > dark)
  for (const c of ['#000000', '#ffffff', '#fefefe', '#010101']) { const t = api.ldTones(api.ldStyle('panel'), c); assert.ok(api.lumOf(t.l) > api.lumOf(t.d), c); assert.doesNotMatch(J(t).m, /NaN/); }
});

// every part of the load in the scene (not the slings), the hook, the slings, the pad and the building
const ldParts = sc => sc.parts.filter(p => p.fr === 'load' && !p.hose), slingParts = sc => sc.parts.filter(p => p.hose && /^(sl|th)/.test(String(p.seg)));
const COMBOS = []; for (const sty of ['hopper', 'rebar', 'beam', 'panel', 'pallet', 'pipes']) for (const k of ['s', 'm', 'l']) for (const r of ['two', 'four', 'belt']) if (api.ldStyle(sty).rigs.includes(r)) COMBOS.push({ style: sty, size: k, rig: r });
const ctr = parts => { let v = 0, c = [0, 0, 0]; for (const p of parts) { const w = (p.box[1][0] - p.box[0][0])*(p.box[1][1] - p.box[0][1])*(p.box[1][2] - p.box[0][2]); v += w; for (let i = 0; i < 3; i++) c[i] += w*(p.box[0][i] + p.box[1][i])/2; } return c.map(x => x/v); };

test('every style x size x rigging: whole, convex, centre of mass under the hook, slings from the hook eye to the lifting points, clear of everything', () => {
  assert.equal(COMBOS.length, 1*3 + 3*3 + 3*3 + 2*3 + 2*3 + 3*3);
  for (const cb of COMBOS) {
    api.applyLoad(cb); const tag = `${cb.style}-${cb.size}-${cb.rig}`, st = midStep('hoist', 1), sc = api.sceneAt(35, 35.264, st), L = ldParts(sc), S = slingParts(sc);
    assert.ok(L.length >= 4, `${tag}: parts`); assert.doesNotMatch(sceneSvg(sc), /NaN|undefined/, tag);
    for (const p of L) { assert.ok(p.planes && p.planes.length >= 4, tag); for (const [n, d] of p.planes) for (const v of p.pts) assert.ok(dot3(n, v) <= d + 1e-6, `${tag}: convex`); }
    const a = api.hookAnchor(st), lp = api.loadPose(st), c = ctr(L);
    assert.ok(Math.hypot(c[0] - a[0], c[1] - a[1]) < .3, `${tag}: centre of mass off the hook line by ${Math.hypot(c[0] - a[0], c[1] - a[1]).toFixed(3)}`);
    const top = Math.max(...L.flatMap(p => p.pts.map(v => v[2]))), bot = Math.min(...L.flatMap(p => p.pts.map(v => v[2])));
    assert.ok(a[2] - top > 1, `${tag}: clearance above the load ${(a[2] - top).toFixed(2)}`); assert.ok(Math.abs(top - (lp.p[2] + api.LOAD.h)) < 1e-6, `${tag}: the load is as tall as it says`); assert.ok(Math.abs(bot - lp.p[2]) < .3, `${tag}: underside at ${bot - lp.p[2]}`);
    // the slings: one rope / belt per lifting point; each starts on the shackle and ends on the lifting point
    const want = api.loadStyle().lift(api.LOAD, cb.rig).length; assert.equal(want, cb.rig === 'four' ? 4 : 2, tag);
    for (let i = 0; i < want; i++) {
      const pieces = S.filter(p => p.seg === 'sl' + i); assert.ok(pieces.length >= 1, `${tag}: leg ${i}`);
      const f0 = pieces[0], l1 = pieces[pieces.length - 1], n0 = f0.pts.length/2, n1 = l1.pts.length/2;
      const s0 = avg3(f0.pts.slice(0, n0)), e1 = avg3(l1.pts.slice(n1)), pt = api.loadStyle().lift(api.LOAD, cb.rig)[i];
      const w = [Math.cos(lp.yaw)*pt[0] - Math.sin(lp.yaw)*pt[1] + lp.p[0], Math.sin(lp.yaw)*pt[0] + Math.cos(lp.yaw)*pt[1] + lp.p[1], lp.p[2] + pt[2]];
      assert.ok(Math.hypot(s0[0] - a[0], s0[1] - a[1], s0[2] - a[2]) < .05, `${tag}: leg ${i} starts at the hook eye`); assert.ok(Math.hypot(e1[0] - w[0], e1[1] - w[1], e1[2] - w[2]) < .05, `${tag}: leg ${i} ends on the lifting point (${Math.hypot(e1[0] - w[0], e1[1] - w[1], e1[2] - w[2]).toFixed(3)})`);
      assert.ok(Math.abs(w[2] - top) < 1e-6, `${tag}: the lifting points are on the top`);
    }
    // nothing goes into anything: the load against the hook, its slings, the pad, the building and the stubs
    const others = sc.parts.filter(p => (p.n === 9 && !p.hose) || p.fr === 'pad' || p.fr === 'plat');
    for (const p of L) for (const q of [...others, ...S]) if (boxHit(p, q)) assert.ok(depthOf(p, q) <= (q.hose ? .3 : .05), `${tag}: load part against ${q.n}/${q.fr}/${q.seg}: ${depthOf(p, q).toFixed(3)}`);
    for (const p of L) for (const q of L) if (p !== q && p.fr === 'load' && boxHit(p, q)) assert.ok(depthOf(p, q) <= .05 + 1e-9 || p.pts === q.pts, `${tag}: load parts overlap ${depthOf(p, q).toFixed(3)}`);
  }
  api.applyLoad({ style: 'rebar', size: 'm', rig: 'four' });
});

test('every style x size: lands flush (gap under 0.05) on the pad and on the building, fits on both, clear of the rebar stubs, and the hook can reach every height', () => {
  const stubs = api.sceneAt(35, 35.264, api.makeState()).parts.filter(p => p.fr === 'plat' && p.box[1][2] > api.ROOF_Z + 1);
  assert.equal(stubs.length, 8);
  for (const sty of api.LD_STYLES) for (const k of ['s', 'm', 'l']) {
    api.applyLoad({ style: sty.id, size: k }); const tag = `${sty.id}-${k}`;
    for (const [to, spot] of [['roof', api.SPOT.roof], ['pad', api.SPOT.pad]]) {
      const st = midStep('set', 1, { at: to === 'roof' ? 'pad' : 'roof', loadT: 1 }), sc = api.sceneAt(35, 35.264, st), L = ldParts(sc), z = Math.min(...L.flatMap(p => p.pts.map(v => v[2])));
      assert.ok(z - spot.z > -.01 && z - spot.z < .05, `${tag} on ${to}: gap ${(z - spot.z).toFixed(3)}`);
      const lp = api.loadPose(st); assert.ok(Math.hypot(lp.p[0] - spot.x, lp.p[1] - spot.y) < 1e-6);
      for (const p of L) for (const v of p.pts) { const dx = v[0] - spot.x, dy = v[1] - spot.y;
        if (to === 'roof') assert.ok(Math.abs(dx) <= api.BLD.hx - .3 && Math.abs(dy) <= api.BLD.hy - .3, `${tag}: inside the slab ${dx.toFixed(1)} ${dy.toFixed(1)}`);
        else { const c = Math.cos(spot.yaw), sn = Math.sin(spot.yaw), u = dx*c + dy*sn, w2 = -dx*sn + dy*c; assert.ok(Math.abs(u) <= 14.5 - .2 && Math.abs(w2) <= 7.2 - .2, `${tag}: inside the pad ${u.toFixed(1)} ${w2.toFixed(1)}`); } }
      const others = sc.parts.filter(p => p.fr === (to === 'roof' ? 'plat' : 'pad'));
      for (const p of L) for (const q of others) if (boxHit(p, q)) assert.ok(depthOf(p, q) <= .05, `${tag} on ${to}: into ${q.fr} by ${depthOf(p, q).toFixed(2)}`);
    }
    // the hook's heights: at the pick on either spot, at the carry height, and at the limits the crane has
    for (const at of ['pad', 'roof']) { const st = api.makeState(); st.at = at; for (const z of [api.pickZ(st, api.SPOT[at].z), api.carryZ(st)]) assert.ok(z >= C.HOOK_MIN && z <= C.HOOK_MAX, `${tag} ${at}: hookZ ${z.toFixed(1)}`); }
  }
  api.applyLoad({ style: 'rebar', size: 'm', rig: 'four' });
});

test('the whole cycle works with every regular size (both directions, hooks on, lands on both), and the two heavy sizes are refused at the pad with the red gauge and a clean stop', () => {
  for (const sty of api.LD_STYLES) for (const k of ['s', 'm', 'l']) {
    api.applyLoad({ style: sty.id, size: k }); const heavy = api.LOAD.t > 3.5;
    const st = api.makeState(), h = api.harness(st); h.toggleAuto('work');
    let n = 0; while ((st.auto || st.cur || st.pending) && n++ < 4000) h.tick(.05);
    const tag = `${sty.id}-${k} (${api.LOAD.t} t)`;
    if (heavy) {
      assert.equal(st.hooked, true, `${tag}: the hook still holds it`); assert.equal(st.auto, false); assert.equal(st.cur, null); assert.equal(st.busy, false); assert.equal(st.at, 'pad');
      assert.deepEqual(J(h.flashes.slice(-1)), ['太重了，起重机吊不动，换轻一点的']); assert.ok(st.over > 0, 'the gauge is red'); assert.ok(api.activeParts(st).has(19));
      assert.equal(st.hookZ, api.pickZ(st, api.PAD_H), `${tag}: nothing moved after the refusal`);
      for (let i = 0; i < 80; i++) h.tick(.05); assert.equal(st.over, 0, 'the red goes out');
    } else {
      assert.equal(st.hooked, false, tag); assert.equal(st.at, 'roof', tag); assert.ok(atSpot(st, 'roof'), `${tag}: on the building`);
      h.toggleAuto('work'); n = 0; while ((st.auto || st.cur || st.pending) && n++ < 4000) h.tick(.05);
      assert.equal(st.at, 'pad', `${tag}: and back`); assert.ok(atSpot(st, 'pad'), tag); assert.equal(st.hooked, false);
    }
  }
  api.applyLoad({ style: 'rebar', size: 'm', rig: 'four' });
});

test('the load chart colours the gauge: amber over 90 % of the rating, only then (and red on a refusal); the other work steps show no gauge label', () => {
  api.applyLoad({ style: 'beam', size: 'l', rig: 'two' });                     // 2.8 t: 95 % of the 2.95 t at the pad
  const st = midStep('hoist', 1); assert.ok(api.momentRatio(st) > .9 && api.momentRatio(st) < 1); assert.ok(api.activeParts(st).has(19));
  api.applyLoad({ style: 'beam', size: 's' }); const s2 = midStep('hoist', 1); assert.ok(api.momentRatio(s2) < .9); assert.ok(!api.activeParts(s2).has(19), 'a light load: no gauge label');
  for (const id of [...api.WORK_ORDER, ...api.CLIMB_ORDER]) { const s = midStep(id, .5); assert.ok(!api.activeParts(s).has(19), `${id}: no gauge label with a light load`); }
  api.applyLoad({ style: 'rebar', size: 'm', rig: 'four' });
});

test('almost no visibly wrong pairs hanging and landed, for every load style (middle size) and for the heavy ones', () => {
  let pairs = 0, area = 0, views = 0, worst = 0, worstArea = 0; const by = {};
  for (const [sty, k] of [['hopper', 'm'], ['rebar', 'm'], ['beam', 'm'], ['panel', 'm'], ['pallet', 'm'], ['pipes', 'm'], ['hopper', 'l'], ['panel', 'l']]) {
    api.applyLoad({ style: sty, size: k });
    for (const [name, [id, t]] of Object.entries({ hoist: ['hoist', .5], carry: ['slewBack', .5], set: ['set', 1], lower: ['lower', 1] })) for (const [yaw, pitch] of ORDER_VIEWS.filter(([, p]) => p === 35.264)) {
      const e = rayErrors(api.sceneAt(yaw, pitch, midStep(id, t)));
      views++; pairs += e.wrong.length; area += e.area; worst = Math.max(worst, e.wrong.length); worstArea = Math.max(worstArea, e.area); (by[sty + '-' + k] = by[sty + '-' + k] || []).push(e.wrong.length); }
  }
  if (process.env.ORDER_REPORT) console.log('load styles: wrong pairs per view', JSON.stringify(Object.fromEntries(Object.entries(by).map(([k, v]) => [k, +(v.reduce((a, b) => a + b, 0)/v.length).toFixed(1)]))), 'average', +(pairs/views).toFixed(1), 'worst', worst, 'area', +(area/views).toFixed(1), 'worst area', +worstArea.toFixed(1));
  assert.ok(pairs/views < 18, `average wrong pairs ${pairs/views}`); assert.ok(area/views < 60, `average wrong area ${area/views}`); assert.ok(worst <= 35 && worstArea < 260, `worst view: ${worst} pairs, area ${worstArea}`);
  api.applyLoad({ style: 'rebar', size: 'm', rig: 'four' });
});
