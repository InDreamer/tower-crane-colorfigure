
/* ================= 涂装 (skins): repaint the tower and jib, the cab and the motors =================
   A skin rewrites the shared palette objects in place (YEL = tower, jib, climbing frame and every yellow lattice, CABW = cab,
   MOT = the blue motors). Nothing derived from them is kept between frames (scene() builds every part again each render),
   so after applySkin the figure only has to be redrawn (ui.invalidate). The see-through / selection colours (SYSC), the
   ballast, counterweights, ropes, hook stripes and hydraulics are not touched. The first skin is the reference paint, value for value. */
const triM = (m, wl = .25, dk = .45) => ({ l: mix(m, '#ffffff', wl), m, d: mix(m, '#000000', dk) });
const triD = (m, dk = .14, dd = .55) => ({ l: m, m: mix(m, '#000000', dk), d: mix(m, '#000000', dd) });
const SKIN_KEYS = ['YEL', 'CABW', 'MOT'];
const SKINS = [
  { id: 'classic',  name: '经典黄', dot: '#f3b11b',
    YEL: { l:'#ffd34d', m:'#f3b11b', d:'#b6760b' }, CABW: { l:'#fbfaf5', m:'#e4e4dd', d:'#bfc2bc' }, MOT: { l:'#5d9be8', m:'#2f6fcb', d:'#1b3f86' } },
  { id: 'orange',   name: '橙色', dot: '#f0801c',
    YEL: { l:'#ffb257', m:'#f0801c', d:'#a04a08' }, CABW: { l:'#fbfaf5', m:'#e4e4dd', d:'#bfc2bc' }, MOT: { l:'#5d9be8', m:'#2f6fcb', d:'#1b3f86' } },
  { id: 'redwhite', name: '红白', dot: '#d8382c',
    YEL: { l:'#ff7461', m:'#d8382c', d:'#8a1a12' }, CABW: { l:'#fbfaf5', m:'#e4e4dd', d:'#bfc2bc' }, MOT: { l:'#5d9be8', m:'#2f6fcb', d:'#1b3f86' } },
  { id: 'green',    name: '绿色', dot: '#3ea34c',
    YEL: { l:'#85d584', m:'#3ea34c', d:'#1d6a2b' }, CABW: { l:'#f4faef', m:'#dde9d6', d:'#b3c4aa' }, MOT: { l:'#f7c35a', m:'#e9a21c', d:'#9a6208' } },
  { id: 'bluewhite', name: '蓝白', dot: '#3a78d6',
    YEL: { l:'#86b6f4', m:'#3a78d6', d:'#1c4694' }, CABW: { l:'#fbfaf5', m:'#e4e4dd', d:'#bfc2bc' }, MOT: { l:'#ffc65c', m:'#f0a21e', d:'#9c610a' } },
  { id: 'pink',     name: '粉色', dot: '#ee7fb0',
    YEL: { l:'#ffb9d6', m:'#ee7fb0', d:'#a24a77' }, CABW: { l:'#fffafc', m:'#efe3e9', d:'#c6b3bd' }, MOT: { l:'#9a86e6', m:'#6a52c6', d:'#3c2c82' } },
];
const SKIN_DEFAULT = 'classic';
const PAINT = { YEL, CABW, MOT };
let SKIN_ID = SKIN_DEFAULT;
const skinOf = id => SKINS.find(s => s.id === id);
// repaint in place; an unknown id falls back to the original paint. Returns the id that is now on the crane.
function applySkin(id){
  const sk = skinOf(id) || skinOf(SKIN_DEFAULT);
  for (const k of SKIN_KEYS) Object.assign(PAINT[k], sk[k]);
  SKIN_ID = sk.id;
  return SKIN_ID;
}

/* ----- 无极调色板: the three zones (tower + jib, cab, motors) painted any colour -----
   A zone colour is the mid tone; the light and dark tones are derived from it like the presets do (triM / triD), but with
   the spread tuned by brightness so extremes stay readable: near-white keeps its mid slightly dimmed (the light tone needs
   room above it) and gets a darker shade, near-black gets a lifted mid and a stronger light tone. A colour that is some
   preset's own zone colour keeps that preset's hand-tuned tones, so editing one zone leaves the others exactly as they look. */
