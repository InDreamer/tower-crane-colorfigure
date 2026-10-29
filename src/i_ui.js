
/* ================= behaviour: taking apart, picking parts, the working cycle ================= */
let ui;
const ORDER = [5, 3, 4, 2, 6, 1];                      // the order they come apart: the ropes and hook first (so they never stretch), then the jib and counter-jib, the slewing unit, the climbing frame, last the mast; they go back in reverse
const ALL_OUT = () => [0, ...SYS_IDS.map(() => 1)];
const assembled = st => st.p.every(v => v < .001) && st.tgt.every(v => v === 0) && st.subSel === 0 && Object.values(st.pull).every(v => v < .001);
function stopAuto(st){ st.auto = false; st.autoWait = 0; st.pending = null; }
function setTargets(st, want, stagger){            // want[k] 0/1; stagger: separate one after another
  const opening = ORDER.filter(k => want[k] && !st.tgt[k]), closing = ORDER.filter(k => !want[k] && st.tgt[k]);
  opening.forEach((k, i) => { st.tgt[k] = 1; st.dl[k] = stagger ? i*.28 : 0; });
  closing.reverse().forEach((k, i) => { st.tgt[k] = 0; st.dl[k] = stagger ? i*.28 : 0; });
  run();
}
function explodeAll(){ const st = ui.st; if (st.busy) return ui.flash('正在工作，等这一步做完'); stopAuto(st); st.sel = -1; st.subSel = 0; setTargets(st, ALL_OUT(), true); }
function collapseAll(){ const st = ui.st; if (st.busy) return ui.flash('正在工作，等这一步做完'); stopAuto(st); st.sel = -1; st.subSel = 0; setTargets(st, zeros(), true); }
function pickSystem(k){
  const st = ui.st; if (st.busy) return ui.flash('正在工作，等这一步做完');
  stopAuto(st); st.sel = k; st.subSel = 0; const w = zeros(); w[k] = 1; setTargets(st, w, false);
}
function putBack(){ const st = ui.st; if (st.busy) return ui.flash('正在工作，等这一步做完'); stopAuto(st); st.sel = -1; st.subSel = 0; setTargets(st, zeros(), false); }
function pickPart(k, n){
  const st = ui.st; if (st.busy) return ui.flash('正在工作，等这一步做完');
  if (st.sel !== k) return pickSystem(k);
  stopAuto(st); st.subSel = st.subSel === n ? 0 : n; run();
}

/* ----- the working cycle: the steps are in g_work.js; here they are started (doStep), run (advanceStep) and chained (the 工作 and 顶升 buttons) ----- */
function doStep(id, quiet){
  const st = ui.st;
  if (st.busy){ if (!quiet) ui.flash('正在动作，等这一步做完'); return false; }
  const w = whyNot(st, id); if (w){ if (/太重/.test(w)){ st.over = 2.5; run(); } ui.flash(w, 2000); return false; }
  if (!assembled(st)){ st.sel = -1; st.subSel = 0; st.pending = id; setTargets(st, zeros(), true); ui.flash('先合拢，再工作'); return false; }
  const msg = beginStep(st, id); applySeg(st, STEPS[id].segs[0]); if (msg){ st.over = 2.5; ui.flash(msg, 2400); }
  st.busy = true; st.cur = { id, i: 0, t: 0 };
  run(); return true;
}
function startAutoStep(st){ if (!doStep(nextAuto(st), true) && !st.pending) stopAuto(st); }
function toggleAuto(mode){            // mode: 'work' (a lift) or 'climb' (one more mast section)
  const st = ui.st;
  if (st.auto){ stopAuto(st); return ui.flash('做完这一步后停下'); }
  if (st.busy) return ui.flash('正在动作，等这一步做完');
  st.autoMode = mode; st.auto = true; st.autoWait = 0; st.autoN = 0;
  if (!st.xrT) setXr(1);
  if (!st.busy) startAutoStep(st);
}
function setXr(v){ const st = ui.st; st.xrT = v; const b = document.getElementById('xrb'); if (b) b.setAttribute('aria-pressed', !!v); run(); }

