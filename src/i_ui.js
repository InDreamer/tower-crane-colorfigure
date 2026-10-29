
/* ================= behaviour: taking apart, picking parts, the working cycle ================= */
let ui;
const ejOf = L => EJ0 + L*(EJ1 - EJ0);
const ORDER = [1, 2, 3, 4, 5];
const assembled = st => st.p.every(v => v < .001) && st.tgt.every(v => v === 0) && st.subSel === 0 && Object.values(st.pull).every(v => v < .001);
function stopAuto(st){ st.auto = false; st.autoWait = 0; st.pending = null; }
function setTargets(st, want, stagger){            // want[k] 0/1; stagger: separate one after another
  const opening = ORDER.filter(k => want[k] && !st.tgt[k]), closing = ORDER.filter(k => !want[k] && st.tgt[k]);
  opening.forEach((k, i) => { st.tgt[k] = 1; st.dl[k] = stagger ? i*.28 : 0; });
  closing.reverse().forEach((k, i) => { st.tgt[k] = 0; st.dl[k] = stagger ? i*.28 : 0; });
  run();
}
function explodeAll(){ const st = ui.st; if (st.busy) return ui.flash('正在工作，等这一步做完'); stopAuto(st); st.sel = -1; st.subSel = 0; setTargets(st, [0, 1, 1, 1, 1, 1], true); }
function collapseAll(){ const st = ui.st; if (st.busy) return ui.flash('正在工作，等这一步做完'); stopAuto(st); st.sel = -1; st.subSel = 0; setTargets(st, [0, 0, 0, 0, 0, 0], true); }
function pickSystem(k){
  const st = ui.st; if (st.busy) return ui.flash('正在工作，等这一步做完');
  stopAuto(st); st.sel = k; st.subSel = 0; const w = [0, 0, 0, 0, 0, 0]; w[k] = 1; setTargets(st, w, false);
}
function putBack(){ const st = ui.st; if (st.busy) return ui.flash('正在工作，等这一步做完'); stopAuto(st); st.sel = -1; st.subSel = 0; setTargets(st, [0, 0, 0, 0, 0, 0], false); }
function pickPart(k, n){
  const st = ui.st; if (st.busy) return ui.flash('正在工作，等这一步做完');
  if (st.sel !== k) return pickSystem(k);
  stopAuto(st); st.subSel = st.subSel === n ? 0 : n; run();
}

