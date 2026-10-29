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
vm.runInContext(read('src/a_base.js'), ctx);
vm.runInContext(read('src/b_chassis.js'), ctx);
vm.runInContext(read('src/c_cab.js'), ctx);
vm.runInContext(read('src/d_body.js'), ctx);
vm.runInContext(read('src/e_bins.js'), ctx);
vm.runInContext(read('src/e_lift.js'), ctx);
vm.runInContext(read('src/f_hyd.js'), ctx);
vm.runInContext(read('src/g_skin.js'), ctx);
vm.runInContext(read('src/h_scene.js'), ctx);
vm.runInContext(read('src/i_ui.js').split('ui = mountFigure({')[0], ctx);
const api = vm.runInContext(`({
  mix, shape, setCam, P, vis, rotV, hull, makeFrames, whyNot, nextAuto, assembled,
  setOrigin(rc, rcz, ox, oy) { RC = rc; RCZ = rcz; OX = ox; OY = oy; },
  get advanceStep() { return typeof advanceStep === 'undefined' ? null : advanceStep; },
  get axes() { return typeof projectionAxes === 'undefined' ? null : projectionAxes; },
  polysOverlap, orderParts, sepOrder,
  applySkin, skinOf, SKINS, lookParams, hexOf, urlHex, lumOf, hsvHex, hexHsv, tuneOf, zoneTones, applyPaint, paintOf, paintNorm, paintParams, paintStored, paintStore, setZone, setSkin, skinDot, skinChoices,
  setUi(st) { ui = { st, flash() {}, invalidate() {} }; }, binSpec, binStyleOf, binSizeFor, binStyleForSize, BIN_STYLES, binTypeOf, binLoadStep, BIN_TYPES, setBin, binLabel, binChoices, binMat, binTones, binStored, binStore, setBinColor, binColorNow, YC, GST: () => GST,
  get palettes() { return { CABW: { ...CABW }, GRN: { ...GRN }, GRND: { ...GRND }, ORG: { ...ORG }, RFL }; },
  // the parts the bin is made of (frame 'bin'), built into a scene at the given state
  binParts(patch = {}, yaw = 45, pitch = 35.264) {
    const st = Object.assign(this.makeState(), patch), op = push;
    GST = st; st.E = st.p.map(v => ease(clamp01(v))); setFrames(st); PARTS = []; setCam(yaw, pitch);
    push = (svg, wp, o) => { const p = op(svg, wp, o); p.fr = CX.fr; return p; };
    try { buildChassis(st); buildCab(st); buildBody(st); buildLifter(st); buildHydraulic(st); buildOther(st); buildPile(st); } finally { push = op; }
    return { all: PARTS, bin: PARTS.filter(p => p.fr === 'bin' && p.n === 14), carr: PARTS.filter(p => p.fr === 'carr') };
  },
  makeState: () => ({
    p: [0,0,0,0,0,0], tgt: [0,0,0,0,0,0], dl: [0,0,0,0,0,0], E: [0,0,0,0,0,0],
    sel: -1, subSel: 0, pull: {}, hook: 0, clamp: 0, lift: 0, tip: 0, lidA: 0,
    binFull: 1, pour: 0, hop: 0, pk: 0, slide: 0, blade: 0,
    load: .6, ej: ejOf(.6), dense: 0, packed: false, gate: 0, pile: 0, pump: 0,
    act: null, clock: 0, busy: false, auto: false, autoWait: 0, cur: null, xr: 0, xrT: 0
  }),
  cylinder(a,b,barrel) {
    GST = this.makeState(); setFrames(GST); PARTS = []; use('body', 12);
    return { returned: gCyl(a,b,1,barrel,BLU,{world:true}), parts: PARTS };
  },
  rodPart(a,b,r,r1,sides) {
    GST = this.makeState(); setFrames(GST); PARTS = []; use('body', 12);
    return gR(a,b,r,BLU,.7,{world:true,r1,sides});
  },
  gateParts(st) {
    GST = st; setFrames(st); PARTS = [];
    const original = gB, originalRod = gR, result = { brackets: [], pins: [] };
    gB = (...args) => {
      const fr = CX.fr, part = original(...args);
      if ((args[0] === 44 && args[3] === 47.5) || (args[0] === 32 && args[3] === 34.6))
        result.brackets.push({ fr, pts: part.pts });
      return part;
    };
    gR = (...args) => {
      const part = originalRod(...args);
      if (args[0][0] === HINGE[0] && args[0][2] === HINGE[1] && args[1][2] === HINGE[1])
        result.pins.push({ a: wpt(args[0]), b: wpt(args[1]) });
      return part;
    };
    try { buildGate(st); } finally { gB = original; gR = originalRod; }
    return result;
  },
  fullScene(yaw) {
    const st = this.makeState(), originalBox = gB, originalRod = gR;
    const captures = { roof: [], ribs: [], inner: [], outer: [], rim: [] };
    GST = st; setFrames(st); PARTS = []; setCam(yaw, PITCH0);
    const sign = CAM_V[1] > 0 ? 1 : -1;
    gB = (...args) => {
      const fr = CX.fr, n = CX.n, part = originalBox(...args);
      if (fr === 'body' && n === 8) {
        if (args[0] === 42.6 && args[1] === 2 && args[2] === BZ1 - 1 && args[3] === BX1 - 1 && args[5] === BZ1)
          captures.roof.push(part);
        if ([56,76,96,116].some(x => Math.abs(args[0] - (x - .7)) < 1e-9) && args[2] === BZ1 && args[5] === BZ1 + .7)
          captures.ribs.push(part);
      }
      return part;
    };
    gR = (...args) => {
      const n = CX.n, part = originalRod(...args), a = args[0], b = args[1], radius = args[2];
      if (n === 7 && part && a[0] === AX_R[0] && b[0] === AX_R[0] && a[2] === WR && b[2] === WR) {
        const y = (a[1] + b[1])/2;
        if (radius === WR && Math.abs(y - (YC + sign*15.8)) < 1e-8) captures.inner.push(part);
        if (radius === WR && Math.abs(y - (YC + sign*21.8)) < 1e-8) captures.outer.push(part);
        if (radius === 6.4 && Math.abs(y - (YC + sign*(21.8 + 2.7 + .26))) < 1e-8) captures.rim.push(part);
      }
      return part;
    };
    try {
      buildChassis(st); buildCab(st); buildBody(st); buildLifter(st); buildHydraulic(st); buildOther(st); buildPile(st);
      const parts = [...PARTS], ordered = orderParts(PARTS);
      return { ...captures, parts, ordered };
    } finally { gB = originalBox; gR = originalRod; }
  },
  get orderStats() { return ORDER_STATS; },
  // the whole scene's parts, built for a view; patch overrides state fields
  sceneAt(yaw, pitch, patch = {}) {
    const st = Object.assign(this.makeState(), patch);
    GST = st; st.E = st.p.map(v => ease(clamp01(v))); setFrames(st); PARTS = []; setCam(yaw, pitch);
    buildChassis(st); buildCab(st); buildBody(st); buildLifter(st); buildHydraulic(st); buildOther(st); buildPile(st);
    const parts = PARTS, ordered = orderParts(parts);
    return { parts, ordered, stats: { ...ORDER_STATS }, view: { R: CAM_R, D: CAM_D, V: CAM_V, s0: P(0, 0, 0), k: CAM_K } };
  },
  rod(a, b, r) { GST = this.makeState(); setFrames(GST); PARTS = []; use('body', 12); return gR(a, b, r, BLU, .7, { world: true }); },
  harness(st) {
    const callbacks = [];
    const flashes = [];
    ui = { st, animate: fn => callbacks.push(fn), flash(t) { flashes.push(t); }, invalidate() {} }; loopOn = false;
    return {
      flashes,
      toggleAuto, explodeAll, doStep,
      tick(dt) { for (const fn of [...callbacks]) if (fn(dt) === false) callbacks.splice(callbacks.indexOf(fn), 1); },
      get count() { return callbacks.length; }
    };
  }
})`, ctx);

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

test('free bin does not rotate when the gate opens, but hooked bin follows carriage', () => {
  const st = api.makeState(), e = [0,.2,.4,.6,0,0], p = [-5,25,10], n = [1,0,0];
  const a = {}, an = {}, b = {}, bn = {};
  api.makeFrames(st, e, a, an);
  st.gate = 1;
  api.makeFrames(st, e, b, bn);
  assert.deepEqual(Array.from(b.bin(p)), Array.from(a.bin(p)));
  assert.deepEqual(Array.from(bn.bin(n)), Array.from(an.bin(n)));
  st.hook = 1; st.lift = .5; st.tip = .5;
  api.makeFrames(st, e, b, bn);
  assert.deepEqual(Array.from(b.bin(p)), Array.from(b.carr(p)));
  assert.deepEqual(Array.from(bn.bin(n)), Array.from(bn.carr(n)));
});

test('state guards reject unsafe operation and unknown steps', () => {
  const st = api.makeState();
  assert.ok(api.whyNot(st, 'unknown'));
  st.hop = 1; assert.ok(api.whyNot(st, 'hook'));
  st.hop = 0; st.packed = true; assert.ok(api.whyNot(st, 'hook'));
  st.load = 1; st.packed = false; st.hop = 1; assert.ok(api.whyNot(st, 'pack'));
  st.hop = 0; st.hook = 1; st.clamp = 1; st.lift = 1; assert.ok(api.whyNot(st, 'dump'));
  st.load = .6; st.hook = 0; st.lift = 0; st.clamp = 0; st.gate = .0001;
  for (const id of ['hook', 'lift', 'tip', 'pack', 'press']) assert.ok(api.whyNot(st, id), id);
});

test('automatic cycle pushes packed load before hooking another bin', () => {
  const st = api.makeState(); st.load = .8; st.packed = true;
  assert.equal(api.nextAuto(st), 'press');
});

test('assembly waits for pulled-out parts to return', () => {
  const st = api.makeState(); st.subSel = 3; st.pull[3] = 1;
  assert.equal(api.assembled(st), false);
  st.subSel = 0;
  assert.equal(api.assembled(st), false);
  st.pull[3] = 0;
  assert.equal(api.assembled(st), true);
});

