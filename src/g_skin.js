
/* ================= 涂装 (skins): repaint the box, cab, lifter and reflective stripes =================
   A skin rewrites the shared palette objects in place (GRN / GRND = box and tailgate, CABW = cab, ORG = lifter, RFL = reflective
   red). Nothing derived from them is kept between frames (scene() builds every part again each render), so after applySkin
   the figure only has to be redrawn (ui.invalidate). The see-through / selection colours (SYSC) and the chassis, tyres,
   hydraulics and the bins are not touched. The first skin is the original paint, value for value. */
const triM = (m, wl = .25, dk = .45) => ({ l: mix(m, '#ffffff', wl), m, d: mix(m, '#000000', dk) });
const triD = (m, dk = .14, dd = .55) => ({ l: m, m: mix(m, '#000000', dk), d: mix(m, '#000000', dd) });
const SKIN_KEYS = ['GRN', 'GRND', 'CABW', 'ORG'];
const SKINS = [
  { id: 'classic',  name: '经典绿', dot: '#5fa43c',
    GRN: { l:'#80c556', m:'#5fa43c', d:'#376a22' }, GRND: { l:'#5fa43c', m:'#4a8a2e', d:'#2a5218' },
    CABW: { l:'#fbfaf5', m:'#e4e4dd', d:'#bfc2bc' }, ORG: { l:'#f7a83e', m:'#df842b', d:'#9c5414' }, RFL: '#e8463a' },
  { id: 'orange',   name: '环卫橙', dot: '#ef8a2c',
    GRN: triM('#ef8a2c'), GRND: triD('#ef8a2c'), CABW: { l:'#fbfaf5', m:'#e4e4dd', d:'#bfc2bc' }, ORG: triM('#5a6572', .3, .45), RFL: '#d93a2e' },
  { id: 'sky',      name: '天空蓝', dot: '#4c9be0',
    GRN: triM('#4c9be0'), GRND: triD('#4c9be0'), CABW: triM('#f1f6fa', .5, .2), ORG: triM('#f5b53c', .3, .42), RFL: '#e8463a' },
  { id: 'yellow',   name: '警示黄', dot: '#f3c41c',
    GRN: triM('#f3c41c', .3, .4), GRND: triD('#f3c41c', .12, .5), CABW: { l:'#fbfaf5', m:'#e4e4dd', d:'#bfc2bc' }, ORG: triM('#454b54', .3, .45), RFL: '#e8463a' },
  { id: 'snow',     name: '雪白', dot: '#e8ece6',
    GRN: triM('#e8ece6', .6, .28), GRND: triD('#e8ece6', .1, .38), CABW: { l:'#fbfaf5', m:'#e4e4dd', d:'#bfc2bc' }, ORG: { l:'#f7a83e', m:'#df842b', d:'#9c5414' }, RFL: '#e8463a' },
  { id: 'graphite', name: '深空灰', dot: '#5e6773',
    GRN: triM('#5e6773', .22, .5), GRND: triD('#5e6773', .15, .55), CABW: triM('#d5dae0', .5, .22), ORG: { l:'#f7a83e', m:'#df842b', d:'#9c5414' }, RFL: '#ff5a48' },
  { id: 'forest',   name: '墨绿', dot: '#2f6f4d',
    GRN: triM('#2f6f4d', .25, .5), GRND: triD('#2f6f4d', .16, .58), CABW: { l:'#fbfaf5', m:'#e4e4dd', d:'#bfc2bc' }, ORG: triM('#e9b43a', .3, .42), RFL: '#e8463a' },
];
const SKIN_DEFAULT = 'classic';
const PAINT = { GRN, GRND, CABW, ORG };
let SKIN_ID = SKIN_DEFAULT;
const skinOf = id => SKINS.find(s => s.id === id);
// repaint in place; an unknown id falls back to the original paint. Returns the id that is now on the truck.
function applySkin(id){
  const sk = skinOf(id) || skinOf(SKIN_DEFAULT);
  for (const k of SKIN_KEYS) Object.assign(PAINT[k], sk[k]);
  RFL = sk.RFL; SKIN_ID = sk.id;
  return SKIN_ID;
}

/* ----- 无极调色板: the three zones (box + tailgate, cab, lifter) painted any colour -----
   A zone colour is the mid tone; the light and dark tones are derived from it like the presets do (triM / triD), but with
   the spread tuned by brightness so extremes stay readable: near-white keeps its mid slightly dimmed (the light tone needs
   room above it) and gets a darker shade, near-black gets a lifted mid and a stronger light tone. A colour that is some
   preset's own zone colour keeps that preset's hand-tuned tones, so editing one zone leaves the others exactly as they look. */
const ZONE_KEYS = { body: ['GRN', 'GRND'], cab: ['CABW'], lift: ['ORG'] };
const RFL_CUSTOM = '#e8463a';
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
// the tones for one zone: [GRN, GRND] for the box, [CABW] / [ORG] otherwise
function zoneTones(z, hex){
  const ks = ZONE_KEYS[z], sk = SKINS.find(s => s[ks[0]].m === hex);
  if (sk) return ks.map(n => sk[n]);
  const t = tuneOf(hex); return [triM(t.m, t.wl, t.dk*(z === 'cab' ? .7 : 1)), triD(t.m, t.k, t.dd)].slice(0, ks.length);
}
// the zone colours a preset shows (its mid tones): the picker starts from these
const paintOf = id => { const sk = skinOf(id) || skinOf(SKIN_DEFAULT); return { body: sk.GRN.m, cab: sk.CABW.m, lift: sk.ORG.m }; };
// anything -> { body, cab, lift } of valid '#rrggbb'; a missing or invalid zone takes base's
const paintNorm = (p, base = paintOf()) => { const o = {}; for (const z in ZONE_KEYS) o[z] = hexOf(p && p[z]) || base[z]; return o; };
// repaint in place from { body, cab, lift } (normalised hex). Returns 'custom'.
function applyPaint(p){
  for (const z in ZONE_KEYS) ZONE_KEYS[z].forEach((n, i) => Object.assign(PAINT[n], zoneTones(z, p[z])[i]));
  RFL = RFL_CUSTOM; SKIN_ID = 'custom';
  return SKIN_ID;
}
// ?body= ?cab= ?lift= (RRGGBB, '#' optional): any valid one makes a custom paint on top of the ?skin preset (default: the original); else null
function paintParams(q){
  const p = paintOf(q.get('skin')); let any = false;
  for (const z in ZONE_KEYS){ const h = urlHex(q.get(z)); if (h){ p[z] = h; any = true; } }
  return any ? p : null;
}
// the choice is remembered in the browser when it can be (storage may be missing, blocked or hold garbage: then it simply is not).
// JSON { skin: preset id | 'custom', paint: { body, cab, lift } }; the old key held just a preset id.
const SKIN_STORE = 'garbage-truck.skin', PAINT_STORE = 'garbage-truck.paint';
function paintStored(){
  try {
    const o = JSON.parse(localStorage.getItem(PAINT_STORE));
    if (o && typeof o === 'object'){
      if (o.skin === 'custom') return { skin: 'custom', paint: paintNorm(o.paint) };
      if (skinOf(o.skin)) return { skin: o.skin, paint: paintOf(o.skin) };
    }
  } catch (e) {}
  try { const v = localStorage.getItem(SKIN_STORE); if (skinOf(v)) return { skin: v, paint: paintOf(v) }; } catch (e) {}
  return null;
}
const paintStore = st => { try { localStorage.setItem(PAINT_STORE, JSON.stringify({ skin: st.skin, paint: st.paint })); } catch (e) {} };
