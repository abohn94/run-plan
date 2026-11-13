import os, json
d = os.path.dirname(os.path.abspath(__file__))
src = lambda f: open(os.path.join(d, 'src', f)).read()
engine = src('engine.js').replace('/*LIFTS*/', src('_lifts_body.js')).replace('/*FIT*/', src('_fit.js'))
os.makedirs(os.path.join(d, 'dist'), exist_ok=True)
open(os.path.join(d, 'dist', 'engine.built.js'), 'w').write(engine)
html = src('shell.html')
for k, v in (('/*CSS*/', src('style.css')), ('/*ENGINE*/', engine), ('/*STORE*/', src('store.js')), ('/*COACH*/', src('coach.js')), ('/*UI*/', src('ui.js'))):
    assert k in html, k
    html = html.replace(k, v)
open(os.path.join(d, 'dist', 'index.html'), 'w').write(html)
icon = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#071013"/><rect x="24" y="24" width="464" height="464" rx="92" fill="none" stroke="#1c2c31" stroke-width="8"/><path d="M60 330 L170 330 L200 330 L222 230 L250 400 L276 300 L300 330 L452 330" fill="none" stroke="#2dd4bf" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/><circle cx="330" cy="140" r="34" fill="#2dd4bf"/></svg>'''
open(os.path.join(d, 'dist', 'icon.svg'), 'w').write(icon)
man = {"name": "Run Plan", "short_name": "Run Plan", "start_url": "./#/today", "scope": "./", "display": "standalone", "background_color": "#071013", "theme_color": "#071013",
       "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png"}, {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"}, {"src": "icon.svg", "sizes": "any", "type": "image/svg+xml"}]}
open(os.path.join(d, 'dist', 'manifest.webmanifest'), 'w').write(json.dumps(man, indent=1))
open(os.path.join(d, 'dist', '.nojekyll'), 'w').write('')
print('built', len(html))