test('zero and short cylinders contain no non-finite coordinates', () => {
  const zero = api.cylinder([0,0,0], [0,0,0], 13);
  assert.equal(zero.returned.length, 0);
  const short = api.cylinder([0,0,0], [0,0,.2], 13);
  for (const p of short.parts) for (const pt of p.pts) for (const n of pt) assert.ok(Number.isFinite(n));
  assert.ok(short.parts.every(p => p.box[0][2] >= -1e-9));
});

test('advanceStep preserves elapsed time across segments', () => {
  assert.equal(typeof api.advanceStep, 'function');
  const a = api.makeState(), b = api.makeState();
  for (const st of [a,b]) { st.cur = {id:'pack', i:0, t:0}; st.busy = true; st.L0 = st.load; st.hop = 1; }
  api.advanceStep(a, 4.2);
  for (let i = 0; i < 84; i++) api.advanceStep(b, .05);
  for (const key of ['blade','slide','pk','load','ej','hop','packed','busy','pump','act']) {
    if (typeof a[key] === 'number') assert.ok(Math.abs(a[key] - b[key]) < 1e-8, key);
    else assert.equal(a[key], b[key], key);
  }
  for (const st of [a,b]) {
    assert.equal(st.cur, null);
    assert.equal(st.busy, false);
    assert.equal(st.hop, 0);
    assert.equal(st.packed, true);
    assert.ok(Math.abs(st.load - .8) < 1e-8);
  }
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

test('tailgate brackets follow their own frame and hinge pins stay on axis', () => {
  const st = api.makeState(), closed = api.gateParts(st);
  st.gate = 1; const open = api.gateParts(st);
  assert.equal(closed.brackets.length, 4);
  assert.equal(open.pins.length, 2);
  for (let i = 0; i < 4; i++) {
    assert.equal(closed.brackets[i].fr, open.brackets[i].fr);
    const same = JSON.stringify(closed.brackets[i].pts) === JSON.stringify(open.brackets[i].pts);
    assert.equal(same, closed.brackets[i].fr === 'body');
  }
  for (let i = 0; i < 2; i++) for (const end of ['a','b'])
    assert.ok(open.pins[i][end].every((n,k) => Math.abs(n - closed.pins[i][end][k]) < 1e-9));
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

test('full scene roof ribs and near-side wheel occlusion in four quadrants', () => {
  for (const yaw of [45,135,225,315]) {
    const scene = api.fullScene(yaw), ord = Array.from(scene.ordered);
    assert.ok(scene.parts.length > 300, `yaw ${yaw}: full scene`);
    assert.equal(ord.length, scene.parts.length, `yaw ${yaw}: part count`);
    assert.equal(new Set(ord).size, scene.parts.length, `yaw ${yaw}: each part once`);
    assert.equal(scene.roof.length, 1, `yaw ${yaw}: roof`);
    assert.equal(scene.ribs.length, 4, `yaw ${yaw}: ribs`);
    for (const rib of scene.ribs) assert.ok(ord.indexOf(scene.roof[0]) < ord.indexOf(rib), `yaw ${yaw}: roof before rib`);
    for (const key of ['inner','outer','rim']) assert.equal(scene[key].length, 1, `yaw ${yaw}: ${key}`);
    assert.ok(ord.indexOf(scene.inner[0]) < ord.indexOf(scene.outer[0]), `yaw ${yaw}: inner tyre before outer tyre`);
    assert.ok(ord.indexOf(scene.outer[0]) < ord.indexOf(scene.rim[0]), `yaw ${yaw}: outer tyre before rim`);
  }
});

test('full automatic cycle presses after each pack and finishes with mechanisms home', () => {
  const st = api.makeState(), h = api.harness(st), order = [];
  h.toggleAuto();
  let previous = null;
  for (let i = 0; i < 2000 && (st.auto || st.cur || h.count); i++) {
    const id = st.cur && st.cur.id;
    if (id && id !== previous) order.push(id);
    previous = id;
    h.tick(.05);
  }
  assert.deepEqual(order, ['hook','lift','tip','pack','press','hook','lift','tip','pack','press','dump']);
  assert.equal(st.load, 0);
  assert.equal(st.auto, false);
  assert.equal(st.cur, null);
  for (const key of ['hook','clamp','lift','tip','blade','slide','gate','pump']) assert.equal(st[key], 0, key);
  assert.equal(st.act, null);
});

test('pausing auto during assembly cancels pending work and manual explode cancels wait', () => {
  const st = api.makeState(); st.sel = 1; st.subSel = 2; st.pull[2] = 1; st.p[1] = st.tgt[1] = 1;
  const h = api.harness(st); h.toggleAuto();
  assert.equal(st.pending, 'hook'); assert.equal(st.cur, null);
  h.toggleAuto();
  for (let i = 0; i < 100; i++) h.tick(.05);
  assert.equal(st.pending, null); assert.equal(st.cur, null); assert.equal(st.auto, false);
  st.auto = true; st.autoWait = .25; h.explodeAll();
  for (let i = 0; i < 100; i++) h.tick(.05);
  assert.equal(st.auto, false); assert.equal(st.cur, null); assert.equal(st.pending, null);
  assert.equal(st.tgt[1], 1);
});

test('pending work waits until pulled parts have actually returned', () => {
  const st = api.makeState(); st.subSel = 2; st.pull[2] = 1;
  const h = api.harness(st);
  assert.equal(h.doStep('hook'), false);
  assert.equal(st.pending, 'hook');
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
  assert.equal(st.cur.id, 'hook');
});

test('build from outside the project exactly embeds sorted UTF-8 sources', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'truck-build-test-'));
  try {
    const before = read('truck.html');
    execFileSync('python3', [path.join(root, 'mk.py')], { cwd });
    const html = read('truck.html');
    assert.equal(html, before);
    assert.equal(fs.existsSync(path.join(cwd, 'truck.html')), false);
    const scripts = [...html.matchAll(/<script>\n([\s\S]*?)<\/script>/g)];
    const names = fs.readdirSync(path.join(root, 'src')).filter(name => name.endsWith('.js')).sort();
    assert.equal(scripts.length, 2);
    assert.equal(scripts[0][1], read('core.js') + '\n');
    assert.equal(scripts[1][1], names.map(name => read(path.join('src', name))).join(''));
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

/* ---------- painter's order: ground truth by ray casting, independent of the ordering code ---------- */
const dot3 = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
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

test('every part is a convex solid whose face planes enclose its own points, hoses and bin included', () => {
  const states = [{}, { p: [1,1,1,1,1,1] }, { gate: 1, lift: .6, tip: .5, hook: 1, pump: 1, act: 'lift' }];
  for (const patch of states) {
    const { parts } = api.sceneAt(35, 35.264, patch);
    assert.ok(parts.length > 400);
    for (const p of parts) {
      assert.ok(p.planes && p.planes.length >= 4, `part ${p.n} has planes`);
      for (const [n, d] of p.planes) for (const v of p.pts) assert.ok(dot3(n, v) <= d + 1e-6, `part ${p.n} point outside its plane`);
    }
    const hoses = parts.filter(p => p.hose);
    assert.ok(hoses.length > 20);
    assert.ok(hoses.every(p => p.seg !== undefined && p.pts.length === 8));
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

test('assembled, exploded and working scenes have almost no visibly wrong pairs from any side', () => {
  // before the fix: ~80 wrong pairs and ~1500 square units of wrong overlap per view in the assembled scene
  const scenes = { assembled: {}, exploded: { p: [1,1,1,1,1,1] }, working: { gate: 1, lift: .6, tip: .5, hook: 1, pump: 1, act: 'lift', pile: 1 } };
  let pairs = 0, area = 0, views = 0, worst = 0, worstArea = 0, dropped = 0, tiebreak = 0;
  const byGroup = {};
  for (const [name, patch] of Object.entries(scenes)) for (const [yaw, pitch] of ORDER_VIEWS.filter(([, p]) => name === 'assembled' || p === 35.264)) {
    const scene = api.sceneAt(yaw, pitch, patch), e = rayErrors(scene);
    views++; pairs += e.wrong.length; area += e.area; dropped += scene.stats.dropped; tiebreak += scene.stats.tiebreak;
    worst = Math.max(worst, e.wrong.length); worstArea = Math.max(worstArea, e.area);
    for (const g of e.wrong) byGroup[g] = (byGroup[g] || 0) + 1;
  }
  assert.ok(pairs/views < 18, `average wrong pairs ${pairs/views}`);
  assert.ok(area/views < 60, `average wrong area ${area/views}`);
  assert.ok(worst <= 35 && worstArea < 260, `worst view: ${worst} pairs, area ${worstArea}`);
  assert.ok(dropped/views < 30, `average arcs dropped to break cycles ${dropped/views}`);
  assert.ok(tiebreak/views < 40, `average arcs left to the tie-break ${tiebreak/views}`);
  // the groups named in the bug report: tailgate with hoses and valve block, frame/box, ejector, side panels, engine, axle
  for (const g of ['12-21', '12-20', '6-8', '8-10', '8-11', '5-7', '5-5'])
    assert.ok((byGroup[g] || 0) <= 2, `group ${g}: ${byGroup[g]} wrong pair-views of ${views}`);
  assert.ok((byGroup['2-6'] || 0) <= 12 && (byGroup['6-6'] || 0) <= 60, `frame groups ${byGroup['2-6']} ${byGroup['6-6']}`);
});

test('the hoses and valve block on the tailgate side are drawn over the tailgate wherever the viewer is on that side', () => {
  // viewer on the truck's left (+y), looking at the tailgate's left side: its valve block (20) and hoses (21) lie outside the gate (12)
  for (const yaw of [95, 110, 125]) for (const pitch of [20, 35.264, 60]) {
    const { parts, ordered } = api.sceneAt(yaw, pitch), pos = new Map(ordered.map((p, i) => [p, i]));
    const gate = parts.filter(p => p.n === 12 && p.shell), valve = parts.filter(p => p.n === 20 && p.box[0][1] > 48.9);
    assert.ok(gate.length && valve.length);
    for (const g of gate) for (const v of valve) if (api.polysOverlap(g.hl, v.hl)) assert.ok(pos.get(g) < pos.get(v), `yaw ${yaw} pitch ${pitch}`);
  }
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

/* ---------- skins (涂装) and bins (垃圾桶) ---------- */
const HEX = /^#[0-9a-f]{6}$/;
const ORIGINAL_PAINT = {          // the colours before skins existed
  CABW: { l:'#fbfaf5', m:'#e4e4dd', d:'#bfc2bc' }, GRN: { l:'#80c556', m:'#5fa43c', d:'#376a22' },
  GRND: { l:'#5fa43c', m:'#4a8a2e', d:'#2a5218' }, ORG: { l:'#f7a83e', m:'#df842b', d:'#9c5414' }, RFL: '#e8463a' };
const STYLES = { wheelie: [120, 240, 360], cart4: [660, 1100], drum: [100, 200], dome: [120, 240], pedal: [120, 240] }, TYPES = ['kitchen', 'other', 'recycle', 'hazard'];
const COMBOS = Object.entries(STYLES).flatMap(([style, sizes]) => sizes.map(size => ({ style, size })));      // every style x size
const spec = (style, size) => api.binSpec({ binStyle: style, binSize: size });
const HOOKED = { hook: 1, clamp: 1, lift: .6, tip: .5, lidA: .6, pour: .3, hop: .3, binFull: .6 };
const J = v => JSON.parse(JSON.stringify(v));            // plain objects: values made inside the vm have another Object
const sceneSvg = scene => scene.parts.map(p => p.svg).join('');
test.afterEach(() => { api.applySkin('classic'); });

test('the default skin is the original paint, value for value, and nothing else is repainted', () => {
  assert.deepEqual(J(api.palettes), ORIGINAL_PAINT);
  assert.equal(api.applySkin('classic'), 'classic');
  assert.deepEqual(J(api.palettes), ORIGINAL_PAINT);
  assert.equal(api.SKINS[0].id, 'classic');
  assert.ok(api.SKINS.length >= 6);
  assert.equal(new Set(api.SKINS.map(s => s.id)).size, api.SKINS.length);
  });

test('every skin has complete valid palettes, repaints the scene and can be taken off again', () => {
  const classic = sceneSvg(api.sceneAt(35, 35.264));
  for (const sk of api.SKINS) {
    assert.equal(api.applySkin(sk.id), sk.id);
    const pal = J(api.palettes);
    for (const key of ['CABW', 'GRN', 'GRND', 'ORG']) for (const tone of ['l', 'm', 'd']) assert.match(pal[key][tone], HEX, `${sk.id} ${key}.${tone}`);
    assert.match(pal.RFL, HEX, `${sk.id} RFL`);
    assert.match(sk.dot, HEX);
    assert.ok(sk.name.length >= 2);
    for (const [yaw, patch] of [[35, {}], [200, { gate: 1 }], [120, { p: [1,1,1,1,1,1] }]]) {
      const scene = api.sceneAt(yaw, 35.264, patch), svg = sceneSvg(scene);
      assert.ok(scene.parts.length > 300, `${sk.id}: renders`);
      assert.doesNotMatch(svg, /NaN|undefined/);
    }
    const svg = sceneSvg(api.sceneAt(35, 35.264));
    if (sk.id === 'classic') assert.equal(svg, classic);
    else {
      assert.notEqual(svg, classic, `${sk.id} looks different`);
      assert.ok([sk.GRN.l, sk.GRN.m, sk.GRN.d, sk.GRND.m, sk.GRND.d].some(c => svg.includes(c)), `${sk.id}: box colour is drawn`);
    }
    // the see-through / selection system colours do not change with the paint
    assert.deepEqual(J(vm.runInContext('SYSC', ctx)), ['', '#3b7be0', '#45a33a', '#ef8a1c', '#5a50d4', '#e0463a']);
  }
  api.applySkin('classic');
  assert.equal(sceneSvg(api.sceneAt(35, 35.264)), classic);
});

test('an unknown skin falls back to the original paint; ?skin and ?bin parameters are validated', () => {
  api.applySkin('sky');
  for (const bad of ['', 'nope', undefined, null, '__proto__', 'SKY', 7]) {
    assert.equal(api.applySkin(bad), 'classic', String(bad));
    assert.deepEqual(J(api.palettes), ORIGINAL_PAINT);
    api.applySkin('sky');
  }
  const look = qs => { const st = api.makeState(); api.lookParams(st, new URLSearchParams(qs)); return st; };
  assert.deepEqual([look('skin=forest').skin, look('skin=forest').binSize, look('skin=forest').binType], ['forest', 240, 'kitchen']);
  assert.equal(look('skin=bad').skin, 'classic');
  assert.deepEqual(J(api.palettes), ORIGINAL_PAINT);
  assert.equal(look('').skin, 'classic');
  const bin = look('bin=660&binType=hazard');
  assert.deepEqual([bin.binSize, bin.binType], [660, 'hazard']);
  for (const q of ['bin=999&binType=x', 'bin=abc', 'bin=', 'bin=-120', 'bin=240.5', 'binType=KITCHEN', 'bin=0x78']) {
    const st = look(q);
    assert.deepEqual([st.binSize, st.binType], [240, 'kitchen'], q);
  }
  assert.equal(look('bin=120').binType, 'kitchen');
  assert.equal(look('binType=recycle').binSize, 240);
});

/* ---------- 无极调色板: the custom paint ---------- */
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
  for (const c of CUSTOM_SAMPLES) for (const z of ['body', 'cab', 'lift']) {
    const tones = J(api.zoneTones(z, c));
    assert.equal(tones.length, z === 'body' ? 2 : 1);
    tones.forEach((t, n) => {                // n = 1 is the tailgate, whose light tone is the box's mid (a gentler first step)
      for (const k of ['l', 'm', 'd']) assert.match(t[k], HEX, `${c} ${z}.${k}`);
      assert.ok(lum(t.l) - lum(t.m) > (n ? .02 : .03), `${c} ${z}: light ${t.l} vs mid ${t.m}`);
      assert.ok(lum(t.m) - lum(t.d) > (n ? .02 : .03), `${c} ${z}: mid ${t.m} vs dark ${t.d}`);
    });
    if (z === 'body') {   // the tailgate's tones too: the box mid is its light tone, and it is darker below
      const [g, gd] = tones; assert.equal(gd.l, g.m); assert.ok(lum(gd.l) > lum(gd.m) && lum(gd.m) > lum(gd.d), `${c} tailgate`);
    }
  }
  // the extremes are spread wide enough to read, not just ordered
  const black = J(api.zoneTones('body', '#000000'))[0], white = J(api.zoneTones('body', '#ffffff'))[0];
  assert.ok(lum(black.l) - lum(black.m) > .25, `black: ${JSON.stringify(black)}`);
  assert.ok(lum(white.m) - lum(white.d) > .25, `white: ${JSON.stringify(white)}`);
  assert.ok(lum(black.m) > 0 && lum(white.m) < 1);
  // an ordinary colour keeps its own value as the mid tone
  for (const c of ['#7b3fe4', '#e8348c', '#a8e63c', '#4c9be0']) assert.equal(J(api.zoneTones('body', c))[0].m, c);
  // a colour that is some preset's own zone colour keeps that preset's hand-tuned tones
  assert.deepEqual(J(api.zoneTones('body', '#5fa43c')), [ORIGINAL_PAINT.GRN, ORIGINAL_PAINT.GRND]);
  assert.deepEqual(J(api.zoneTones('cab', '#e4e4dd')), [ORIGINAL_PAINT.CABW]);
  assert.deepEqual(J(api.zoneTones('lift', '#df842b')), [ORIGINAL_PAINT.ORG]);
});

test('paintOf gives each preset its zone colours; applying them back reproduces the preset', () => {
  for (const sk of api.SKINS) {
    const p = J(api.paintOf(sk.id));
    assert.deepEqual(p, { body: sk.GRN.m, cab: sk.CABW.m, lift: sk.ORG.m });
    for (const v of Object.values(p)) assert.match(v, HEX);
    api.applySkin(sk.id); const preset = J(api.palettes);
    assert.equal(api.applyPaint(p), 'custom');
    const custom = J(api.palettes);
    // the tones of an untouched zone are the preset's own; only the stripe red is the fixed custom one
    assert.deepEqual([custom.GRN, custom.GRND, custom.CABW, custom.ORG], [preset.GRN, preset.GRND, preset.CABW, preset.ORG], sk.id);
    assert.equal(custom.RFL, '#e8463a');
  }
  assert.deepEqual(J(api.paintOf('nope')), J(api.paintOf('classic')));
  assert.deepEqual(J(api.paintOf(undefined)), { body: '#5fa43c', cab: '#e4e4dd', lift: '#df842b' });
});

test('a custom paint repaints only the box, cab, lifter and stripes; presets are untouched by it', () => {
  const SYSC0 = J(vm.runInContext('SYSC', ctx)), others = () => J(vm.runInContext('({ BLU, CHS, TYRE, RIM, RED, ENG, ALU, RUB, GBIN, AMB, GLASS, INK, METAL, DARK, CLEAR, CERAMIC })', ctx)), others0 = others();
  const paintTokens = p => [p.GRN.l, p.GRN.m, p.GRN.d, p.GRND.l, p.GRND.m, p.GRND.d, p.CABW.l, p.CABW.m, p.CABW.d, p.ORG.l, p.ORG.m, p.ORG.d, p.RFL];
  for (const [yaw, patch] of [[35, {}], [120, { gate: 1 }], [200, { p: [1, 1, 1, 1, 1, 1] }], [300, { hook: 1, clamp: 1, lift: .6, tip: .5, lidA: .6 }]]) {
    api.applySkin('classic');
    const classic = api.sceneAt(yaw, 35.264, patch).parts.map(p => p.svg), classicTokens = paintTokens(J(api.palettes));
    assert.equal(api.applyPaint({ body: '#7b3fe4', cab: '#e8348c', lift: '#a8e63c' }), 'custom');
    const pal = J(api.palettes), custom = api.sceneAt(yaw, 35.264, patch).parts.map(p => p.svg);
    assert.equal(custom.length, classic.length);
    let changed = 0;
    custom.forEach((svg, i) => {
      assert.doesNotMatch(svg, /NaN|undefined/);
      if (svg === classic[i]) return;
      changed++;
      assert.ok(classicTokens.some(c => classic[i].includes(c)), `part ${i} changed but was not painted with the truck's paint`);
      assert.ok(paintTokens(pal).some(c => svg.includes(c)), `part ${i} changed but does not show the custom paint`);
    });
    assert.ok(changed > 20, `${yaw}: ${changed} parts repainted`);
    assert.ok(changed < classic.length - 150, `${yaw}: most parts keep their colour (${changed} of ${classic.length})`);
    assert.deepEqual(J(vm.runInContext('SYSC', ctx)), SYSC0);
    assert.deepEqual(others(), others0);
  }
  // the three zones are independent: change only the cab and only the cab's parts change
  api.applyPaint({ body: '#7b3fe4', cab: '#e8348c', lift: '#a8e63c' }); const a = api.sceneAt(35, 35.264).parts.map(p => p.svg), palA = J(api.palettes);
  api.applyPaint({ body: '#7b3fe4', cab: '#33aaff', lift: '#a8e63c' }); const b = api.sceneAt(35, 35.264).parts.map(p => p.svg), palB = J(api.palettes);
  assert.deepEqual([palB.GRN, palB.GRND, palB.ORG, palB.RFL], [palA.GRN, palA.GRND, palA.ORG, palA.RFL]);
  assert.notDeepEqual(palB.CABW, palA.CABW);
  b.forEach((svg, i) => { if (svg !== a[i]) assert.ok([palA.CABW.l, palA.CABW.m, palA.CABW.d].some(c => a[i].includes(c)), `part ${i}`); });
  assert.ok(b.some((svg, i) => svg !== a[i]));
  // and back to a preset: the scene is the preset's again, value for value
  api.applySkin('classic'); assert.deepEqual(J(api.palettes), ORIGINAL_PAINT);
});

test('every colour renders a whole scene (no NaN, valid fills), even pure black and white', () => {
  for (const c of ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff']) {
    api.applyPaint({ body: c, cab: c, lift: c });
    const svg = sceneSvg(api.sceneAt(35, 35.264));
    assert.doesNotMatch(svg, /NaN|undefined/);
    for (const m of svg.matchAll(/fill="(#[^"]*)"/g)) assert.match(m[1], /^#[0-9a-f]{6}$/, c);
  }
});

test('?body ?cab ?lift make a custom paint on top of ?skin; invalid values fall back silently', () => {
  const look = qs => { const st = api.makeState(); api.lookParams(st, new URLSearchParams(qs)); return J({ skin: st.skin, paint: st.paint, pal: api.palettes }); };
  const base = { body: '#5fa43c', cab: '#e4e4dd', lift: '#df842b' };
  assert.deepEqual(look('body=ff8800').paint, { ...base, body: '#ff8800' });
  assert.equal(look('body=ff8800').skin, 'custom');
  assert.deepEqual(look('body=%23FF8800&cab=%2333aaff&lift=123456').paint, { body: '#ff8800', cab: '#33aaff', lift: '#123456' });
  assert.deepEqual(look('lift=%232244AA').paint, { ...base, lift: '#2244aa' });
  assert.deepEqual(look('skin=orange&cab=ffffff').paint, { body: '#ef8a2c', cab: '#ffffff', lift: '#5a6572' });
  assert.deepEqual(look('skin=nope&cab=ffffff').paint, { ...base, cab: '#ffffff' });
  assert.equal(look('body=ff8800').pal.GRN.m, '#ff8800');
  assert.equal(look('cab=ffffff').pal.GRN.m, '#5fa43c');            // unnamed zones keep the base paint
  // invalid: the zone keeps the base colour; with nothing valid at all it is the plain preset
  assert.deepEqual(look('body=zzzzzz&cab=ffffff').paint, { ...base, cab: '#ffffff' });
  for (const q of ['body=zz', 'body=', 'body=12345', 'body=1234567', 'body=%23', 'body=f80', 'cab=null', 'lift=0.5', 'body=red&cab=rgb(1,2,3)']) {
    const r = look(q); assert.equal(r.skin, 'classic', q); assert.deepEqual(r.paint, base, q); assert.deepEqual(r.pal, ORIGINAL_PAINT, q);
  }
  assert.equal(look('skin=sky&body=zz').skin, 'sky');
  assert.equal(look('').skin, 'classic');
  assert.equal(look('').paint.body, '#5fa43c');
});

test('the picker edits: first edit turns the truck custom, a preset afterwards resets the picker colours, storage is only written on commit', () => {
  const writes = []; ctx.localStorage = { getItem: () => null, setItem: (k, v) => writes.push([k, v]) };
  try {
    const st = api.makeState(); api.lookParams(st, new URLSearchParams('skin=orange')); api.setUi(st);
    assert.deepEqual([st.skin, st.paint.body], ['orange', '#ef8a2c']);
    assert.equal(api.skinDot(st), '#ef8a2c');
    api.setZone('cab', '#336699');
    assert.deepEqual([st.skin, J(st.paint)], ['custom', { body: '#ef8a2c', cab: '#336699', lift: '#5a6572' }]);
    assert.equal(api.palettes.CABW.m, '#336699');
    assert.equal(api.palettes.GRN.m, '#ef8a2c');
    assert.deepEqual(J(api.palettes).ORG, J(api.skinOf('orange').ORG));    // the zones that were not edited keep the preset's own tones
    api.setZone('body', '#102030'); assert.equal(api.skinDot(st), '#102030');
    for (let i = 0; i < 50; i++) api.setZone('body', api.hsvHex(i*7, 1, 1));
    assert.equal(writes.length, 0, 'dragging does not write storage');
    api.paintStore(st); assert.equal(writes.length, 1);
    assert.deepEqual(JSON.parse(writes[0][1]), { skin: 'custom', paint: J(st.paint) });
    api.setSkin('sky', true);
    assert.deepEqual([st.skin, J(st.paint)], ['sky', J(api.paintOf('sky'))]);
    assert.equal(writes.length, 2);
    assert.deepEqual(JSON.parse(writes[1][1]), { skin: 'sky', paint: J(api.paintOf('sky')) });
    // the preset list has a heading and a chip each; none is current while custom
    const items = api.skinChoices(st); assert.deepEqual(J(items[0]), { heading: '预设' }); assert.equal(items.length, api.SKINS.length + 1);
    assert.equal(items.filter(c => c.current).length, 1);
    api.setZone('lift', '#ffffff'); assert.equal(api.skinChoices(st).filter(c => c.current).length, 0);
  } finally { delete ctx.localStorage; }
});

test('storage round trip, old string values, garbage and blocked storage', () => {
  const mem = {}, fake = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } };
  const look = qs => { const st = api.makeState(); api.lookParams(st, new URLSearchParams(qs)); return J({ skin: st.skin, paint: st.paint, grn: api.palettes.GRN.m }); };
  ctx.localStorage = fake;
  try {
    // custom colours survive a round trip
    const st = api.makeState(); st.skin = 'custom'; st.paint = { body: '#ff8800', cab: '#33aaff', lift: '#123456' };
    api.paintStore(st);
    assert.deepEqual(J(api.paintStored()), { skin: 'custom', paint: st.paint });
    assert.deepEqual(look(''), { skin: 'custom', paint: st.paint, grn: '#ff8800' });
    assert.deepEqual(look('skin=sky').skin, 'sky');                       // the URL wins over storage
    assert.deepEqual(look('body=00ff00').paint, { body: '#00ff00', cab: '#e4e4dd', lift: '#df842b' });
    // a preset round trip
    st.skin = 'forest'; api.paintStore(st); assert.deepEqual(look(''), { skin: 'forest', paint: J(api.paintOf('forest')), grn: '#2f6f4d' });
    // the first version stored a bare preset id under another key
    for (const k in mem) delete mem[k];
    mem['garbage-truck.skin'] = 'graphite'; assert.equal(look('').skin, 'graphite');
    mem['garbage-truck.skin'] = 'custom'; assert.equal(look('').skin, 'classic');
    // garbage in either key is ignored; a half-valid custom paint is repaired zone by zone
    for (const junk of ['', 'not json {', 'null', '[]', '7', '"sky"', '{"skin":"nope"}', '{"skin":42}', '{}', '{"skin":"__proto__"}', 'undefined']) {
      for (const k in mem) delete mem[k];
      mem['garbage-truck.paint'] = junk; const r = look(''); assert.equal(r.skin, 'classic', junk); assert.equal(r.grn, '#5fa43c', junk);
      assert.equal(api.paintStored(), null, junk);
    }
    mem['garbage-truck.paint'] = '{"skin":"custom","paint":{"body":"#ABCDEF","cab":"zz","lift":7}}';
    assert.deepEqual(look('').paint, { body: '#abcdef', cab: '#e4e4dd', lift: '#df842b' });
    mem['garbage-truck.paint'] = '{"skin":"custom","paint":"x"}';
    assert.deepEqual([look('').skin, look('').paint.body], ['custom', '#5fa43c']);
    // a stored preset takes the picker colours of that preset, whatever paint the entry carries
    mem['garbage-truck.paint'] = '{"skin":"sky","paint":{"body":"#ff0000"}}';
    assert.deepEqual(look('').paint, J(api.paintOf('sky')));
  } finally { delete ctx.localStorage; }
  // blocked storage (the accessor throws) and a storage whose calls throw: everything still works, nothing throws
  Object.defineProperty(ctx, 'localStorage', { get() { throw new Error('blocked'); }, configurable: true });
  try {
    assert.equal(api.paintStored(), null);
    assert.doesNotThrow(() => api.paintStore({ skin: 'custom', paint: { body: '#ff8800', cab: '#ffffff', lift: '#000000' } }));
    assert.equal(look('').skin, 'classic');
    assert.equal(look('body=ff8800').skin, 'custom');
  } finally { delete ctx.localStorage; }
  ctx.localStorage = { getItem() { throw new Error('boom'); }, setItem() { throw new Error('full'); } };
  try {
    assert.equal(api.paintStored(), null); assert.doesNotThrow(() => api.paintStore({ skin: 'sky', paint: {} })); assert.equal(look('skin=sky').skin, 'sky');
  } finally { delete ctx.localStorage; }
  assert.equal(api.paintStored(), null);                                // no storage at all
});

test('?lift=RRGGBB is a colour while ?lift=<number> is still the mechanism state', () => {
  const look = qs => { const st = api.makeState(); api.lookParams(st, new URLSearchParams(qs)); return st; };
  // lookParams does not read the mechanism numbers (the figure's params() does): the guard lives in the same expression as the others
  assert.match(read('src/i_ui.js'), /!\(k === 'lift' && urlHex\(q\.get\(k\)\)\)/);
  assert.equal(look('lift=ff8800').paint.lift, '#ff8800');
  assert.equal(look('lift=1').skin, 'classic');
  assert.equal(look('lift=.5').skin, 'classic');
});

test('the 240 L kitchen bin is the original green bin, point for point', () => {
  const fixture = JSON.parse(read('tests/fixtures/bin240-baseline.json')), crypto = require('node:crypto');
  const states = [
    ['45/0', 45, {}], ['45/1', 45, { hook: 1, clamp: 1, lift: 1, tip: 1, lidA: 1, pour: .5, hop: .5, binFull: .5 }],
    ['45/3', 45, { hook: 1, clamp: 1, lift: .5, tip: .3, lidA: .3, binFull: .5 }],
    ['45/4', 45, { hook: 1, clamp: 1, lift: 1, tip: .5, lidA: .5, pour: .3, binFull: .7 }],
    ['135/1', 135, { hook: 1, clamp: 1, lift: 1, tip: 1, lidA: 1, pour: .5, hop: .5, binFull: .5 }]];
  for (const [key, yaw, patch] of states) {
    const { all } = api.binParts(patch, yaw), parts = all.filter(p => p.n === 14), want = fixture.scenes[key];
    assert.equal(parts.length, want.length, key);
    parts.forEach((p, i) => {
      assert.equal(crypto.createHash('md5').update(p.svg).digest('hex'), want[i].svg, `${key} part ${i}: drawing`);
      assert.equal(p.pts.length, want[i].pts.length);
      p.pts.forEach((v, k) => v.forEach((x, c) => assert.ok(Math.abs(x - want[i].pts[k][c]) < 1e-8, `${key} part ${i} point ${k}`)));
    });
  }
  const st = api.makeState();
  assert.equal(api.binSpec(st).id, 240);
  assert.equal(api.binSpec(st).dz, 0);
  assert.equal(api.binLoadStep(st), .2);
});

test('there are five distinct styles, each with its own sizes, and every style x size x type renders whole as convex parts', () => {
  assert.deepEqual(J(api.BIN_STYLES.map(s => s.id)), Object.keys(STYLES));
  assert.deepEqual(J(Object.fromEntries(api.BIN_STYLES.map(s => [s.id, s.sizes]))), STYLES);
  assert.deepEqual(J(api.BIN_TYPES.map(t => t.id).sort()), [...TYPES].sort());
  for (const s of api.BIN_STYLES) { assert.ok(s.sizes.includes(s.dflt), `${s.id}: default size`); assert.ok(s.name.length >= 3); }
  assert.equal(new Set(api.BIN_STYLES.map(s => s.name)).size, api.BIN_STYLES.length);
  // the styles really differ: another set of parts, not only another colour (compare the shapes of the 240-ish bin of each style)
  const shapes = new Set(), sizeOf = { wheelie: 240, cart4: 660, drum: 200, dome: 240, pedal: 240 };
  for (const [style, size] of Object.entries(sizeOf)) {
    const { bin } = api.binParts({ binStyle: style, binSize: size }, 35);
    shapes.add(bin.map(p => p.pts.length).join(','));
    assert.ok(bin.length >= 8, `${style}: parts (${bin.length})`);
  }
  assert.equal(shapes.size, 5, 'five different constructions');
  for (const { style, size } of COMBOS) for (const type of TYPES) for (const patch of [{}, HOOKED, { ...HOOKED, lidA: 0, tip: 0, lift: 0 }, ...(type === 'hazard' ? [{ p: [1,1,1,1,1,1] }] : [])]) {
    const { all, bin } = api.binParts({ ...patch, binStyle: style, binSize: size, binType: type }, 35);
    const what = `${style} ${size}L ${type}`;
    assert.ok(bin.length >= 8, `${what}: bin parts (${bin.length})`);
    for (const p of all.filter(p => p.fr === 'bin')) {
      assert.ok(p.planes && p.planes.length >= 4, `${what}: planes`);
      for (const [n, d] of p.planes) for (const v of p.pts) assert.ok(dot3(n, v) <= d + 1e-6, `${what}: point outside its own face plane`);
      for (const v of p.pts) for (const x of v) assert.ok(Number.isFinite(x), `${what}: finite`);
    }
    const color = api.BIN_TYPES.find(t => t.id === type).mat;
    assert.ok(bin.some(p => p.svg.includes(color.m) || p.svg.includes(color.l) || p.svg.includes(color.d)), `${what}: painted in its type colour`);
    if (patch === HOOKED || type === 'hazard') {
      const scene = api.sceneAt(35, 35.264, { ...patch, binStyle: style, binSize: size, binType: type });
      assert.equal(scene.ordered.length, scene.parts.length);
      assert.doesNotMatch(sceneSvg(scene), /NaN|undefined/, what);
    }
    // a waste type that is not the kitchen one shows its marking on every style
    if (type !== 'kitchen' && patch === HOOKED) {
      const mark = { other: '#c8cdd2', recycle: '#f4f1ea', hazard: '#f3c21e' }[type];
      assert.ok(bin.some(p => p.svg.includes(mark)), `${what}: shows the ${type} marking`);
    }
  }
});

test('bins fit the lifter: width within the carriage, lip on the comb, front clear of the plate and clamp bar, ground at z 0 (every style and size)', () => {
  for (const { style, size } of COMBOS) for (const type of TYPES) {
    const what = `${style} ${size}L ${type}`, bs = spec(style, size);
    // standing free (hook 0 shifts the whole bin 8 back; nothing is lifted): on the ground, centred on the carriage, within its width
    const free = api.binParts({ binStyle: style, binSize: size, binType: type }).bin.flatMap(p => p.pts);
    const lo = (pts, i) => Math.min(...pts.map(v => v[i])), hi = (pts, i) => Math.max(...pts.map(v => v[i]));
    assert.ok(hi(free, 1) - lo(free, 1) <= 24 + 1e-6, `${what}: width ${hi(free, 1) - lo(free, 1)}`);
    assert.ok(Math.abs((hi(free, 1) + lo(free, 1))/2 - api.YC) < 1e-6, `${what}: centred on the carriage`);
    assert.ok(Math.abs(lo(free, 2)) < 1e-6, `${what}: stands on the ground`);
    // the lip bar: inside the clamp's width, resting with its underside on the comb teeth (top z 20.6) once hooked on
    assert.ok(bs.lip.hy <= 6.8 && bs.lip.hy >= 3.5, `${what}: lip half width`);
    assert.ok(Math.abs(bs.lip.z0 + bs.dz - 20.6) < 1e-9 && bs.dz >= 0, `${what}: lip meets the comb`);
    assert.ok(bs.lip.x1 > 2.6 && bs.lip.x0 < 2.6 && bs.lip.x1 <= 3.81, `${what}: lip spans the comb teeth`);
    // hooked on (the frames are the identity when nothing is lifted: world = the bin's own frame, raised by dz): behind the carriage
    // plate (x 2.6, z 14..19.6) except the lip and the rim above it; above the lip clear of the clamp bar (x 1.7, z >= 21.8)
    const hooked = api.binParts({ hook: 1, binStyle: style, binSize: size, binType: type }).bin.flatMap(p => p.pts);
    assert.ok(Math.abs(lo(hooked, 2) - bs.dz) < 1e-6, `${what}: raised by dz`);
    assert.ok(Math.abs(hi(hooked, 0) - 3.8) < 1e-6, `${what}: the lip bar is the front-most thing, at x 3.8`);
    for (const v of hooked) {
      if (v[0] > 2.65) assert.ok(v[2] >= 19.55 && v[0] <= 3.81, `${what}: only the rim and lip reach the comb (x ${v[0]} z ${v[2]})`);
      if (v[2] > 21.75) assert.ok(v[0] <= 1.7, `${what}: clear of the clamp bar (x ${v[0]} z ${v[2]})`);
    }
    assert.ok(bs.wheelList.every(w => w.y1 <= 12 && w.z === w.r), `${what}: wheels stay inside the width`);
    assert.equal(bs.wheelList.length > 0, style !== 'drum', `${what}: only the drum has no wheels`);
  }
});

test('the styles keep their own look: wheel counts, lids, details', () => {
  const count = (style, size, re) => api.binParts({ binStyle: style, binSize: size, binType: 'recycle' }).bin.filter(p => re.test(p.svg)).length;
  assert.equal(spec('cart4', 660).wheelList.length*2, 4);                       // two wheel pairs: four wheels
  assert.equal(spec('cart4', 1100).wheelList.length*2, 4);
  assert.equal(spec('wheelie', 240).wheelList.length*2, 2);
  assert.equal(spec('drum', 200).n >= 12 && spec('drum', 200).n <= 16, true);
  assert.equal(spec('drum', 200).hoops.length, 2);
  // 1100 L is bigger mainly in depth and height, not width
  const ext = (style, size, i) => { const v = api.binParts({ binStyle: style, binSize: size }).bin.flatMap(p => p.pts).map(p => p[i]); return Math.max(...v) - Math.min(...v); };
  assert.ok(ext('cart4', 1100, 0) > ext('cart4', 660, 0) + 4 && ext('cart4', 1100, 2) > ext('cart4', 660, 2) + 2 && ext('cart4', 1100, 1) <= 24);
  assert.ok(ext('drum', 200, 2) > ext('drum', 100, 2) && ext('dome', 240, 2) > ext('dome', 120, 2));
  // the pedal and its lift rod sit on the back (-x) wall, away from the truck
  const pedal = api.binParts({ binStyle: 'pedal', binSize: 240 }).bin, wheelie = api.binParts({ binStyle: 'wheelie', binSize: 240 }).bin;
  const minX = ps => Math.min(...ps.flatMap(p => p.pts).map(v => v[0]));
  assert.ok(minX(pedal) < minX(wheelie) - 1, 'the pedal reaches out behind the bin');
  assert.ok(pedal.length > wheelie.length - 1);
  // a two-flap lid is two parts, a dome is a stack: more parts than a flat lid
  assert.ok(api.binParts({ binStyle: 'cart4', binSize: 660 }).bin.length > api.binParts({ binStyle: 'wheelie', binSize: 360 }).bin.length);
  assert.ok(api.binParts({ binStyle: 'dome', binSize: 240 }).bin.length >= api.binParts({ binStyle: 'wheelie', binSize: 240 }).bin.length + 4);
});

test('a hooked bin of every style and size rides the carriage; a free one does not turn with the gate', () => {
  for (const { style, size } of COMBOS) {
    const st = api.makeState(); st.binStyle = style; st.binSize = size;
    const bs = api.binSpec(st), e = [0, .2, .4, .6, 0, 0], p = [-5, 25, 10], n = [1, 0, 0], what = `${style} ${size}L`;
    const a = {}, an = {}, b = {}, bn = {};
    api.makeFrames(st, e, a, an); st.gate = 1; api.makeFrames(st, e, b, bn);
    assert.deepEqual(Array.from(b.bin(p)), Array.from(a.bin(p)), `${what}: free bin stays when the gate opens`);
    st.hook = 1; st.lift = .5; st.tip = .5;
    api.makeFrames(st, e, b, bn);
    assert.deepEqual(Array.from(b.bin(p)), Array.from(b.carr([p[0], p[1], p[2] + bs.dz])), `${what}: hooked`);
    assert.deepEqual(Array.from(bn.bin(n)), Array.from(bn.carr(n)));
    // while hooking on, a low bin rises to the comb by dz; the others do not move up or down
    st.hook = .5; st.gate = 0; st.lift = 0; st.tip = 0; api.makeFrames(st, [0, 0, 0, 0, 0, 0], b, bn);
    assert.ok(Math.abs(b.bin(p)[2] - (p[2] + .5*bs.dz)) < 1e-9, `${what}: rises by dz while hooking`);
  }
  assert.equal(spec('wheelie', 120).dz > 0, true);
  for (const [style, size] of [['wheelie', 240], ['wheelie', 360], ['cart4', 660], ['cart4', 1100], ['dome', 240]]) assert.equal(spec(style, size).dz, 0, `${style} ${size}`);
  assert.ok(spec('drum', 100).dz > spec('drum', 200).dz && spec('drum', 200).dz > 0);
});

test('a hooked, tipped bin of every style and size keeps clear of the lifter parts', () => {
  for (const { style, size } of COMBOS) for (const tip of [0, .5, 1]) {
    const { all, bin } = api.binParts({ hook: 1, clamp: 1, lift: tip ? 1 : 0, tip, lidA: tip ? 1 : 0, binStyle: style, binSize: size });
    const others = all.filter(p => p.fr !== 'bin' && p.planes && !p.hose && p.n !== 12 && p.n !== 24 && p.n !== 8);
    for (const b of bin) for (const o of others) {
      let deep = 0;
      for (const v of b.pts) { let m = 1e9; for (const [nn, d] of o.planes) m = Math.min(m, d - dot3(nn, v)); deep = Math.max(deep, m); }
      assert.ok(deep < .7, `${style} ${size}L tip ${tip}: bin goes ${deep.toFixed(2)} into part ${o.n}`);
    }
  }
});

test('bin parts are drawn in the right order against the lifter, whatever the style and size', () => {
  const base = {};
  for (const { style, size } of COMBOS) {
    let area = 0, pairs = 0;
    for (const [yaw, pitch] of [[45, 35.264], [120, 30], [200, 35.264], [300, 45]]) {
      const scene = api.sceneAt(yaw, pitch, { hook: 1, clamp: 1, lift: .5, tip: .3, lidA: .3, binStyle: style, binSize: size }), e = rayErrors(scene);
      for (const g of e.wrong) if (/^14-/.test(g) || /-14$/.test(g) || /^15-/.test(g)) pairs++;
      area += e.area;
    }
    base[`${style}${size}`] = { pairs, area };
  }
  for (const { style, size } of COMBOS) {
    const b = base[`${style}${size}`], ref = base.wheelie240;
    assert.ok(b.pairs <= ref.pairs + 4, `${style} ${size}L wrong pairs ${b.pairs} vs 240L ${ref.pairs}`);
    assert.ok(b.area <= ref.area + 40, `${style} ${size}L wrong area ${b.area} vs 240L ${ref.area}`);
  }
});

test('a tipped bin of every style and size, in the working pose, is drawn in order from every side', () => {
  for (const { style, size } of COMBOS) {
    let area = 0, pairs = 0;
    for (const [yaw, pitch] of [[45, 35.264], [140, 32], [230, 35.264]]) {
      const scene = api.sceneAt(yaw, pitch, { hook: 1, clamp: 1, lift: 1, tip: .6, lidA: .9, pour: .4, hop: .3, binFull: .6, binStyle: style, binSize: size }), e = rayErrors(scene);
      for (const g of e.wrong) if (/^14-/.test(g) || /-14$/.test(g)) pairs++;
      area += e.area;
    }
    assert.ok(pairs <= 14 && area < 200, `${style} ${size}L: ${pairs} wrong bin pairs, area ${area.toFixed(0)}`);
  }
});

test('refuse pours from the real mouth of every bin, and nothing in the drawing is NaN', () => {
  for (const { style, size } of COMBOS) {
    const bs = spec(style, size), m = bs.mouth;
    assert.ok(bs.pourX > m.x0 && bs.pourX < m.x1, `${style} ${size}L: pour x ${bs.pourX} inside the mouth ${m.x0}..${m.x1}`);
    assert.ok(bs.pourSpread/2 <= m.hy + 1e-9, `${style} ${size}L: pour spread inside the mouth`);
    assert.ok(Math.abs(bs.pourZ - bs.zt) < 1.2, `${style} ${size}L: pour starts at the rim`);
    assert.ok(m.lx0 >= m.x0 && m.lx1 <= m.x1 && m.lhy <= m.hy, `${style} ${size}L: refuse lumps stay in the mouth`);
    const scene = api.sceneAt(35, 35.264, { hook: 1, clamp: 1, lift: 1, tip: .7, lidA: 1, pour: .5, hop: .3, binFull: .5, binStyle: style, binSize: size });
    assert.doesNotMatch(sceneSvg(scene), /NaN|undefined/, `${style} ${size}L`);
    // the mouth's point, carried to the world by the bin's frame, is a real point (the particles start from it)
    const f = {}, st = Object.assign(api.makeState(), { hook: 1, clamp: 1, lift: 1, tip: .7 }); api.makeFrames(st, [0, 0, 0, 0, 0, 0], f, {});
    assert.ok(Array.from(f.bin([bs.pourX, api.YC, bs.pourZ])).every(Number.isFinite));
  }
});

test('style and size are validated: unknown styles fall back, a size the style does not make becomes the nearest one', () => {
  assert.equal(api.binStyleOf('wheelie').id, 'wheelie');
  for (const bad of [undefined, null, '', 'nope', '__proto__', 'WHEELIE', 7]) assert.equal(api.binStyleOf(bad).id, 'wheelie', String(bad));
  // nearest allowed size within the style (a tie goes to the larger one)
  const near = (style, v) => api.binSizeFor(style, v);
  assert.equal(near('drum', 240), 200); assert.equal(near('drum', 120), 100); assert.equal(near('drum', 150), 200); assert.equal(near('drum', 1), 100);
  assert.equal(near('cart4', 240), 660); assert.equal(near('cart4', 1000), 1100); assert.equal(near('cart4', 880), 1100); assert.equal(near('cart4', 660), 660);
  assert.equal(near('wheelie', 660), 360); assert.equal(near('wheelie', 100), 120); assert.equal(near('dome', 360), 240); assert.equal(near('pedal', 120), 120);
  for (const v of [undefined, null, '', 'abc', NaN]) assert.equal(near('dome', v), 240, String(v));
  assert.equal(near('nope', 360), 360);                             // unknown style = the default style
  // binSpec follows the same rules for any state, even one that never chose a bin
  assert.equal(api.binSpec({}).style, 'wheelie'); assert.equal(api.binSpec({}).L, 240);
  assert.equal(api.binSpec({ binStyle: 'drum', binSize: 240 }).L, 200);
  assert.equal(api.binSpec({ binStyle: 'cart4', binSize: 120 }).L, 660);
  assert.equal(api.binSpec({ binSize: 660 }).style, 'wheelie');                  // (the URL, not binSpec, infers a style from an old size)
  assert.equal(api.binStyleForSize(660).id, 'cart4'); assert.equal(api.binStyleForSize('1100').id, 'cart4'); assert.equal(api.binStyleForSize(100).id, 'drum');
  assert.equal(api.binStyleForSize(240).id, 'wheelie'); assert.equal(api.binStyleForSize(999), undefined);
});

test('?binStyle / ?bin / ?binType: validated per style, and an old ?bin= link without a style still means the same bin', () => {
  const look = qs => { const st = api.makeState(); api.lookParams(st, new URLSearchParams(qs)); return [st.binStyle, st.binSize, st.binType]; };
  assert.deepEqual(look(''), ['wheelie', 240, 'kitchen']);
  for (const style of Object.keys(STYLES)) {
    for (const size of STYLES[style]) assert.deepEqual(look(`binStyle=${style}&bin=${size}&binType=recycle`), [style, size, 'recycle']);
    assert.equal(look(`binStyle=${style}`)[1], api.BIN_STYLES.find(s => s.id === style).dflt, `${style}: default size`);
    assert.equal(look(`binStyle=${style}&bin=999`)[1], api.BIN_STYLES.find(s => s.id === style).dflt, `${style}: a bad size gives its default`);
    assert.equal(look(`binStyle=${style}&bin=abc`)[1], api.BIN_STYLES.find(s => s.id === style).dflt);
  }
  // a size that belongs to another style is not that style's: its default
  assert.deepEqual(look('binStyle=drum&bin=240'), ['drum', 200, 'kitchen']);
  assert.deepEqual(look('binStyle=cart4&bin=120'), ['cart4', 660, 'kitchen']);
  assert.deepEqual(look('binStyle=wheelie&bin=660'), ['wheelie', 240, 'kitchen']);
  // old links: no style, the style that has that size (the first one when several do)
  assert.deepEqual(look('bin=660'), ['cart4', 660, 'kitchen']);
  assert.deepEqual(look('bin=360&binType=hazard'), ['wheelie', 360, 'hazard']);
  assert.deepEqual(look('bin=120'), ['wheelie', 120, 'kitchen']);
  assert.deepEqual(look('bin=1100'), ['cart4', 1100, 'kitchen']);
  assert.deepEqual(look('bin=100'), ['drum', 100, 'kitchen']);
  // an unknown style is no style: the size is read like an old link
  assert.deepEqual(look('binStyle=nope&bin=660'), ['cart4', 660, 'kitchen']);
  assert.deepEqual(look('binStyle=DRUM&bin=200'), ['drum', 200, 'kitchen']);
  assert.deepEqual(look('binStyle=DRUM&bin=240'), ['wheelie', 240, 'kitchen']);
  for (const q of ['bin=999', 'bin=abc', 'bin=', 'bin=-120', 'bin=240.5', 'bin=0x78', 'binStyle=&bin=', 'binStyle=__proto__']) assert.deepEqual(look(q), ['wheelie', 240, 'kitchen'], q);
  assert.deepEqual(look('binStyle=pedal&binType=KITCHEN'), ['pedal', 240, 'kitchen']);
});

test('the bin label names style, size and type and stays short enough for a phone', () => {
  const lab = (style, size, type) => api.binLabel({ binStyle: style, binSize: size, binType: type });
  assert.equal(lab('drum', 200, 'recycle'), '圆形铁桶 200L 可回收物');
  assert.equal(lab('wheelie', 240, 'kitchen'), '两轮翻盖桶 240L 厨余垃圾');
  for (const { style, size } of COMBOS) for (const type of TYPES) assert.ok(lab(style, size, type).length <= 18, lab(style, size, type));
});

test('the bin picker groups 款式 / 容量 / 分类, lists only the style\'s sizes, and marks the current ones', () => {
  const st = api.makeState(); st.binStyle = 'drum'; st.binSize = 200; st.binType = 'hazard';
  const ch = J(api.binChoices(st)), heads = ch.filter(c => c.heading).map(c => c.heading);
  assert.deepEqual(heads, ['款式', '容量', '分类', '颜色']);
  const group = h => { const i = ch.findIndex(c => c.heading === h); let j = i + 1; const out = []; while (j < ch.length && !ch[j].heading) out.push(ch[j++]); return out; };
  assert.deepEqual(group('款式').map(c => c.label), J(api.BIN_STYLES.map(s => s.name)));
  assert.deepEqual(group('容量').map(c => c.label), ['100L', '200L']);
  assert.equal(group('分类').length, 4); assert.ok(group('分类').every(c => /^#/.test(c.swatch)));
  for (const h of heads.slice(0, 3)) assert.equal(group(h).filter(c => c.current).length, 1, `${h}: one current item`);
  assert.equal(group('款式').find(c => c.current).label, '圆形铁桶'); assert.equal(group('容量').find(c => c.current).label, '200L');
  assert.equal(group('分类').find(c => c.current).label, '有害垃圾');
  st.binStyle = 'cart4'; st.binSize = 1100;
  assert.deepEqual(J(api.binChoices(st)).filter(c => !c.heading && /L$/.test(c.label)).map(c => c.label), ['660L', '1100L']);
});

test('changing the bin is refused while it is hooked or the cycle is running, and otherwise resets it to a full closed bin', () => {
  const st = api.makeState(), h = api.harness(st);
  st.binFull = .3; st.lidA = .5; st.pour = .2;
  api.setBin({ binSize: 360 });
  assert.equal(st.binSize, 360); assert.equal(st.binFull, 1); assert.equal(st.lidA, 0); assert.equal(st.pour, 0);
  api.setBin({ binType: 'hazard' });
  assert.equal(st.binType, 'hazard'); assert.equal(st.binSize, 360); assert.equal(st.binStyle, 'wheelie');
  // choosing a style whose sizes do not include the current one gives the nearest size it has
  api.setBin({ binStyle: 'cart4' });
  assert.deepEqual([st.binStyle, st.binSize], ['cart4', 660]);
  api.setBin({ binSize: 1100 }); api.setBin({ binStyle: 'drum' });
  assert.deepEqual([st.binStyle, st.binSize], ['drum', 200]);
  api.setBin({ binStyle: 'pedal', binSize: 120 });
  assert.deepEqual([st.binStyle, st.binSize], ['pedal', 120]);
  api.setBin({ binStyle: 'nope', binSize: 999, binType: 'x' });                 // garbage in a patch is cleaned the same way
  assert.deepEqual([st.binStyle, st.binSize, st.binType], ['wheelie', 360, 'kitchen']);
  assert.equal(st.binFull, 1);
  const refused = [{ hook: .5 }, { hook: 1 }, { busy: true }, { cur: { id: 'pack', i: 0, t: 0 } }, { pending: 'hook' }];
  for (const patch of refused) {
    const s2 = api.makeState(), h2 = api.harness(s2); Object.assign(s2, patch);
    api.setBin({ binStyle: 'drum', binSize: 100, binType: 'recycle' });
    assert.equal(s2.binStyle, undefined, JSON.stringify(patch)); assert.equal(s2.binSize, undefined); assert.equal(s2.binType, undefined);
    assert.equal(s2.swapT, undefined, 'a refused swap shows no animation');
    assert.equal(h2.flashes.length, 1); assert.match(h2.flashes[0], /垃圾桶|换桶/);
  }
  assert.equal(h.flashes.length, 7);
});

test('a swap shows the old bin sliding off and the new one sliding in, but the state changes at once and nothing is built twice at rest', () => {
  const st = api.makeState(), h = api.harness(st);
  api.setBin({ binStyle: 'drum' });
  assert.deepEqual([st.binStyle, st.binSize], ['drum', 200]);                    // immediately
  assert.equal(st.swapT, 1); assert.deepEqual(J(st.swapOld), { binStyle: 'wheelie', binSize: 240, binType: 'kitchen', binColor: null });
  const countFr = (patch, fr) => api.binParts({ ...patch }).all.filter(p => p.fr === fr).length;
  assert.ok(countFr({ binStyle: 'drum', swapT: .6, swapOld: { binStyle: 'wheelie', binSize: 240, binType: 'kitchen' } }, 'olb') >= 8, 'the old bin is drawn while it slides off');
  assert.equal(countFr({ binStyle: 'drum' }, 'olb'), 0, 'nothing of it at rest');
  for (const swapT of [1, .7, .3, .01]) {
    const scene = api.sceneAt(40, 35.264, { binStyle: 'drum', swapT, swapOld: { binStyle: 'cart4', binSize: 1100, binType: 'hazard' } });
    assert.doesNotMatch(sceneSvg(scene), /NaN|undefined/); assert.equal(scene.ordered.length, scene.parts.length);
  }
  // the clock runs it down to nothing and the loop can stop
  for (let i = 0; i < 100 && (st.swapT > 0 || h.count); i++) h.tick(.05);
  assert.equal(st.swapT, 0); assert.equal(h.count, 0);
  // no change = no swap picture
  api.setBin({ binStyle: 'drum', binSize: 200 }); assert.equal(st.swapT, 0);
  // the new bin starts out behind the old place and ends exactly in it
  const a = {}, b = {}; api.makeFrames(Object.assign(api.makeState(), { swapT: 1 }), [0,0,0,0,0,0], a, {}); api.makeFrames(api.makeState(), [0,0,0,0,0,0], b, {});
  assert.ok(a.bin([0, 25, 0])[0] < b.bin([0, 25, 0])[0] - 15);
  const z = {}; api.makeFrames(Object.assign(api.makeState(), { swapT: 0 }), [0, 0, 0, 0, 0, 0], z, {});
  assert.deepEqual(Array.from(b.bin([1, 2, 3])), Array.from(z.bin([1, 2, 3])));
});

test('a bigger bin tips more refuse into the body and still obeys the full-body rule', () => {
  const step = (style, size) => api.binLoadStep({ binStyle: style, binSize: size });
  for (const { style, size } of COMBOS) assert.ok(Math.abs(step(style, size) - .2*size/240) < 1e-12, `${style} ${size}L: load step proportional to litres`);
  assert.deepEqual([[ 'wheelie', 120], ['wheelie', 240], ['wheelie', 360], ['cart4', 660], ['cart4', 1100], ['drum', 100], ['drum', 200]].map(([s, v]) => +step(s, v).toFixed(6)), [.1, .2, .3, .55, .916667, .083333, .166667]);
  for (const { style, size } of COMBOS) {
    const st = api.makeState(); st.binStyle = style; st.binSize = size; st.load = .3; st.L0 = .3; st.hop = 1; st.cur = { id: 'pack', i: 0, t: 0 }; st.busy = true;
    api.advanceStep(st, 10);
    assert.ok(Math.abs(st.load - Math.min(1, .3 + step(style, size))) < 1e-8, `${style} ${size}L load ${st.load}`);
  }
  // a body that is full takes no more: the next bin waits for the dump
  const st = api.makeState(); st.binStyle = 'cart4'; st.binSize = 660; st.load = 1;
  assert.match(api.whyNot(st, 'hook'), /已满/);
  // automatic cycle: one 660 L bin finishes the body, four 120 L bins are needed, a 100 L drum needs even more
  for (const [style, size, bins] of [['cart4', 660, 1], ['cart4', 1100, 1], ['wheelie', 240, 2], ['wheelie', 120, 4], ['drum', 100, 5]]) {
    const s2 = api.makeState(); s2.binStyle = style; s2.binSize = size; const h2 = api.harness(s2), order = [];
    h2.toggleAuto(); let previous = null;
    for (let i = 0; i < 4000 && (s2.auto || s2.cur || h2.count); i++) { const id = s2.cur && s2.cur.id; if (id && id !== previous) order.push(id); previous = id; h2.tick(.05); }
    assert.equal(order.filter(id => id === 'hook').length, bins, `${style} ${size}L: bins to fill the body`);
    assert.equal(order.at(-1), 'dump'); assert.equal(s2.load, 0);
  }
});

/* ---------- the bin's own colour (垃圾桶调色) ---------- */
const BIN_SAMPLES = ['#000000', '#010101', '#111111', '#ffffff', '#fefefe', '#f4f4f4', '#808080', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#3366cc', '#ff8800'];

test('a custom bin colour gives tri-tones that shade for every colour, even near-white and near-black; no colour = the type\'s own', () => {
  for (const t of api.BIN_TYPES) assert.deepEqual(J(api.binMat({ binType: t.id })), J(t.mat));
  assert.deepEqual(J(api.binMat({})), J(api.BIN_TYPES[0].mat));
  assert.deepEqual(J(api.binMat({ binType: 'recycle', binColor: null })), J(api.BIN_TYPES[2].mat));
  for (const c of BIN_SAMPLES) {
    const m = J(api.binMat({ binType: 'recycle', binColor: c }));
    for (const k of ['l', 'm', 'd']) assert.match(m[k], HEX, `${c} ${k}`);
    assert.ok(lum(m.l) > lum(m.m) && lum(m.m) > lum(m.d), `${c}: light > mid > dark (${m.l} ${m.m} ${m.d})`);
    assert.ok(lum(m.l) - lum(m.d) > .15, `${c}: the tones are told apart`);
    assert.deepEqual(m, J(api.binTones(c)));
  }
  // anything that is not a colour is ignored (the type colour shows)
  for (const bad of ['', 'red', '#12', '#12345', 'ff88zz', 7, {}]) assert.deepEqual(J(api.binMat({ binType: 'hazard', binColor: bad })), J(api.BIN_TYPES[3].mat), String(bad));
  assert.deepEqual(J(api.binMat({ binColor: '#F80' })), J(api.binTones('#ff8800')));
});

test('recolouring the bin repaints only the bin: the truck paint and the bin colour do not touch each other, and the markings stay', () => {
  const base = api.binParts({ binType: 'hazard' }), custom = api.binParts({ binType: 'hazard', binColor: '#3366cc' });
  const tones = J(api.binTones('#3366cc')), kitchen = J(api.BIN_TYPES[3].mat);
  assert.equal(base.all.length, custom.all.length);
  assert.deepEqual(custom.all.filter(p => p.fr !== 'bin').map(p => p.svg), base.all.filter(p => p.fr !== 'bin').map(p => p.svg), 'nothing but the bin changes');
  const bsvg = custom.bin.map(p => p.svg).join(''), osvg = base.bin.map(p => p.svg).join('');
  assert.ok(bsvg.includes(tones.m) && bsvg.includes(tones.l), 'drawn in the custom tones');
  assert.ok(!bsvg.includes(kitchen.m) && !bsvg.includes(kitchen.l), 'the type colour is gone');
  assert.ok(osvg.includes(kitchen.m));
  assert.ok(bsvg.includes('#f3c21e'), 'the hazard marking stays');
  // for every style
  for (const { style, size } of COMBOS) {
    const a = api.binParts({ binStyle: style, binSize: size, binType: 'recycle' }), b = api.binParts({ binStyle: style, binSize: size, binType: 'recycle', binColor: '#ff8800' });
    assert.deepEqual(b.all.filter(p => p.fr !== 'bin').map(p => p.svg), a.all.filter(p => p.fr !== 'bin').map(p => p.svg), `${style} ${size}L`);
    assert.notEqual(b.bin.map(p => p.svg).join(''), a.bin.map(p => p.svg).join(''));
    assert.deepEqual(b.bin.map(p => p.pts), a.bin.map(p => p.pts), 'same shape');
  }
  // the truck's paint is independent of the bin's colour, both ways
  const pal0 = J(api.palettes);
  const withBin = api.binParts({ binColor: '#ff8800' });
  assert.deepEqual(J(api.palettes), pal0, 'a bin colour does not touch the palettes');
  api.applySkin('orange');
  try {
    const orange = api.binParts({ binType: 'hazard' }), orangeCustom = api.binParts({ binColor: '#ff8800' });
    assert.equal(orangeCustom.bin.map(p => p.svg).join(''), withBin.bin.map(p => p.svg).join(''), 'the truck paint does not change a custom-coloured bin');
    assert.equal(orange.bin.map(p => p.svg).join(''), osvg, 'a repainted truck leaves the type-coloured bin as it was');
    assert.notEqual(orange.all.filter(p => p.fr !== 'bin').map(p => p.svg).join(''), base.all.filter(p => p.fr !== 'bin').map(p => p.svg).join(''));
  } finally { api.applySkin('classic'); }
  // convexity and finiteness hold with a custom colour too
  const { all } = api.binParts({ binColor: '#010101', binStyle: 'dome' });
  for (const p of all.filter(p => p.fr === 'bin')) for (const [n, d] of p.planes) for (const v of p.pts) assert.ok(dot3(n, v) <= d + 1e-6);
  assert.doesNotMatch(sceneSvg(api.sceneAt(35, 35.264, { binColor: '#fefefe', hook: 1, tip: .5 })), /NaN|undefined/);
});

test('the bin colour can change at any time (hooked, running), unlike style / size / type', () => {
  for (const patch of [{}, { hook: .5 }, { hook: 1 }, { busy: true }, { cur: { id: 'pack', i: 0, t: 0 } }, { pending: 'hook' }]) {
    const st = Object.assign(api.makeState(), patch); const h = api.harness(st);
    api.setBinColor('#FF8800', false); assert.equal(st.binColor, '#ff8800', JSON.stringify(patch));
    assert.equal(h.flashes.length, 0, 'no refusal note');
    api.setBinColor(null, false); assert.equal(st.binColor, null);
  }
  // changing the type keeps a custom colour (a swap picture starts, the colour stays); following the type clears it
  const st = api.makeState(), h = api.harness(st);
  api.setBinColor('#336699', false); api.setBin({ binType: 'hazard' });
  assert.equal(st.binColor, '#336699'); assert.equal(st.binType, 'hazard');
  assert.equal(J(st.swapOld).binColor, '#336699', 'the old bin slides off in its own colour');
  assert.equal(api.binColorNow(st), '#336699');
  api.setBinColor(null, false);
  assert.equal(api.binColorNow(st), api.BIN_TYPES[3].mat.m);
});

test('?binColor= is validated like the truck colours, and the bin choice survives a reload through storage (junk and blocked storage tolerated)', () => {
  const look = qs => { const st = api.makeState(); api.lookParams(st, new URLSearchParams(qs)); return st; };
  assert.equal(look('').binColor, null);
  assert.equal(look('binColor=ff8800').binColor, '#ff8800');
  assert.equal(look('binColor=%23FF8800').binColor, '#ff8800');
  assert.equal(look('binColor=%2312ab9c&binType=other').binType, 'other');
  for (const bad of ['', 'zzzzzz', 'f80', '12345', '1234567', '%23', 'ff88001', 'red', 'ff 880']) assert.equal(look(`binColor=${bad}`).binColor, null, bad);
  // storage round trip
  const store = {}, writes = [];
  ctx.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; writes.push(k); } };
  try {
    const st = api.makeState(); Object.assign(st, { binStyle: 'drum', binSize: 100, binType: 'recycle', binColor: '#33aa66' });
    api.binStore(st); assert.equal(writes.length, 1);
    assert.deepEqual(J(api.binStored()), { binStyle: 'drum', binSize: 100, binType: 'recycle', binColor: '#33aa66' });
    assert.deepEqual([look('').binStyle, look('').binSize, look('').binType, look('').binColor], ['drum', 100, 'recycle', '#33aa66']);
    // the URL beats the memory (per field); an invalid colour in the URL is ignored, so the remembered one shows
    assert.deepEqual([look('binStyle=pedal').binStyle, look('binStyle=pedal').binSize, look('binStyle=pedal').binType], ['pedal', 240, 'recycle']);
    assert.equal(look('bin=660').binStyle, 'cart4'); assert.equal(look('binType=hazard').binSize, 100); assert.equal(look('binType=hazard').binStyle, 'drum');
    assert.equal(look('binColor=ff0000').binColor, '#ff0000'); assert.equal(look('binColor=nope').binColor, '#33aa66');
    // setBin / setBinColor write (setBinColor only when told to: dragging does not, release does)
    const s2 = api.makeState(); api.harness(s2); const n0 = writes.length;
    api.setBinColor('#112233', false); assert.equal(writes.length, n0);
    api.setBinColor('#112233', true); assert.equal(writes.length, n0 + 1);
    api.setBin({ binStyle: 'dome' }); assert.equal(writes.length, n0 + 2);
    assert.deepEqual(J(api.binStored()), { binStyle: 'dome', binSize: 240, binType: 'kitchen', binColor: '#112233' });
    api.setBinColor(null, true); assert.equal(api.binStored().binColor, null);
    // garbage: unknown ids, wrong types, a size the style does not make
    for (const junk of ['{', 'null', '7', '"x"', '[]', JSON.stringify({ binStyle: 'x', binSize: 'y', binType: 3, binColor: 'blue' }), JSON.stringify({ binStyle: 'drum', binSize: 240, binType: 'recycle', binColor: '#12' })]) {
      store['garbage-truck.bin'] = junk;
      const st3 = look('');
      assert.ok(api.BIN_STYLES.some(s => s.id === st3.binStyle) && api.binSpec(st3).style === st3.binStyle, junk);
      assert.ok(api.binSpec(st3).id === st3.binSize, junk); assert.ok(api.BIN_TYPES.some(t => t.id === st3.binType)); assert.equal(st3.binColor, null, junk);
    }
    store['garbage-truck.bin'] = JSON.stringify({ binStyle: 'drum', binSize: 240, binType: 'recycle' });
    assert.deepEqual([look('').binStyle, look('').binSize], ['drum', 200]);
  } finally { delete ctx.localStorage; }
  Object.defineProperty(ctx, 'localStorage', { get() { throw new Error('blocked'); }, configurable: true });
  try {
    assert.equal(api.binStored(), null); assert.doesNotThrow(() => api.binStore({ binStyle: 'drum', binSize: 100, binType: 'x', binColor: '#ffffff' }));
    assert.deepEqual([look('').binStyle, look('').binSize, look('').binColor], ['wheelie', 240, null]);
  } finally { delete ctx.localStorage; }
  ctx.localStorage = { getItem() { throw new Error('boom'); }, setItem() { throw new Error('full'); } };
  try { assert.equal(api.binStored(), null); assert.doesNotThrow(() => api.binStore({})); } finally { delete ctx.localStorage; }
});
