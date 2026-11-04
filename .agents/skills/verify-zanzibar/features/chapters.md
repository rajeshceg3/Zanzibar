# Chapters

## Sub-features
Four chapters (lagoon, Stone Town, grove, night tide), each with title, line, invitation and its own camera, sky, fog, ink and veil.

## How to get to it (user POV)
Tap a chapter button, swipe the nav strip horizontally, or use arrow keys on the focused nav.

## Driving it with Playwright
Click `[data-chapter="n"]`, wait ~1.4s for the camera/sky lerp, screenshot. Full pass: four pointer-drag quadrants per chapter at both widths.

## Gotchas
Chapter changes preserve azimuth unless the chapter defines its entry view. Night is chapter 3: check text ink flips light and the moon/stars/plankton appear.
