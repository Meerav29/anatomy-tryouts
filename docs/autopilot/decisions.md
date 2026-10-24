# Decisions made by autopilot

Every design call a routine made because the brief did not settle it. Newest at the bottom.

Format:

```
## <date> slice-<n> <figure>, PR #<pr>
Question: ...
Chosen: ...
Rejected: ...
Blast radius: ...
```

---

## 2026-10-20 slice-1 undercut, no PR (build halted)
Question: The queue lists slice-1 undercut as `todo`, but `undercut/` already exists on `auto/queue` (and `main`): built 2026-10-16 (a4cd6e4, b89c5cd, dcad11a), README row present, IDEAS.md box ticked. The same is true of slices 2-4 (drs-slot-gap, ackermann, chai-boilover). Should the routine rebuild it?
Chosen: Halt without building. Slice status left at `todo`, no branch, no PR. Reported on issue #2 for Meerav to decide.
Rejected: (a) Rebuilding into `undercut/`: overwrites the owner's finished figure, and the acceptance asks for "a new folder". (b) Building under a new name (e.g. `undercut-2/`): invents a figure nobody asked for. (c) Skipping to the next todo slice: all four are already built, so it hits the same problem.
Blast radius: None. No figure files touched. Later build runs (Oct 22, 24, 26) will hit the same state unless the queue is updated: mark slices as `held`, or replace them with unbuilt ideas (force-feedback, carb-ice are the `[ ]` lines in IDEAS.md).

## 2026-10-22 slice-1 force-feedback, PR #3
Question: The Tue Oct 20 evening run left no trace, so slice-1 (force-feedback) was still `todo` when Thursday's run (scheduled for carb-ice) fired. Build force-feedback or skip to carb-ice?
Chosen: Built force-feedback. The routine takes the first `todo` slice, and no later slice was non-todo, so nothing called for a halt. Each remaining figure moves one run later: carb-ice Sat, calibration-jars Mon, and kart-solid-axle has no run left in the window.
Rejected: Skipping to carb-ice to keep the calendar. That leaves slice-1 `todo` behind a later slice, which the queue rules don't allow for.
Blast radius: Schedule only. kart-solid-axle stays `todo` after Oct 26 unless an extra run is added.

## 2026-10-22 slice-1 force-feedback, PR #3
Question: The notes say the pointer sets the slip (or steering angle). With slip alone and a fixed FFB strength, a motor either always clips at the peak or never does. How should clipping become something you can see change?
Chosen: Pointer x sets slip (0-12 deg). Pointer y sets the FFB strength (25-100% of rack torque sent to the motor), shown on a knob on the motor mount. Arrow keys do the same. The idle tour sweeps both.
Rejected: (a) A fixed strength: clipping becomes a property of the picture, not something the reader controls. (b) Strength on a click toggle: only two states.
Blast radius: This figure only. The readout keeps to slip, rack, FFB, clip and latency. Strength is shown by the knob and in `aria-valuetext`, not in the readout, so the readout fits at 390 px.

## 2026-10-22 slice-1 force-feedback, PR #3
Question: What do "clipping %" and "latency" mean as single numbers?
Chosen: Clip % = share of the requested torque the motor can't deliver, `1 - 8 Nm / (strength x rack torque)`. Latency = mean delay of a 60 Hz zero-order hold (8.3 ms) plus the group delay of a one-pole 20 Hz smoothing filter (8.0 ms), about 16 ms. The live FFB pen and needle really run through that hold and filter.
Rejected: Clip % as the share of time spent clipped (that depends on the tour, not the state). Latency from iRacing's 360 Hz mode (+16 ms per its developer): it's a different setting, and it's forum-sourced.
Blast radius: The readout numbers. The 20 Hz filter corner is an illustrative setting and is labelled that way in rig.mjs.