/* ----- the working cycle: each step is a list of timed moves; act = the cylinder pair the valve is feeding ----- */
const STEPS = {
  hook: { name: '挂桶', segs: [
    { d: .9, f: (st, t) => { st.hook = Math.min(.999, sstep(t)); } },
    { d: .5, f: (st, t) => { st.hook = 1; st.clamp = sstep(t); } } ] },
  lift: { name: '提升', segs: [ { d: 1.1, act: 'lift', f: (st, t) => { st.lift = sstep(t); } } ] },
  tip: { name: '翻倒', segs: [
    { d: 1.5, act: 'tip', f: (st, t) => { st.tip = sstep(t); st.lidA = sstep((t - .45)/.45); } },
    { d: 1.3, f: (st, t) => { st.pour = t; st.binFull = 1 - t; st.hop = Math.max(st.hop, t); } },
    { d: 1.3, act: 'tip', f: (st, t) => { st.pour = 1; st.tip = 1 - sstep(t); st.lidA = 1 - sstep(t/.6); } },
    { d: .8, act: 'lift', f: (st, t) => { st.pour = 0; st.lift = 1 - sstep(t); } },
    { d: .4, f: (st, t) => { st.clamp = 1 - t; } },
    { d: .8, f: (st, t) => { st.hook = Math.min(.999, 1 - sstep(t)); if (t >= 1){ st.hook = 0; st.binFull = 1; } } } ] },
  pack: { name: '压缩', segs: [
    { d: .8, act: 'blade', f: (st, t) => { st.blade = sstep(t); } },
    { d: 1, act: 'slide', f: (st, t) => { st.slide = sstep(t); } },
    { d: 1.1, act: 'blade', f: (st, t) => { st.blade = 1 - sstep(t); st.pk = .5*sstep(t); } },
    { d: 1.3, act: 'slide', f: (st, t) => { st.slide = 1 - sstep(t); st.pk = .5 + .5*sstep(t);
        st.load = Math.min(1, st.L0 + binLoadStep(st)*sstep(t)); st.ej = ejOf(st.load);
        if (t >= 1){ st.hop = 0; st.pk = 0; st.packed = true; } } } ] },
  press: { name: '推实', segs: [ { d: 1.2, act: 'eject', f: (st, t) => { st.ej = ejOf(st.load) - 3.2*Math.sin(Math.PI*t); st.dense = Math.min(1, st.d0 + .35*sstep(t)); if (t >= 1) st.packed = false; } } ] },
  dump: { name: '卸料', segs: [
    { d: 1.6, act: 'gate', f: (st, t) => { st.gate = sstep(t); } },
    { d: 2.6, act: 'eject', f: (st, t) => { const e = sstep(t); st.ej = lerp(st.ejS, 43.4, e); st.load = st.L0*(1 - e); st.pile = Math.max(st.pile, e); } },
    { d: 1.4, act: 'eject', f: (st, t) => { st.load = 0; st.ej = lerp(43.4, EJ0, sstep(t)); } },
    { d: 1.5, act: 'gate', f: (st, t) => { st.gate = 1 - sstep(t); if (t >= 1) st.dense = 0; } } ] },
};
const STEP_ORDER = ['hook', 'lift', 'tip', 'pack', 'press', 'dump'];
// why a step can't run yet (the hint names the step that has to come first), or '' if it can
function whyNot(st, id){
  const pct = Math.round(st.load*100);
  if (!Object.hasOwn(STEPS, id)) return '未知步骤：请选择有效的工作步骤';
  if (st.gate > 0 && ['hook', 'lift', 'tip', 'pack', 'press'].includes(id)) return '先关闭后门，再继续工作';
  if (id === 'hook') return st.hook >= 1 ? '桶已挂好：下一步提升' : st.hop > .05 ? '料斗有垃圾：先压缩' : st.packed ? '先推实，再挂桶' : st.load >= .999 ? '车厢已满：先卸料' : '';
  if (id === 'lift') return st.hook < 1 ? '先挂桶，再提升' : st.lift >= 1 ? '已经提升：下一步翻倒' : '';
  if (id === 'tip') return st.hook < 1 ? '先挂桶、提升，再翻倒' : st.lift < 1 ? '先提升，再翻倒' : '';
  if (id === 'pack') return st.load >= .999 ? '车厢已满：先卸料' : st.hook >= 1 ? '先把垃圾桶倒完放下' : st.hop < .05 ? '料斗是空的：先挂桶、提升、翻倒' : '';
  if (id === 'press') return st.hop > .05 ? '先压缩，再推实' : !st.packed ? '先压缩，再推实' : '';
  if (id === 'dump') return st.load < .999 ? `车厢未满（${pct}%）：继续装桶、压缩` : st.packed ? '先推实，再卸料' : [st.hook, st.lift, st.tip, st.clamp].some(v => v > .001) ? '先放下垃圾桶并让提升机构归位，再卸料' : '';
  return '';
}
function doStep(id, quiet){
  const st = ui.st;
  if (st.busy){ if (!quiet) ui.flash('正在动作，等这一步做完'); return false; }
  const w = whyNot(st, id); if (w){ ui.flash(w, 2000); return false; }
  if (!assembled(st)){ st.sel = -1; st.subSel = 0; st.pending = id; setTargets(st, [0, 0, 0, 0, 0, 0], true); ui.flash('先合拢，再工作'); return false; }
  st.busy = true; st.cur = { id, i: 0, t: 0 }; st.L0 = st.load; st.d0 = st.dense; st.ejS = st.ej;
  run(); return true;
}
function nextAuto(st){
  if (st.hook >= 1 && st.lift < 1) return 'lift';
  if (st.hook >= 1 && st.lift >= 1) return 'tip';
  if (st.hop > .05) return 'pack';
  if (st.packed) return 'press';
  if (st.load >= .999) return 'dump';
  return 'hook';
}
function startAutoStep(st){ if (!doStep(nextAuto(st), true) && !st.pending) stopAuto(st); }
function toggleAuto(){
  const st = ui.st;
  if (st.auto){ stopAuto(st); return ui.flash('做完这一步后停下'); }
  st.auto = true; st.autoWait = 0; st.autoN = 0;
  if (!st.xrT) setXr(1);
  if (!st.busy) startAutoStep(st);
}
function setXr(v){ const st = ui.st; st.xrT = v; const b = document.getElementById('xrb'); if (b) b.setAttribute('aria-pressed', !!v); run(); }

