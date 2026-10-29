import json
import re
import unittest
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
SHOTS = ROOT / "shots"
URL = (ROOT / "truck.html").as_uri()


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
                page.screenshot(path=str(SHOTS / f"after-{'mobile' if mobile else 'desktop'}.png"))

    def test_query_validation(self):
        cases = [
            ("sel=999&sub=NaN&load=Infinity&yaw=NaN&pitch=Infinity&act=bad",
             {"sel": -1, "subSel": 0, "load": .6, "act": None}),
            ("sub=9&load=2&binFull=-4&ej=9999", {"sel": 2, "subSel": 9, "load": 1, "binFull": 0, "ej": 112}),
            ("sel=1&sub=9&ex=0679&load=-2&ej=-10", {"sel": 1, "subSel": 0, "load": 0, "ej": 43.4}),
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

    def test_any_open_gate_blocks_work(self):
        _, page, errors = self.new_page()
        page.goto(URL + "?gate=0.0001", wait_until="load")
        self.assertTrue(page.evaluate("() => ['hook','lift','tip','pack','press'].every(id => !!whyNot(__st,id))"))
        self.assertEqual(errors, [])

    def test_side_panel_hit_in_four_quadrants(self):
        for yaw in (45, 135, 225, 315):
            with self.subTest(yaw=yaw):
                _, page, errors = self.new_page()
                page.goto(URL + f"?yaw={yaw}", wait_until="load")
                page.wait_for_timeout(1000)
                hit = page.evaluate("""() => {
                  const root = document.querySelector('#art>g'), y = CAM_V[1] > 0 ? 48.05 : 1.95;
                  const q = new DOMPoint(...P(88,y,42)).matrixTransform(root.getScreenCTM());
                  const el = document.elementFromPoint(q.x,q.y), part = el && el.closest('[data-pn]');
                  return part ? part.dataset.pn : null;
                }""")
                self.assertEqual(hit, '11')
                self.assertEqual(errors, [])

    def test_angles_xray_and_mechanism_screenshots(self):
        cases = [(f"yaw{yaw}-xr{xr}", f"yaw={yaw}&xr={xr}") for yaw in (45, 135, 225, 315) for xr in (0, 1)]
        cases += [("exploded", "ex=12345"), ("open-gate", "gate=1"), ("tipping", "hook=1&clamp=1&lift=1&tip=1")]
        cases += [
            ("open-gate-comparison", "yaw=135&gate=1&load=.5&ej=65&xr=1"),
            ("tipping-comparison", "yaw=135&hook=1&clamp=1&lift=1&tip=1&lidA=1&pour=.5&hop=.5&xr=1"),
        ]
        for name, query in cases:
            with self.subTest(name=name):
                _, page, errors = self.new_page()
                page.goto(URL + "?" + query, wait_until="load")
                page.wait_for_timeout(1000)
                self.check_page(page, errors)
                page.screenshot(path=str(SHOTS / f"after-{name}.png"))

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


    # ---- skins (涂装) and bins (垃圾桶) ----
    SKIN_IDS = ["classic", "orange", "sky", "yellow", "snow", "graphite", "forest"]

    def new_page_logged(self, mobile=False, init=None, size=None):
        """Like new_page, but console errors also count (a failed resource, a script warning turned error)."""
        context, page, errors = self.new_page(mobile, init, size)
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        return context, page, errors

    def test_skin_parameter_screenshot_for_every_skin(self):
        for skin in self.SKIN_IDS:
            with self.subTest(skin=skin):
                _, page, errors = self.new_page_logged()
                page.goto(URL + f"?skin={skin}&yaw=135", wait_until="load")
                page.wait_for_timeout(800)
                self.check_page(page, errors)
                self.assertEqual(page.evaluate("() => [__st.skin, SKIN_ID, GRN.m]"),
                                 [skin, skin, page.evaluate(f"() => skinOf('{skin}').GRN.m")])
                page.screenshot(path=str(SHOTS / f"skin-{skin}.png"))
        with self.subTest(skin="invalid"):
            _, page, errors = self.new_page_logged()
            page.goto(URL + "?skin=%3Cb%3E&bin=1&binType=zz", wait_until="load")
            page.wait_for_timeout(500)
            self.check_page(page, errors)
            self.assertEqual(page.evaluate("() => [__st.skin, __st.binSize, __st.binType, GRN.m]"), ["classic", 240, "kitchen", "#5fa43c"])

    # every style x size the picker offers (style id -> sizes), and the type each is shown in so every type is seen on every style
    BIN_STYLES = {"wheelie": [120, 240, 360], "cart4": [660, 1100], "drum": [100, 200], "dome": [120, 240], "pedal": [120, 240]}
    BIN_TYPES = ["kitchen", "other", "recycle", "hazard"]

    def test_bin_parameters_styles_sizes_types_and_working_pose_screenshots(self):
        combos = [(style, size) for style, sizes in self.BIN_STYLES.items() for size in sizes]
        for i, (style, size) in enumerate(combos):
            with self.subTest(style=style, size=size):
                typ = self.BIN_TYPES[i % 4]
                _, page, errors = self.new_page_logged()
                page.goto(URL + f"?binStyle={style}&bin={size}&binType={typ}&yaw=120&pitch=32", wait_until="load")
                page.wait_for_timeout(800)
                self.check_page(page, errors)
                self.assertEqual(page.evaluate("() => [__st.binStyle, __st.binSize, __st.binType, __st.swapT]"), [style, size, typ, 0])
                page.screenshot(path=str(SHOTS / f"bin-{style}-{size}-{typ}.png"))
        poses = {"hooked": "hook=1&clamp=1", "lifted": "hook=1&clamp=1&lift=1", "pouring": "hook=1&clamp=1&lift=1&tip=.6&lidA=.9&pour=.4&hop=.3&binFull=.6"}
        for style, size in combos:
            for pose, query in poses.items():
                with self.subTest(style=style, size=size, pose=pose):
                    _, page, errors = self.new_page_logged()
                    page.goto(URL + f"?binStyle={style}&bin={size}&binType=recycle&yaw=140&pitch=32&{query}", wait_until="load")
                    page.wait_for_timeout(700)
                    self.check_page(page, errors)
                    page.screenshot(path=str(SHOTS / f"bin-{style}-{size}-{pose}.png"))

    def test_old_bin_links_without_a_style_and_bad_values(self):
        for query, want in [("bin=660", ["cart4", 660]), ("bin=120&binType=hazard", ["wheelie", 120]), ("bin=1100", ["cart4", 1100]), ("bin=100", ["drum", 100]),
                            ("binStyle=drum&bin=240", ["drum", 200]), ("binStyle=nope&bin=nope", ["wheelie", 240]), ("binStyle=pedal", ["pedal", 240])]:
            with self.subTest(query=query):
                _, page, errors = self.new_page_logged()
                page.goto(URL + "?" + query, wait_until="load")
                page.wait_for_timeout(400)
                self.check_page(page, errors)
                self.assertEqual(page.evaluate("() => [__st.binStyle, __st.binSize]"), want)

    def pick(self, page, button, choice):
        page.locator("button.act", has_text=button).first.click()
        page.locator(".stepwrap.open button.chip", has_text=choice).first.click()
        page.wait_for_timeout(250)

    def test_buttons_change_paint_and_bin_without_errors(self):
        _, page, errors = self.new_page_logged()
        page.goto(URL, wait_until="load")
        page.wait_for_timeout(800)
        dot = lambda label: page.evaluate("(l) => [...document.querySelectorAll('button.act')].find(b => b.textContent.startsWith(l)).querySelector('.dot').style.backgroundColor", label)
        before = dot("涂装")
        # the paint picker lists every skin, marks the current one, and repaints at once
        page.locator("button.act", has_text="涂装").first.click()
        chips = page.locator(".stepwrap.open button.chip")
        self.assertEqual(chips.count(), len(self.SKIN_IDS))
        self.assertEqual(page.locator(".stepwrap.open button.chip.current").count(), 1)
        self.assertEqual(page.locator(".stepwrap.open button.chip.current .dot").count(), 1)
        page.locator(".stepwrap.open button.chip", has_text="环卫橙").click()
        page.wait_for_timeout(300)
        self.assertEqual(page.evaluate("() => [__st.skin, GRN.m]"), ["orange", page.evaluate("() => skinOf('orange').GRN.m")])
        self.assertNotEqual(dot("涂装"), before)
        self.assertTrue(page.evaluate("() => document.getElementById('art').innerHTML.includes(GRN.m)"))
        page.screenshot(path=str(SHOTS / "ui-skin-orange.png"))
        page.locator("button.act", has_text="涂装").first.click()
        self.assertEqual(page.locator(".stepwrap.open button.chip.current").inner_text().strip(), "环卫橙")
        page.keyboard.press("Escape")
        page.mouse.click(5, 5)
        # the bin picker: three groups (款式 / 容量 / 分类), the style's own sizes, the current items marked
        page.locator("button.act", has_text="垃圾桶").first.click()
        self.assertEqual(page.locator(".stepwrap.open .chiph").all_inner_texts(), ["款式", "容量", "分类", "颜色"])
        self.assertEqual(page.locator(".stepwrap.open .skp").count(), 1)
        self.assertEqual(page.locator(".stepwrap.open button.chip").count(), 5 + 3 + 4)
        self.assertEqual(page.locator(".stepwrap.open button.chip.current").all_inner_texts(), ["两轮翻盖桶", "240L", "厨余垃圾"])
        self.assertEqual(page.locator(".stepwrap.open button.chip.current .dot").count(), 1)
        page.locator(".stepwrap.open button.chip", has_text="四轮大桶").click()
        page.wait_for_timeout(300)
        self.assertEqual(page.evaluate("() => [__st.binStyle, __st.binSize]"), ["cart4", 660])         # 240 L is not made by this style: the nearest size
        page.locator("button.act", has_text="垃圾桶").first.click()
        self.assertEqual(page.locator(".stepwrap.open button.chip").count(), 5 + 2 + 4)
        self.assertEqual(page.locator(".stepwrap.open button.chip.current").all_inner_texts(), ["四轮大桶", "660L", "厨余垃圾"])
        self.assertEqual(page.locator(".stepwrap.open button.chip", has_text="1100L").count(), 1)
        self.assertEqual(page.locator(".stepwrap.open button.chip", has_text="360L").count(), 0)
        page.locator(".stepwrap.open button.chip", has_text="1100L").click()
        page.wait_for_timeout(300)
        self.pick(page, "垃圾桶", "有害垃圾")
        self.assertEqual(page.evaluate("() => [__st.binStyle, __st.binSize, __st.binType, __st.binFull, __st.lidA]"), ["cart4", 1100, "hazard", 1, 0])
        self.assertIn("四轮大桶 1100L 有害垃圾", page.locator("#stats").inner_text())
        page.wait_for_timeout(700)
        page.screenshot(path=str(SHOTS / "ui-bin-cart4-1100-hazard.png"))
        # the choices (paint and bin) are remembered and a reload shows them
        page.reload(wait_until="load")
        page.wait_for_timeout(600)
        self.assertEqual(page.evaluate("() => [__st.skin, __st.binStyle, __st.binSize, __st.binType, __st.swapT]"), ["orange", "cart4", 1100, "hazard", 0])
        self.assertEqual(errors, [])
        # a hooked bin cannot be swapped: a note says so and nothing changes (not the style either)
        page.goto(URL + "?hook=1&clamp=1&bin=360", wait_until="load")
        page.wait_for_timeout(500)
        self.pick(page, "垃圾桶", "120L")
        self.assertEqual(page.evaluate("() => __st.binSize"), 360)
        self.pick(page, "垃圾桶", "圆形铁桶")
        self.assertEqual(page.evaluate("() => [__st.binStyle, __st.binSize, __st.swapT]"), ["wheelie", 360, 0])
        self.assertIn("倒完放下", page.locator("#toast").inner_text())
        self.assertEqual(errors, [])

    def test_every_style_can_be_picked_from_the_dropdown_with_a_swap_animation_and_a_screenshot(self):
        _, page, errors = self.new_page_logged()
        page.goto(URL + "?yaw=140&pitch=30", wait_until="load")
        page.wait_for_timeout(600)
        names = {"wheelie": "两轮翻盖桶", "cart4": "四轮大桶", "drum": "圆形铁桶", "dome": "圆顶投放桶", "pedal": "脚踏桶"}
        prev = "wheelie"
        for i, (style, name) in enumerate(list(names.items())*2):
            with self.subTest(style=style, round=i//5):
                page.locator("button.act", has_text="垃圾桶").first.click()
                page.locator(".stepwrap.open button.chip", has_text=name).first.click()
                self.assertEqual(page.evaluate("() => __st.binStyle"), style)                     # the state changed at once...
                page.wait_for_timeout(150)
                if style != prev:
                    self.assertGreater(page.evaluate("() => __st.swapT"), 0)                       # ...the picture is still sliding
                page.wait_for_timeout(750)
                self.assertEqual(page.evaluate("() => __st.swapT"), 0)
                self.check_page(page, errors)
                self.assertIn(name, page.locator("#stats").inner_text())
                self.assertTrue(page.evaluate("() => !document.getElementById('art').innerHTML.match(/NaN|undefined/)"))
                if i < 5:
                    page.screenshot(path=str(SHOTS / f"ui-style-{style}.png"))
                prev = style
        # a swap in the middle: both bins are on the picture, no errors
        self.pick(page, "垃圾桶", "有害垃圾")
        page.wait_for_timeout(120)
        mid = page.evaluate("() => [__st.swapT > 0, document.querySelectorAll('#art path').length]")
        self.assertTrue(mid[0])
        page.screenshot(path=str(SHOTS / "ui-swap-mid.png"))
        page.wait_for_timeout(800)
        self.check_page(page, errors)
        self.assertEqual(errors, [])

    def test_a_bin_cannot_be_changed_during_a_working_cycle_and_can_after(self):
        _, page, errors = self.new_page_logged()
        page.goto(URL + "?skin=classic", wait_until="load")
        page.wait_for_timeout(500)
        page.evaluate("() => doStep('hook')")
        page.wait_for_timeout(300)
        self.pick(page, "垃圾桶", "四轮大桶")
        self.assertEqual(page.evaluate("() => [__st.binStyle, __st.binSize]"), ["wheelie", 240])
        page.wait_for_function("() => !__st.busy && !__st.cur", timeout=8000)
        page.evaluate("() => { __st.hook = 0; __st.clamp = 0; }")   # (stand the bin down again by hand)
        self.pick(page, "垃圾桶", "四轮大桶")
        self.assertEqual(page.evaluate("() => [__st.binStyle, __st.binSize]"), ["cart4", 660])
        self.assertEqual(errors, [])

    def test_blocked_storage_and_mobile_layout(self):
        init = "Object.defineProperty(window, 'localStorage', {get() { throw new Error('blocked'); }});"
        _, page, errors = self.new_page_logged(mobile=True, init=init)
        page.goto(URL, wait_until="load")
        page.wait_for_timeout(600)
        self.check_page(page, errors)
        self.pick(page, "涂装", "天空蓝")
        self.assertEqual(page.evaluate("() => __st.skin"), "sky")
        page.locator("button.act", has_text="垃圾桶").first.click()
        self.check_page(page, errors)
        page.screenshot(path=str(SHOTS / "ui-mobile-bin-picker.png"))
        self.assertEqual(errors, [])

    def test_bin_picker_and_label_fit_a_360px_phone(self):
        _, page, errors = self.new_page_logged(mobile=True, size=(360, 740))
        page.goto(URL + "?yaw=140&pitch=30", wait_until="load")
        page.wait_for_timeout(600)
        for style, name in [("dome", "圆顶投放桶"), ("drum", "圆形铁桶"), ("cart4", "四轮大桶")]:
            with self.subTest(style=style):
                page.locator("button.act", has_text="垃圾桶").first.click()
                page.locator(".stepwrap.open button.chip", has_text=name).first.click()
                page.wait_for_timeout(800)
                self.pick(page, "垃圾桶", "有害垃圾")
                page.wait_for_timeout(700)
                page.locator("button.act", has_text="垃圾桶").first.click()
                box = page.evaluate("""() => { const c = document.querySelector('.stepwrap.open .chips').getBoundingClientRect();
                  const out = [...document.querySelectorAll('.stepwrap.open .chips > *')].map(e => e.getBoundingClientRect()).filter(r => r.left < -.5 || r.right > innerWidth + .5);
                  const s = document.getElementById('stats').getBoundingClientRect();
                  return { left: c.left, right: c.right, vw: innerWidth, out: out.length, statsRight: s.right, statsLeft: s.left,
                           scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }; }""")
                self.assertGreaterEqual(box["left"], -.5)
                self.assertLessEqual(box["right"], box["vw"] + .5)
                self.assertEqual(box["out"], 0)
                self.assertLessEqual(box["scroll"], box["client"])
                self.assertGreaterEqual(box["statsLeft"], -.5)
                self.assertLessEqual(box["statsRight"], box["vw"] + .5)
                page.screenshot(path=str(SHOTS / f"ui-mobile360-bin-{style}.png"))
                page.keyboard.press("Escape")
                page.mouse.click(5, 5)
        self.assertIn("有害垃圾", page.locator("#stats").inner_text())
        self.check_page(page, errors)
        self.assertEqual(errors, [])

    # ---- the bin's own colour (垃圾桶调色) ----
    COUNT_WRITES = "(() => { const set = Storage.prototype.setItem; window.__writes = []; Storage.prototype.setItem = function(k, v) { window.__writes.push(k); return set.call(this, k, v); }; })();"

    def bin_svg_has(self, page, hex_):
        return page.evaluate("(c) => document.getElementById('art').innerHTML.toLowerCase().includes(c)", hex_)

    def test_bin_colour_picker_drag_follow_type_hooked_and_screenshot(self):
        _, page, errors = self.new_page_logged(init=self.COUNT_WRITES)
        page.goto(URL + "?yaw=140&pitch=30&binType=recycle", wait_until="load")
        page.wait_for_timeout(600)
        type_mid = page.evaluate("() => binTypeOf('recycle').mat.m")
        self.assertTrue(self.bin_svg_has(page, type_mid))
        page.locator("button.act", has_text="垃圾桶").first.click()
        panel = page.locator(".stepwrap.open .skp")
        self.assertEqual(panel.count(), 1)
        modes = panel.locator(".tabs .skt")
        self.assertEqual(modes.all_inner_texts(), ["跟随分类", "自定义"])
        self.assertEqual([modes.nth(0).get_attribute("aria-pressed"), modes.nth(1).get_attribute("aria-pressed")], ["true", "false"])
        self.assertEqual(panel.locator("input").input_value(), type_mid)         # the picker starts from the type colour
        writes0 = page.evaluate("() => window.__writes.length")
        # drag in the saturation / value square: the colour changes live, storage is written on release only
        box = panel.locator(".sv").bounding_box()
        page.mouse.move(box["x"] + box["width"]*.2, box["y"] + box["height"]*.3); page.mouse.down()
        page.mouse.move(box["x"] + box["width"]*.6, box["y"] + box["height"]*.5, steps=6)
        page.mouse.move(box["x"] + box["width"]*.9, box["y"] + box["height"]*.2, steps=6)
        self.assertEqual(page.evaluate("() => window.__writes.length"), writes0)
        live = page.evaluate("() => __st.binColor")
        self.assertRegex(live, r"^#[0-9a-f]{6}$")
        page.mouse.up(); page.wait_for_timeout(150)
        self.assertEqual(page.evaluate("() => window.__writes.length"), writes0 + 1)
        self.assertEqual(page.evaluate("() => __st.binColor"), live)
        self.assertEqual([modes.nth(0).get_attribute("aria-pressed"), modes.nth(1).get_attribute("aria-pressed")], ["false", "true"])
        self.assertEqual(page.locator(".stepwrap.open").count(), 1, "the dropdown stays open while painting")
        tones = page.evaluate("(c) => binTones(c)", live)
        self.assertTrue(self.bin_svg_has(page, tones["m"]))
        self.assertFalse(self.bin_svg_has(page, type_mid))
        self.assertEqual(page.evaluate("() => [GRN.m, ORG.m, CABW.m]"), ["#5fa43c", "#df842b", "#e4e4dd"])   # the truck is untouched
        dot = page.evaluate("() => [...document.querySelectorAll('button.act')].find(b => b.textContent.startsWith('垃圾桶')).querySelector('.dot').style.backgroundColor")
        self.assertEqual(dot, page.evaluate("(c) => { const e = document.createElement('i'); e.style.backgroundColor = c; return e.style.backgroundColor; }", live))
        # type a colour
        panel.locator("input").fill("#ff8800"); page.wait_for_timeout(100)
        self.assertEqual(page.evaluate("() => __st.binColor"), "#ff8800")
        panel.locator("input").press("Enter"); page.wait_for_timeout(100)
        page.screenshot(path=str(SHOTS / "bin-custom-colour-picker.png"))
        page.mouse.click(5, 5)
        page.screenshot(path=str(SHOTS / "bin-custom-colour.png"), clip={"x": 380, "y": 380, "width": 340, "height": 260})
        # another waste type keeps the custom colour; the marking stays
        self.pick(page, "垃圾桶", "有害垃圾")
        self.assertEqual(page.evaluate("() => [__st.binType, __st.binColor]"), ["hazard", "#ff8800"])
        self.assertTrue(self.bin_svg_has(page, "#f3c21e"))
        page.wait_for_timeout(700)
        # follow the type again
        page.locator("button.act", has_text="垃圾桶").first.click()
        self.assertEqual(page.locator(".stepwrap.open .skp .tabs .skt").nth(1).get_attribute("aria-pressed"), "true")
        page.locator(".stepwrap.open .skp .tabs .skt", has_text="跟随分类").click(); page.wait_for_timeout(150)
        self.assertEqual(page.evaluate("() => __st.binColor"), None)
        self.assertTrue(self.bin_svg_has(page, page.evaluate("() => binTypeOf('hazard').mat.m")))
        self.assertEqual(page.locator(".stepwrap.open .skp .tabs .skt").nth(0).get_attribute("aria-pressed"), "true")
        # a reload keeps a colour chosen earlier
        page.locator(".stepwrap.open .skp .tabs .skt", has_text="自定义").click(); page.wait_for_timeout(100)
        page.locator(".stepwrap.open .skp input").fill("#12ab9c"); page.locator(".stepwrap.open .skp input").press("Enter"); page.wait_for_timeout(100)
        page.goto(URL, wait_until="load"); page.wait_for_timeout(500)
        self.assertEqual(page.evaluate("() => __st.binColor"), "#12ab9c")
        self.check_page(page, errors)
        self.assertEqual(errors, [])

    def test_bin_can_be_recoloured_while_hooked_and_while_working(self):
        _, page, errors = self.new_page_logged()
        page.goto(URL + "?yaw=140&pitch=30&hook=1&clamp=1&lift=1&tip=.6&lidA=.9&pour=.4&hop=.3&binFull=.6&binStyle=dome", wait_until="load")
        page.wait_for_timeout(500)
        page.locator("button.act", has_text="垃圾桶").first.click()
        page.locator(".stepwrap.open .skp input").fill("#c026d3"); page.wait_for_timeout(200)
        self.assertEqual(page.evaluate("() => [__st.binColor, __st.binStyle, __st.hook, __st.swapT]"), ["#c026d3", "dome", 1, 0])
        self.assertTrue(any(self.bin_svg_has(page, c) for c in page.evaluate("() => Object.values(binTones('#c026d3'))")))
        self.assertNotIn("倒完放下", page.locator("#toast").inner_text())
        page.screenshot(path=str(SHOTS / "bin-custom-colour-hooked.png"))
        # style / size / type are still refused there
        page.keyboard.press("Escape"); page.mouse.click(5, 5)
        self.pick(page, "垃圾桶", "有害垃圾")
        self.assertEqual(page.evaluate("() => __st.binType"), "kitchen")
        self.assertIn("倒完放下", page.locator("#toast").inner_text())
        # and while the cycle runs
        _, page2, errors2 = self.new_page_logged()
        page2.goto(URL, wait_until="load"); page2.wait_for_timeout(400)
        page2.evaluate("() => doStep('hook')"); page2.wait_for_timeout(300)
        self.assertTrue(page2.evaluate("() => __st.busy"))
        page2.locator("button.act", has_text="垃圾桶").first.click()
        page2.locator(".stepwrap.open .skp .tabs .skt", has_text="自定义").click()
        page2.locator(".stepwrap.open .skp input").fill("#2288ee"); page2.wait_for_timeout(150)
        self.assertEqual(page2.evaluate("() => __st.binColor"), "#2288ee")
        page2.wait_for_function("() => !__st.busy && !__st.cur", timeout=8000)
        self.check_page(page2, errors2); self.assertEqual(errors, []); self.assertEqual(errors2, [])

    def test_bin_colour_url_parameter_and_garbage_storage(self):
        for query, want in [("binColor=ff8800", "#ff8800"), ("binColor=%23FF8800", "#ff8800"), ("binColor=zzz", None), ("binColor=f80", None), ("binColor=", None)]:
            with self.subTest(query=query):
                _, page, errors = self.new_page_logged()
                page.goto(URL + "?" + query, wait_until="load"); page.wait_for_timeout(400)
                self.check_page(page, errors)
                self.assertEqual(page.evaluate("() => __st.binColor"), want)
        for junk in ["{", "7", '{"binStyle":"x","binSize":"y","binColor":"blue"}']:
            with self.subTest(junk=junk):
                _, page, errors = self.new_page_logged(init=f"localStorage.setItem('garbage-truck.bin', {json.dumps(junk)});")
                page.goto(URL, wait_until="load"); page.wait_for_timeout(400)
                self.check_page(page, errors)
                self.assertEqual(page.evaluate("() => [__st.binStyle, __st.binSize, __st.binType, __st.binColor]"), ["wheelie", 240, "kitchen", None])
        _, page, errors = self.new_page_logged(init="Object.defineProperty(window, 'localStorage', {get() { throw new Error('blocked'); }});")
        page.goto(URL + "?binColor=ff8800", wait_until="load"); page.wait_for_timeout(400)
        page.locator("button.act", has_text="垃圾桶").first.click()
        page.locator(".stepwrap.open .skp input").fill("#00aa55"); page.wait_for_timeout(100)
        self.assertEqual(page.evaluate("() => __st.binColor"), "#00aa55")
        self.check_page(page, errors); self.assertEqual(errors, [])

    def test_bin_colour_picker_fits_a_360px_phone(self):
        _, page, errors = self.new_page_logged(mobile=True, size=(360, 740))
        page.goto(URL + "?yaw=140&pitch=30", wait_until="load"); page.wait_for_timeout(500)
        page.locator("button.act", has_text="垃圾桶").first.click()
        page.locator(".stepwrap.open .skp .tabs .skt", has_text="自定义").tap()
        r = page.evaluate("""() => { const p = document.querySelector('.stepwrap.open .skp').getBoundingClientRect(), c = document.querySelector('.stepwrap.open .chips').getBoundingClientRect();
          return { pl: p.left, pr: p.right, cl: c.left, cr: c.right, vw: innerWidth, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }; }""")
        self.assertGreaterEqual(r["pl"], 0); self.assertLessEqual(r["pr"], r["vw"]); self.assertGreaterEqual(r["cl"], 0); self.assertLessEqual(r["cr"], r["vw"])
        self.assertLessEqual(r["sw"], r["cw"])
        box = page.locator(".stepwrap.open .skp .sv").bounding_box()
        page.touchscreen.tap(box["x"] + box["width"]*.7, box["y"] + box["height"]*.4); page.wait_for_timeout(150)
        self.assertEqual(page.evaluate("() => /^#[0-9a-f]{6}$/.test(__st.binColor)"), True)
        page.screenshot(path=str(SHOTS / "ui-mobile360-bin-colour.png"))
        self.check_page(page, errors); self.assertEqual(errors, [])

    # ---- 无极调色板: the custom paint picker inside the 涂装 dropdown ----
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
        return page.evaluate("() => ({skin: __st.skin, paint: {...__st.paint}, grn: [GRN.l, GRN.m, GRN.d], cab: CABW.m, lift: ORG.m, rfl: RFL})")

    def test_custom_picker_drag_hex_and_dropdown_stays_open(self):
        _, page, errors = self.new_page_logged()
        page.goto(URL, wait_until="load")
        page.wait_for_timeout(700)
        classic = self.paint_state(page)
        self.assertEqual(classic["skin"], "classic")
        # the presets stay on top (a heading, then one chip each) and the custom section sits below them
        page.locator("button.act", has_text="涂装").first.click()
        self.assertEqual(page.locator(".stepwrap.open button.chip").count(), len(self.SKIN_IDS))
        self.assertEqual(page.locator(".stepwrap.open .chiph").first.inner_text(), "预设")
        self.assertEqual(page.locator(".stepwrap.open .skp button.skt").all_inner_texts(), ["箱体", "驾驶室", "上料机构"])
        self.assertEqual(page.locator(".stepwrap.open .skp button.skt[aria-pressed=true]").inner_text(), "箱体")
        self.assertEqual(page.locator(".stepwrap.open .skp input").input_value(), classic["paint"]["body"])
        # the dropdown is built once: mark its first chip and the panel, drag, and check they are the same elements
        page.evaluate("() => { window.__mark = [document.querySelector('.chips .chip'), document.querySelector('.skp')]; window.__writes = 0; const o = Storage.prototype.setItem; Storage.prototype.setItem = function(k, v){ window.__writes++; return o.call(this, k, v); }; }")
        sv = ".stepwrap.open .skp .sv"
        box = page.locator(sv).bounding_box()
        page.mouse.move(box["x"] + box["width"]*.5, box["y"] + box["height"]*.5); page.mouse.down()
        page.mouse.move(box["x"] + box["width"]*.8, box["y"] + box["height"]*.2, steps=6)
        page.wait_for_timeout(150)
        # mid-drag: the truck is already repainted, the dropdown is open and nothing was written to storage yet
        mid = self.paint_state(page)
        self.assertEqual(mid["skin"], "custom")
        self.assertNotEqual(mid["grn"], classic["grn"])
        self.assertEqual(mid["cab"], classic["cab"])
        self.assertEqual(page.locator(".stepwrap.open").count(), 1)
        self.assertEqual(page.evaluate("() => window.__writes"), 0)
        self.assertTrue(page.evaluate("() => { const a = document.getElementById('art').innerHTML; return [GRN.l, GRN.m, GRN.d].some(c => a.includes(c)); }"))
        # let go far outside the square (on the figure): still no click-away close, one write on release
        page.mouse.move(box["x"] + 10, box["y"] + 700, steps=3)
        page.mouse.up(); page.wait_for_timeout(150)
        self.assertEqual(page.locator(".stepwrap.open").count(), 1)
        self.assertEqual(page.evaluate("() => window.__writes"), 1)
        self.assertTrue(page.evaluate("() => window.__mark[0].isConnected && window.__mark[1].isConnected && window.__mark[1] === document.querySelector('.skp')"))
        # the saturation/value square: the colour follows the pointer (top right corner = full saturation, full value of the current hue)
        self.drag_in(page, sv, (.1, .9), (.9, .1))
        after_sv = self.paint_state(page)
        self.assertNotEqual(after_sv["paint"]["body"], mid["paint"]["body"])
        self.assertEqual(page.locator(".stepwrap.open .skp input").input_value(), after_sv["paint"]["body"])
        # the hue bar: a different hue, same saturation / value
        h0 = page.evaluate("(c) => hexHsv(c).h", after_sv["paint"]["body"])
        self.drag_in(page, ".stepwrap.open .skp .hue", (.05, .5), (.55, .5))
        after_hue = self.paint_state(page)
        h1 = page.evaluate("(c) => hexHsv(c).h", after_hue["paint"]["body"])
        self.assertGreater(abs(h1 - h0), 60)
        self.assertAlmostEqual(h1, 198, delta=8)
        self.assertEqual(page.locator(".stepwrap.open").count(), 1)
        # the button's dot follows the box colour, and its zone tab shows it too
        dot = lambda: page.evaluate("() => [...document.querySelectorAll('button.act')].find(b => b.textContent.startsWith('涂装')).querySelector('.dot').style.backgroundColor")
        rgb = lambda hx: f"rgb({int(hx[1:3], 16)}, {int(hx[3:5], 16)}, {int(hx[5:7], 16)})"
        self.assertEqual(dot(), rgb(after_hue["paint"]["body"]))
        self.assertEqual(page.evaluate("() => document.querySelector('.skp .skt .dot').style.backgroundColor"), rgb(after_hue["paint"]["body"]))
        # the cab tab: its own colour, the box keeps its own
        page.locator(".stepwrap.open .skp button.skt", has_text="驾驶室").click()
        self.assertEqual(page.locator(".stepwrap.open .skp input").input_value(), classic["paint"]["cab"])
        self.drag_in(page, sv, (.5, .5), (.2, .3))
        page.locator(".stepwrap.open .skp button.skt", has_text="上料机构").click()
        self.drag_in(page, sv, (.5, .5), (.7, .4))
        zones = self.paint_state(page)
        self.assertEqual(zones["paint"]["body"], after_hue["paint"]["body"])
        self.assertNotEqual(zones["paint"]["cab"], classic["paint"]["cab"])
        self.assertNotEqual(zones["paint"]["lift"], classic["paint"]["lift"])
        self.assertEqual(zones["grn"], after_hue["grn"])
        self.assertEqual(zones["rfl"], "#e8463a")
        self.check_page(page, errors)
        # HEX: #rgb / #rrggbb apply live, junk only marks the box and is put right on leaving it
        page.locator(".stepwrap.open .skp button.skt", has_text="箱体").click()
        inp = page.locator(".stepwrap.open .skp input")
        inp.fill("#ff00aa")
        self.assertEqual(self.paint_state(page)["paint"]["body"], "#ff00aa")
        inp.fill("#0af")
        self.assertEqual(self.paint_state(page)["paint"]["body"], "#00aaff")
        for junk in ("zzz", "#12", "#12345", "#gg0000", "rgb(1,2,3)"):
            inp.fill(junk)
            self.assertEqual(self.paint_state(page)["paint"]["body"], "#00aaff", junk)
            self.assertTrue(inp.evaluate("e => e.classList.contains('bad')"), junk)
        inp.press("Enter")
        self.assertEqual(inp.input_value(), "#00aaff")
        self.assertFalse(inp.evaluate("e => e.classList.contains('bad')"))
        inp.fill("FF8800"); inp.press("Enter")
        self.assertEqual(self.paint_state(page)["paint"]["body"], "#ff8800")
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
        # choosing a preset afterwards puts the picker back on that preset's colours (and ?skin / stored still work)
        self.pick(page, "涂装", "天空蓝")
        sky = page.evaluate("() => ({skin: __st.skin, paint: {...__st.paint}, want: paintOf('sky')})")
        self.assertEqual(sky["skin"], "sky")
        self.assertEqual(sky["paint"], sky["want"])
        page.locator("button.act", has_text="涂装").first.click()
        self.assertEqual(page.locator(".stepwrap.open .skp input").input_value(), sky["want"]["body"])
        self.assertEqual(page.locator(".stepwrap.open .skp button.skt[aria-pressed=true]").inner_text(), "箱体")
        self.assertEqual(page.locator(".stepwrap.open button.chip.current").inner_text().strip(), "天空蓝")
        self.drag_in(page, sv, (.3, .3), (.6, .4))
        self.assertEqual(page.evaluate("() => [__st.skin, __st.paint.cab === paintOf('sky').cab]"), ["custom", True])
        self.assertEqual(page.locator(".stepwrap.open button.chip.current").count(), 0)     # a custom paint is no preset
        self.assertEqual(errors, [])

    def test_custom_paint_url_parameters(self):
        cases = [
            ("body=ff8800", "custom", {"body": "#ff8800", "cab": "#e4e4dd", "lift": "#df842b"}),
            ("body=%23ff8800&cab=%2333aaff&lift=123456", "custom", {"body": "#ff8800", "cab": "#33aaff", "lift": "#123456"}),
            ("cab=%2333AAFF", "custom", {"body": "#5fa43c", "cab": "#33aaff", "lift": "#df842b"}),
            ("skin=orange&lift=2244aa", "custom", {"body": "#ef8a2c", "cab": "#e4e4dd", "lift": "#2244aa"}),
            ("body=zzzzzz&cab=12&lift=1234567&skin=sky", "sky", None),     # nothing valid: the preset alone
            ("body=ff00&cab=%23", "classic", None),
            ("cab=#33aaff", "classic", None),                    # a raw '#' starts the URL fragment: not a parameter
            ("skin=forest&body=nope&cab=ffffff", "custom", {"body": "#2f6f4d", "cab": "#ffffff", "lift": "#e9b43a"}),
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
        _, page, errors = self.new_page_logged()
        page.goto(URL + "?body=ff8800&lift=1&yaw=135", wait_until="load")      # ?lift=1 is still the mechanism, not a colour
        page.wait_for_timeout(500)
        self.assertEqual(page.evaluate("() => [__st.skin, __st.lift, __st.paint.lift]"), ["custom", 1, "#df842b"])
        self.check_page(page, errors)
        # ?lift=RRGGBB is a colour, not lift = 1
        page.goto(URL + "?lift=ff8800", wait_until="load")
        page.wait_for_timeout(400)
        self.assertEqual(page.evaluate("() => [__st.skin, __st.lift, __st.paint.lift]"), ["custom", 0, "#ff8800"])
        for name, query in (("custom-pink-cab-blue", "body=e8348c&cab=bfe3ff&lift=2b2f36&yaw=135"), ("custom-white-black", "body=ffffff&cab=111111&lift=000000&yaw=135"),
                            ("custom-purple-lime", "body=7b3fe4&cab=f0f0e0&lift=a8e63c&yaw=40")):
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
        self.assertNotEqual(after["paint"]["body"], before["paint"]["body"])
        self.assertEqual(page.locator(".stepwrap.open").count(), 1)
        self.touch_drag(page, ".stepwrap.open .skp .hue", (.1, .5), (.7, .5))
        self.assertNotEqual(self.paint_state(page)["paint"]["body"], after["paint"]["body"])
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
        self.assertEqual(self.paint_state(page)["paint"]["body"], "#336699")
        self.check_page(page, errors)
        self.assertEqual(errors, [])

    def test_garbage_in_storage_is_ignored_and_old_values_still_work(self):
        for stored, skin in (("not json {", "classic"), ('{"skin":"custom","paint":{"body":"zz","cab":5,"lift":null}}', "custom"), ('{"skin":"nope"}', "classic"),
                             ('"sky"', "classic"), ("null", "classic"), ("[1,2]", "classic"), ('{"skin":"custom","paint":"x"}', "custom"), ('{"skin":"orange"}', "orange")):
            with self.subTest(stored=stored):
                _, page, errors = self.new_page_logged(init=f"localStorage.setItem('garbage-truck.paint', {json.dumps(stored)});")
                page.goto(URL, wait_until="load")
                page.wait_for_timeout(400)
                self.check_page(page, errors)
                got = self.paint_state(page)
                self.assertEqual(got["skin"], skin)
                self.assertTrue(all(re.fullmatch(r"#[0-9a-f]{6}", v) for v in got["paint"].values()))
        # the first version kept just the preset id under another key
        _, page, errors = self.new_page_logged(init="localStorage.setItem('garbage-truck.skin', 'forest');")
        page.goto(URL, wait_until="load")
        page.wait_for_timeout(400)
        self.assertEqual(self.paint_state(page)["skin"], "forest")
        self.check_page(page, errors)


if __name__ == "__main__":
    unittest.main(verbosity=2)
