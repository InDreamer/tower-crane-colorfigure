/* ================= 垃圾桶规格: styles (款式) x sizes (容量) x waste-sorting types (分类), all data-driven =================
   Bin frame: x = depth (front face toward the truck, the lifter's comb is at x 2.6..3.6), y = width about YC, z = up from the
   ground. Every number a bin is built from comes from its spec, so any style / size can be combined with any type (the type only
   chooses the colour and the markings). A style has its own geometry (src/e_lift.js buildBin dispatches on spec.kind) and its own
   list of sizes; the size is the litre capacity L (what one emptied bin adds to the body's load is proportional to it).
     wheelie  两轮翻盖桶  120 / 240 / 360 L   tapered box, hinged lid, two wheels on an axle, push bar     (kind 'box')
     cart4    四轮大桶    660 / 1100 L         the same box, 4 wheels, a flat lid in two flaps, side grips   (kind 'box')
     drum     圆形铁桶    100 / 200 L          16-sided steel drum, two rolling hoops, knob lid, welded bracket, no wheels (kind 'drum')
     dome     圆顶投放桶  120 / 240 L          rounded-corner box, a faceted dome on a hinge, posting hatches in its sides, 2 wheels (kind 'box')
     pedal    脚踏桶      120 / 240 L          rounded-corner wheelie with a foot pedal + lift rod on the back (-x) wall           (kind 'box')
   What the lifter fixes (see buildLifter): the comb's teeth top at z 20.6, y 19.5..30.5; the carriage plate stands at x >= 2.6
   (z 14..19.6); the clamp bar closes at x 1.7..3.9, z >= 21.8, y 18.2..31.8; the carriage shoes / mount plates / tip cylinders
   lie outside y 13.4..36.6. So a bin hangs by a lip bar (half width 3.5..6.8, x 2.6 inside its span, reaching at most x 3.8) whose
   underside meets the comb (z 20.6); nothing else may stand beyond x 2.65 except the rim / lid edge at z >= 19.55, and above z 21.75
   everything stays at x <= 1.7 (clear of the clamp bar). A bin whose lip sits lower than the comb rises by dz while it is hooked on
   (120 L, drums, ...); a taller one has its lip on its front wall and a front face at x <= 1.5. Everything fits the carriage width
   (total y width <= 24, centred on YC) and stands on z 0. The 240 L wheelie / kitchen entry reproduces the original green bin
   number for number. The body colour is the type's, unless the bin has a custom colour (st.binColor, binMat below). */
