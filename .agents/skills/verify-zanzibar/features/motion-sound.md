# Motion and music

## Sub-features
Pause/resume ambient motion; reduced-motion starts paused with a still canvas; opt-in music with per-chapter palettes; easy mute with a fade.

## How to get to it (user POV)
The pause and note orbs, top right. Music never starts by itself.

## Driving it with Playwright
`#pause` toggles `aria-pressed`. Reduced-motion emulation: canvas pixels identical over 700ms. Music: toggle `#sound`, wait ~2.6s, read `window.__musicStats()` - expect rms > 0.005 and peak < 0.99; mute and confirm the fade.

## Gotchas
`__musicStats` is verification scaffolding, a signal check only - it cannot judge musical quality. Clouds, dhows, terns and butterflies all ride the pausable clock; anything on raw `dt` fails the reduced-motion check.