/* ----- 涂装: repaint the crane ----- */
function setSkin(id, remember){
  applySkin(id); ui.st.skin = SKIN_ID; ui.st.paint = paintOf(SKIN_ID);          // the picker starts from what is on the crane
  if (remember) paintStore(ui.st);
  if (remember) ui.flash(`涂装：${skinOf(SKIN_ID).name}`);
  ui.invalidate();
}
const skinChoices = st => [{ heading: '预设' }, ...SKINS.map(k => ({ label: k.name, swatch: k.dot, current: st.skin === k.id, onClick: () => setSkin(k.id, true) }))];
const skinDot = st => st.skin === 'custom' ? st.paint.tower : skinOf(st.skin).dot;
// paint one zone of the custom paint (live while dragging: no storage write here, the picker commits on release)
function setZone(z, hex){
  const st = ui.st; if (st.skin === 'custom' && st.paint[z] === hex) return;
  st.paint[z] = hex; st.skin = applyPaint(st.paint); ui.invalidate();
}
/* the custom paint picker inside the 涂装 dropdown: zone tabs, a saturation/value square, a hue bar, a HEX box and a preview.
   Built once per opening; dragging only moves the knobs and recolours a few elements (the dropdown is not redrawn). */
const ZONE_TABS = [['tower', '塔身与臂架'], ['cab', '驾驶室'], ['motor', '机构电机']];
const SKP_CSS = `.skp{width:276px;max-width:100%;display:flex;flex-direction:column;gap:7px;user-select:none;-webkit-user-select:none}
  .skp .tabs{display:flex;gap:5px} .skt{flex:1 1 0;min-width:0;white-space:nowrap;font:inherit;font-size:11.5px;font-weight:700;color:var(--ink);background:var(--paper);border:1.5px solid var(--ink);border-radius:8px;padding:4px 3px;cursor:pointer;box-shadow:2px 2px 0 var(--ink)}
  .skt .dot{margin-right:4px} .skt[aria-pressed=true]{background:var(--ink);color:var(--paper)} .skt[aria-pressed=true] .dot{border-color:var(--paper)}
  .skp .sv,.skp .hue{position:relative;border:1.5px solid var(--ink);border-radius:8px;cursor:crosshair;touch-action:none}
  .skp .sv{height:128px;background:linear-gradient(to top,#000,#0000),linear-gradient(to right,#fff,hsl(var(--h,120),100%,50%))}
  .skp .hue{height:18px;background:linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)}
  .skp .kn{position:absolute;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1.5px var(--ink);pointer-events:none}
  .skp .hue .kn{top:50%;height:22px;width:10px;margin:-11px 0 0 -5px;border-radius:5px}
  .skp .hx{display:flex;align-items:center;gap:8px} .skp .hx .dot{width:22px;height:22px;margin:0;flex:none}
  .skp input{flex:1;min-width:0;font:inherit;font-size:12px;color:var(--ink);background:var(--paper);border:1.5px solid var(--ink);border-radius:8px;padding:3px 7px;text-transform:lowercase}
  .skp input.bad{border-color:#d93a2e;background:#fbe4e1}
  @media (max-width:560px){.skp{width:100%}}`;