/* ----- 涂装 and 垃圾桶: repaint the truck; swap the bin (only while it stands free and nothing is running) ----- */
function setSkin(id, remember){
  applySkin(id); ui.st.skin = SKIN_ID; ui.st.paint = paintOf(SKIN_ID);          // the picker starts from what is on the truck
  if (remember) paintStore(ui.st);
  if (remember) ui.flash(`涂装：${skinOf(SKIN_ID).name}`);
  ui.invalidate();
}
function binBusy(st){ return st.hook > 0 || st.busy || !!st.cur || !!st.pending; }
// patch: any of binStyle / binSize / binType. A size the style does not make becomes the nearest one it does. The picture of the swap
// (st.swapT 1 -> 0, see makeFrames) is only an offset: the state holds the new bin at once.
function setBin(patch){
  const st = ui.st;
  if (binBusy(st)) return ui.flash('先把垃圾桶倒完放下，再换桶', 2000);
  const old = { binStyle: binStyleOf(st.binStyle).id, binSize: binSpec(st).id, binType: binTypeOf(st.binType).id, binColor: st.binColor || null };
  Object.assign(st, patch);
  st.binStyle = binStyleOf(st.binStyle).id; st.binSize = binSizeFor(st.binStyle, st.binSize); st.binType = binTypeOf(st.binType).id;
  st.binFull = 1; st.lidA = 0; st.pour = 0;                       // the new bin stands full, lid shut
  binStore(st);
  if (st.binStyle !== old.binStyle || st.binSize !== old.binSize || st.binType !== old.binType){ st.swapOld = old; st.swapT = 1; run(); }
  ui.flash(`垃圾桶：${binLabel(st)}`); ui.invalidate();
}
const binLabel = st => `${binStyleOf(st.binStyle).name} ${binSpec(st).name} ${binTypeOf(st.binType).name}`;
const skinChoices = st => [{ heading: '预设' }, ...SKINS.map(k => ({ label: k.name, swatch: k.dot, current: st.skin === k.id, onClick: () => setSkin(k.id, true) }))];
const skinDot = st => st.skin === 'custom' ? st.paint.body : skinOf(st.skin).dot;
// paint one zone of the custom paint (live while dragging: no storage write here, the picker commits on release)
function setZone(z, hex){
  const st = ui.st; if (st.skin === 'custom' && st.paint[z] === hex) return;
  st.paint[z] = hex; st.skin = applyPaint(st.paint); ui.invalidate();
}
/* the custom paint picker inside the 涂装 dropdown: zone tabs, a saturation/value square, a hue bar, a HEX box and a preview.
   Built once per opening; dragging only moves the knobs and recolours a few elements (the dropdown is not redrawn). */
const ZONE_TABS = [['body', '箱体'], ['cab', '驾驶室'], ['lift', '上料机构']];
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
// the truck paint: one picker, three zone tabs
function skinPanel(st, ui){
  // the first edit turns the truck custom: the preset chip stops being marked as the current one (the chips are otherwise left alone)
  const root = colorPicker({ zones: ZONE_TABS, get: z => st.paint[z], commit: () => paintStore(st),
    set: (z, hex) => { const was = st.skin; setZone(z, hex);
      if (was !== 'custom' && root.parentNode) for (const b of root.parentNode.querySelectorAll('.chip.current')){ b.classList.remove('current'); b.removeAttribute('aria-pressed'); } } });
  return root;
}
// the bin's colour: follow the waste type, or any custom colour (cosmetic, so it works at any time, hooked or running)
const binColorNow = st => hexOf(st.binColor) || binTypeOf(st.binType).mat.m;
function setBinColor(hex, remember){ const st = ui.st; st.binColor = hex ? hexOf(hex) : null; if (remember) binStore(st); ui.invalidate(); }
function binPanel(st, ui){
  const root = colorPicker({ zones: [['bin', '']], get: () => binColorNow(st), commit: () => binStore(st), set: (z, hex) => { setBinColor(hex, false); modes(); } });
  const row = document.createElement('div'); row.className = 'tabs'; root.insertBefore(row, root.firstChild);
  const mkb = (txt, f) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'skt'; b.textContent = txt; b.onclick = f; row.appendChild(b); return b; };
  const follow = mkb('跟随分类', () => { setBinColor(null, true); root.sync(); modes(); }),
    custom = mkb('自定义', () => { setBinColor(binColorNow(st), true); root.sync(); modes(); });
  function modes(){ follow.setAttribute('aria-pressed', !st.binColor); custom.setAttribute('aria-pressed', !!st.binColor); }
  modes();
  return root;
}
const binChoices = st => { const sty = binStyleOf(st.binStyle), sp = binSpec(st);
  return [{ heading: '款式' },
    ...BIN_STYLES.map(s => ({ label: s.name, current: sty.id === s.id, onClick: () => setBin({ binStyle: s.id }) })),
    { heading: '容量' },
    ...sty.specs.map(b => ({ label: b.name, current: sp.id === b.id, onClick: () => setBin({ binSize: b.id }) })),
    { heading: '分类' },
    ...BIN_TYPES.map(t => ({ label: t.name, swatch: t.dot, current: binTypeOf(st.binType).id === t.id, onClick: () => setBin({ binType: t.id }) })),
    { heading: '颜色' } ]; };

