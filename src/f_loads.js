/* ================= 吊物 (swappable loads): six styles x three sizes x three riggings x any colour =================
   LOAD is the load on the crane right now; applyLoad() rewrites it in place (like the paint in g_skin.js), so nothing else keeps a copy.
   A style builds itself in its own frame: x along the length, y across, z up, the underside on z = 0, centred on x = y = 0, so the
   centre of mass is on the hook's line (every style is symmetric, the test measures it). Its top is exactly sp.h, and every lifting point
   is on that top: lift(sp, rig) lists them (x, y, h) and the slings run from the hook's lower eye (hookAnchor) to those points.
   Hanging constraints, in model units (the mast is 10 across, a section 16 high; the pad is 29 x 15, the building's top slab 30 x 22):
     - sling height above the lifting points sp.v = 8 or 9, so the shackle is v >= 8 above the load top (the test wants > 1);
     - length <= 26, width <= 12, height <= 12; the pad is 14.4 wide and 29 long, the slab is 22 wide and 30 long, the rebar stubs stand
       13.5 from the slab's middle: a load turned 10 degrees on the slab (yaw 170) stays inside +-12.7 there;
     - the lifting points are symmetric about the load's middle, so the slings meet the hook above the centre of mass;
     - heavy sizes (4.5 t hopper, 5.0 t panel) are over the load chart at both spots (2.95 t at the pad's 25.5 m, 3.5 t on the roof's 21.8 m);
       every other size is 2.8 t or less, so the whole cycle works with it.
   Riggings: 'two' two wire legs, 'four' four wire legs (thimble at each lifting point), 'belt' two flat belts. A style lists the ones it can use
   and the reason for the others. Colours: one body colour per style (the straps, frames, wood and lugs keep theirs). */
