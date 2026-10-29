import sys, json, os
from playwright.sync_api import sync_playwright
# usage: pw.py query [actions json] [w h]; actions: ["wait",ms] ["click",text] ["chip",text] ["shot",name] ["eval",js] ["tap",x,y]
q = sys.argv[1]; acts = json.loads(sys.argv[2]) if len(sys.argv) > 2 else [["wait", 500], ["shot", "pw"]]
W = int(sys.argv[3]) if len(sys.argv) > 3 else 1400; H = int(sys.argv[4]) if len(sys.argv) > 4 else 1050
with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': W, 'height': H}, device_scale_factor=float(os.environ.get('DPR', '1.5')))
    pg.on('console', lambda m: print('CONSOLE', m.text))
    pg.on('pageerror', lambda e: print('PAGEERROR', e))
    pg.goto('file://' + os.getcwd() + '/' + os.environ.get('OUT', 'crane.html') + '?free=1&' + q)
    pg.wait_for_timeout(400)
    for a in acts:
        if a[0] == 'wait': pg.wait_for_timeout(a[1])
        elif a[0] == 'click': pg.locator('button.act', has_text=a[1]).first.click()
        elif a[0] == 'chip': pg.locator('button.chip', has_text=a[1]).first.click()
        elif a[0] == 'shot': pg.screenshot(path='shots/' + a[1] + '.png')
        elif a[0] == 'eval': print('EVAL', pg.evaluate(a[1]))
        elif a[0] == 'tap': pg.mouse.click(a[1], a[2])
    print('ERR', pg.evaluate('document.documentElement.dataset.errors'))
    b.close()