/* ----- one clock for everything that moves ----- */
let loopOn = false;
function advanceStep(st, dt){
  while (st.cur && dt > 1e-12){
    const cur = st.cur, seg = STEPS[cur.id].segs[cur.i], remaining = (1 - cur.t)*seg.d, elapsed = Math.min(dt, remaining);
    dt -= elapsed; cur.t = remaining - elapsed < 1e-12 ? 1 : cur.t + elapsed/seg.d;
    st.act = seg.act || null; st.pump = seg.act ? 1 : 0; seg.f(st, cur.t);
    if (cur.t >= 1){ cur.i++; cur.t = 0;
      if (cur.i >= STEPS[cur.id].segs.length){ const id = cur.id; st.cur = null; st.busy = false; st.act = null; st.pump = 0; return id; }
    }
  }
  return null;
}
function run(){
  if (loopOn) return; loopOn = true;
  ui.animate(dt => { const st = ui.st; let busy = false;
    st.clock += dt;
    for (const k of ORDER){
      if (st.dl[k] > 0){ st.dl[k] -= dt; busy = true; continue; }
      const d = st.tgt[k] - st.p[k]; if (Math.abs(d) < 1e-3){ st.p[k] = st.tgt[k]; continue; }
      st.p[k] += Math.sign(d)*Math.min(Math.abs(d), dt/.9); busy = true; }
    for (let n = 1; n <= 25; n++){ const want = st.subSel === n ? 1 : 0, cur = st.pull[n] || 0;
      if (Math.abs(want - cur) > 1e-3){ st.pull[n] = cur + Math.sign(want - cur)*Math.min(Math.abs(want - cur), dt/.6); busy = true; } else st.pull[n] = want; }
    const g = Math.sign((st.xrT || 0) - (st.xr || 0)); if (g){ st.xr = clamp01(st.xr + g*dt/.7); busy = true; }
    if (st.pending && assembled(st)){ const id = st.pending; st.pending = null; if (!doStep(id, true) && st.auto && !st.pending) stopAuto(st); }
    if (st.cur){ busy = true; const finished = advanceStep(st, dt);
      if (finished && st.auto){ if (finished === 'dump') stopAuto(st); else st.autoWait = .25; }
    } else if (st.auto && !st.pending){
      st.autoWait = Math.max(0, (st.autoWait || 0) - dt);
      if (!st.autoWait) startAutoStep(st);
    }
    if (!st.cur && st.pile > 0 && st.gate === 0 && st.load === 0){ st.pile = Math.max(0, st.pile - dt/2.2); busy = true; }
    if (st.swapT > 0){ st.swapT = Math.max(0, st.swapT - dt/.55); busy = true; }
    if (st.zoomMoving) busy = true;
    if (!busy && !st.auto) loopOn = false;
    return busy || !!st.auto; });
}

// paint and bin from the URL: ?skin=<id>, ?body= ?cab= ?lift= (RRGGBB: a custom paint on top of ?skin), ?binStyle=wheelie|cart4|drum|dome|pedal, ?binColor=RRGGBB,
// ?bin=<litres> (one of that style's sizes, else its default; without ?binStyle the first style that makes that size), ?binType=kitchen|other|recycle|hazard (anything else: the default); without ?skin / colours the remembered paint (if the browser kept one) is used
function lookParams(st, q){
  const url = paintParams(q), kept = !url && !q.has('skin') ? paintStored() : null;
  if (url || (kept && kept.skin === 'custom')){ st.paint = url || kept.paint; st.skin = applyPaint(st.paint); }
  else { st.skin = applySkin(q.has('skin') ? q.get('skin') : kept && kept.skin); st.paint = paintOf(st.skin); }
  const bkept = binStored() || {}, sized = q.has('bin') || q.has('binStyle');       // the URL decides style and size when it names either; else what the browser kept
  const bn = /^\d+$/.test(q.get('bin') || '') ? Number(q.get('bin')) : NaN, bsy = BIN_STYLES.find(s => s.id === q.get('binStyle'));
  const sty = sized ? bsy || binStyleForSize(bn) || binStyleOf(BIN_STYLE_DEFAULT) : binStyleOf(bkept.binStyle);     // an old ?bin=660 link names no style: the style that makes that size
  st.binStyle = sty.id; st.binSize = sized ? (sty.sizes.includes(bn) ? bn : sty.dflt) : bkept.binSize || sty.dflt;
  st.binType = binTypeOf(q.has('binType') ? q.get('binType') : bkept.binType).id;
  st.binColor = urlHex(q.get('binColor')) || bkept.binColor || null;             // ?binColor=RRGGBB (an invalid one is ignored)
}