// the picker widget, for any set of colour zones: o = { zones: [[id, name]] (tabs only when there are several), get(id) -> '#rrggbb',
// set(id, hex) (live, while dragging), commit() (on release / confirm: where a caller writes to storage) }. root.sync() re-reads get().
function colorPicker(o){
  const mk = (tag, cls, par) => { const e = document.createElement(tag); if (cls) e.className = cls; if (par) par.appendChild(e); return e; };
  const root = mk('div', 'skp'), tabs = o.zones.length > 1 ? mk('div', 'tabs', root) : null, sv = mk('div', 'sv', root), svk = mk('i', 'kn', sv), hue = mk('div', 'hue', root), hk = mk('i', 'kn', hue);
  const hx = mk('div', 'hx', root), pv = mk('i', 'dot', hx), inp = mk('input', '', hx);
  inp.setAttribute('maxlength', '7'); inp.setAttribute('spellcheck', 'false'); inp.setAttribute('autocomplete', 'off'); inp.setAttribute('aria-label', 'HEX');
  let zone = o.zones[0][0], c = hexHsv(o.get(zone));            // c: the picker's own HSV (keeps the hue of a grey)
  const tb = {};
  if (tabs) for (const [z, name] of o.zones){ const b = tb[z] = mk('button', 'skt', tabs); b.type = 'button'; b.innerHTML = '<i class="dot"></i>' + name;
    b.onclick = () => { zone = z; c = hexHsv(o.get(z)); show(true); }; }
  const show = full => {                                          // reflect c (and the zone colours) on the controls
    const hex = hsvHex(c.h, c.s, c.v);
    sv.style.setProperty('--h', Math.round(c.h)); svk.style.left = c.s*100 + '%'; svk.style.top = (1 - c.v)*100 + '%'; hk.style.left = c.h/360*100 + '%';
    pv.style.background = hex; if (full || document.activeElement !== inp){ inp.value = hex; inp.classList.remove('bad'); }
    for (const z in tb){ tb[z].querySelector('.dot').style.background = z === zone ? hex : o.get(z); tb[z].setAttribute('aria-pressed', z === zone); }
  };
  const paint = () => o.set(zone, hsvHex(c.h, c.s, c.v));
  // drag a surface with pointer capture (mouse, pen and touch alike): f(x, y) gets 0..1 across the surface; the colour is committed on release
  const drag = (el, f) => {
    let r = null; const at = e => { f(Math.min(1, Math.max(0, (e.clientX - r.left)/r.width)), Math.min(1, Math.max(0, (e.clientY - r.top)/r.height))); paint(); show(); };
    el.addEventListener('pointerdown', e => { if (e.button || r) return; e.preventDefault(); inp.blur(); r = el.getBoundingClientRect(); try { el.setPointerCapture(e.pointerId); } catch (x) {} el._id = e.pointerId; at(e); });
    el.addEventListener('pointermove', e => { if (r && e.pointerId === el._id) at(e); });
    const end = e => { if (!r || e.pointerId !== el._id) return; r = null; o.commit(); };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    // arrow keys nudge (and stay off the camera); Shift = ten times as far
    el.tabIndex = 0; el.addEventListener('keydown', e => { const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (!d) return;
      e.preventDefault(); e.stopPropagation(); const k = e.shiftKey ? .1 : .01; f(...el._k(d[0]*k, d[1]*k)); paint(); show(); o.commit(); });
  };
  sv.setAttribute('role', 'slider'); sv.setAttribute('aria-label', '饱和度与明度'); hue.setAttribute('role', 'slider'); hue.setAttribute('aria-label', '色相');
  sv._k = (dx, dy) => [Math.min(1, Math.max(0, c.s + dx)), Math.min(1, Math.max(0, 1 - c.v + dy))];
  hue._k = dx => [Math.min(1, Math.max(0, c.h/360 + dx)), 0];
  drag(sv, (x, y) => { c.s = x; c.v = 1 - y; });
  drag(hue, x => { c.h = x*360; });
  // HEX: a valid #rgb / #rrggbb repaints as it is typed; an invalid one only marks the box and is put right when it is left
  inp.addEventListener('input', () => { const h = hexOf(inp.value); inp.classList.toggle('bad', !h && inp.value.trim() !== ''); if (h){ c = hexHsv(h); o.set(zone, h); show(); } });
  const done = () => { show(true); o.commit(); };
  inp.addEventListener('change', done); inp.addEventListener('blur', done);
  inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') inp.blur(); });
  root.sync = () => { c = hexHsv(o.get(zone)); show(true); };
  show(true);
  return root;
}
// the crane paint: one picker, three zone tabs
function skinPanel(st, ui, close){
  // the first edit turns the crane custom: the preset chip stops being marked as the current one (the chips are otherwise left alone)
  const root = colorPicker({ zones: ZONE_TABS, get: z => st.paint[z], commit: () => paintStore(st),
    set: (z, hex) => { const was = st.skin; setZone(z, hex);
      if (was !== 'custom' && root.closest('.chips')) for (const b of root.closest('.chips').querySelectorAll('.chip.current')){ b.classList.remove('current'); b.removeAttribute('aria-pressed');
        b.onclick = ev => { ev.stopPropagation(); close(); const k = SKINS.find(q => q.name === b.textContent.trim()); if (k){ setSkin(k.id, true); ui.invalidate(); } }; } } });       // (the chip no longer is the current one: it must work again)
  const box = document.createElement('div'), h = document.createElement('div'); h.className = 'chiph'; h.textContent = '自定义'; box.append(h, root);
  return box;
}

