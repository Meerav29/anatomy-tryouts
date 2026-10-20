# Autopilot queue: anatomy-tryouts

Design: `grid-prophet/docs/superpowers/specs/2026-09-19-autopilot-design.md` (branch model, review contract, PR template in section 9).
Window: 2026-10-20 → 10-26. Base branch: `auto/queue`. Tracking issue: #2.
Rotation: Tue (one-off, evening), Thu, Sat, Mon.

One slice = one new figure, from [IDEAS.md](../../IDEAS.md). The idea's line in IDEAS.md is the brief. If it's ambiguous, decide and record the decision in decisions.md.

Status values: `todo` → `in-progress` → `in-review` → `merged`.
Terminal: `held` (owner vetoed), `blocked` (review rejected).

## Acceptance for every slice (do not weaken)

- [ ] A new folder `<name>/` with `build.mjs`, a pure model module (`rig.mjs`), `<name>.html`, `<name>-light.html` and `preview.png`, following `tyre-window/` and `friction-circle/`.
- [ ] Built with the vendored skill (`.claude/skills/anatomy/SKILL.md`): a physical machine on a bench, four-tone shading, correct painter's order, a framed card with title, hint and live readout, and calm eased motion driven by the pointer.
- [ ] Every number on the card comes from the model. Each model constant has a source or a derivation in a comment. The PR body lists the key numbers and where they come from.
- [ ] `node ../scripts/lines.mjs` prints `line ends: 0` for **both** themes. The review routine re-runs this itself.
- [ ] `capture.mjs` at `--width 390` shows no sideways scroll and no console errors or exceptions.
- [ ] The PR body embeds or links the desktop shot, the phone shot, and at least two 4x close-ups.
- [ ] The README table gets a row and an image, and IDEAS.md gets its box ticked.
- [ ] Touches nothing outside the new folder, README.md, IDEAS.md and the two autopilot docs. `kit/` and `scripts/` stay unchanged. If the kit needs a change, record it in decisions.md as a proposal; don't make it.

If Chrome can't be installed in the sandbox (see CLAUDE.md), the line-end and phone checks can't run. **Say so in the PR body.** The review routine must then set the slice to `held` rather than merging it unchecked.

The size cap is relaxed for this repo: built HTML is generated. Count only `build.mjs` and `rig.mjs` against the 600-line review limit, and if they're over it, say why in the PR.

---

## slice-1: undercut

Status: todo

IDEAS.md: two cars on a conveyor and a pit-lane switch. Per-lap fresh-tyre gain against a fixed stop cost, so the crossover lap falls out of the numbers.

Notes: model the gap as `gap(lap) = gap0 - pit_loss + sum(fresh-tyre delta per lap since the stop)`, with the delta decaying as the new tyre wears. The readout shows the lap where the undercut car comes out ahead, or "never". Pick the pit-loss and tyre-delta numbers from a real circuit and cite it.

## slice-2: drs-slot-gap

Status: todo

IDEAS.md: two flaps on a rail, a pin that opens the gap, and a comb of smoke lines that stalls when it opens.

Notes: the readout is drag reduction or top-speed gain against slot gap. Keep the aero claim qualitative unless you can cite a number. Smoke-line stall is the visual payoff.

## slice-3: ackermann

Status: todo

IDEAS.md: a four-bar steering linkage on a plate. The inside wheel turns more than the outside.

Notes: the geometry should be real. The inside and outside angles come from wheelbase, track and steering-arm angle, and the readout shows both angles plus the percent Ackermann. The pointer steers.

## slice-4: chai-boilover

Status: todo

IDEAS.md: a pot with a milk skin and a rising foam level, showing why it boils over.

Notes: the mechanism is a protein skin trapping steam bubbles until the foam lifts the skin over the rim. The pointer sets the burner, and the readout shows temperature and foam height. Stirring or lowering the flame (a second control) breaks the skin.
