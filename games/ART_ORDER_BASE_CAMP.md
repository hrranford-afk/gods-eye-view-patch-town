# Art order: Base Camp (set by CAIRN, 12 Nov 2026)

Harry: "I'm still feeling a little bit lackluster with the actual graphics… place some orders to get some real original
artwork in the system using our hardware and ChatGPT."

The style target is unchanged: an original 1990s TV-cartoon look. That means wobbly ink outlines, squash and stretch,
grubby painted textures, and sickly-sweet colours. See `base-camp-STYLE_PROMPTS.md`.

## How a picture gets into a 3D game

A picture cannot simply be dropped in. It gets used in one of these ways:
1. **A texture painted onto a 3D shape**, such as a matchbox hut wearing a painted matchbox texture.
2. **A face or decal** stuck on a creature's 3D body.
3. **A flat cut-out** that always faces the camera.
4. **Screen art**: the title, album cards and icons.

Every order below says which of these it is for and the exact size, so it can be wired in without redoing it.

## Order A: ChatGPT (Harry pastes; one picture per message)

Add this line to every prompt:
"Original 1990s TV cartoon style, thick wobbly ink outlines, grubby painted texture, no text, no logos, no real brands."

| # | What | Size and format | Used as |
|---|---|---|---|
| A1 | **Face sheet**: a 4×4 grid of creature faces (eyes plus mouth only), with expressions: happy, panic, sleepy, greedy, grumpy, dizzy, delighted, sick-from-bad-water, and others | square, transparent background, plain gaps between cells | faces on the 3D creatures (biggest win) |
| A2 | **Seamless textures**, one each: matchbox card, flattened tin roof, sock knit, moss, carpet fluff, pencil wood, cork, dental floss rope | 1024×1024, seamless tile | textures on huts, land, cable cars and hooks |
| A3 | **Toolbar icons**: Look, Seeds, Water, Build, Music, Cable, Menu, Hide, all in one set | one sheet, a 4×2 grid, transparent background | the buttons |
| A4 | **Title painting**: a colony on a real shelf at dusk, with space at the top for the name | 16:9 | title screen |
| A5 | **Album card frame**: a scrappy photo frame made of lint and tape | square, transparent centre | milestone album |
| A6 | **Ceiling things**: a cup-hook pulley with a bell, a tea-bag hot-air balloon, a sock lookout nest, a lantern on a string | one sheet, transparent background | cut-outs and reference for the 3D shapes |

**Paste-ready prompt for A1:**
```
A 4x4 grid sheet of cartoon faces for thumb-sized dust-bunny creatures: only the eyes and mouth, no heads, on a transparent background, with clear empty gaps between each cell. Sixteen expressions: happy, panic, sleepy, greedy, grumpy, dizzy, delighted, queasy (green), proud, sneaky, crying with joy, shocked, singing, chewing, suspicious, snoring. Original 1990s TV cartoon style: bulging eyes, gappy teeth, thick wobbly black ink outlines. No text, no logos.
```

**Paste-ready prompt for A2 (swap the material each time):**
```
A seamless tileable texture of MATCHBOX CARDBOARD, seen flat from straight above, filling the whole square, for a video game. Grubby, hand-painted, slightly worn, in an original 1990s TV cartoon painting style. No text, no logos, no brand marks. 1024x1024.
```

To bring the pictures back, save them to Photos and send them to the game session. Name them by their number, e.g. "A1".

## Order B: our own hardware (PatchTown; needs Harry's yes, because these are downloads)

- **B1. A local picture model on the Radeon.** Use it to make many variations of Harry's ChatGPT pictures, such as 40 hut textures, keeping the same style. The Mill picks the model, after preflight and a canary.
- **B2. Picture-to-3D on the Radeon.** Turn the A6 sheet and the creature line-up into real low-poly 3D models.
- **B3. Free 3D parts.** Use CC0 low-poly model packs that anyone may use (no licence worries) as a base, repainted in our style. This is the "look first" rule: use what already exists.

Nothing in Order B is downloaded until Harry says yes.

## Checking (CAIRN)

Before anything goes into the game, it must pass these checks:
- transparent where it should be;
- seamless where it should be;
- no text, logos or brands;
- matches the 90s look;
- readable at iPad size.

Before and after screenshots go to Harry. Taste is Harry's call, so he picks the winners.
