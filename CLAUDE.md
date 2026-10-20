# anatomy-tryouts

Interactive isometric figures: each one is a small tabletop machine whose working *is* the idea it explains. Built with the **anatomy** skill.

## Start here

- **The skill is vendored at `.claude/skills/anatomy/`** (MIT, copied from Meerav's local install on 2026-10-20, built example HTML stripped; rebuild any example with `node .claude/skills/anatomy/examples/<name>/build.mjs`). Read `.claude/skills/anatomy/SKILL.md` before drawing anything, and open the closest example. The references in `.claude/skills/anatomy/references/` (`craft.md`, `kit.md`, `motion.md`, `verify.md`) are the bar.
- **What to build next:** [IDEAS.md](IDEAS.md). `[x]` built, `[ ]` planned.
- **Autopilot (Oct 20-26, 2026):** [AUTOPILOT.md](AUTOPILOT.md) and [docs/autopilot/queue.md](docs/autopilot/queue.md) on the `auto/queue` branch. Work in progress lands on `auto/queue`, never directly on `main`.

## Layout

- One folder per figure: `build.mjs` writes `<name>.html` (dark) and, with `--light`, `<name>-light.html`; a pure model module (`rig.mjs`) holds every number the drawing shows; `preview.png` is the README image.
- `kit/` and `scripts/` at the repo root are the shared kit and checks (copied from the skill). A figure imports `../kit/...` and `../scripts/inline-kit.mjs`.
- Look at `tyre-window/` or `friction-circle/` for the house pattern: a framed card with title, hint and live readout; motion driven by the pointer; numbers from the model.

## Done means

Run these from inside the figure folder:

```bash
node build.mjs && node build.mjs --light
node ../scripts/lines.mjs <name>.html          # must print "line ends: 0"
node ../scripts/lines.mjs <name>-light.html    # must print "line ends: 0"
node ../scripts/capture.mjs <name>.html --out shots/desk.png
node ../scripts/capture.mjs <name>.html --out shots/phone.png --width 390   # no sideways scroll, no console errors
```

Then do 4x close-ups of the joints (`--zoom`), read every PNG, and save `preview.png`. Add the README table row and image, and tick the box in IDEAS.md.

**Chrome:** the checks need Chrome or Chromium. In a Linux cloud sandbox:

```bash
npx -y playwright@1.48.2 install --with-deps chromium
export CHROME_PATH=$(ls -d ~/.cache/ms-playwright/chromium-*/chrome-linux/chrome | head -1)
```

If Chrome can't be installed, say so plainly. Never claim a check ran when it didn't.

## Conventions

- World units ~1 px, x/y floor, z up.
- Every number shown on the card comes from the model, and every model number has a stated source or derivation (a comment in `rig.mjs`). No decorative numbers.
- `shots/` is gitignored. Built HTML and `preview.png` are committed.
