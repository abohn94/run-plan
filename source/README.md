# Run Plan: source

The app is one file, `index.html` in the repo root, built from the files in `src/`.

Build: `python3 build.py` writes `dist/index.html` (plus manifest and icons). Copy `dist/index.html` to the repo root to publish it.

- `src/engine.js`: plan generator, paces, readiness, nutrition, Garmin matching, FIT export
- `src/store.js`: GitHub storage and Garmin data loading
- `src/coach.js`: rule-based coach
- `src/ui.js`: all screens and the onboarding wizard
- `src/features.js`: lift logger (sets, rest timer, 1RM), shoes, calendar, activity pages, progress tabs, health trends, VO2 max & threshold (inlined into ui.js at the FEATURES marker)
- `src/features2.js`: watch self-evaluation (feel + effort), lift volume and progressive overload, exact fueling from Garmin weight and calories, honest consistency check, drag-and-drop week editor (FEATURES2 marker)
- `src/style.css`, `src/shell.html`: look and page shell
- `test/`: engine tests (`node test/engine.test.js`), the onboarding flow (`test/flow.js`) and the features walkthroughs (`node test/features.js` / `test/features2.js state.json data.json shots/`, `REAL=1` to use the Garmin file unmodified), all with mocked GitHub and Garmin

User data is not stored here. It lives in the private `run-plan-data` repository.
