"""Record raw render/layout costs and animation cadence using local Playwright."""

import argparse
import json
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parent
RENDER_PROBE = """() => {
    const samples = [], ordering = [];
    const originalOrder = orderParts;
    let lastOrder = 0;
    orderParts = parts => {
        const start = performance.now();
        const result = originalOrder(parts);
        lastOrder = performance.now() - start;
        return result;
    };
    try {
        for (let i = 0; i < 35; i++) {
            setCam(45 + i * 2, PITCH0);
            const start = performance.now();
            window.__ui.render();
            document.getElementById('art').getBBox();
            if (i >= 5) {
                samples.push(performance.now() - start);
                ordering.push(lastOrder);
            }
        }
    } finally {
        orderParts = originalOrder;
        setCam(YAW0, PITCH0);
        window.__ui.render();
    }
    return {render_and_svg_layout_ms: samples, ordering_ms: ordering};
}"""
FRAME_PROBE = """() => new Promise(resolve => {
    const intervals = [];
    let last = null;
    document.getElementById('vspin').click();
    const sample = now => {
        if (last !== null) intervals.push(now - last);
        last = now;
        if (intervals.length < 90) {
            requestAnimationFrame(sample);
        } else {
            document.getElementById('vspin').click();
            resolve(intervals);
        }
    };
    requestAnimationFrame(sample);
})"""


def local_only(route):
    parsed = urlsplit(route.request.url)
    if parsed.scheme in ("file", "data", "blob") or parsed.hostname in (
        "127.0.0.1", "localhost", "::1"
    ):
        route.continue_()
    else:
        route.abort()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default=(ROOT / "crane.html").as_uri())
    parser.add_argument("--output", type=Path, default=ROOT / "shots/performance.json")
    args = parser.parse_args()
    result = {
        "url": args.url,
        "method": "5 warmups; 30 synchronous renders with forced SVG layout; "
                  "90 requestAnimationFrame intervals during the built-in turntable. "
                  "Headless cadence is not a real-device FPS guarantee.",
        "views": {},
    }
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            args=["--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1"]
        )
        result["browser_version"] = browser.version
        try:
            for name, width, height in (("desktop", 1440, 1000), ("mobile", 390, 844)):
                context = browser.new_context(
                    viewport={"width": width, "height": height}, device_scale_factor=1
                )
                context.route("**/*", local_only)
                page = context.new_page()
                errors = []
                page.on("pageerror", lambda error: errors.append(str(error)))
                page.goto(args.url, wait_until="load")
                page.wait_for_timeout(1500)
                view = {
                    "viewport": {"width": width, "height": height},
                    "device_scale_factor": 1,
                    "errors": errors,
                }
                view.update(page.evaluate(RENDER_PROBE))
                view["turntable_frame_intervals_ms"] = page.evaluate(FRAME_PROBE)
                result["views"][name] = view
                context.close()
        finally:
            browser.close()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(args.output.resolve())


if __name__ == "__main__":
    main()