const LD_RIGS = [['two', '两肢吊索'], ['four', '四肢吊索'], ['belt', '吊带']];
const LD_SIZES = [['s', '小'], ['m', '中'], ['l', '大']];
const REB = { l: '#cf8a63', m: '#a85f3c', d: '#6d3b24' };
const PALW = { l: '#e2bf8a', m: '#bf9157', d: '#80592e' };
const ldTone = hex => { const t = tuneOf(hex); return triM(t.m, t.wl, t.dk); };
// a block with a square top and bottom of other sizes (the hopper's body)
function gFrus(h0, h1, z0, z1, m, o = {}){
  const ring = (hh, z) => [[-hh, -hh], [hh, -hh], [hh, hh], [-hh, hh]].map(([x, y]) => wpt([x, y, z])), A = ring(h0, z0), B = ring(h1, z1);
  return push(solid(A, B, m, o.w ?? .6, o.sh || tone) + hullInk([...A, ...B], o.ink ?? 1.4), [...A, ...B], { ...o, planes: planesOf(A, B) });
}
const lb = (x0, y0, z0, x1, y1, z1, m, o = {}) => gB(x0, y0, z0, x1, y1, z1, m, .5, { ink: 1, ...o });
const LD_STYLES = [
  { id: 'hopper', name: '混凝土料斗', col: '#2f8fd6', rig: 'four', rigs: ['four'], why: { two: '料斗用自己的 4 个吊耳，只能用四肢吊索', belt: '料斗用自己的 4 个吊耳，只能用四肢吊索' }, v: 8,
    sizes: { s: { t: 1, w: 7, h: 7 }, m: { t: 2, w: 9, h: 9 }, l: { t: 4.5, w: 12, h: 11 } }, dims: p => ({ w: p.w, d: p.w, h: p.h }),
    // tapered steel hopper standing in a frame (four posts and a rim), a gate with a lever under it, four lifting lugs on the posts
    build(sp, C){
      const a = sp.w/2, pw = .8, zp = sp.h - 1.2, zr = zp - .8, hb = .17*sp.w;
      for (const sx of [-1, 1]) for (const sy of [-1, 1]){
        const x0 = sx > 0 ? a - pw : -a, y0 = sy > 0 ? a - pw : -a;
        lb(x0, y0, 0, x0 + pw, y0 + pw, zp, DKS, { ink: 1.2 });
        lb(x0 + pw/2 - .25, y0 + pw/2 - .7, zp, x0 + pw/2 + .25, y0 + pw/2 + .7, sp.h, HKY, { ink: .9 });
      }
      for (const y0 of [-a, a - pw]) lb(-a + pw, y0, zr, a - pw, y0 + pw, zp, DKS);
      for (const x0 of [-a, a - pw]) lb(x0, -a + pw, zr, x0 + pw, a - pw, zp, DKS);
      gFrus(hb, a - pw - .15, 1.5, zp - .2, C, { ink: 1.6 });
      lb(-hb - .3, -hb - .3, .5, hb + .3, hb + .3, 1.5, DKS, { ink: 1.2 });
      gR([hb + .3, 0, 1], [hb + 2.6, 0, 1], .3, HKY, .5, { sides: 8, ink: .9 }); gR([hb + 2.6, 0, 1], [hb + 3.1, 0, 1], .55, RED, .5, { sides: 8, ink: .9 });
    },
    lift: sp => { const c = sp.w/2 - .4; return [[-c, -c, sp.h], [c, -c, sp.h], [-c, c, sp.h], [c, c, sp.h]]; } },
  { id: 'rebar', name: '钢筋捆', col: '#a85f3c', pal: REB, rig: 'four', rigs: ['two', 'four', 'belt'], why: {}, v: 9,
    sizes: { s: { t: 1.2, w: 16, ny: 3, nz: 2 }, m: { t: 2, w: 22, ny: 4, nz: 3 }, l: { t: 2.7, w: 24, ny: 5, nz: 3 } }, dims: p => ({ w: p.w, d: p.ny + .4, h: p.nz + .61 }),
    // rods in a bundle of ny x nz, two yellow straps round it
    build(sp, C){
      const hl = sp.w/2, R = .48, sx = .32*sp.w, ht = sp.d/2, zt = .73 + (sp.nz - 1) + R, yl = (sp.ny - 1)/2 + R;
      for (let j = 0; j < sp.ny; j++) for (let k = 0; k < sp.nz; k++) gR([-hl, j - (sp.ny - 1)/2, .73 + k], [hl, j - (sp.ny - 1)/2, .73 + k], R, C, .5, { sides: 8, ink: 1 });
      for (const s of [-sx, sx]){
        const x0 = s - .25, x1 = s + .25;
        lb(x0, -ht, 0, x1, ht, .25, HKY); lb(x0, -ht, zt, x1, ht, sp.h, HKY);
        lb(x0, yl + .01, .25, x1, ht, zt, HKY); lb(x0, -ht, .25, x1, -yl - .01, zt, HKY);
      }
    },
    lift: (sp, rig) => { const s = .32*sp.w, y = sp.d/2 - .5; return rig === 'four' ? [[-s, -y, sp.h], [-s, y, sp.h], [s, -y, sp.h], [s, y, sp.h]] : [[-s, 0, sp.h], [s, 0, sp.h]]; } },
  { id: 'beam', name: '工字钢梁', col: '#7d8f9e', rig: 'two', rigs: ['two', 'four', 'belt'], why: {}, v: 9,
    sizes: { s: { t: 1, w: 18, n: 1 }, m: { t: 1.9, w: 22, n: 2 }, l: { t: 2.8, w: 22, n: 3 } }, dims: p => ({ w: p.w, d: p.n*3.1 - .5 + .6, h: 3.45 }),
    // one to three I-beams side by side (flanges and web are three blocks), a yellow strap round the stack at each end
    build(sp, C){
      const L = sp.w/2, fw = 1.3, ft = .55, tw = .22, bh = 3.2, W = sp.n*3.1 - .5;
      for (let i = 0; i < sp.n; i++){ const y = (i - (sp.n - 1)/2)*3.1;
        lb(-L, y - fw, 0, L, y + fw, ft, C); lb(-L, y - fw, bh - ft, L, y + fw, bh, C); lb(-L, y - tw, ft, L, y + tw, bh - ft, C); }
      for (const s of [-.3*sp.w, .3*sp.w]){ lb(s - .25, -W/2 - .3, bh, s + .25, W/2 + .3, sp.h, HKY);
        lb(s - .25, -W/2 - .3, 0, s + .25, -W/2, bh, HKY); lb(s - .25, W/2, 0, s + .25, W/2 + .3, bh, HKY); }
    },
    lift: (sp, rig) => { const s = .3*sp.w, y = sp.d/2 - .6; return rig === 'four' ? [[-s, -y, sp.h], [-s, y, sp.h], [s, -y, sp.h], [s, y, sp.h]] : [[-s, 0, sp.h], [s, 0, sp.h]]; } },
  { id: 'panel', name: '预制墙板', col: '#cfcfc8', rig: 'two', rigs: ['two', 'four'], why: { belt: '墙板要挂在顶上的吊环里，不能用吊带' }, v: 8,
    sizes: { s: { t: 1.2, w: 10, d: 1, h: 7 }, m: { t: 2.4, w: 14, d: 1.2, h: 9 }, l: { t: 5, w: 18, d: 1.5, h: 11 } }, dims: p => ({ w: p.w, d: p.d, h: p.h }),
    // a wall panel standing on its edge, a window opening (four blocks round it), four lifting anchors on top
    build(sp, C){
      const x = sp.w/2, y = sp.d/2, hb = sp.h - .7, ww = .16*sp.w, z0 = .32*hb, z1 = .74*hb;
      lb(-x, -y, 0, -ww, y, hb, C, { ink: 1.3 }); lb(ww, -y, 0, x, y, hb, C, { ink: 1.3 });
      lb(-ww, -y, 0, ww, y, z0, C, { ink: 1.3 }); lb(-ww, -y, z1, ww, y, hb, C, { ink: 1.3 });
      for (const s of [-.36, -.12, .12, .36]) lb(s*sp.w - .4, -.25, hb, s*sp.w + .4, .25, sp.h, HKY, { ink: .9 });
    },
    lift: (sp, rig) => rig === 'four' ? [-.36, -.12, .12, .36].map(s => [s*sp.w, 0, sp.h]) : [-.36, .36].map(s => [s*sp.w, 0, sp.h]) },
  { id: 'pallet', name: '砖托盘', col: '#b4483a', rig: 'four', rigs: ['four', 'belt'], why: { two: '砖垛要挂在四个角上，不能用两肢吊索' }, v: 9,
    sizes: { s: { t: 1.4, w: 8, d: 6, n: 4 }, m: { t: 2.1, w: 10, d: 7.5, n: 5 }, l: { t: 2.8, w: 12, d: 9, n: 6 } }, dims: p => ({ w: p.w, d: p.d, h: 1.2 + p.n*.9 + 1.3 }),
    // a wooden pallet, a stack of brick courses (every other course a little in), a steel plate on top with six lugs, a yellow strap each side
    build(sp, C){
      const x = sp.w/2, y = sp.d/2, sx = x - .5, sy = y - .5, zt = 1.2 + sp.n*.9, Cl = ldTone(mix(C.m, '#ffffff', .1));
      for (const q of [-y, -.45, y - .9]) lb(-x, q, 0, x, q + .9, .6, PALW);
      lb(-x, -y, .6, x, y, 1.2, PALW, { ink: 1.1 });
      for (let i = 0; i < sp.n; i++){ const e = i % 2 ? .14 : 0; lb(-sx + e, -sy + e, 1.2 + i*.9, sx - e, sy - e, 2.1 + i*.9, i % 2 ? Cl : C, { ink: .9 }); }
      lb(-sx - .3, -sy - .3, zt, sx + .3, sy + .3, zt + .4, STL, { ink: 1.1 });
      for (const q of [-sy - .2, sy]) lb(-.5, q, 1.2, .5, q + .2, zt, HKY);
      for (const [lx, ly] of [[-sx, -sy], [sx, -sy], [-sx, sy], [sx, sy], [-sx, 0], [sx, 0]]) lb(lx - .5, ly - .25, zt + .4, lx + .5, ly + .25, sp.h, HKY, { ink: .9 });
    },
    lift: (sp, rig) => { const sx = sp.w/2 - .5, sy = sp.d/2 - .5; return rig === 'belt' ? [[-sx, 0, sp.h], [sx, 0, sp.h]] : [[-sx, -sy, sp.h], [sx, -sy, sp.h], [-sx, sy, sp.h], [sx, sy, sp.h]]; } },
  { id: 'pipes', name: '钢管束', col: '#4aa58d', rig: 'two', rigs: ['two', 'four', 'belt'], why: {}, v: 9,
    sizes: { s: { t: 1.1, w: 18, rows: [2, 3, 2] }, m: { t: 1.9, w: 22, rows: [3, 4, 3] }, l: { t: 2.8, w: 22, rows: [4, 5, 4] } },
    dims: p => ({ w: p.w, d: 2*Math.max(...p.rows)*PIPE_R + .5, h: PIPE_R*2 + (p.rows.length - 1)*PIPE_R*1.732 + .25 }),
    // round pipes in a hexagonal bundle, a top strap and two side straps at each end
    build(sp, C){
      const L = sp.w/2, ym = Math.max(...sp.rows)*PIPE_R, ztop = sp.h - .25;
      sp.rows.forEach((c, r) => { for (let j = 0; j < c; j++){ const y = (j - (c - 1)/2)*2*PIPE_R, z = PIPE_R + r*PIPE_R*1.732; gR([-L, y, z], [L, y, z], PIPE_R, C, .5, { sides: 10, ink: 1 }); } });
      for (const s of [-.3*sp.w, .3*sp.w]){ lb(s - .25, -ym - .25, ztop, s + .25, ym + .25, sp.h, HKY); lb(s - .25, ym, PIPE_R, s + .25, ym + .25, ztop, HKY); lb(s - .25, -ym - .25, PIPE_R, s + .25, -ym, ztop, HKY); }
    },
    lift: (sp, rig) => { const s = .3*sp.w, y = Math.max(...sp.rows)*PIPE_R*.7; return rig === 'four' ? [[-s, -y, sp.h], [-s, y, sp.h], [s, -y, sp.h], [s, y, sp.h]] : [[-s, 0, sp.h], [s, 0, sp.h]]; } },
];
const PIPE_R = .95;
const LD_DEFAULT = { style: 'rebar', size: 'm', rig: 'four', color: null };
const ldStyle = id => LD_STYLES.find(s => s.id === id);
// anything -> { style, size, rig, color }: an unknown style / size / rig falls back (the size to the middle one, the rig to the style's own), a colour that is not #rrggbb to null (the style's own)
function ldNorm(sel){
  const o = sel && typeof sel === 'object' ? sel : {}, sty = ldStyle(o.style) || ldStyle(LD_DEFAULT.style);
  return { style: sty.id, size: typeof o.size === 'string' && Object.hasOwn(sty.sizes, o.size) ? o.size : LD_DEFAULT.size, rig: sty.rigs.includes(o.rig) ? o.rig : sty.rig, color: o.color == null ? null : hexOf(o.color) };
}
// the style's own size nearest in weight to the weight of the load that was there (a swap of style keeps about the same weight)
const ldNearest = (sty, t) => Object.keys(sty.sizes).reduce((a, k) => Math.abs(sty.sizes[k].t - t) < Math.abs(sty.sizes[a].t - t) - 1e-9 ? k : a);
const LOAD = {};      // what is on the crane: { kind, size, rig, color, name, w, d, h, t (tonnes), v (sling height) + the style's own fields }
let LSEL = ldNorm(LD_DEFAULT);
function applyLoad(sel){
  const n = ldNorm(sel), sty = ldStyle(n.style), p = sty.sizes[n.size];
  for (const k of Object.keys(LOAD)) delete LOAD[k];
  Object.assign(LOAD, p, sty.dims(p), { kind: sty.id, size: n.size, rig: n.rig, color: n.color, name: sty.name, v: sty.v });
  LSEL = n; return n;
}
const loadStyle = () => ldStyle(LOAD.kind);
const ldTones = (sty, color) => color ? ldTone(color) : sty.pal || ldTone(sty.col);
const ldRigName = id => LD_RIGS.find(r => r[0] === id)[1], ldSizeName = id => LD_SIZES.find(s => s[0] === id)[1];
const ldLabel = () => `${LOAD.name} ${LOAD.t.toFixed(1)}t ${ldRigName(LOAD.rig)}`;
// why the load can't be swapped just now, or null
const ldWhyNot = st => st.hooked || st.sl > 0 ? '先摘钩，再换吊物' : st.busy || st.cur || st.pending || climbing(st) ? '正在工作，等这一步做完' : null;
// from the URL: ?loadStyle= ?loadSize= ?rig= ?loadColor= (RRGGBB); returns null when none is given
function ldParams(q){
  if (!['loadStyle', 'loadSize', 'rig', 'loadColor'].some(k => q.has(k))) return null;
  const sty = ldStyle(q.get('loadStyle')), o = { style: sty ? sty.id : LD_DEFAULT.style, size: q.get('loadSize'), rig: q.get('rig'), color: urlHex(q.get('loadColor')) };
  return ldNorm(o);
}
const LD_STORE = 'tower-crane.load';
function ldStored(){
  try { const o = JSON.parse(localStorage.getItem(LD_STORE)); if (o && typeof o === 'object' && ldStyle(o.style)) return ldNorm(o); } catch (e) {}
  return null;
}
const ldStore = sel => { try { localStorage.setItem(LD_STORE, JSON.stringify(ldNorm(sel))); } catch (e) {} };
applyLoad(LD_DEFAULT);