/* ----- 吊物: swap the load (style, size, rigging; the colour any time) ----- */
function setLoad(patch){
  const st = ui.st, w = ldWhyNot(st); if (w){ ui.flash(w); return false; }
  const from = ldNorm(st.ld), next = ldNorm({ ...from, ...patch });
  if (JSON.stringify(from) === JSON.stringify(next)) return true;
  st.ld = applyLoad(next); st.swap = { from, t: 0 }; ldStore(st.ld); run(); ui.invalidate(); return true;       // (the state changes at once; the slide is only the picture)
}
function setLoadColor(hex, commit){
  const st = ui.st; if (st.ld.color === hex) return;
  st.ld = applyLoad({ ...st.ld, color: hex }); if (commit) ldStore(st.ld); ui.invalidate();
}
const ldChoices = st => { const sty = ldStyle(st.ld.style); return [
  { heading: '款式' }, ...LD_STYLES.map(k => ({ label: k.name, swatch: k.col, current: k.id === sty.id, onClick: () => setLoad({ style: k.id, size: ldNearest(k, LOAD.t) }) })),
  { heading: '尺寸' }, ...LD_SIZES.filter(([id]) => sty.sizes[id]).map(([id, nm]) => ({ label: `${nm} ${sty.sizes[id].t.toFixed(1)}t`, current: st.ld.size === id, onClick: () => setLoad({ size: id }) })),
  { heading: '吊索' }, ...LD_RIGS.map(([id, nm]) => ({ label: nm, current: st.ld.rig === id, disabled: !sty.rigs.includes(id), why: sty.why[id], onClick: () => setLoad({ rig: id }) })),
  { heading: '颜色' }, { label: '跟随默认', swatch: sty.col, current: !st.ld.color, onClick: () => setLoadColor(null, true) }]; };
function ldPanel(st, ui, close){
  const root = colorPicker({ zones: [['load', '吊物颜色']], get: () => st.ld.color || ldStyle(st.ld.style).col, commit: () => ldStore(st.ld),
    set: (z, hex) => { const was = st.ld.color; setLoadColor(hex, false);
      if (!was && root.closest('.chips')) for (const b of root.closest('.chips').querySelectorAll('.chip.current')) if (b.textContent === '跟随默认'){ b.classList.remove('current'); b.removeAttribute('aria-pressed');
        b.onclick = ev => { ev.stopPropagation(); close(); setLoadColor(null, true); ui.invalidate(); }; } } });
  return root;
}

/* ----- one clock for everything that moves ----- */
let loopOn = false;
function advanceStep(st, dt){
  while (st.cur && dt > 1e-12){
    const cur = st.cur, S = STEPS[cur.id], seg = S.segs[cur.i], d = typeof seg.d === 'function' ? seg.d(st) : seg.d, remaining = (1 - cur.t)*d, elapsed = Math.min(dt, remaining);
    dt -= elapsed; cur.t = remaining - elapsed < 1e-12 ? 1 : cur.t + elapsed/d;
    applySeg(st, seg); seg.f(st, cur.t);
    if (cur.t >= 1){ cur.i++; cur.t = 0;
      if (cur.i >= S.segs.length){ const id = cur.id; st.cur = null; st.busy = false; endStep(st, id); return id; }
    }
  }
  return null;
}
function run(){
  if (loopOn) return; loopOn = true;
  ui.animate(dt => { const st = ui.st; let busy = false;
    st.clock += dt; if (st.over > 0){ st.over = Math.max(0, st.over - dt); busy = true; }
    if (st.swap){ st.swap.t += dt/SWAP_SECS; busy = true; if (st.swap.t >= 1) st.swap = null; }
    for (const k of ORDER){
      if (st.dl[k] > 0){ st.dl[k] -= dt; busy = true; continue; }
      const d = st.tgt[k] - st.p[k]; if (Math.abs(d) < 1e-3){ st.p[k] = st.tgt[k]; continue; }
      st.p[k] += Math.sign(d)*Math.min(Math.abs(d), dt/.9); busy = true; }
    for (let n = 1; n <= NPART; n++){ const want = st.subSel === n ? 1 : 0, cur = st.pull[n] || 0;
      if (Math.abs(want - cur) > 1e-3){ st.pull[n] = cur + Math.sign(want - cur)*Math.min(Math.abs(want - cur), dt/.6); busy = true; } else st.pull[n] = want; }
    const g = Math.sign((st.xrT || 0) - (st.xr || 0)); if (g){ st.xr = clamp01(st.xr + g*dt/.7); busy = true; }
    if (st.pending && assembled(st)){ const id = st.pending; st.pending = null; if (!doStep(id, true) && st.auto && !st.pending) stopAuto(st); }
    if (st.cur){ busy = true; const finished = advanceStep(st, dt);
      if (finished && st.auto){ if (finished === lastStep(st)) stopAuto(st); else st.autoWait = .8; }
    } else if (st.auto && !st.pending){
      st.autoWait = Math.max(0, (st.autoWait || 0) - dt);
      if (!st.autoWait) startAutoStep(st);
    }
    if (st.zoomMoving || st.over > 0 || st.swap) busy = true;
    if (!busy && !st.auto) loopOn = false;
    return busy || !!st.auto; });
}

