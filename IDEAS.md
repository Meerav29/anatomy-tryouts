# Figure ideas

Each figure is a real tabletop machine whose working *is* the concept. One folder per figure, each with `build.mjs` (writes the HTML) and a pure model file the drawing reads from. Status: `[x]` built, `[ ]` planned.

## Built
- [x] **accretion** — dust beads on a tray, a protoplanet on an arm, a capture hoop widened by gravitational focusing. Ends at isolation mass.

## F1 and racing
- [ ] **tyre-window** — rubber block on a heated drum with a grip-vs-temperature dial. Too cold: no grip. Too hot: graining. The narrow window drivers talk about.
- [ ] **drs-slot-gap** — two flaps on a rail, a pin that opens the gap, a comb of smoke lines that stalls when it opens.
- [ ] **undercut** — two cars on a conveyor, a pit-lane switch. Fresh-tyre gain per lap vs a fixed stop cost, so the crossover lap falls out of the numbers.

## Go-karting and simulators
- [ ] **ackermann** — four-bar steering linkage on a plate; the inside wheel turns more than the outside.
- [ ] **force-feedback** — wheel on a motor, spring and torque dial: what a sim sends vs what a real rack does.
- [ ] **friction-circle** — a physical disc grip budget with a pointer that cannot leave it; braking and cornering draw from the same grip.

## Aviation (prop planes)
- [ ] **carb-ice** — venturi on a stand with a temperature dial showing the drop that can ice it up.

## Coffee and chai
- [ ] **chai-boilover** — pot with a milk skin and a rising foam level; why it boils over.

## AI and classifiers
- [ ] **threshold-sieve** — a sieve on a slider over two piles of beads (positives, negatives); precision and recall move together as it slides.
- [ ] **class-imbalance** — a scale with 1,000 grains on one side and 10 on the other; why accuracy lies.

## Shelved
- Kart solid axle (no differential), prop governor, espresso pressure profile, calibration jars, hash table, tides, sky-is-blue: liked, not picked yet.

## Conventions
- World units ~1 px, x/y floor, z up. Model in `rig.mjs`-style pure module, shared by build and live page.
- Shared kit lives in `kit/` and `scripts/` at the repo root (copied from the anatomy skill); a figure folder imports `../kit/...`.
- Checks before calling one done: `node ../scripts/lines.mjs <page>.html` prints `line ends: 0` in both themes; 4x close-ups; phone width.