## 2026-10-22 slice-1 force-feedback, PR #3
Question: Which motor and car should the numbers describe?
Chosen: An 8 Nm direct-drive base (Fanatec CSL DD with boost kit / GT DD Pro class) against an unassisted GT car on slicks with a 12:1 ratio. Rack torque at the rim peaks near 20 Nm at 2.85 deg of slip, so clipping is a real, common situation. The tyre and steering constants are marked illustrative in rig.mjs.
Rejected: A 25 Nm high-end base (Simucube 2 Pro / Podium DD): with this model it rarely clips, which hides the point. A power-assisted rack: it adds an assist curve the brief doesn't ask for.
Blast radius: This figure only.


## 2026-10-24 slice-2 carb-ice, PR #(this run's PR)
Question: The FAA carburettor icing chart (SAIB CE-09-35 / PHAK fig. 7-12) is a graphic, and the sandbox's network blocked every copy of it (faa.gov mirrors, CAA, CASA, Transport Canada, EASA: proxy refused). How should the chart's zones be drawn?
Chosen: Four nested lobes in temperature and humidity, each `rhMin + (100 - rhMin) u^4` across a temperature span, fitted to the chart's published reading points found by search: light icing about -12..38 C down to ~30% RH; serious at descent power about -7..32 C; serious at any power below 21 C with RH above 80%. The moderate zone's edges (60%, -7..27 C) are illustrative. The card's caption says the edges are approximate and not for flight use.
Rejected: (a) Digitising the chart from memory point by point: it would look exact and isn't. (b) Halting the build: the chart's shape, not its exact edges, is the idea.
Blast radius: The zone outlines on the chart card and the zone name in the readout. When the owner has the chart to hand, the four `ZONES` rows in `carb-ice/rig.mjs` are the only thing to retune.

## 2026-10-24 slice-2 carb-ice, PR #(this run's PR)
Question: What is "the venturi temperature drop" as one number, and does it move?
Chosen: A fixed ~32 K: fuel evaporating at a 12.5:1 best-power mixture (L / (AFR cp) = 349 / (12.5 x 1.005) = 27.8 K, all fuel evaporated, an upper bound) plus the speed-up in the throat (v^2 / 2cp at an illustrative 90 m/s = 4.0 K). It's in line with the "up to 70 F (39 K)" usually quoted. The dial shows air in and venturi air as two hands with the drop as an arc between them; the chart, not the dial, decides whether ice forms (the real body is warmed by the engine, so a sub-zero venturi number alone doesn't mean ice).
Rejected: A drop that varies with throttle: needs a third control and a flow model the brief doesn't ask for. Icing decided by "venturi < 0 C": it disagrees with the chart, which is the source pilots use.
Blast radius: This figure only.

## 2026-10-24 slice-2 carb-ice, PR #(this run's PR)
Question: How does carb heat change the state, and what does the chart pin show with heat on?
Chosen: Heat adds 50 K (the 90 F rise required by 14 CFR 23.1093(a)(1) before amendment 23-64). The same moisture is then re-expressed as humidity at the heated temperature (Magnus formula), and the zone is looked up for the heated air, which always falls off the chart's warm edge, so the frost melts. The pin keeps showing the outside air, the way a pilot reads the chart. Inputs: pointer x = temperature, pointer y = humidity, click (or Space) = carb heat. Touch: a drag sets the air, a tap toggles heat.
Rejected: Moving the pin to the heated point (it leaves the chart for every input). A separate humidity knob drag control (two knobs only shown, driven by the pointer, as in force-feedback).
Blast radius: This figure only.

## 2026-10-24 slice-2 carb-ice, PR #(this run's PR)
Question: The brief names a venturi, a stand and a dial. What else goes on the bench?
Chosen: Added an airbox with a cold inlet (pleated filter) and a hot inlet (finned heater muff on an exhaust stack), a float bowl with a jet arm into the throat, and a wet-and-dry-bulb psychrometer whose columns read the air temperature and the wet-bulb temperature (Stull 2011), so the humidity input is an instrument, not a number. The frost is the figure's one colour (a pale blue-grey token per theme).
Rejected: A hygrometer dial (a third dial reads as a gauge cluster). Monochrome frost (it disappeared against the dark bore in the light theme).
Blast radius: This figure only. The frost colour is defined locally in the page's CSS, not in kit/.