// paint from the URL: ?skin=<id>, ?tower= ?cab= ?motor= (RRGGBB: a custom paint on top of ?skin); without ?skin / colours the remembered paint (if the browser kept one) is used
function lookParams(st, q){
  const url = paintParams(q), kept = !url && !q.has('skin') ? paintStored() : null;
  if (url || (kept && kept.skin === 'custom')){ st.paint = url || kept.paint; st.skin = applyPaint(st.paint); }
  else { st.skin = applySkin(q.has('skin') ? q.get('skin') : kept && kept.skin); st.paint = paintOf(st.skin); }
  st.ld = applyLoad(ldParams(q) || ldStored() || LD_DEFAULT);       // the URL wins over what the browser kept
}
// the working state from the URL: ?slew=<degrees> ?trolley=<x> ?hookZ=<z> ?nsec=4..6 ?climb=0..1 ?at=pad|roof ?hooked=0|1 ?loadT=<0.2..8 t> ?step=<id>&t=<0..1> (a bad value keeps the default)
function stateParams(st, q){
  const num = k => { const v = q.get(k); return q.has(k) && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : NaN; };
  if (Number.isInteger(num('nsec')) && num('nsec') >= NSEC_MIN && num('nsec') <= NSEC_MAX) st.nsec = num('nsec');
  if (Number.isFinite(num('slew'))) st.slew = num('slew')*Math.PI/180;
  if (Number.isFinite(num('trolley'))) st.trolley = Math.max(TROL_MIN, Math.min(TROL_MAX, num('trolley')));
  if (Number.isFinite(num('hookZ'))) st.hookZ = Math.max(hookMin(st), Math.min(HOOK_MAX, num('hookZ')));
  if (Number.isFinite(num('climb'))) st.climb = clamp01(num('climb'));
  if (['pad', 'roof'].includes(q.get('at'))) st.at = q.get('at');
  if (Number.isFinite(num('loadT')) && num('loadT') >= .2 && num('loadT') <= 8) st.loadT = num('loadT');
  if (['0', '1'].includes(q.get('hooked'))){ st.hooked = q.get('hooked') === '1'; st.sl = +st.hooked; }
  if (Object.hasOwn(STEPS, q.get('step')) && !(q.has('t') && !(num('t') >= 0 && num('t') <= 1))) scrub(st, q.get('step'), q.has('t') ? num('t') : .5);
}

