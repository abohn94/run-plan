import os, json
d = os.path.dirname(os.path.abspath(__file__))
src = lambda f: open(os.path.join(d, 'src', f)).read()
engine = src('engine.js').replace('/*LIFTS*/', src('_lifts_body.js')).replace('/*FIT*/', src('_fit.js'))
os.makedirs(os.path.join(d, 'dist'), exist_ok=True)
open(os.path.join(d, 'dist', 'engine.built.js'), 'w').write(engine)
html = src('shell.html')
for k, v in (('/*CSS*/', src('style.css')), ('/*ENGINE*/', engine), ('/*STORE*/', src('store.js')), ('/*COACH*/', src('coach.js')), ('/*UI*/', src('ui.js').replace('/*FEATURES*/', src('features.js')).replace('/*FEATURES2*/', src('features2.js')).replace('/*FEATURES3*/', src('features3.js')).replace('/*FEATURES4*/', src('features4.js')).replace('/*FEATURES5*/', src('features5.js') + '\n' + src('features6.js') + '\n' + src('features7.js') + '\n' + src('features8.js') + '\n' + src('features9.js') + '\n' + src('features10.js') + '\n' + src('features11.js') + '\n' + src('features12.js') + '\n' + src('features13.js') + '\n' + src('features14.js') + '\n' + src('features15.js') + '\n' + src('features16.js') + '\n' + src('features17.js') + '\n' + src('features18.js') + '\n' + src('features19.js') + '\n' + src('features20.js')))):
    assert k in html, k
    html = html.replace(k, v)
open(os.path.join(d, 'dist', 'index.html'), 'w').write(html)
man = {"name": "Personal Run", "short_name": "Personal Run", "start_url": "./#/today", "scope": "./", "display": "standalone", "background_color": "#071013", "theme_color": "#071013",
       "shortcuts": [{"name": "Today", "short_name": "Today", "url": "./#/today"}, {"name": "Start today's workout", "short_name": "Workout", "url": "./#/workout"}, {"name": "This week", "short_name": "This Week", "url": "./#/plan"}, {"name": "Season", "short_name": "Season", "url": "./#/calendar"}],
       "icons": [{"src": "pr-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"}, {"src": "pr-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"}, {"src": "pr-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}, {"src": "pr-icon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any"}]}
open(os.path.join(d, 'dist', 'manifest.webmanifest'), 'w').write(json.dumps(man, indent=1))
open(os.path.join(os.path.dirname(d), 'manifest.webmanifest'), 'w').write(json.dumps(man, indent=1))
open(os.path.join(d, 'dist', '.nojekyll'), 'w').write('')
print('built', len(html))
