from pathlib import Path

root = Path(__file__).resolve().parent
js = ''.join(f.read_text(encoding='utf-8') for f in sorted((root / 'src').glob('*.js')))
(root / 'truck.html').write_text('''<!doctype html>
<html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>压缩式垃圾车 · 结构拆解图</title></head><body>
<script>
''' + (root / 'core.js').read_text(encoding='utf-8') + '''
</script>
<script>
''' + js + '''</script></body></html>
''', encoding='utf-8')
