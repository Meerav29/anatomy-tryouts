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

## Re-queued 2026-10-20

The original four slices (undercut, drs-slot-gap, ackermann, chai-boilover) turned out to be **already built** on `main` (Oct 13-16). The first build run correctly halted rather than overwrite them (see decisions.md). They were replaced with the two unbuilt IDEAS.md lines, plus two from IDEAS.md's "Shelved: liked, not picked yet" list. Picking those two was a setup-time call, not Meerav's.

Don't rebuild or edit any existing figure folder. Note that ackermann is marked "built, but not liked". Its notes (blocky shapes, lines running off the plate, reads as a diagram rather than a machine) are worth avoiding in every new figure.

## slice-1: force-feedback

Status: in-progress

IDEAS.md: a wheel on a motor, a spring and a torque dial, showing what a sim sends vs what a real rack does.

Notes: two torque traces side by side, the real steering rack's self-aligning torque and the sim's FFB output (clipped at the motor's max, filtered, with latency). The pointer sets the steering angle or the slip. The readout shows rack torque, FFB torque, clipping %, and latency in ms. Typical direct-drive wheel torque (Nm) and FFB update rates should be cited.

## slice-2: carb-ice

Status: todo

IDEAS.md: a venturi on a stand with a temperature dial showing the drop that can ice it up.

Notes: ambient temperature and humidity in (two knobs, or a pointer x/y), venturi temperature drop out, and the carb-icing probability band from the standard FAA icing chart (cite it). Frost grows on the throttle plate when you're in the band, and carb heat is a toggle.

## slice-3: calibration-jars

Status: todo

IDEAS.md shelf: "calibration jars". A row of jars, one per predicted-probability bin (0-10% … 90-100%). Each jar fills with beads for the events forecast in that bin, coloured hit or miss, and a level line marks the bin's predicted rate. A well-calibrated forecaster's hit-fill matches each line. Sits next to threshold-sieve and class-imbalance.

Notes: a knob morphs the forecaster from calibrated to overconfident to underconfident, and the readout shows expected calibration error. Use a synthetic seeded forecast set. It's fine to use the shape grid-prophet's phase-2 notes describe ("too generous at the back, too timid at the front") as one preset, labelled illustrative.

## slice-4: kart-solid-axle

Status: todo

IDEAS.md shelf: "kart solid axle (no differential)". Why a kart has no diff, and why it lifts the inside rear wheel to turn.

Notes: a kart chassis on a turntable from a rear three-quarter view, both rear wheels on one axle. In a corner the inside wheel has to cover less distance than the outside one, so with no diff one of them scrubs. Chassis flex and caster jacking lift the inside rear, and the scrub stops. The pointer sets the corner radius. The readout shows the inner/outer path-length difference and the inside-wheel lift needed. Avoid ackermann's problems: keep it a machine on a plate, not floor lines.
