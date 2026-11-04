---
name: verify-zanzibar
description: "Drive the Zanzibar island site like a user and prove behavior with pixels and signal checks. Use on every changed build."
---

# Verify Zanzibar

Launch: `python3 -m http.server 4187 --bind 127.0.0.1` from the repo root (no build step). Ready when `/` answers and `#status` detaches after boot. Kill the server you started; keep `artifacts/verification/`.

Doctor: `npm run check` (syntax) then `node scripts/verify.mjs` with `CHROME_BIN` set. Wrong title or a page error fails the run before any driving.

Drive: real pointer at 390x844 and 1365x900. Chapter buttons `[data-chapter]`, `#encounter`, `#pause`, `#sound`, `#about`; canvas drag rotates, nav-strip swipe changes chapter, arrow keys on the focused canvas look around. Env: QUICK=1 (entry view per chapter, not quadrants), WIDTH, CHAPTER, ZANZIBAR_URL (drive a deployed URL), EVIDENCE_DIR.

Evidence: screenshots per scene/quadrant/encounter plus `proof.json` with the exact URL and log. Pixels settle judgments; DOM state alone does not. QUICK runs are entry-view passes - never report them as full quadrant sweeps.

Cleanup: the script kills its own server and closes the browser. Evidence survives in `artifacts/verification/`.

Helpers: `scripts/verify.mjs` is the whole harness; invocation above.

Music: the harness checks opt-in start, signal rms/peak (no clipping) and mute fade via the `window.__musicStats` probe. That is a signal check, not a perceptual listening judgment - no tooling here establishes musical quality.
