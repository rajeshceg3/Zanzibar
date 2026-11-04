# Look around

## Sub-features
Horizontal drag rotates with unbounded azimuth; shallow vertical range; compass reads bearing; arrow keys look when the canvas is focused.

## How to get to it (user POV)
Any chapter. Drag the sea/sand/sky itself, or focus the canvas and use arrow keys.

## Driving it with Playwright
`page.mouse` down/move/up across the canvas; compare `#compass` text before/after. Keyboard: focus `canvas`, press ArrowRight, wait for compass change.

## Gotchas
A drag starting on the nav strip must not rotate the world; a world drag must not change the chapter. Judge quadrant screenshots as pixels, never DOM alone.
