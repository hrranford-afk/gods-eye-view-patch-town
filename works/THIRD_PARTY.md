# PatchTown Works: third-party parts

| Part | Where it comes from | Licence | How it is used |
|---|---|---|---|
| three.js r128 | https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js | MIT, (c) three.js authors | 3D engine, loaded from the CDN |
| GLTFLoader (three.js r128 examples) | https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js | MIT, (c) three.js authors | Loaded only when `assets/models.json` lists models (none in v1) |
| Bricolage Grotesque | Google Fonts | SIL Open Font Licence 1.1 | Headings |
| Atkinson Hyperlegible | Google Fonts (Braille Institute) | SIL Open Font Licence 1.1 | Body text |
| JetBrains Mono | Google Fonts | SIL Open Font Licence 1.1 | Times and code |
| Data | GitHub REST API (public repo only) and `ledger.jsonl` | The repo's own content | Read in the browser; nothing is sent anywhere |

All buildings, people, wagons, lanterns, trees and the bridge are drawn in code in `index.html` (our own work).

## Kenney models (planned, not included)

Kenney's kits are CC0 1.0 (public domain, commercial use fine, credit appreciated). The download from kenney.nl
was refused (HTTP 403) from the build machine, so **no Kenney files are in v1**.

To add them later: download e.g. *City Kit Suburban* and *Mini Characters* from kenney.nl on a normal computer, put
only the `.glb` files used plus `License.txt` in `games/works/assets/kenney/<kit>/`, and list them in
`games/works/assets/models.json` like this:

```json
{ "hut": "assets/kenney/city-kit-suburban/building-type-a.glb", "workshop": "assets/kenney/city-kit-suburban/building-type-c.glb" }
```

The page loads GLTFLoader and swaps the shapes for those models; if a model fails, it keeps the drawn shape.
Then add a row here: "Kenney <kit> — CC0 1.0 — www.kenney.nl".
