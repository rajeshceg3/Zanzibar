# Grove study sources

This is an imagined mixed spice grove, not a surveyed farm, a botanical scale model, or a depiction of Jozani forest. Tree placement and proportions are artistic. Leaves are enlarged for this stylized scene.

The branch study replaces opaque sphere cores with paired elliptic leaves on short sprays and visible branch gaps. The soil and understory remain on the island height field. The colobus approach stays clear. This does not claim finished art.

Visual and morphology references checked November 11, 2026:

- Kew Plants of the World Online, Syzygium aromaticum: evergreen tree, glossy opposite elliptical leaves on short branches. https://powo.science.kew.org/taxon/urn:lsid:ipni.org:names:601421-1/general-information
- Singapore NParks, Syzygium aromaticum: opposite leathery shiny leaves and branching crown. https://www.nparks.gov.sg/florafaunaweb/flora/3/1/3154
- BBC News, In pictures: Zanzibar's clove harvest (2014): irregular dense foliage in Pemba harvest photographs. https://www.bbc.com/news/world-africa-30478709
- Tanzanian Affairs (1991), historical account of clove trees and plantations: historical context only. https://www.tzaffairs.org/1991/05/my-father-and-the-%e2%80%98useful-plants-of-zanzibar/
- Kimberly Leupo (2016), visitor account and photographs of a Zanzibar mixed spice plantation: anecdotal visual corroboration only. https://www.kimberlyleupo.com/2016/01/stone-town-zanzibar-skipping-through.html

No reference photographs or copied meshes are distributed. All scene meshes are generated here.

## November 11, 19:10 IST study checkpoint

The paired-leaf study uses folded 16-triangle leaves aligned along short opposite sprays, deterministic branch placement, and density-dependent spray counts. The camera and foliage placements are art choices, not geographic or botanical measurements. Leaf shadows are disabled; woody branch shadows remain. Production is unchanged.

Local Chromium study checks cover four pointer-driven directions and the colobus encounter at 390x844 and 1365x900, plus reduced-motion pixel stability. Screenshots were inspected. This is not art acceptance: the sea horizon is still too exposed, the floor is too plain, leaves are oversized, and the repeated straight-fork branch structure remains visible. A raised-midstory experiment was rejected because nearby leaves hid the colobus and some crowns looked unsupported. That experiment is not in this candidate.

Chapter and quadrant screenshots now wait for the settled camera. The encounter screenshot check now waits for two animation frames and the camera's settled state rather than relying on a fixed 1.8-second delay. The old delay could capture an unfinished camera move. Four pointer steps replace twenty in the quadrant drag, preserving the same gesture distance while reducing software-renderer work.

## November 11, 20:00 IST branch and floor checkpoint

The retained follow-on study replaces the shared fan-shaped fork origin with a central leader and staggered side branches. Woody branches now use two tapered bent sections. Leaves are smaller, and distant growth has a low tier attached to the existing ground. Small dry leaf shapes are one instanced draw call, deterministic and placed against the height field. No new downloaded images, textures or meshes are used.

Canopy twigs no longer cast shadows; the scene's separate trunks still do. This is a software-rendering cost tradeoff, not a claim of physically accurate lighting. The default test crown has 210 leaves and 72 woody sections. The floor test checks all 1,800 litter instances for deterministic placement, finite transforms, bounded radius and height-field contact.

Both 390x844 and 1365x900 four-direction visual studies and their settled encounters passed without page errors. All ten images were inspected. Reduced-motion pixel stability also passed. Current evidence is `artifacts/branchfloor-final390` and `artifacts/branchfloor-final1365`. These are still visual-only grove checks, not a full release acceptance suite. A denser three-section branch experiment exceeded the 120-second local sweep budget and was not retained.

This is still NOT accepted art and is not deployed. Trees read as repeated stylized structures, large sea and sand bands remain visible from the grove, and the square-cut trunk joins and simple colobus need more work. The litter improves a previously empty floor but does not make the ground realistic. Do not call this a finished grove or whole-world release.