const ZONE_KEYS = { tower: ['YEL'], cab: ['CABW'], motor: ['MOT'] };
// '#rgb' / '#rrggbb' with or without '#', any case -> '#rrggbb' lowercase, or null
const hexOf = c => { const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(typeof c === 'string' ? c.trim() : ''); return m ? '#' + (m[1].length === 3 ? [...m[1]].map(x => x + x).join('') : m[1]).toLowerCase() : null; };
const urlHex = c => typeof c === 'string' && /^#?[0-9a-f]{6}$/i.test(c.trim()) ? hexOf(c) : null;     // URL colours: the full six digits only
const lumOf = c => (.299*parseInt(c.substr(1, 2), 16) + .587*parseInt(c.substr(3, 2), 16) + .114*parseInt(c.substr(5, 2), 16))/255;
const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a)/(b - a))); return k*k*(3 - 2*k); };
const hsvHex = (h, s, v) => { const f = n => { const k = (n + h/60) % 6; return v - v*s*Math.max(0, Math.min(k, 4 - k, 1)); };
  return '#' + [5, 3, 1].map(n => Math.round(f(n)*255).toString(16).padStart(2, '0')).join(''); };
const hexHsv = c => { const [r, g, b] = [1, 3, 5].map(i => parseInt(c.substr(i, 2), 16)/255), v = Math.max(r, g, b), d = v - Math.min(r, g, b);
  const h = !d ? 0 : v === r ? (g - b)/d : v === g ? 2 + (b - r)/d : 4 + (r - g)/d; return { h: (h*60 + 360) % 360, s: v ? d/v : 0, v }; };
function tuneOf(c){
  const y = lumOf(c), dark = 1 - smooth(.1, .45, y), light = smooth(.6, .95, y);
  return { m: mix(mix(c, '#ffffff', .18*(1 - smooth(0, .14, y))), '#000000', .12*smooth(.86, 1, y)),
    wl: .25 + .25*dark + .35*light, dk: .45 + .2*dark - .1*light, k: .14 - .04*light + .2*dark, dd: .55 - .15*light };
}
// the tones for one zone: one palette per key of the zone
function zoneTones(z, hex){
  const ks = ZONE_KEYS[z], sk = SKINS.find(s => s[ks[0]].m === hex);
  if (sk) return ks.map(n => sk[n]);
  const t = tuneOf(hex); return [triM(t.m, t.wl, t.dk*(z === 'cab' ? .7 : 1)), triD(t.m, t.k, t.dd)].slice(0, ks.length);
}
// the zone colours a preset shows (its mid tones): the picker starts from these
const paintOf = id => { const sk = skinOf(id) || skinOf(SKIN_DEFAULT); return { tower: sk.YEL.m, cab: sk.CABW.m, motor: sk.MOT.m }; };
// anything -> { tower, cab, motor } of valid '#rrggbb'; a missing or invalid zone takes base's
const paintNorm = (p, base = paintOf()) => { const o = {}; for (const z in ZONE_KEYS) o[z] = hexOf(p && p[z]) || base[z]; return o; };
// repaint in place from { tower, cab, motor } (normalised hex). Returns 'custom'.
function applyPaint(p){
  for (const z in ZONE_KEYS) ZONE_KEYS[z].forEach((n, i) => Object.assign(PAINT[n], zoneTones(z, p[z])[i]));
  SKIN_ID = 'custom';
  return SKIN_ID;
}
// ?tower= ?cab= ?motor= (RRGGBB, '#' optional): any valid one makes a custom paint on top of the ?skin preset (default: the original); else null
function paintParams(q){
  const p = paintOf(q.get('skin')); let any = false;
  for (const z in ZONE_KEYS){ const h = urlHex(q.get(z)); if (h){ p[z] = h; any = true; } }
  return any ? p : null;
}
// the choice is remembered in the browser when it can be (storage may be missing, blocked or hold garbage: then it simply is not).
// JSON { skin: preset id | 'custom', paint: { tower, cab, motor } }.
const PAINT_STORE = 'tower-crane.paint';
function paintStored(){
  try {
    const o = JSON.parse(localStorage.getItem(PAINT_STORE));
    if (o && typeof o === 'object'){
      if (o.skin === 'custom') return { skin: 'custom', paint: paintNorm(o.paint) };
      if (skinOf(o.skin)) return { skin: o.skin, paint: paintOf(o.skin) };
    }
  } catch (e) {}
  return null;
}
const paintStore = st => { try { localStorage.setItem(PAINT_STORE, JSON.stringify({ skin: st.skin, paint: st.paint })); } catch (e) {} };
