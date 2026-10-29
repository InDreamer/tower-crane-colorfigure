from pathlib import Path

root = Path(__file__).resolve().parent
# phone (width <= 560): a taller frame (FIG_A), labels as numbered badges (LBL_U = drawing units per screen px; 0 on a desktop) with a name list under the figure (src/i_ui.js)
HEAD = '<style>@media (max-width:560px){body > header{display:none}.stat .v{font-size:20px!important}.stats{align-items:flex-end}}</style><script>window.FIG_A = () => innerWidth <= 560 ? 1.1 : .75;window.LBL_U = () => { if (innerWidth > 560) return 0; const s = document.getElementById("fig"); return s && s.clientWidth && s.viewBox.baseVal.width ? s.viewBox.baseVal.width / s.clientWidth : 0; };</script>'
js = ''.join(f.read_text(encoding='utf-8') for f in sorted((root / 'src').glob('*.js')))
(root / 'crane.html').write_text('''<!doctype html>
<html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>塔式起重机 · 结构拆解图</title>''' + HEAD + '''</head><body>
<script>
''' + (root / 'core.js').read_text(encoding='utf-8') + '''
</script>
<script>
''' + js + '''</script></body></html>
''', encoding='utf-8')
