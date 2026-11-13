# Run Plan: source

The app is one file, `index.html` in the repo root, built from the files in `src/`.

Build: `python3 build.py` writes `dist/index.html` (plus manifest and icons). Copy `dist/index.html` to the repo root to publish it.

- `src/engine.js`: plan generator, paces, readiness, nutrition, Garmin matching, FIT export
- `src/store.js`: GitHub storage and Garmin data loading
- `src/coach.js`: rule-based coach
- `src/ui.js`: all screens and the onboarding wizard
- `src/style.css`, `src/shell.html`: look and page shell
- `test/`: engine tests and an end-to-end browser flow (Playwright, mocked GitHub and Garmin)

User data is not stored here. It lives in the private `run-plan-data` repository.