const GBIN = { l:'#53c25e', m:'#39a246', d:'#1d6a29' };
const BIN_TYPES = [
  { id: 'kitchen', name: '厨余垃圾', mat: GBIN, dot: '#39a246' },
  { id: 'other',   name: '其他垃圾', mat: { l:'#707780', m:'#4c525b', d:'#2a2d33' }, dot: '#4c525b' },
  { id: 'recycle', name: '可回收物', mat: { l:'#5d93e8', m:'#3f72c9', d:'#223f86' }, dot: '#3f72c9' },
  { id: 'hazard',  name: '有害垃圾', mat: { l:'#ef6a58', m:'#cf4535', d:'#80241a' }, dot: '#cf4535' },
];
const BIN_TYPE_DEFAULT = 'kitchen', BIN_STYLE_DEFAULT = 'wheelie', BIN_COMB_Z = 20.6;
const q6 = v => Math.round(v*1e6)/1e6;
// the numbers every style fills in (the lifter, the pouring and the tests read only these): id = L (litres, unique within a style),
// name, w (total y width), lip { x0 x1 hy z0 z1 }, lipZ, dz, mouth { x0 x1 hy z lx0 lx1 lhy lz area }, pourX pourZ pourSpread, wheelList.
// box kind. o: L (litres), bx0 bx1 bhy: bottom ring (back x, front x, half width); tx0 tx1 thy: top ring; zt: top of the body; onLid: the
// lip bar sits on the lid (else on the front wall at the comb height, or at o.lipZ); fo: how far the rim collar overhangs the front face;
// lipHW: lip bar half width; wheels: [{ x, r, w, axle, fork }] pairs (outboard of the body, y from bhy + .4);
// rr: corner radius of the plan (0 = a plain box); lidKind: 'flat' (default) | 'flaps' (two) | 'dome' (o.dome = { sk, dh, r })
function mkBox(o){
  const zb = 1.2, lipZ = o.lipZ ?? (o.onLid ? q6(o.zt + 1) : BIN_COMB_Z), cx1 = q6(o.tx1 + o.fo), hy = q6(o.thy + .4);
  const mw = q6(o.thy - .4), mouthA = (o.tx1 - o.tx0 - .7)*mw*2;
  return { kind: 'box', ...o, zb, lipZ, dz: q6(BIN_COMB_Z - lipZ), w: q6(2*o.thy),
    collar: { x0: q6(o.tx0 - .4), x1: cx1, hy, z0: o.zt, z1: q6(o.zt + 1) },
    lid: { x0: q6(o.tx0 - .6), x1: q6(cx1 + .1), hy, hinge: [q6(o.tx0 - .4), q6(o.zt + 1)], z0: q6(o.zt + 1), z1: q6(o.zt + 1.8) },
    lip: { x0: o.onLid ? o.tx1 : q6(o.tx1 - (o.lipIn ?? .2)), x1: 3.8, hy: o.lipHW, z0: lipZ, z1: q6(lipZ + 1) },
    mouth: { x0: q6(o.tx0 + .4), x1: q6(o.tx1 - .3), hy: mw, z: q6(o.zt + 1.02), lx0: q6(o.tx0 + 1), lx1: q6(o.tx1 - .8), lhy: q6(o.thy - 1), lz: q6(o.zt + 1.05), area: mouthA },
    handle: { x: q6(o.tx0 - 1.2), hy: q6(o.thy - 1.6), z: q6(o.zt - .6) },
    pourX: q6(o.tx1 - 4.4*(o.tx1 - o.tx0)/13), pourSpread: q6(8*o.thy/5.6), pourZ: q6(o.zt + .4),
    wheelList: o.wheels.map(w => ({ ...w, x: q6(w.x), z: w.r, y0: q6(o.bhy + .4), y1: q6(o.bhy + (w.w || 1.8)) })) };
}
// drum kind. o: L, R (circumradius of the 16-gon), zt (top of the drum), lipHW. The drum's front facet stands at x = 1.4; a bracket plate
// (a lug on the top rim) carries the lip bar over the lid, so the drum rises by dz while it hooks on. hoops: heights of the two rolling hoops.
function mkDrum(o){
  const n = 16, ap = q6(o.R*Math.cos(Math.PI/n)), fx = 1.4, cx = q6(fx - ap), lipZ = q6(o.zt + .8), R = o.R, zt = o.zt;
  return { kind: 'drum', ...o, n, ap, fx, cx, lipZ, dz: q6(BIN_COMB_Z - lipZ), w: q6(2*(R + .5)), hoops: [q6(zt*.3), q6(zt*.58)],
    lid: { r: q6(R - .15), z0: zt, z1: q6(zt + .8), hinge: [q6(cx - (R - .15)*Math.cos(Math.PI/n) - .1), q6(zt + .8)], knob: q6(zt + 1.9) },
    lip: { x0: q6(fx - .1), x1: 3.8, hy: o.lipHW, z0: lipZ, z1: q6(lipZ + 1) },
    plate: { x0: q6(fx + .3), x1: q6(fx + 1.1), hy: 2.2, z0: q6(zt - 4.4), z1: lipZ },
    mouth: { x0: q6(cx - .7*R), x1: q6(cx + .7*R), hy: q6(.7*R), z: q6(zt + .03), lx0: q6(cx - .6*R), lx1: q6(cx + .6*R), lhy: q6(.6*R), lz: q6(zt + .05), area: Math.PI*(R - .6)*(R - .6) },
    pourX: q6(cx + .4*R), pourSpread: q6(1.3*R), pourZ: q6(zt + .4), wheelList: [] };
}
const BIN_STYLES = [
  { id: 'wheelie', name: '两轮翻盖桶', dflt: 240, specs: [
    mkBox({ id: 120, L: 120, name: '120L', style: 'wheelie', bx0: -7.6, bx1: 1.8, bhy: 4.2, tx0: -8.4, tx1: 2.4, thy: 4.8, zt: 16.8, onLid: true, fo: .5, lipHW: 3.8,
      wheels: [{ x: -7.8, r: 2.2, axle: true }] }),
    mkBox({ id: 240, L: 240, name: '240L', style: 'wheelie', bx0: -9.6, bx1: 1.8, bhy: 5, tx0: -10.6, tx1: 2.4, thy: 5.6, zt: 19.6, onLid: true, fo: .5, lipHW: 4.5,
      wheels: [{ x: -9.8, r: 2.6, axle: true }] }),
    mkBox({ id: 360, L: 360, name: '360L', style: 'wheelie', bx0: -12, bx1: 1, bhy: 5.6, tx0: -13, tx1: 1.4, thy: 6.2, zt: 20.2, onLid: false, fo: .1, lipHW: 5,
      wheels: [{ x: -12.2, r: 2.8, axle: true }] }) ] },
  { id: 'cart4', name: '四轮大桶', dflt: 660, specs: [
    mkBox({ id: 660, L: 660, name: '660L', style: 'cart4', bx0: -11.6, bx1: 1, bhy: 9.4, tx0: -12.6, tx1: 1.4, thy: 10, zt: 23, onLid: false, fo: .1, lipHW: 5.8,
      lidKind: 'flaps', side: true, noHandle: true, wheels: [{ x: -9.6, r: 3.2, axle: true }, { x: -.6, r: 1.8, w: 1.8, fork: true }] }),
    mkBox({ id: 1100, L: 1100, name: '1100L', style: 'cart4', bx0: -17.4, bx1: 1, bhy: 9.8, tx0: -18.8, tx1: 1.4, thy: 10.5, zt: 26.6, onLid: false, fo: .1, lipHW: 6.2,
      lidKind: 'flaps', side: true, noHandle: true, wheels: [{ x: -15.4, r: 3.4, axle: true }, { x: -.8, r: 2, w: 1.9, fork: true }] }) ] },
  { id: 'drum', name: '圆形铁桶', dflt: 200, specs: [
    mkDrum({ id: 100, L: 100, name: '100L', style: 'drum', R: 4.6, zt: 14.2, lipHW: 3.6 }),
    mkDrum({ id: 200, L: 200, name: '200L', style: 'drum', R: 5.8, zt: 17.6, lipHW: 4.2 }) ] },
  { id: 'dome', name: '圆顶投放桶', dflt: 240, specs: [
    mkBox({ id: 120, L: 120, name: '120L', style: 'dome', bx0: -7.6, bx1: .8, bhy: 4.2, tx0: -8.4, tx1: 1.2, thy: 4.8, zt: 14, onLid: false, lipZ: 17.2, lipIn: .8, fo: .3, lipHW: 3.8, rr: 1.8,
      lidKind: 'dome', dome: { sk: 3.4, dh: 4.6, r: 1.8 }, wheels: [{ x: -7.4, r: 2.2, axle: true }] }),
    mkBox({ id: 240, L: 240, name: '240L', style: 'dome', bx0: -9.6, bx1: .8, bhy: 5, tx0: -10.6, tx1: 1.2, thy: 5.6, zt: 15.6, onLid: false, lipZ: 20.6, lipIn: .8, fo: .3, lipHW: 4.5, rr: 2.2,
      lidKind: 'dome', dome: { sk: 3.6, dh: 5.2, r: 2.2 }, wheels: [{ x: -9.4, r: 2.6, axle: true }] }) ] },
  { id: 'pedal', name: '脚踏桶', dflt: 240, specs: [
    mkBox({ id: 120, L: 120, name: '120L', style: 'pedal', bx0: -7.6, bx1: 1.8, bhy: 4.2, tx0: -8.4, tx1: 2.4, thy: 4.8, zt: 16.8, onLid: true, fo: .5, lipHW: 3.8, rr: 1.8,
      noHandle: true, pedal: true, wheels: [{ x: -7.0, r: 2.2, axle: true }] }),
    mkBox({ id: 240, L: 240, name: '240L', style: 'pedal', bx0: -9.6, bx1: 1.8, bhy: 5, tx0: -10.6, tx1: 2.4, thy: 5.6, zt: 19.6, onLid: true, fo: .5, lipHW: 4.5, rr: 2.2,
      noHandle: true, pedal: true, wheels: [{ x: -9.0, r: 2.6, axle: true }] }) ] },
];
BIN_STYLES.forEach(s => { s.sizes = s.specs.map(b => b.id); });
const BIN_SIZE_DEFAULT = 240;
const binStyleOf = id => BIN_STYLES.find(s => s.id === id) || BIN_STYLES.find(s => s.id === BIN_STYLE_DEFAULT);
// the size of a style: the nearest one it offers (a tie goes to the larger); anything that is not a number gives the style's default
function binSizeFor(styleId, v){
  const s = binStyleOf(styleId), L = Number(v);
  if (v === null || v === undefined || v === '' || !Number.isFinite(L)) return s.dflt;
  return s.sizes.reduce((a, b) => Math.abs(b - L) < Math.abs(a - L) || (Math.abs(b - L) === Math.abs(a - L) && b > a) ? b : a);
}
// the first style that makes a bin of exactly this many litres (an old ?bin=660 link has no style): undefined if none does
const binStyleForSize = v => BIN_STYLES.find(s => s.sizes.includes(Number(v)));
const binTypeOf = id => BIN_TYPES.find(t => t.id === id) || BIN_TYPES.find(t => t.id === BIN_TYPE_DEFAULT);
// the bin on show: the spec of its style and size, its type's material (a state without a bin chosen gets the default)
const binSpec = st => { const s = binStyleOf(st && st.binStyle); return s.specs.find(b => b.id === binSizeFor(s.id, st && st.binSize)); };
// the body colour: the waste type's own, or a custom colour (st.binColor '#rrggbb') whose light / mid / dark tones come from the same
// luminance-aware helper the truck paint uses (tuneOf / triM in src/g_skin.js), so near-white and near-black bins still shade
const binTones = hex => { const t = tuneOf(hex); return triM(t.m, t.wl, t.dk); };
const binMat = st => { const c = st && hexOf(st.binColor); return c ? binTones(c) : binTypeOf(st && st.binType).mat; };
// the choice is remembered in the browser when it can be (storage may be missing, blocked or hold garbage: then it simply is not)
const BIN_STORE = 'garbage-truck.bin';
function binStored(){
  try {
    const o = JSON.parse(localStorage.getItem(BIN_STORE));
    if (o && typeof o === 'object'){
      const sty = BIN_STYLES.find(s => s.id === o.binStyle), ty = BIN_TYPES.find(t => t.id === o.binType);
      return { binStyle: sty && sty.id, binSize: sty && sty.sizes.includes(o.binSize) ? o.binSize : undefined, binType: ty && ty.id, binColor: hexOf(o.binColor) };
    }
  } catch (e) {}
  return null;
}
const binStore = st => { try { localStorage.setItem(BIN_STORE, JSON.stringify({ binStyle: st.binStyle, binSize: st.binSize, binType: st.binType, binColor: hexOf(st.binColor) })); } catch (e) {} };
// how much one emptied bin adds to the body's load: 0.2 for a 240 L bin (two bins fill the last 40 %), in proportion to its size
const binLoadStep = st => .2*binSpec(st).L/240;
const BIN_MOUTH0 = BIN_STYLES[0].specs[1].mouth.area;      // the 240 L wheelie's mouth: how much refuse shows in a mouth is scaled by its area
