# Figure ideas

Each figure is a real tabletop machine whose working *is* the concept. One folder per figure, each with `build.mjs` (writes the HTML) and a pure model file the drawing reads from. Status: `[x]` built, `[ ]` planned.

## Built
- [x] **accretion** — dust beads on a tray, a protoplanet on an arm, a capture hoop widened by gravitational focusing. Ends at isolation mass.

## F1 and racing
- [x] **tyre-window** — reciprocating friction tester: rubber block on a heated platen, spring-measured grip, a 30-slat comb of grip vs temperature with a probe. Window ~80-102 C; hot = blisters, wear x18, crumbs.
- [ ] **drs-slot-gap** — two flaps on a rail, a pin that opens the gap, a comb of smoke lines that stalls when it opens.
- [x] **undercut** — oval circuit with a pit lane; car B (7 s behind) pits on the lap you pick, A answers a lap later. A band along the track shows the gap; a comb of slats shows how far ahead B ends up for every pit lap, with a break-even line. Crossover lap 11 falls out of tyre age vs a 22 s stop.

## Go-karting and simulators
- [x] **ackermann** — two go-karts on one pad, same steering input: parallel steering (violet) vs Ackermann (teal). Axle lines run back to the rear axle's line: they land at one point for Ackermann, miss by a track width for parallel, and the parallel kart's tyres scuff and its scrub dial goes red. Knob on a rail sets the lock. Light-first build (`--dark` for the dark one). Built, but not liked as a visualization (blocky karts, long floor lines run off the plate at small angles, the idea reads as a diagram more than a machine); kept for the record, not promoted.
- [ ] **force-feedback** — wheel on a motor, spring and torque dial: what a sim sends vs what a real rack does.
- [x] **friction-circle** — XY pen plotter over a dish; a puck driven by accel/brake/corner demand is stopped by a ring of pegs at mu*g. Slick/inter/wet shrinks the ring; a pen traces the g-g path; lamp lights on a slide.

## Aviation (prop planes)
- [ ] **carb-ice** — venturi on a stand with a temperature dial showing the drop that can ice it up.

## Coffee and chai
- [x] **chai-boilover** — two round half-pots (glass pane on the cut) on one burner, water vs milk, a thermometer by each (both read 100 C). Bubbles rise from the floor: in water they pop and the steam escapes; in milk a skin stops them, foam stacks under it, passes the red rim line and runs down the glass. Heat knob on a rail follows the pointer; click stirs (spoon, breaks the skin). Boils over above ~half heat.

## AI and classifiers
- [x] **threshold-sieve** — 112 beads on a score ruler, a hovering sieve blade on rails; beads right of it lift on pins; two dial gauges read precision and recall.
- [x] **class-imbalance** — 200 bead wells, a knob thins positives from 50% to 1%; always-no accuracy climbs to 0.99 while a fixed 90%/5% model keeps recall and loses precision.

## Shelved
- Kart solid axle (no differential), prop governor, espresso pressure profile, calibration jars, hash table, tides, sky-is-blue: liked, not picked yet.

## Conventions
- World units ~1 px, x/y floor, z up. Model in `rig.mjs`-style pure module, shared by build and live page.
- Shared kit lives in `kit/` and `scripts/` at the repo root (copied from the anatomy skill); a figure folder imports `../kit/...`.
- Checks before calling one done: `node ../scripts/lines.mjs <page>.html` prints `line ends: 0` in both themes; 4x close-ups; phone width.
