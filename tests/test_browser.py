import json
import re
import unittest
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
SHOTS = ROOT / "shots"
URL = (ROOT / "crane.html").as_uri()


def local_only(route):
    url = urlsplit(route.request.url)
    if url.scheme in ("file", "data", "blob") or url.hostname in ("127.0.0.1", "localhost", "::1"):
        route.continue_()
    else:
        route.abort()


class BrowserRegression(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        SHOTS.mkdir(exist_ok=True)
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(
            headless=True,
            args=["--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1"],
        )

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()

    def new_page(self, mobile=False, init=None, size=None):
        context = self.browser.new_context(
            viewport={"width": size[0], "height": size[1]} if size else {"width": 390 if mobile else 1440, "height": 844 if mobile else 1000},
            device_scale_factor=1,
            is_mobile=mobile,
            has_touch=mobile,
        )
        context.route("**/*", local_only)
        if init:
            context.add_init_script(init)
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        self.addCleanup(context.close)
        return context, page, errors

    def check_page(self, page, errors):
        self.assertEqual(errors, [])
        result = page.evaluate("""() => {
          const bad = [], props = ['d','points','x','y','x1','x2','y1','y2','cx','cy','r','rx','ry','width','height','transform','fill','stroke'];
          for (const el of document.querySelectorAll('#fig *')) for (const key of props) {
            const value = el.getAttribute(key); if (value === null) continue;
            if (/NaN|Infinity/.test(value)) bad.push([el.tagName,key,value]);
            if ((key === 'fill' || key === 'stroke') && value !== 'none' &&
                !value.startsWith('url(') && !value.startsWith('var(') && !CSS.supports('color', value))
              bad.push([el.tagName,key,value]);
          }
          return {bad, scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth,
                  dpr: devicePixelRatio, errors: document.documentElement.dataset.errors || ''};
        }""")
        self.assertEqual(result["bad"], [])
        self.assertLessEqual(result["scroll"], result["client"])
        self.assertEqual(result["dpr"], 1)
        self.assertEqual(result["errors"], "")

    def test_default_desktop_and_touch_mobile(self):
        for mobile in (False, True):
            with self.subTest(mobile=mobile):
                _, page, errors = self.new_page(mobile)
                response = page.goto(URL, wait_until="load")
                self.assertTrue(response.ok)
                page.wait_for_timeout(1000)
                self.check_page(page, errors)
                self.assertEqual(page.title(), "塔式起重机 · 结构拆解图")
                self.assertGreater(page.evaluate("() => document.querySelectorAll('#art [data-pn]').length"), 24)
                self.assertEqual(sorted(page.evaluate("() => [...new Set([...document.querySelectorAll('#art [data-pn]')].map(e => +e.dataset.pn))]")), list(range(0, 25)))      # (0: the pad, the building and the load: scenery with no number)
                self.assertIn("幅度", page.locator("#stats").inner_text())
                self.assertEqual([t.strip() for t in page.locator("button.act").all_inner_texts()][:4], ["拆解", "合拢", "工作", "顶升"])
                page.screenshot(path=str(SHOTS / f"crane-{'mobile' if mobile else 'desktop'}.png"))

    def test_query_validation(self):
        cases = [
            ("sel=999&sub=NaN&slew=abc&trolley=NaN&hookZ=&nsec=9&climb=x&yaw=NaN&pitch=Infinity&act=bad",
             {"sel": -1, "subSel": 0, "slew": 0, "trolley": 40, "hookZ": 62, "nsec": 4, "climb": 0, "act": None}),
            ("sel=5&sub=9&slew=90&trolley=500&hookZ=1&nsec=6&climb=7", {"sel": 5, "subSel": 9, "trolley": 90, "hookZ": 1, "nsec": 6, "climb": 1}),
            ("sub=9", {"sel": 5, "subSel": 9}),
            ("sel=2&sub=9", {"sel": 2, "subSel": 0}),
            ("sel=1&sub=9&ex=0679&slew=-45&trolley=33.5&nsec=5.5&climb=.25", {"sel": 1, "subSel": 0, "trolley": 33.5, "nsec": 4, "climb": .25}),
            ("ex=123456&ex=7", {"sel": -1}),
        ]
        for query, expected in cases:
            with self.subTest(query=query):
                _, page, errors = self.new_page()
                page.goto(URL + "?" + query, wait_until="load")
                page.wait_for_timeout(1000)
                self.check_page(page, errors)
                state = page.evaluate("() => window.__st")
                for key, value in expected.items():
                    self.assertEqual(state[key], value, key)
        _, page, errors = self.new_page()
        page.goto(URL + "?slew=90", wait_until="load")
        page.wait_for_timeout(600)
        self.assertAlmostEqual(page.evaluate("() => __st.slew"), 3.141592653589793/2, places=9)
        page.goto(URL + "?ex=123456", wait_until="load")
        page.wait_for_timeout(600)
        self.assertEqual(page.evaluate("() => [...__st.p]"), [0, 1, 1, 1, 1, 1, 1])
        page.goto(URL + "?ex=0789", wait_until="load")          # only the digits 1..6 count
        page.wait_for_timeout(600)
        self.assertEqual(page.evaluate("() => [...__st.p]"), [0, 0, 0, 0, 0, 0, 0])
        self.assertEqual(errors, [])

    def test_counterweight_hit_in_four_quadrants(self):
        # the outer face of a counterweight block, on the side the viewer is: that is the part the pointer hits
        for yaw in (45, 135, 225, 315):
            with self.subTest(yaw=yaw):
                _, page, errors = self.new_page()
                page.goto(URL + f"?yaw={yaw}", wait_until="load")
                page.wait_for_timeout(1000)
                hit = page.evaluate("""() => {
                  const root = document.querySelector('#art>g'), y = CAM_V[1] > 0 ? 4.65 : -4.65;
                  const q = new DOMPoint(...P(-42.4,y,78.7)).matrixTransform(root.getScreenCTM());
                  const el = document.elementFromPoint(q.x,q.y), part = el && el.closest('[data-pn]');
                  return part ? part.dataset.pn : null;
                }""")
                self.assertEqual(hit, '2')
                self.assertEqual(errors, [])

    def test_angles_xray_and_state_screenshots(self):
        cases = [(f"yaw{yaw}-xr{xr}", f"yaw={yaw}&xr={xr}") for yaw in (45, 135, 225, 315) for xr in (0, 1)]
        cases += [("exploded", "ex=123456"), ("slewed", "slew=90&yaw=135"), ("trolley-out", "trolley=90&hookZ=30&yaw=135"), ("trolley-in", "trolley=30&hookZ=70&yaw=60"),
                  ("six-sections", "nsec=6&yaw=135"), ("climbing", "nsec=5&climb=.6&yaw=200"), ("exploded-xr", "ex=123456&yaw=135&xr=1")]
        for name, query in cases:
            with self.subTest(name=name):
                _, page, errors = self.new_page()
                page.goto(URL + "?" + query, wait_until="load")
                page.wait_for_timeout(1000)
                self.check_page(page, errors)
                page.screenshot(path=str(SHOTS / f"crane-{name}.png"))

    def test_explode_collapse_and_pick_a_system_and_a_part(self):
        _, page, errors = self.new_page_logged()
        page.goto(URL, wait_until="load")
        page.wait_for_timeout(700)
        page.locator("button.act", has_text="拆解").first.click()
        page.wait_for_timeout(4200)
        self.assertEqual(page.evaluate("() => [...__st.p]"), [0, 1, 1, 1, 1, 1, 1])
        self.check_page(page, errors)
        page.locator("button.act", has_text="合拢").first.click()
        page.wait_for_timeout(4200)
        self.assertEqual(page.evaluate("() => [...__st.p]"), [0, 0, 0, 0, 0, 0, 0])
        self.assertEqual(page.evaluate("() => assembled(__st)"), True)
        # pick a system by clicking a part of it, then a part of that system
        page.evaluate("() => pickSystem(4)")
        page.wait_for_timeout(1500)
        self.assertEqual(page.evaluate("() => [__st.sel, __st.tgt[4], __st.tgt[1]]"), [4, 1, 0])
        page.evaluate("() => pickPart(4, 2)")
        page.wait_for_timeout(1200)
        self.assertEqual(page.evaluate("() => __st.subSel"), 2)
        page.screenshot(path=str(SHOTS / "crane-picked-part.png"))
        page.evaluate("() => putBack()")
        page.wait_for_timeout(1800)
        self.assertEqual(page.evaluate("() => assembled(__st)"), True)
        self.check_page(page, errors)
        self.assertEqual(errors, [])

    # the page's own loop, run by hand: seconds of model time in 0.05 s ticks (a whole lift takes 40 s; this is the template's way to go faster than the clock)
    FF = """(secs) => { const st = __st;
      for (let t = 0; t < secs; t += .05){
        if (st.cur){ const f = advanceStep(st, .05); if (f && st.auto){ if (f === lastStep(st)) stopAuto(st); else st.autoWait = .8; } }
        else if (st.auto && !st.pending){ st.autoWait = Math.max(0, (st.autoWait || 0) - .05); if (!st.autoWait) startAutoStep(st); }
        else if (!st.auto) break;
      }
      __ui.invalidate(); return [st.auto, st.at, st.hooked, st.hookZ, st.trolley, st.nsec]; }"""

    def test_work_button_runs_a_whole_lift_and_the_next_one_back_and_is_refused_while_apart(self):
        _, page, errors = self.new_page_logged()
        page.goto(URL + "?yaw=120", wait_until="load")
        page.wait_for_timeout(700)
        page.locator("button.act", has_text="工作").first.click()
        page.wait_for_timeout(1800)
        mid = page.evaluate("() => [__st.busy, __st.slew, __st.cur && __st.cur.id, __st.act]")
        self.assertTrue(mid[0]); self.assertLess(mid[1], 0); self.assertGreater(mid[1], -0.7854); self.assertEqual(mid[2], "slewTo"); self.assertEqual(mid[3], "slew")
        self.assertGreaterEqual(page.locator(".tag.on, .tg2.on").count(), 1)                    # the label of what works is lit
        self.assertEqual(page.evaluate("() => document.documentElement.classList.contains('xr') || __st.xrT"), 1)
        self.check_page(page, errors)
        out = page.evaluate(self.FF, 80)
        self.assertEqual(out[:3], [False, "roof", False]); self.assertAlmostEqual(out[3], 62, places=6); self.assertAlmostEqual(out[4], 40, places=6)
        page.wait_for_timeout(300)
        self.assertEqual(page.evaluate("() => [__st.busy, __st.cur, __st.act, __st.pump, __st.flowH, __st.flowT]"), [False, None, None, 0, 0, 0])
        page.screenshot(path=str(SHOTS / "crane-after-lift.png"))
        # the second press carries it back
        page.locator("button.act", has_text="工作").first.click()
        out = page.evaluate(self.FF, 80)
        self.assertEqual(out[:3], [False, "pad", False])
        self.check_page(page, errors)
        self.assertEqual(errors, [])
        # asked while taken apart: it puts everything back first, then works
        _, page, errors = self.new_page_logged()
        page.goto(URL + "?ex=123456", wait_until="load")
        page.wait_for_timeout(700)
        page.evaluate("() => doStep('slewTo')")
        self.assertEqual(page.evaluate("() => __st.pending"), "slewTo")
        page.wait_for_timeout(4200)
        self.assertEqual(page.evaluate("() => [__st.pending, __st.cur && __st.cur.id]"), [None, "slewTo"])
        self.assertEqual(errors, [])

    def test_wrong_order_shows_the_hint_and_a_heavy_load_turns_the_gauge_red(self):
        _, page, errors = self.new_page_logged()
        page.goto(URL, wait_until="load")
        page.wait_for_timeout(600)
        for step, hint in [("hoist", "先挂钩，再起升"), ("hook", "先把吊钩开到吊物上方，再挂钩"), ("slewBack", "先挂钩，再回转"), ("unhook", "吊钩上没有吊物"), ("jack", "先配平，再顶升")]:
            page.evaluate(f"() => doStep('{step}')")
            self.assertEqual(page.locator("#toast").inner_text().strip().lower(), hint.lower(), step)
            self.assertFalse(page.evaluate("() => __st.busy"))
        # 4 t on the hook at the pad: the chart allows 2.95 t there, whatever the trolley does
        page.goto(URL + "?loadT=4&step=hook&t=1&yaw=30&pitch=28", wait_until="load")
        page.wait_for_timeout(700)
        self.assertEqual(page.evaluate("() => [__st.hooked, __st.loadT]"), [True, 4])
        page.evaluate("() => doStep('hoist')")
        page.wait_for_timeout(250)
        self.assertEqual(page.locator("#toast").inner_text().strip(), "太重了，起重机吊不动，换轻一点的")
        self.assertEqual(page.evaluate("() => [__st.busy, __st.over > 0]"), [False, True])
        self.assertTrue(page.evaluate("() => { const t = document.getElementById('toast').getBoundingClientRect(); return [...document.querySelectorAll('.tag, .tg2')].every(g => { const r = g.querySelector('rect').getBoundingClientRect(); return r.right < t.left || r.left > t.right || r.bottom < t.top || r.top > t.bottom; }); }"), "the flash does not cover a label")
        self.assertEqual(page.locator("[data-n=\"19\"]").count(), 1, "the refused gauge label stays visible")
        self.assertEqual(page.evaluate("() => document.querySelector('[data-n=\"19\"] rect').getAttribute('stroke')"), "#d93a2e")
        self.check_page(page, errors)
        self.assertEqual(errors, [])

    def test_the_readouts_follow_the_lift(self):
        _, page, errors = self.new_page_logged()
        for query, weight in [("step=lower&t=.5", "0.0 t"), ("step=hoist&t=1", "2.0 t"), ("step=hoist&t=1&loadT=2.5", "2.5 t"), ("step=unhook&t=1", "0.0 t")]:
            page.goto(URL + "?" + query, wait_until="load")
            page.wait_for_timeout(500)
            text = page.locator("#stats").inner_text()
            self.assertIn(weight, text, query); self.assertIn("幅度", text); self.assertIn("高度", text)
        page.goto(URL + "?step=hoist&t=1", wait_until="load")
        page.wait_for_timeout(500)
        h1 = page.evaluate("() => readouts(__st).h")
        page.goto(URL, wait_until="load")
        page.wait_for_timeout(500)
        self.assertLess(page.evaluate("() => readouts(__st).h"), h1)
        self.assertEqual(errors, [])

    def test_climb_button_adds_a_section_twice_then_says_the_mast_is_highest(self):
        _, page, errors = self.new_page_logged()
        page.goto(URL + "?yaw=60&pitch=20", wait_until="load")
        page.wait_for_timeout(700)
        page.locator("button.act", has_text="顶升").first.click()
        page.wait_for_timeout(1500)
        self.assertEqual(page.evaluate("() => [__st.busy, __st.cur && __st.cur.id, __st.autoMode]"), [True, "balance", "climb"])
        out = page.evaluate(self.FF, 60)
        self.assertEqual([out[0], out[5]], [False, 5])
        self.assertEqual(page.evaluate("() => [__st.climb, __st.ext, __st.sx, __st.pump]"), [0, 0, None, 0])
        self.check_page(page, errors)
        page.locator("button.act", has_text="顶升").first.click()
        out = page.evaluate(self.FF, 60)
        self.assertEqual([out[0], out[5]], [False, 6])
        page.locator("button.act", has_text="顶升").first.click()
        page.wait_for_timeout(300)
        self.assertEqual(page.locator("#toast").inner_text().strip(), "已经最高了")
        self.assertEqual(page.evaluate("() => [__st.nsec, __st.busy]"), [6, False])
        page.screenshot(path=str(SHOTS / "crane-six-sections.png"))
        # a load on the hook: no climbing
        page.goto(URL + "?hooked=1&at=pad", wait_until="load")
        page.wait_for_timeout(500)
        page.locator("button.act", has_text="顶升").first.click()
        page.wait_for_timeout(300)
        self.assertEqual(page.locator("#toast").inner_text().strip(), "先放下吊物，再顶升")
        self.check_page(page, errors)
        self.assertEqual(errors, [])

    def test_lifting_while_climbing_is_refused_and_four_sections_come_back(self):
        _, page, errors = self.new_page_logged()
        page.goto(URL + "?step=jack&t=.5", wait_until="load")
        page.wait_for_timeout(500)
        page.evaluate("() => doStep('slewTo')")
        self.assertEqual(page.locator("#toast").inner_text().strip(), "正在顶升，等顶升做完")
        page.goto(URL + "?nsec=6", wait_until="load")
        page.wait_for_timeout(500)
        page.locator("button.act", has_text="分步").first.click()
        menu = page.locator(".stepwrap.open").inner_text()
        for word in ["吊装", "顶升", "落钩", "挂钩", "起升", "摘钩", "配平", "引进标准节", "螺栓连接", "恢复 4 节"]: self.assertIn(word, menu)
        page.locator(".stepwrap.open button.chip", has_text="恢复 4 节").first.click()
        page.wait_for_timeout(400)
        self.assertEqual(page.evaluate("() => [__st.nsec, __st.climb, __st.ext, __st.sx]"), [4, 0, 0, None])
        self.check_page(page, errors)
        self.assertEqual(errors, [])

    def test_stage3_url_parameters_put_the_crane_in_the_middle_of_a_step_and_are_validated(self):
        for query, expect in [("step=hoist&t=.5", {"hooked": True, "sl": 1}), ("at=roof&hooked=0", {"at": "roof", "hooked": False}), ("loadT=3", {"loadT": 3}), ("loadT=99", {"loadT": None}),
                              ("step=bogus&t=.5", {"hooked": False}), ("step=hoist&t=7", {"hooked": False}), ("hooked=1&at=moon", {"at": "pad", "hooked": True}),
                              ("step=insert&t=.5", {"climb": 1}), ("step=bolt&t=.5", {"climb": 1}), ("step=retract&t=.5", {"climb": 0, "nsec": 5})]:
            with self.subTest(query=query):
                _, page, errors = self.new_page_logged()
                page.goto(URL + "?yaw=40&" + query, wait_until="load")
                page.wait_for_timeout(500)
                state = page.evaluate("() => window.__st")
                for key, value in expect.items(): self.assertEqual(state[key], value, key)
                self.check_page(page, errors)
                self.assertEqual(errors, [])

    def test_phone_mid_hoist(self):
        _, page, errors = self.new_page_logged(mobile=True)
        page.goto(URL + "?step=hoist&t=.5&yaw=30&pitch=28", wait_until="load")
        page.wait_for_timeout(900)
        self.check_page(page, errors)
        page.screenshot(path=str(SHOTS / "crane-phone-hoist.png"))
        self.assertEqual(errors, [])

    def test_pointer_selection_isolation_and_cancel(self):
        _, page, errors = self.new_page()
        page.goto(URL, wait_until="load")
        page.wait_for_timeout(1000)
        point = page.evaluate("""() => {
          const r = fig.getBoundingClientRect();
          for (let y = r.top + 10; y < r.bottom - 10; y += 8)
            for (let x = r.left + 10; x < r.right - 10; x += 8) {
              const e = document.elementFromPoint(x,y), g = e && e.closest('[data-ps]');
              if (g) return {x,y,k:+g.dataset.ps};
            }
        }""")
        self.assertIsNotNone(point)
        page.mouse.click(point["x"], point["y"])
        self.assertEqual(page.evaluate("() => __st.sel"), point["k"])
        page.reload(wait_until="load")
        page.wait_for_timeout(1000)
        outcome = page.evaluate("""() => {
          const svg = document.getElementById('fig'), target = svg.querySelector('[data-ps]');
          const send = (el,type,id,x,y,primary=true) => el.dispatchEvent(new PointerEvent(type,
            {bubbles:true,button:0,pointerId:id,pointerType:'touch',isPrimary:primary,clientX:x,clientY:y}));
          send(target,'pointerdown',11,100,100); send(svg,'pointermove',11,140,100);
          send(target,'pointerdown',12,100,100); send(svg,'pointerup',12,100,100);
          const firstHeld = svg.classList.contains('drag');
          send(svg,'pointermove',11,100,100); send(svg,'pointerup',11,100,100);
          const afterRoundTrip = __st.sel;
          send(target,'pointerdown',13,100,100); send(svg,'pointermove',13,120,100);
          const moving = svg.classList.contains('moving');
          send(svg,'pointercancel',13,120,100);
          const afterCancel = svg.classList.contains('moving');
          send(target,'pointerdown',14,100,100); send(svg,'pointerup',14,100,100);
          return {afterRoundTrip, firstHeld, moving, afterCancel, selected:__st.sel, expected:+target.dataset.ps};
        }""")
        self.assertEqual(outcome["afterRoundTrip"], -1)
        self.assertTrue(outcome["firstHeld"])
        self.assertTrue(outcome["moving"])
        self.assertFalse(outcome["afterCancel"])
        self.assertEqual(outcome["selected"], outcome["expected"])
        self.assertEqual(errors, [])

    def test_real_mobile_vertical_touch_rotates_camera(self):
        context, page, errors = self.new_page(mobile=True)
        page.goto(URL, wait_until="load")
        page.wait_for_timeout(1000)
        before = page.evaluate("() => ({pitch:PITCH, touch:getComputedStyle(fig).touchAction})")
        box = page.locator("#fig").bounding_box()
        x, y = box["x"] + box["width"] * .5, box["y"] + box["height"] * .5
        cdp = context.new_cdp_session(page)
        cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y}]})
        cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": x, "y": y + 70}]})
        cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        page.wait_for_timeout(200)
        self.assertEqual(before["touch"], "none")
        self.assertNotEqual(page.evaluate("() => PITCH"), before["pitch"])
        self.assertEqual(errors, [])

    def test_frame_fallback_generation_spin_and_filter(self):
        init = r"""(() => {
          let next = -1, clock = 1000;
          const nativeSet = window.setTimeout, nativeClear = window.clearTimeout;
          const raf = new Map(), all = new Map(), timers = new Map(), allTimers = new Set();
          Object.defineProperty(performance, 'now', {value: () => clock});
          window.requestAnimationFrame = fn => { const id = next--; raf.set(id,fn); all.set(id,fn); return id; };
          window.cancelAnimationFrame = id => raf.delete(id);
          window.setTimeout = (fn,ms,...args) => { if (ms !== 60) return nativeSet(fn,ms,...args);
            const id = next--; timers.set(id,fn); allTimers.add(id); return id; };
          window.clearTimeout = id => { if (allTimers.has(id)) timers.delete(id); else nativeClear(id); };
          window.__fake = {raf,all,timers, tick() { clock += 50; },
            fireRaf(id) { const fn = raf.get(id); raf.delete(id); fn(); },
            fireTimer(id) { const fn = timers.get(id); timers.delete(id); fn(); }};
        })();"""
        _, page, errors = self.new_page(init=init)
        page.goto(URL, wait_until="load")
        outcome = page.evaluate("""() => {
          const f = window.__fake, svg = document.getElementById('fig');
          for (let i = 0; f.raf.size && i < 100; i++) { f.tick(); f.fireRaf([...f.raf.keys()][0]); }
          const idle = {raf:f.raf.size,timers:f.timers.size};
          let steps = 0, renders = 0; const original = __ui.render;
          __ui.render = () => { renders++; original(); };
          __ui.animate(() => ++steps < 2);
          const motionStart = getComputedStyle(document.getElementById('art')).filter;
          const old = [...f.raf.keys()][0]; f.tick(); f.fireTimer([...f.timers.keys()][0]);
          const afterFallback = {raf:f.raf.size, timers:f.timers.size,steps,renders};
          f.all.get(old)();
          const afterOld = {raf:f.raf.size,timers:f.timers.size,steps,renders};
          const oldTimer = f.timers.get([...f.timers.keys()][0]);
          f.tick(); f.fireRaf([...f.raf.keys()][0]);
          const end = {raf:f.raf.size,timers:f.timers.size,steps,renders,
            filter:getComputedStyle(document.getElementById('art')).filter};
          __ui.animate(() => { steps++; return false; });
          const beforeOldTimer = {raf:f.raf.size,timers:f.timers.size,steps,renders};
          oldTimer();
          const afterOldTimer = {raf:f.raf.size,timers:f.timers.size,steps,renders};
          f.tick(); f.fireRaf([...f.raf.keys()][0]);
          document.getElementById('vspin').click(); document.getElementById('vspin').click(); document.getElementById('vspin').click();
          const spinPending = f.raf.size, yaw = YAW;
          f.tick(); f.fireRaf([...f.raf.keys()][0]);
          const delta = YAW - yaw;
          document.getElementById('vspin').click(); f.tick(); f.fireRaf([...f.raf.keys()][0]);
          const spinEnd = f.raf.size;
          setCam(-1040,35); const multiYaw = YAW; __ui.camTo(45,35,100);
          f.tick(); f.fireRaf([...f.raf.keys()][0]);
          const camDelta = YAW - multiYaw;
          f.tick(); f.fireRaf([...f.raf.keys()][0]);
          return {idle,motionStart,afterFallback,afterOld,end,beforeOldTimer,afterOldTimer,spinPending,delta,spinEnd,camDelta};
        }""")
        self.assertEqual(outcome["idle"], {"raf": 0, "timers": 0})
        self.assertEqual(outcome["motionStart"], "none")
        self.assertEqual(outcome["afterFallback"], {"raf": 1, "timers": 1, "steps": 1, "renders": 1})
        self.assertEqual(outcome["afterOld"], outcome["afterFallback"])
        self.assertEqual(outcome["end"]["raf"], 0)
        self.assertEqual(outcome["end"]["timers"], 0)
        self.assertEqual(outcome["end"]["steps"], 2)
        self.assertRegex(outcome["end"]["filter"], re.compile(r"url\(.*#hand[\"']?\)"))
        self.assertEqual(outcome["beforeOldTimer"], outcome["afterOldTimer"])
        self.assertEqual(outcome["spinPending"], 1)
        self.assertAlmostEqual(outcome["delta"], .9, places=6)
        self.assertEqual(outcome["spinEnd"], 0)
        self.assertAlmostEqual(outcome["camDelta"], 2.5, places=6)
        self.assertEqual(errors, [])


    # ---- 涂装 ----
    SKIN_IDS = ["classic", "orange", "redwhite", "green", "bluewhite", "pink"]
    SKIN_NAMES = ["经典黄", "橙色", "红白", "绿色", "蓝白", "粉色"]

    def new_page_logged(self, mobile=False, init=None, size=None):
        """Like new_page, but console errors also count (a failed resource, a script warning turned error)."""
        context, page, errors = self.new_page(mobile, init, size)
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        return context, page, errors

    def test_skin_parameter_and_screenshot(self):
        _, page, errors = self.new_page_logged()
        page.goto(URL + "?skin=classic&yaw=135", wait_until="load")
        page.wait_for_timeout(800)
        self.check_page(page, errors)
        self.assertEqual(page.evaluate("() => [__st.skin, SKIN_ID, YEL.m, CABW.m, MOT.m]"), ["classic", "classic", "#f3b11b", "#e4e4dd", "#2f6fcb"])
        page.screenshot(path=str(SHOTS / "skin-classic.png"))
        _, page, errors = self.new_page_logged()
        page.goto(URL + "?skin=%3Cb%3E&nsec=x", wait_until="load")
        page.wait_for_timeout(500)
        self.check_page(page, errors)
        self.assertEqual(page.evaluate("() => [__st.skin, __st.nsec, YEL.m]"), ["classic", 4, "#f3b11b"])

    def pick(self, page, button, choice):
        page.locator("button.act", has_text=button).first.click()
        page.locator(".stepwrap.open button.chip", has_text=choice).first.click()
        page.wait_for_timeout(250)

    def test_paint_button_lists_the_preset_marks_it_and_remembers_the_choice(self):
        _, page, errors = self.new_page_logged()
        page.goto(URL, wait_until="load")
        page.wait_for_timeout(800)
        dot = lambda label: page.evaluate("(l) => [...document.querySelectorAll('button.act')].find(b => b.textContent.startsWith(l)).querySelector('.dot').style.backgroundColor", label)
        self.assertEqual(dot("涂装"), "rgb(243, 177, 27)")
        page.locator("button.act", has_text="涂装").first.click()
        chips = page.locator(".stepwrap.open button.chip")
        self.assertEqual(chips.count(), len(self.SKIN_IDS))
        self.assertEqual(page.locator(".stepwrap.open button.chip.current").count(), 1)
        self.assertEqual(page.locator(".stepwrap.open button.chip.current").inner_text().strip(), "经典黄")
        page.locator(".stepwrap.open button.chip", has_text="经典黄").click()
        page.wait_for_timeout(300)
        self.assertEqual(page.evaluate("() => [__st.skin, YEL.m]"), ["classic", "#f3b11b"])
        self.assertTrue(page.evaluate("() => document.getElementById('art').innerHTML.includes(YEL.m)"))
        page.keyboard.press("Escape")
        page.mouse.click(5, 5)
        self.assertEqual(errors, [])

    def test_blocked_storage_and_mobile_layout(self):
        init = "Object.defineProperty(window, 'localStorage', {get() { throw new Error('blocked'); }});"
        _, page, errors = self.new_page_logged(mobile=True, init=init)
        page.goto(URL, wait_until="load")
        page.wait_for_timeout(600)
        self.check_page(page, errors)
        self.pick(page, "涂装", "经典黄")
        self.assertEqual(page.evaluate("() => __st.skin"), "classic")
        page.locator("button.act", has_text="分步").first.click()
        self.check_page(page, errors)
        page.screenshot(path=str(SHOTS / "ui-mobile-step-picker.png"))
        self.assertEqual(errors, [])

    def test_step_picker_lists_the_steps_and_runs_one(self):
        _, page, errors = self.new_page_logged()
        page.goto(URL, wait_until="load")
        page.wait_for_timeout(600)
        page.locator("button.act", has_text="分步").first.click()
        self.assertIn("回转", page.locator(".stepwrap.open").inner_text())
        page.locator(".stepwrap.open button.chip", has_text="回转").first.click()
        page.wait_for_timeout(1200)
        self.assertTrue(page.evaluate("() => __st.busy"))
        self.assertEqual(errors, [])

    def open_paint(self, page):
        page.locator("button.act", has_text="涂装").first.click()
        self.assertEqual(page.locator(".stepwrap.open .skp").count(), 1)

    def drag_in(self, page, selector, start, end, steps=8, release_at=None):
        """Mouse drag inside an element: start / end are (fx, fy) fractions of its box; release_at = absolute (x, y) to let go elsewhere."""
        box = page.locator(selector).bounding_box()
        pt = lambda f: (box["x"] + box["width"]*f[0], box["y"] + box["height"]*f[1])
        page.mouse.move(*pt(start)); page.mouse.down(); page.mouse.move(*pt(end), steps=steps)
        if release_at: page.mouse.move(*release_at, steps=3)
        page.mouse.up(); page.wait_for_timeout(120)

    def paint_state(self, page):
        return page.evaluate("() => ({skin: __st.skin, paint: {...__st.paint}, yel: [YEL.l, YEL.m, YEL.d], cab: CABW.m, motor: MOT.m})")

    def test_custom_picker_drag_hex_and_dropdown_stays_open(self):
        _, page, errors = self.new_page_logged()
        page.goto(URL, wait_until="load")
        page.wait_for_timeout(700)
        classic = self.paint_state(page)
        self.assertEqual(classic["skin"], "classic")
        # the presets stay on top (a heading, then one chip each) and the custom section sits below them
        page.locator("button.act", has_text="涂装").first.click()
        self.assertEqual(page.locator(".stepwrap.open button.chip").count(), len(self.SKIN_IDS))
        self.assertEqual(page.locator(".stepwrap.open .chiph").all_inner_texts()[:2], ["预设", "自定义"])
        self.assertEqual(page.locator(".stepwrap.open .skp button.skt").all_inner_texts(), ["塔身与臂架", "驾驶室", "机构电机"])
        self.assertEqual(page.locator(".stepwrap.open .skp button.skt[aria-pressed=true]").inner_text(), "塔身与臂架")
        self.assertEqual(page.locator(".stepwrap.open .skp input").input_value(), classic["paint"]["tower"])
        # the dropdown is built once: mark its first chip and the panel, drag, and check they are the same elements
        page.evaluate("() => { window.__mark = [document.querySelector('.chips .chip'), document.querySelector('.skp')]; window.__writes = 0; const o = Storage.prototype.setItem; Storage.prototype.setItem = function(k, v){ window.__writes++; return o.call(this, k, v); }; }")
        sv = ".stepwrap.open .skp .sv"
        box = page.locator(sv).bounding_box()
        page.mouse.move(box["x"] + box["width"]*.5, box["y"] + box["height"]*.5); page.mouse.down()
        page.mouse.move(box["x"] + box["width"]*.8, box["y"] + box["height"]*.2, steps=6)
        page.wait_for_timeout(150)
        # mid-drag: the crane is already repainted, the dropdown is open and nothing was written to storage yet
        mid = self.paint_state(page)
        self.assertEqual(mid["skin"], "custom")
        self.assertNotEqual(mid["yel"], classic["yel"])
        self.assertEqual(mid["cab"], classic["cab"])
        self.assertEqual(page.locator(".stepwrap.open").count(), 1)
        self.assertEqual(page.evaluate("() => window.__writes"), 0)
        self.assertTrue(page.evaluate("() => { const a = document.getElementById('art').innerHTML; return [YEL.l, YEL.m, YEL.d].some(c => a.includes(c)); }"))
        # let go far outside the square (on the figure): still no click-away close, one write on release
        page.mouse.move(box["x"] + 10, box["y"] + 700, steps=3)
        page.mouse.up(); page.wait_for_timeout(150)
        self.assertEqual(page.locator(".stepwrap.open").count(), 1)
        self.assertEqual(page.evaluate("() => window.__writes"), 1)
        self.assertTrue(page.evaluate("() => window.__mark[0].isConnected && window.__mark[1].isConnected && window.__mark[1] === document.querySelector('.skp')"))
        # the saturation/value square: the colour follows the pointer (top right corner = full saturation, full value of the current hue)
        self.drag_in(page, sv, (.1, .9), (.9, .1))
        after_sv = self.paint_state(page)
        self.assertNotEqual(after_sv["paint"]["tower"], mid["paint"]["tower"])
        self.assertEqual(page.locator(".stepwrap.open .skp input").input_value(), after_sv["paint"]["tower"])
        # the hue bar: a different hue, same saturation / value
        h0 = page.evaluate("(c) => hexHsv(c).h", after_sv["paint"]["tower"])
        self.drag_in(page, ".stepwrap.open .skp .hue", (.05, .5), (.55, .5))
        after_hue = self.paint_state(page)
        h1 = page.evaluate("(c) => hexHsv(c).h", after_hue["paint"]["tower"])
        self.assertGreater(abs(h1 - h0), 60)
        self.assertAlmostEqual(h1, 198, delta=8)
        self.assertEqual(page.locator(".stepwrap.open").count(), 1)
        # the button's dot follows the tower colour, and its zone tab shows it too
        dot = lambda: page.evaluate("() => [...document.querySelectorAll('button.act')].find(b => b.textContent.startsWith('涂装')).querySelector('.dot').style.backgroundColor")
        rgb = lambda hx: f"rgb({int(hx[1:3], 16)}, {int(hx[3:5], 16)}, {int(hx[5:7], 16)})"
        self.assertEqual(dot(), rgb(after_hue["paint"]["tower"]))
        self.assertEqual(page.evaluate("() => document.querySelector('.skp .skt .dot').style.backgroundColor"), rgb(after_hue["paint"]["tower"]))
        # the cab tab: its own colour, the tower keeps its own
        page.locator(".stepwrap.open .skp button.skt", has_text="驾驶室").click()
        self.assertEqual(page.locator(".stepwrap.open .skp input").input_value(), classic["paint"]["cab"])
        self.drag_in(page, sv, (.5, .5), (.2, .3))
        page.locator(".stepwrap.open .skp button.skt", has_text="机构电机").click()
        self.drag_in(page, sv, (.5, .5), (.7, .4))
        zones = self.paint_state(page)
        self.assertEqual(zones["paint"]["tower"], after_hue["paint"]["tower"])
        self.assertNotEqual(zones["paint"]["cab"], classic["paint"]["cab"])
        self.assertNotEqual(zones["paint"]["motor"], classic["paint"]["motor"])
        self.assertEqual(zones["yel"], after_hue["yel"])
        self.check_page(page, errors)
        # HEX: #rgb / #rrggbb apply live, junk only marks the box and is put right on leaving it
        page.locator(".stepwrap.open .skp button.skt", has_text="塔身与臂架").click()
        inp = page.locator(".stepwrap.open .skp input")
        inp.fill("#ff00aa")
        self.assertEqual(self.paint_state(page)["paint"]["tower"], "#ff00aa")
        inp.fill("#0af")
        self.assertEqual(self.paint_state(page)["paint"]["tower"], "#00aaff")
        for junk in ("zzz", "#12", "#12345", "#gg0000", "rgb(1,2,3)"):
            inp.fill(junk)
            self.assertEqual(self.paint_state(page)["paint"]["tower"], "#00aaff", junk)
            self.assertTrue(inp.evaluate("e => e.classList.contains('bad')"), junk)
        inp.press("Enter")
        self.assertEqual(inp.input_value(), "#00aaff")
        self.assertFalse(inp.evaluate("e => e.classList.contains('bad')"))
        inp.fill("FF8800"); inp.press("Enter")
        self.assertEqual(self.paint_state(page)["paint"]["tower"], "#ff8800")
        self.assertEqual(inp.input_value(), "#ff8800")
        self.assertEqual(page.locator(".stepwrap.open").count(), 1)
        page.screenshot(path=str(SHOTS / "ui-custom-picker.png"))
        # a click outside closes it as before
        page.mouse.click(5, 5)
        self.assertEqual(page.locator(".stepwrap.open").count(), 0)
        self.check_page(page, errors)
        # reload keeps the custom paint
        saved = self.paint_state(page)
        page.reload(wait_until="load")
        page.wait_for_timeout(600)
        self.assertEqual(self.paint_state(page), saved)
        self.assertEqual(saved["skin"], "custom")
        self.check_page(page, errors)
        page.screenshot(path=str(SHOTS / "custom-orange-reloaded.png"))
        # choosing the preset afterwards puts the picker back on that preset's colours
        self.pick(page, "涂装", "经典黄")
        back = page.evaluate("() => ({skin: __st.skin, paint: {...__st.paint}, want: paintOf('classic')})")
        self.assertEqual(back["skin"], "classic")
        self.assertEqual(back["paint"], back["want"])
        page.locator("button.act", has_text="涂装").first.click()
        self.assertEqual(page.locator(".stepwrap.open .skp input").input_value(), back["want"]["tower"])
        self.assertEqual(page.locator(".stepwrap.open .skp button.skt[aria-pressed=true]").inner_text(), "塔身与臂架")
        self.assertEqual(page.locator(".stepwrap.open button.chip.current").inner_text().strip(), "经典黄")
        self.drag_in(page, sv, (.3, .3), (.6, .4))
        self.assertEqual(page.evaluate("() => [__st.skin, __st.paint.cab === paintOf('classic').cab]"), ["custom", True])
        self.assertEqual(page.locator(".stepwrap.open button.chip.current").count(), 0)     # a custom paint is no preset
        self.assertEqual(errors, [])

    def test_custom_paint_url_parameters(self):
        cases = [
            ("tower=ff8800", "custom", {"tower": "#ff8800", "cab": "#e4e4dd", "motor": "#2f6fcb"}),
            ("tower=%23ff8800&cab=%2333aaff&motor=123456", "custom", {"tower": "#ff8800", "cab": "#33aaff", "motor": "#123456"}),
            ("cab=%2333AAFF", "custom", {"tower": "#f3b11b", "cab": "#33aaff", "motor": "#2f6fcb"}),
            ("skin=classic&motor=2244aa", "custom", {"tower": "#f3b11b", "cab": "#e4e4dd", "motor": "#2244aa"}),
            ("tower=zzzzzz&cab=12&motor=1234567&skin=classic", "classic", None),     # nothing valid: the preset alone
            ("tower=ff00&cab=%23", "classic", None),
            ("cab=#33aaff", "classic", None),                    # a raw '#' starts the URL fragment: not a parameter
            ("skin=nope&tower=nope&cab=ffffff", "custom", {"tower": "#f3b11b", "cab": "#ffffff", "motor": "#2f6fcb"}),
        ]
        for query, skin, want in cases:
            with self.subTest(query=query):
                _, page, errors = self.new_page_logged()
                page.goto(URL + "?" + query, wait_until="load")
                page.wait_for_timeout(500)
                self.check_page(page, errors)
                got = self.paint_state(page)
                self.assertEqual(got["skin"], skin)
                if want: self.assertEqual(got["paint"], want)
        # paint and mechanism parameters together
        _, page, errors = self.new_page_logged()
        page.goto(URL + "?tower=ff8800&slew=60&trolley=70&yaw=135", wait_until="load")
        page.wait_for_timeout(500)
        got = page.evaluate("() => [__st.skin, __st.trolley, __st.paint.tower]")
        self.assertEqual(got, ["custom", 70, "#ff8800"])
        self.check_page(page, errors)
        for name, query in (("custom-pink-cab-blue", "tower=e8348c&cab=bfe3ff&motor=2b2f36&yaw=135"), ("custom-white-black", "tower=ffffff&cab=111111&motor=000000&yaw=135"),
                            ("custom-purple-lime", "tower=7b3fe4&cab=f0f0e0&motor=a8e63c&yaw=40")):
            with self.subTest(shot=name):
                _, page, errors = self.new_page_logged()
                page.goto(URL + "?" + query, wait_until="load")
                page.wait_for_timeout(700)
                self.check_page(page, errors)
                page.screenshot(path=str(SHOTS / f"{name}.png"))

    def touch_drag(self, page, selector, start, end, steps=6):
        """A real touch drag through the DevTools protocol (pointer events with pointerType touch)."""
        page.locator(selector).scroll_into_view_if_needed()
        box = page.locator(selector).bounding_box()
        pt = lambda f: {"x": box["x"] + box["width"]*f[0], "y": box["y"] + box["height"]*f[1]}
        cdp = page.context.new_cdp_session(page)
        cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [pt(start)]})
        for i in range(1, steps + 1):
            f = (start[0] + (end[0] - start[0])*i/steps, start[1] + (end[1] - start[1])*i/steps)
            cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [pt(f)]})
        cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
        page.wait_for_timeout(150)

    def test_custom_picker_fits_a_360px_phone_and_works_by_touch(self):
        _, page, errors = self.new_page_logged(mobile=True, size=(360, 740))
        page.goto(URL, wait_until="load")
        page.wait_for_timeout(600)
        self.open_paint(page)
        fit = page.evaluate("""() => { const r = e => e.getBoundingClientRect(), p = r(document.querySelector('.stepwrap.open .skp')), c = r(document.querySelector('.stepwrap.open .chips'));
          return { pl: p.left, pr: p.right, cl: c.left, cr: c.right, vw: innerWidth, scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth,
                   over: [...document.querySelectorAll('.stepwrap.open .chips *')].filter(e => r(e).right > c.right + 1 || r(e).left < c.left - 1).map(e => e.className) }; }""")
        self.assertGreaterEqual(fit["pl"], 0); self.assertLessEqual(fit["pr"], fit["vw"])
        self.assertGreaterEqual(fit["cl"], 0); self.assertLessEqual(fit["cr"], fit["vw"])
        self.assertLessEqual(fit["scroll"], fit["client"])
        self.assertEqual(fit["over"], [])
        before = self.paint_state(page)
        y0 = page.evaluate("() => scrollY")
        self.touch_drag(page, ".stepwrap.open .skp .sv", (.3, .7), (.8, .25))
        after = self.paint_state(page)
        self.assertEqual(after["skin"], "custom")
        self.assertNotEqual(after["paint"]["tower"], before["paint"]["tower"])
        self.assertEqual(page.locator(".stepwrap.open").count(), 1)
        self.touch_drag(page, ".stepwrap.open .skp .hue", (.1, .5), (.7, .5))
        self.assertNotEqual(self.paint_state(page)["paint"]["tower"], after["paint"]["tower"])
        self.assertEqual(page.evaluate("() => scrollY"), y0)             # the touch drag did not scroll the page
        self.assertEqual(page.locator(".stepwrap.open").count(), 1)
        self.check_page(page, errors)
        page.locator(".stepwrap.open .skp").scroll_into_view_if_needed()
        page.screenshot(path=str(SHOTS / "ui-mobile-custom-picker.png"))
        # a tap outside closes the dropdown
        page.touchscreen.tap(8, 8)
        self.assertEqual(page.locator(".stepwrap.open").count(), 0)
        self.assertEqual(errors, [])

    def test_custom_picker_with_blocked_storage(self):
        init = "Object.defineProperty(window, 'localStorage', {get() { throw new Error('blocked'); }});"
        _, page, errors = self.new_page_logged(init=init)
        page.goto(URL, wait_until="load")
        page.wait_for_timeout(500)
        self.open_paint(page)
        self.drag_in(page, ".stepwrap.open .skp .sv", (.4, .6), (.7, .3))
        self.assertEqual(self.paint_state(page)["skin"], "custom")
        inp = page.locator(".stepwrap.open .skp input"); inp.fill("#336699"); inp.press("Enter")
        self.assertEqual(self.paint_state(page)["paint"]["tower"], "#336699")
        self.check_page(page, errors)
        self.assertEqual(errors, [])

    def test_garbage_in_storage_is_ignored_and_old_values_still_work(self):
        for stored, skin in (("not json {", "classic"), ('{"skin":"custom","paint":{"tower":"zz","cab":5,"motor":null}}', "custom"), ('{"skin":"nope"}', "classic"),
                             ('"classic"', "classic"), ("null", "classic"), ("[1,2]", "classic"), ('{"skin":"custom","paint":"x"}', "custom"), ('{"skin":"classic"}', "classic")):
            with self.subTest(stored=stored):
                _, page, errors = self.new_page_logged(init=f"localStorage.setItem('tower-crane.paint', {json.dumps(stored)});")
                page.goto(URL, wait_until="load")
                page.wait_for_timeout(400)
                self.check_page(page, errors)
                got = self.paint_state(page)
                self.assertEqual(got["skin"], skin)
                self.assertTrue(all(re.fullmatch(r"#[0-9a-f]{6}", v) for v in got["paint"].values()))

    # ---------- stage 2: tap a system, tap a part, see-through, labels, phone ----------
    FIND = """(k) => {
      // a point where the pointer really hits a part of system k (or of part n when k is a string 'n:..')
      const want = String(k).startsWith('n:') ? ['pn', String(k).slice(2)] : ['ps', String(k)];
      for (const e of document.querySelectorAll('#art [data-' + want[0] + '="' + want[1] + '"]')) {
        const r = e.getBoundingClientRect(); if (r.width < 1) continue;
        for (let fy = .1; fy < 1; fy += .1) for (let fx = .1; fx < 1; fx += .1) {
          const x = r.left + r.width*fx, y = r.top + r.height*fy, hit = document.elementFromPoint(x, y), g = hit && hit.closest('#art [data-' + want[0] + ']');
          if (g && g.dataset[want[0]] === want[1]) return { x, y };
        }
      }
      return null;
    }"""

    def test_tap_each_system_and_put_it_back(self):
        for k in range(1, 7):
            with self.subTest(system=k):
                _, page, errors = self.new_page_logged()
                page.goto(URL + "?yaw=30&pitch=28", wait_until="load")
                page.wait_for_timeout(900)
                pt = page.evaluate(self.FIND, k)
                self.assertIsNotNone(pt, f"a visible spot on system {k}")
                page.mouse.click(pt["x"], pt["y"])
                page.wait_for_timeout(1700)
                self.assertEqual(page.evaluate("() => [__st.sel, ...__st.p]"), [k] + [1 if i == k else 0 for i in range(7)])
                n_parts = page.evaluate("(k) => SYS_TAB.filter(s => s === k).length", k)
                self.assertEqual(page.locator(".tg2").count(), n_parts, "every part of the system is labelled")
                self.assertEqual(page.locator(f"[data-title='{k}']").count(), 1, "its title shows")
                self.check_page(page, errors)
                page.screenshot(path=str(SHOTS / f"crane-tap-system-{k}.png"))
                page.locator(f"[data-title='{k}']").click()
                page.wait_for_timeout(1700)
                self.assertEqual(page.evaluate("() => assembled(__st)"), True)
                self.assertEqual(page.locator(".tg2").count(), 0)
                self.assertEqual(errors, [])

    def test_tap_a_part_of_a_separated_system_pulls_it_out_and_again_pushes_it_back(self):
        for sysk, n in ((2, 5), (4, 13), (5, 9), (1, 10), (2, 6), (6, 16)):
            with self.subTest(part=n):
                _, page, errors = self.new_page_logged()
                page.goto(URL + f"?yaw=30&pitch=28&sel={sysk}", wait_until="load")
                page.wait_for_timeout(1500)
                before = page.evaluate("(n) => [...document.querySelectorAll('#art [data-pn=\"' + n + '\"]')].map(e => { const r = e.getBoundingClientRect(); return [r.left, r.top]; })", n)
                pt = page.evaluate(self.FIND, f"n:{n}")
                self.assertIsNotNone(pt, f"a visible spot on part {n}")
                page.mouse.click(pt["x"], pt["y"])
                page.wait_for_timeout(1500)
                self.assertEqual(page.evaluate("() => [__st.sel, __st.subSel]"), [sysk, n])
                self.assertGreater(page.evaluate("(n) => __st.pull[n]", n), .99)
                after = page.evaluate("(n) => [...document.querySelectorAll('#art [data-pn=\"' + n + '\"]')].map(e => { const r = e.getBoundingClientRect(); return [r.left, r.top]; })", n)
                moved = max(abs(a[0] - b[0]) + abs(a[1] - b[1]) for a, b in zip(before, after))
                self.assertGreater(moved, 25, f"part {n} comes out clearly ({moved:.0f}px)")
                self.assertEqual(page.locator(f".tg2.on[data-n='{n}']").count(), 1, "its label lights")
                self.check_page(page, errors)
                page.screenshot(path=str(SHOTS / f"crane-tap-part-{n}.png"))
                page.evaluate("(n) => pickPart(__st.sel, n)", n)
                page.wait_for_timeout(1500)
                self.assertEqual(page.evaluate("(n) => [__st.subSel, __st.pull[n]]", n), [0, 0])
                self.assertEqual(errors, [])

    def test_see_through_fades_the_covers_and_nothing_else(self):
        _, page, errors = self.new_page_logged()
        page.goto(URL + "?yaw=30&pitch=28", wait_until="load")
        page.wait_for_timeout(800)
        fade = """() => { const o = {}; for (const e of document.querySelectorAll('#art [data-pn]')) { const p = e.parentElement, v = p.tagName === 'g' && p.hasAttribute('opacity') ? +p.getAttribute('opacity') : 1; o[e.dataset.pn] = Math.min(o[e.dataset.pn] ?? 1, v); } return o; }"""
        self.assertTrue(all(v == 1 for v in page.evaluate(fade).values()))
        page.locator("#xrb").click()
        page.wait_for_timeout(1200)
        self.assertEqual(page.evaluate("() => __st.xrT"), 1)
        o = page.evaluate(fade)
        for n in ("5", "6", "13", "16", "17", "18"):
            self.assertLess(o[n], .3, f"cover of part {n} faded")
        self.assertLess(o["7"], .6, "jib lattice faded a little")
        self.assertGreater(o["7"], .35)
        for n in ("1", "2", "3", "4", "8", "9", "10", "11", "12", "14", "15", "19", "20", "21", "22", "23", "24"):
            self.assertEqual(o[n], 1, f"part {n} stays solid")
        page.screenshot(path=str(SHOTS / "crane-see-through.png"))
        self.check_page(page, errors)
        page.locator("#xrb").click()
        page.wait_for_timeout(1200)
        self.assertTrue(all(v == 1 for v in page.evaluate(fade).values()))
        self.assertEqual(errors, [])

    LABELS = """() => {
      const r = e => e.getBoundingClientRect(), f = r(document.getElementById('fig'));
      let a = 1e9, b = 1e9, c = -1e9, d = -1e9;
      for (const e of document.querySelectorAll('#art [data-pn]')) { const q = r(e); if (!q.width) continue; a = Math.min(a, q.left); b = Math.min(b, q.top); c = Math.max(c, q.right); d = Math.max(d, q.bottom); }
      const tags = [...document.querySelectorAll('#art .tag, #art .tg2')].map(g => { const q = r(g.querySelector('rect')), p = g.querySelector('path').getAttribute('d').match(/-?[\\d.]+/g).map(Number);
        return { n: +g.dataset.n, box: [q.left, q.top, q.right, q.bottom], from: p.slice(0, 2), to: p.slice(-2) }; });
      return { fig: [f.left, f.top, f.right, f.bottom], crane: [a, b, c, d], tags };
    }"""

    def check_labels(self, page, name):
        data = page.evaluate(self.LABELS)
        a, b, c, d = data["crane"]
        for t in data["tags"]:
            x0, y0, x1, y1 = t["box"]
            overlap = min(x1, c) - max(x0, a)
            self.assertLessEqual(overlap, 6, f"{name}: label {t['n']} sits over the crane by {overlap:.0f}px")
            self.assertGreaterEqual(x0, data["fig"][0] - 2); self.assertLessEqual(x1, data["fig"][2] + 2)
        # leaders that end on the same column do not cross (screen units: the path's own coordinates are in drawing units, compare there)
        segs = [(t["from"], t["to"], t["n"]) for t in data["tags"]]
        def side(p, q, r): return (q[0] - p[0])*(r[1] - p[1]) - (q[1] - p[1])*(r[0] - p[0])
        for i, (a0, a1, na) in enumerate(segs):
            for b0, b1, nb in segs[i + 1:]:
                if abs(a1[0] - b1[0]) > 1e-3: continue
                self.assertFalse(side(a0, a1, b0)*side(a0, a1, b1) < -1e-6 and side(b0, b1, a0)*side(b0, b1, a1) < -1e-6, f"{name}: leaders {na} and {nb} cross")

    def test_labels_are_in_two_columns_clear_of_the_crane_and_leaders_do_not_cross(self):
        for q in ("yaw=30&pitch=28", "yaw=110&pitch=28", "yaw=200&pitch=28", "yaw=290&pitch=28", "yaw=60&pitch=60", "yaw=160&pitch=6", "yaw=340&pitch=15",
                  "yaw=30&pitch=28&ex=123456", "yaw=200&pitch=28&ex=123456", "yaw=110&pitch=28&ex=123456", "yaw=30&sel=4", "yaw=30&sel=2&sub=5", "yaw=30&sel=4&sub=13", "yaw=250&slew=100&trolley=80&hookZ=30"):
            with self.subTest(q=q):
                _, page, errors = self.new_page_logged()
                page.goto(URL + "?" + q, wait_until="load")
                page.wait_for_timeout(1200)
                if "sel=" not in q:
                    page.locator("#lblb").click(); page.wait_for_timeout(900)
                    self.assertEqual(page.locator(".tag").count(), 24)
                self.check_labels(page, q)
                self.check_page(page, errors)
                self.assertEqual(errors, [])

    # screen length (px) of each leader that runs over the drawn parts (screen hulls) of the systems other than the selected one; a part the
    # leader starts inside is what it points at, not a crossing
    LEADER_CROSS = """(arg) => {
  const [sel, ld] = Array.isArray(arg) ? arg : [arg, false];
  const svg = document.getElementById('fig'), M = svg.getScreenCTM(), tp = (x, y) => [M.a*x + M.c*y + M.e, M.b*x + M.d*y + M.f];
  const C = document.querySelector('#art g[data-ps]').getScreenCTM(), hp = q => [C.a*q[0] + C.c*q[1] + C.e, C.b*q[0] + C.d*q[1] + C.f];
  const hulls = PARTS.filter(p => (p.n || (ld && p.fr === 'load' && !p.hose)) && p.sys !== sel).map(p => p.hl.map(hp));
  const inside = (a, b, h) => { let t0 = 0, t1 = 1; const dx = b[0] - a[0], dy = b[1] - a[1];
    let ar = 0; for (let i = 0; i < h.length; i++){ const p = h[i], q = h[(i + 1) % h.length]; ar += p[0]*q[1] - q[0]*p[1]; } const sg = ar > 0 ? 1 : -1;
    for (let i = 0; i < h.length; i++){ const p = h[i], q = h[(i + 1) % h.length], ex = q[0] - p[0], ey = q[1] - p[1];
      const n = sg*(ex*(a[1] - p[1]) - ey*(a[0] - p[0])), d = sg*(ex*dy - ey*dx);       // inside when n + t*d >= 0
      if (Math.abs(d) < 1e-12){ if (n < 0) return 0; } else { const t = -n/d; if (d > 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t); } }
    return Math.max(0, t1 - t0)*Math.hypot(dx, dy); };
  const has = (h, a) => { let ar = 0; for (let i = 0; i < h.length; i++){ const p = h[i], q = h[(i + 1) % h.length]; ar += p[0]*q[1] - q[0]*p[1]; } const sg = ar > 0 ? 1 : -1;
    return h.every((p, i) => { const q = h[(i + 1) % h.length]; return sg*((q[0] - p[0])*(a[1] - p[1]) - (q[1] - p[1])*(a[0] - p[0])) >= 0; }); };
  const tags = [...document.querySelectorAll('#art .tag, #art .tg2')].map(g => ({ n: +g.dataset.n, pts: g.querySelector('path').getAttribute('d').match(/-?[\\d.]+/g).map(Number) }));
  return tags.map(t => { const P = [0, 2, 4].map(i => tp(t.pts[i], t.pts[i + 1])); let L = 0;
    for (const h of hulls){ if (has(h, P[0])) continue; for (let i = 0; i < 2; i++) L += inside(P[i], P[i + 1], h); }
    return [t.n, Math.round(L)]; }).filter(x => x[1] > 0);
}"""

    def test_leaders_do_not_run_across_the_other_systems(self):
        sys_of = [0, 1, 4, 4, 3, 2, 2, 3, 3, 5, 1, 2, 5, 4, 3, 6, 6, 6, 4, 6, 6, 6, 1, 4, 5]
        # the safety fittings 19 and 21 sit in the head of the crane, inside the cluster of counter-jib bars, jib root and cab: from there a
        # leader has to cross a little more of them at yaw 110 (measured 145 and 216 px); everything else crosses 30 px or less
        known = {("sel=6", 110): {19: 160, 21: 230}}
        for yaw in (30, 110):
            for st in [f"sel={k}" for k in range(1, 7)] + [f"sub={n}" for n in (5, 13, 9)]:
                with self.subTest(yaw=yaw, state=st):
                    _, page, errors = self.new_page_logged()
                    page.goto(URL + f"?yaw={yaw}&pitch=28&{st}", wait_until="load")
                    page.wait_for_timeout(1500)
                    sel = int(st[4:]) if st.startswith("sel") else sys_of[int(st[4:])]
                    over = dict(page.evaluate(self.LEADER_CROSS, sel))
                    self.assertGreaterEqual(page.locator(".tag, .tg2").count(), 3)
                    for n, px in over.items():
                        self.assertLessEqual(px, known.get((st, yaw), {}).get(n, 30), f"{st} yaw {yaw}: the leader of label {n} runs {px}px over other systems")
                    self.check_page(page, errors)
                    self.assertEqual(errors, [])

    def test_phone_labels_are_badges_with_a_name_list_below(self):
        for q in ("", "?ex=123456", "?sel=4"):
            with self.subTest(q=q):
                _, page, errors = self.new_page_logged(mobile=True)
                page.goto(URL + q, wait_until="load")
                page.wait_for_timeout(1000)
                if "sel" not in q:
                    page.locator("#lblb").click(); page.wait_for_timeout(900)
                info = page.evaluate("""() => ({ tags: [...document.querySelectorAll('#art .tag, #art .tg2')].map(g => [g.dataset.n, g.querySelector('text').textContent]),
                  rows: [...document.querySelectorAll('.lgd > div')].map(d => [d.querySelector('b').textContent, d.textContent.replace(d.querySelector('b').textContent, '')]),
                  scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth, lgd: document.querySelector('.lgd').getBoundingClientRect().top, fig: document.getElementById('fig').getBoundingClientRect().bottom })""")
                self.assertGreaterEqual(len(info["tags"]), 5)
                self.assertTrue(all(t[0] == t[1] for t in info["tags"]), "a badge shows just its number")
                self.assertEqual(sorted(int(r[0]) for r in info["rows"]), sorted(int(t[0]) for t in info["tags"]), "the list names every badge")
                self.assertEqual(len({r[1] for r in info["rows"]}), len(info["rows"]))
                self.assertGreaterEqual(info["lgd"], info["fig"] - 1, "the list sits below the figure")
                self.assertLessEqual(info["scroll"], info["client"], "no horizontal scroll")
                self.check_page(page, errors)
                page.screenshot(path=str(SHOTS / f"crane-phone-labels{'-ex' if 'ex' in q else '-sel' if 'sel' in q else ''}.png"))
                self.assertEqual(errors, [])

    def test_stage2_url_parameters_are_validated(self):
        for query, expected in (("ex=123456&xr=1&sel=3", {"sel": 3, "xr": 1}), ("sel=0", {"sel": -1}), ("sel=7", {"sel": -1}), ("sel=2.5", {"sel": -1}), ("sub=24", {"sel": 5, "subSel": 24}), ("sub=25", {"sel": -1, "subSel": 0}),
                                ("sub=0", {"sel": -1}), ("sel=4&sub=13&xr=1", {"sel": 4, "subSel": 13, "xr": 1}), ("xr=2", {"xr": 0}), ("xr=abc", {"xr": 0})):
            with self.subTest(query=query):
                _, page, errors = self.new_page_logged()
                page.goto(URL + "?" + query, wait_until="load")
                page.wait_for_timeout(700)
                state = page.evaluate("() => __st")
                for key, value in expected.items():
                    self.assertEqual(state[key], value, key)
                self.check_page(page, errors)

    # ----- stage 4: leaders while working, the flash, the 吊物 menu, the load URL, the presets -----
    WORK_STEPS = "slewTo out lower hook hoist slewBack in set unhook home balance jack insert bolt retract".split()
    # the leaders of the working labels run over the drawn parts of the crane (every system, the part they point at excepted, and the hook, ropes and
    # the hanging or landed load): 30 px at most, at every yaw (0, 30 ... 330, pitch 30; and yaw 30 at pitch 70), with the default load and with
    # the heavy pallet. The exceptions are labels whose anchor sits inside a cluster (the trolley winch on the counter-jib, the lifting winch, the
    # climbing cylinders and the limiter in the head), where every way out crosses a truss: the most any pose measured, label by label
    WORK_LEADER_CAP = {4: 50, 13: 45, 16: 50, 17: 55, 19: 125}
    WORK_LEADER_KNOWN = {("pallet", 30, 70, "set"): {9: 111}}

    def work_leaders(self, load, query):
        _, page, errors = self.new_page_logged(size=(1400, 1000))
        worst = {}
        for yaw, pitch in [(y, 30) for y in range(0, 360, 30)] + [(30, 70)]:
            for step in self.WORK_STEPS:
                page.goto(URL + f"?yaw={yaw}&pitch={pitch}&step={step}&t=.5{query}", wait_until="load")
                page.wait_for_selector("#art .tag, #art .tg2")
                page.wait_for_timeout(200)
                over = dict(page.evaluate(self.LEADER_CROSS, [-1, True]))
                if load == "default":
                    self.assertNotIn("19", [t.get_attribute("data-n") for t in page.locator(".tag, .tg2").all()], f"{step}: the gauge is not shown with a light load")
                for n, px in over.items():
                    cap = self.WORK_LEADER_KNOWN.get((load, yaw, pitch, step), {}).get(n, self.WORK_LEADER_CAP.get(n, 30))
                    self.assertLessEqual(px, cap, f"{load} {step} yaw {yaw} pitch {pitch}: the leader of label {n} runs {px}px over the crane")
                    worst[n] = max(worst.get(n, 0), px)
        self.assertEqual(errors, [])
        return worst

    def test_working_leaders_stay_off_the_crane(self):
        self.work_leaders("default", "")

    def test_working_leaders_stay_off_the_crane_with_the_heavy_pallet(self):
        self.work_leaders("pallet", "&loadStyle=pallet&loadSize=l")

    def menu(self, page, button="吊物"):
        page.locator("button.act", has_text=button).first.click()
        return page.evaluate("() => [...document.querySelectorAll('.stepwrap.open .chips > *')].map(e => [e.className.includes('chiph') ? 'H' : e.className.includes('current') ? 'C' : e.className.includes('off') ? 'D' : e.tagName === 'BUTTON' ? 'B' : 'P', e.textContent.trim()])")

    def test_load_menu_has_four_groups_with_the_current_choice_marked(self):
        _, page, errors = self.new_page_logged()
        page.goto(URL + "?yaw=30&pitch=28", wait_until="load")
        page.wait_for_timeout(700)
        m = self.menu(page)
        heads = [t for k, t in m if k == "H"]
        self.assertEqual(heads, ["款式", "尺寸", "吊索", "颜色"])
        cur = [t for k, t in m if k == "C"]
        self.assertEqual(cur, ["钢筋捆", "中 2.0t", "四肢吊索", "跟随默认"])
        self.assertEqual([t for k, t in m[:7] if k != "H"], ["混凝土料斗", "钢筋捆", "工字钢梁", "预制墙板", "砖托盘", "钢管束"])
        self.assertEqual([t for k, t in m if "t" in t and t[0] in "小中大"], ["小 1.2t", "中 2.0t", "大 2.7t"])
        self.assertEqual(page.locator(".stepwrap.open .skp").count(), 1)
        self.assertEqual(page.locator(".stepwrap.open .skp input").input_value(), "#a85f3c")
        # a style whose rigging is fixed shows the others disabled, with the reason when pressed
        page.locator(".stepwrap.open button.chip", has_text="混凝土料斗").click()
        page.wait_for_timeout(300)
        self.assertEqual(page.evaluate("() => [__st.ld.style, __st.ld.size, __st.ld.rig, LOAD.t]"), ["hopper", "m", "four", 2])
        m = self.menu(page)
        self.assertEqual([(k, t) for k, t in m if t in ("两肢吊索", "四肢吊索", "吊带")], [("D", "两肢吊索"), ("C", "四肢吊索"), ("D", "吊带")])
        page.locator(".stepwrap.open button.chip", has_text="吊带").click()
        self.assertIn("料斗用自己的 4 个吊耳", page.locator("#toast").inner_text())
        self.assertEqual(page.evaluate("() => __st.ld.rig"), "four")
        page.keyboard.press("Escape"); page.mouse.click(5, 5)
        # the stats line names the load and fits the phone
        self.assertEqual(page.locator('#stats .v[data-k="吊物"]').inner_text(), "混凝土料斗 2.0t 四肢吊索")
        self.check_page(page, errors)
        self.assertEqual(errors, [])

    def test_swapping_slides_the_picture_refuses_while_hooked_and_recolours_any_time(self):
        _, page, errors = self.new_page_logged()
        page.goto(URL + "?yaw=30&pitch=28", wait_until="load")
        page.wait_for_timeout(700)
        n0 = page.evaluate("() => document.querySelectorAll('#art [data-pn=\"0\"]').length")
        page.evaluate("() => { window.__max = 0; const f = () => { window.__max = Math.max(window.__max, document.querySelectorAll('#art [data-pn=\"0\"]').length); requestAnimationFrame(f); }; f(); }")
        self.menu(page); page.locator(".stepwrap.open button.chip", has_text="工字钢梁").click()
        self.assertEqual(page.evaluate("() => [__st.ld.style, LOAD.kind, !!__st.swap]"), ["beam", "beam", True], "the state changes at once")
        page.wait_for_timeout(900)
        self.assertEqual(page.evaluate("() => __st.swap"), None)
        self.assertGreater(page.evaluate("() => window.__max"), 0)
        self.assertEqual(page.evaluate("() => localStorage.getItem('tower-crane.load')"), '{"style":"beam","size":"m","rig":"four","color":null}')       # (the rigging stays when the new style can use it)
        # hooked: no swap, the message; colour works
        page.goto(URL + "?yaw=30&pitch=28&step=hook&t=1", wait_until="load")
        page.wait_for_timeout(700)
        self.assertTrue(page.evaluate("() => __st.hooked"))
        self.menu(page); page.locator(".stepwrap.open button.chip", has_text="钢管束").click()
        self.assertEqual(page.locator("#toast").inner_text().strip(), "先摘钩，再换吊物")
        before = page.evaluate("() => __st.ld.style")
        self.assertEqual(before, "beam", "remembered from the swap above"); self.assertIsNone(page.evaluate("() => __st.swap"))
        self.menu(page)
        inp = page.locator(".stepwrap.open .skp input"); inp.fill("#ff0000"); inp.press("Enter")
        page.wait_for_timeout(300)
        self.assertEqual(page.evaluate("() => [__st.ld.color, LOAD.color, __st.ld.style]"), ["#ff0000", "#ff0000", before])
        self.assertNotIn("跟随默认", page.locator(".stepwrap.open button.chip.current").all_inner_texts())
        page.locator(".stepwrap.open button.chip", has_text="跟随默认").click()
        page.wait_for_timeout(200)
        self.assertEqual(page.evaluate("() => [__st.ld.color, LOAD.color]"), [None, None])
        self.check_page(page, errors)
        self.assertEqual(errors, [])

    def test_a_heavy_load_is_refused_with_a_red_gauge_and_a_visible_flash_and_auto_stops_hooked(self):
        for style in ("panel", "hopper"):
            with self.subTest(style=style):
                _, page, errors = self.new_page_logged()
                page.goto(URL + f"?yaw=30&pitch=28&loadStyle={style}&loadSize=l&step=hook&t=1", wait_until="load")
                page.wait_for_timeout(700)
                self.assertEqual(page.evaluate("() => [__st.hooked, LOAD.t > 3.5]"), [True, True])
                page.locator("button.act", has_text="工作").first.click()
                page.wait_for_timeout(350)
                self.assertEqual(page.locator("#toast").inner_text().strip(), "太重了，起重机吊不动，换轻一点的")
                self.assertEqual(page.evaluate("() => parseFloat(getComputedStyle(document.getElementById('toast')).opacity)"), 1)
                self.assertEqual(page.evaluate("() => [__st.auto, __st.busy, __st.cur, __st.hooked]"), [False, False, None, True])
                self.assertEqual(page.evaluate("() => document.querySelector('[data-n=\"19\"] rect').getAttribute('stroke')"), "#d93a2e")
                self.assertTrue(page.evaluate("() => { const t = document.getElementById('toast').getBoundingClientRect(); return [...document.querySelectorAll('.tag, .tg2')].every(g => { const r = g.querySelector('rect').getBoundingClientRect(); return r.right < t.left || r.left > t.right || r.bottom < t.top || r.top > t.bottom; }); }"))
                page.screenshot(path=str(SHOTS / f"s4-heavy-{style}.png"))
                page.wait_for_timeout(3000)
                self.assertEqual(page.evaluate("() => __st.over"), 0, "the red goes out by itself")
                self.assertEqual(page.locator('[data-n="19"]').count(), 0)
                self.check_page(page, errors)
                self.assertEqual(errors, [])

    def test_load_url_params_are_validated_and_the_url_beats_the_browser(self):
        _, page, errors = self.new_page_logged()
        for q, want in [("loadStyle=pipes&loadSize=l&rig=belt&loadColor=ff8800", ["pipes", "l", "belt", "#ff8800"]), ("loadStyle=nope&loadSize=9&rig=x&loadColor=zz", ["rebar", "m", "four", None]),
                        ("loadStyle=hopper&rig=belt", ["hopper", "m", "four", None]), ("loadStyle=panel&rig=belt&loadSize=s", ["panel", "s", "two", None]), ("loadSize=l", ["rebar", "l", "four", None])]:
            with self.subTest(q=q):
                page.goto(URL + "?" + q, wait_until="load"); page.wait_for_timeout(500)
                self.assertEqual(page.evaluate("() => [__st.ld.style, __st.ld.size, __st.ld.rig, __st.ld.color]"), want)
        page.goto(URL, wait_until="load"); page.wait_for_timeout(500)
        self.menu(page); page.locator(".stepwrap.open button.chip", has_text="砖托盘").click(); page.wait_for_timeout(700)
        page.goto(URL, wait_until="load"); page.wait_for_timeout(500)
        self.assertEqual(page.evaluate("() => __st.ld.style"), "pallet", "remembered")
        page.goto(URL + "?loadStyle=beam", wait_until="load"); page.wait_for_timeout(500)
        self.assertEqual(page.evaluate("() => __st.ld.style"), "beam", "the URL wins")
        page.evaluate("() => localStorage.setItem('tower-crane.load', '{junk')")
        page.goto(URL, wait_until="load"); page.wait_for_timeout(500)
        self.assertEqual(page.evaluate("() => __st.ld.style"), "rebar")
        self.assertEqual(errors, [])
        init = "Object.defineProperty(window, 'localStorage', {get() { throw new Error('blocked'); }});"
        _, page, errors = self.new_page_logged(init=init)
        page.goto(URL + "?loadStyle=pipes", wait_until="load"); page.wait_for_timeout(500)
        self.menu(page); page.locator(".stepwrap.open button.chip", has_text="小 ").click(); page.wait_for_timeout(300)
        self.assertEqual(page.evaluate("() => [__st.ld.style, __st.ld.size]"), ["pipes", "s"])
        self.assertEqual(errors, [])

    def test_every_paint_preset_by_url_and_the_menu_lists_all_six(self):
        _, page, errors = self.new_page_logged()
        dots = {"classic": "#f3b11b", "orange": "#f0801c", "redwhite": "#d8382c", "green": "#3ea34c", "bluewhite": "#3a78d6", "pink": "#ee7fb0"}
        for sid, dot in dots.items():
            with self.subTest(skin=sid):
                page.goto(URL + f"?skin={sid}&yaw=30&pitch=28", wait_until="load"); page.wait_for_timeout(600)
                self.assertEqual(page.evaluate("() => [__st.skin, YEL.m]"), [sid, dot])
                page.screenshot(path=str(SHOTS / f"s4-skin-{sid}.png"))
        page.goto(URL + "?skin=nope", wait_until="load"); page.wait_for_timeout(400)
        self.assertEqual(page.evaluate("() => __st.skin"), "classic")
        m = self.menu(page, "涂装")
        self.assertEqual([t for k, t in m if k in "CB"][:6], self.SKIN_NAMES)
        self.assertEqual(page.locator(".stepwrap.open .chiph").all_inner_texts(), ["预设", "自定义"])
        self.assertEqual(errors, [])

    def test_phone_shows_the_load_stat_and_the_toast_stays_clear(self):
        for w in (390, 360):
            with self.subTest(width=w):
                _, page, errors = self.new_page_logged(mobile=True, size=(w, 844))
                page.goto(URL + "?step=hoist&t=.6&loadStyle=pallet&loadSize=l", wait_until="load"); page.wait_for_timeout(700)
                self.assertEqual(page.locator('#stats .v[data-k="吊物"]').inner_text(), "砖托盘 2.8t 四肢吊索")
                box = page.locator('#stats .v[data-k="吊物"]').bounding_box()
                self.assertGreaterEqual(box["x"], 0); self.assertLessEqual(box["x"] + box["width"], w)
                self.assertEqual(page.evaluate("() => document.documentElement.scrollWidth <= innerWidth"), True)
                page.screenshot(path=str(SHOTS / f"s4-phone-{w}.png"))
                self.check_page(page, errors)
                self.assertEqual(errors, [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
