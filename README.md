# Zanzibar

An original, procedural 360-degree island world. One imagined corner of Zanzibar:
the lagoon's dhows at first light, a carved door at the end of a Stone Town alley,
the spice grove with its red colobus, and the glowing night tide.

Drag to look all the way around. Four chapters; every gesture has a tap and a
keyboard alternative. Music starts only when you ask - each chapter carries its own
layered procedural palette (airy swirl, breathing drone, sparse plucked phrases).

Built with Three.js (vendored, see THREE-LICENSE.txt). No tracking, no build step:
serve the folder statically (`python3 -m http.server`) and open it.

## Verification

`npm install && npm run verify` drives the real site with Playwright at 390px and
laptop widths: chapter entry pixels (four quadrants unless QUICK=1), encounters,
navigation swipe, keyboard look-around, opt-in music signal level (not a listening
judgment) and reduced-motion stillness. Evidence lands in `artifacts/verification/`.
See `.agents/skills/verify-zanzibar/` for the feature map.