ui = mountFigure({
  fig: '08', turn: 'full', title: '压缩式垃圾车 · 结构拆解图', credit: false,
  size: [196, 62, 72], center: [86, 25], palette: 'mint',
  state: { p: [0,0,0,0,0,0], tgt: [0,0,0,0,0,0], dl: [0,0,0,0,0,0], E: [0,0,0,0,0,0], sel: -1, subSel: 0, pull: {},
    hook: 0, clamp: 0, lift: 0, tip: 0, lidA: 0, binFull: 1, pour: 0, hop: 0, pk: 0, slide: 0, blade: 0,
    load: .6, ej: ejOf(.6), dense: 0, skin: SKIN_DEFAULT, paint: paintOf(SKIN_DEFAULT), binStyle: BIN_STYLE_DEFAULT, binSize: BIN_SIZE_DEFAULT, binType: BIN_TYPE_DEFAULT, binColor: null, swapT: 0, swapOld: null, packed: false, gate: 0, pile: 0, pump: 0, act: null, clock: 0, busy: false, auto: false, autoWait: 0, cur: null },
  scene,
  buttons: [
    { label: '拆解', onClick: () => explodeAll() },
    { label: '合拢', onClick: () => collapseAll() },
    { label: '工作', onClick: () => toggleAuto() },
    { label: '分步', choices: st => STEP_ORDER.map((id, i) => ({ label: `${i + 1} ${STEPS[id].name}`, onClick: () => { stopAuto(st); doStep(id); } })) },
    { label: '涂装', swatch: skinDot, choices: skinChoices, panel: skinPanel },
    { label: '垃圾桶', swatch: st => hexOf(st.binColor) || binTypeOf(st.binType).dot, choices: binChoices, panel: binPanel },
  ],
  stats: st => [{ label: '装载量', value: Math.round(st.load*100) + '%' }, { label: '垃圾桶', value: binLabel(st), small: true }],
  params: (st, q) => {
    lookParams(st, q);
    if (q.has('ex')){ const v = q.get('ex').split('').filter(c => /^[1-5]$/.test(c)).map(Number); for (const k of ORDER) st.p[k] = st.tgt[k] = v.includes(k) ? 1 : 0; }
    const sel = q.has('sel') ? Number(q.get('sel')) : NaN, sub = q.has('sub') ? Number(q.get('sub')) : NaN;
    const validSel = Number.isInteger(sel) && sel >= 1 && sel <= 5, validSub = Number.isInteger(sub) && sub >= 1 && sub <= 25;
    if (validSel || validSub){ st.sel = validSel ? sel : SYS_OF(sub); st.p[st.sel] = st.tgt[st.sel] = 1;
      if (validSub && SYS_OF(sub) === st.sel){ st.subSel = sub; st.pull[sub] = 1; } }
    for (const k of ['hook', 'clamp', 'lift', 'tip', 'lidA', 'binFull', 'hop', 'pk', 'slide', 'blade', 'load', 'gate', 'pile', 'pour', 'dense']){
      const v = Number(q.get(k)); if (q.has(k) && Number.isFinite(v) && !(k === 'lift' && urlHex(q.get(k)))) st[k] = clamp01(v);   // (?lift=RRGGBB is the lifter's colour)
    }
    st.ej = ejOf(st.load);
    if (q.has('ej')){ const v = Number(q.get('ej')); if (Number.isFinite(v)) st.ej = Math.max(43.4, Math.min(EJ1, v)); }
    if (['lift', 'tip', 'blade', 'slide', 'eject', 'gate'].includes(q.get('act'))){ st.act = q.get('act'); st.pump = 1; }
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
})();
run();