const stepItem = (st, id, i) => ({ label: `${i + 1} ${STEPS[id].name}`, onClick: () => { stopAuto(st); doStep(id); } });
// back to four sections at once (only when nothing is moving and nothing hangs on the hook)
function restore4(){
  const st = ui.st; if (st.busy) return ui.flash('正在动作，等这一步做完'); stopAuto(st);
  if (st.hooked) return ui.flash('先放下吊物，再恢复');
  if (st.nsec === NSEC_MIN && !climbing(st)) return ui.flash('现在就是 4 节');
  st.nsec = NSEC_MIN; st.climb = st.ext = 0; st.sx = null; st.bolt = 0; st.hookZ = Math.max(hookMin(st), Math.min(HOOK_MAX, st.hookZ)); ui.flash('已恢复 4 节'); run(); ui.invalidate();
}
ui = mountFigure({
  fig: '09', turn: 'full', title: '塔式起重机 · 结构拆解图', credit: false,
  size: [162, 46, 128], center: [80, 23], palette: 'mustard',
  state: { p: zeros(), tgt: zeros(), dl: zeros(), E: zeros(), sel: -1, subSel: 0, pull: {},
    slew: 0, slew0: 0, trolley: TROL_REST, nsec: NSEC_MIN, climb: 0, ...workState(),
    skin: SKIN_DEFAULT, paint: paintOf(SKIN_DEFAULT), ld: ldNorm(LD_DEFAULT), swap: null, pump: 0, act: null, clock: 0, busy: false, auto: false, autoWait: 0, cur: null },
  scene,
  buttons: [
    { label: '拆解', onClick: () => explodeAll() },
    { label: '合拢', onClick: () => collapseAll() },
    { label: '工作', onClick: () => toggleAuto('work') },
    { label: '顶升', onClick: () => toggleAuto('climb') },
    { label: '分步', choices: st => [{ heading: '吊装' }, ...WORK_ORDER.map((id, i) => stepItem(st, id, i)), { heading: '顶升' }, ...CLIMB_ORDER.map((id, i) => stepItem(st, id, i)),
      { label: '恢复 4 节', onClick: () => restore4() }] },
    { label: '吊物', swatch: st => ldStyle(st.ld.style).col, choices: ldChoices, panel: ldPanel },
    { label: '涂装', swatch: skinDot, choices: skinChoices, panel: skinPanel },
  ],
  stats: st => { const r = readouts(st); return [{ label: '吊重', value: r.t.toFixed(1) + ' t' }, { label: '幅度', value: Math.round(r.r) + ' m', small: true }, { label: '高度', value: Math.round(r.h) + ' m', small: true }, { label: '吊物', value: ldLabel(), small: true }]; },
  params: (st, q) => {
    lookParams(st, q); stateParams(st, q);
    if (q.has('ex')){ const v = q.get('ex').split('').filter(c => new RegExp(`^[1-${NSYS}]$`).test(c)).map(Number); for (const k of ORDER) st.p[k] = st.tgt[k] = v.includes(k) ? 1 : 0; }
    const sel = q.has('sel') ? Number(q.get('sel')) : NaN, sub = q.has('sub') ? Number(q.get('sub')) : NaN;
    const validSel = Number.isInteger(sel) && sel >= 1 && sel <= NSYS, validSub = Number.isInteger(sub) && sub >= 1 && sub <= NPART;
    if (validSel || validSub){ st.sel = validSel ? sel : SYS_OF(sub); st.p[st.sel] = st.tgt[st.sel] = 1;
      if (validSub && SYS_OF(sub) === st.sel){ st.subSel = sub; st.pull[sub] = 1; } }
    if (Object.keys(ACT).includes(q.get('act'))){ st.act = q.get('act'); st.pump = /climb/.test(st.act) ? 1 : 0; }
  },
});
xrMount(() => ui, () => '');
(() => {
  // the switches in Chinese; see-through also wakes the clock (it animates through run())
  const xb = document.getElementById('xrb'), lb = document.getElementById('lblb');
  if (xb){ xb.textContent = '透视'; xb.onclick = () => setXr(ui.st.xrT ? 0 : 1); }
  if (lb){ lb.textContent = '标签'; const o = lb.onclick; lb.onclick = () => { o(); ui.st.zoomMoving = true; run(); }; }
  // the page's own controls in Chinese; the palette swatches do nothing for this figure, so they go
  const lw = document.querySelector('label[for=wb]'); if (lw) lw.textContent = '手绘抖动';
  const pr = document.getElementById('pals'); if (pr) pr.closest('.ctl').style.display = 'none';
  const vr = document.getElementById('vreset'), vs = document.getElementById('vspin');
  if (vr){ vr.textContent = '正面视角'; vr.closest('.ctl').querySelector('label').textContent = '视角'; }
  if (vs) vs.textContent = '自动旋转';
  // tap a part (a press that does not become a drag): separate its system / pull the part / put it back
  const svg = document.getElementById('fig'), css = document.createElement('style'); let dn = null;
  css.textContent = '#fig [data-ps]{cursor:pointer} .tg2{pointer-events:none} #fig .tag{pointer-events:none}' + SKP_CSS;
  document.head.appendChild(css);
  svg.addEventListener('pointerdown', e => { if (e.button || e.isPrimary === false || dn) return; const g = e.target.closest('[data-ps]'), t = e.target.closest('[data-title]');
    dn = { id: e.pointerId, x: e.clientX, y: e.clientY, distance: 0, k: g ? +g.dataset.ps : 0, n: g ? +g.dataset.pn : 0, title: t ? +t.dataset.title : 0 }; }, true);
  const moveTap = e => { if (!dn || e.pointerId !== dn.id) return; dn.distance += Math.hypot(e.clientX - dn.x, e.clientY - dn.y); dn.x = e.clientX; dn.y = e.clientY; };
  svg.addEventListener('pointermove', moveTap);
  svg.addEventListener('pointerup', e => { if (!dn || e.pointerId !== dn.id) return; moveTap(e); const d = dn; dn = null; if (d.distance > 5) return;
    if (d.title) putBack(); else if (d.k) pickPart(d.k, d.n); else if (ui.st.sel > 0) putBack();
    ui.invalidate(); });
  const cancelTap = e => { if (dn && e.pointerId === dn.id) dn = null; };
  svg.addEventListener('pointercancel', cancelTap); svg.addEventListener('lostpointercapture', cancelTap);
  window.__ui = ui;
  // phone: the labels are numbered badges (the part numbers) and the names go in a list under the figure, in the system colours; a lit label lights its row
  const lg = document.createElement('div'); lg.className = 'lgd'; svg.parentNode.after(lg);
  let sig = '';
  const legend = () => { const rows = new Map();
    if (innerWidth <= 560) for (const g of svg.querySelectorAll('[data-n][data-t]')) rows.set(+g.dataset.n, [g.dataset.t, g.classList.contains('on')]);
    const key = [...rows].sort((a, b) => a[0] - b[0]).map(([n, [t, on]]) => n + t + (on ? '*' : '')).join('|'); if (key === sig) return; sig = key;
    lg.innerHTML = [...rows].sort((a, b) => a[0] - b[0]).map(([n, [t, on]]) => `<div class="${on ? 'on' : ''}"><b style="background:${SYSC[SYS_OF(n)]}">${n}</b>${t}</div>`).join(''); };
  new MutationObserver(() => requestAnimationFrame(legend)).observe(svg, { childList: true, subtree: true });
  addEventListener('resize', () => { sig = ''; legend(); });
  const lcss = document.createElement('style');
  lcss.textContent = '.stat.small .v[data-k="吊物"]{font-size:13px;font-weight:700;letter-spacing:0;line-height:1.3}@media (max-width:560px){.stats{flex-wrap:wrap}.stat:last-child{flex:1 0 100%}}.toast{left:50%!important;top:auto!important;bottom:6px;transform:translateX(-50%);max-width:300px;width:max-content;text-align:center}@media (min-width:561px){.stats{display:grid;grid-template-columns:auto auto;justify-items:end;gap:2px 18px}.stat:first-child,.stat:last-child{grid-column:1/-1}.actions{display:grid;grid-template-columns:auto auto;justify-items:start;gap:8px 10px;max-width:none}}.lgd{display:none}@media (max-width:560px){.lgd{display:grid;width:100%;box-sizing:border-box;grid-template-columns:1fr 1fr;gap:5px 10px;margin:6px 0 10px;font:600 13px/20px ui-monospace,Menlo,"PingFang SC","Microsoft YaHei",monospace}.lgd:empty{display:none}.lgd div{display:flex;align-items:center;gap:6px;padding:1px 4px;border-radius:999px}.lgd .on{background:rgba(244,184,41,.35)}.lgd b{flex:none;min-width:20px;height:20px;border-radius:10px;color:#fff;font:800 11px/20px ui-monospace,Menlo,monospace;text-align:center}}';
  document.head.appendChild(lcss);
})();
run();
