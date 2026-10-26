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


## 2026-10-26 slice-3 calibration-jars, no PR (build halted)
Question: slice-3 is the first `todo`, but slice-2 (carb-ice) is `held`: PR #4 is open and unmerged (over the 600-line cap). The build routine's rule is "if the highest-numbered non-todo slice is NOT `merged`, STOP". The Oct 24 review comment read `held` as not triggering the halt. Build calibration-jars anyway?
Chosen: Halt. `held` is not `merged`, and the build prompt's rule is literal. No branch, no PR, slice-3 left `todo`. Reported on issue #2.
Rejected: Building past the held slice. It follows the review routine's reading, which the build rule doesn't support. It would also branch from an `auto/queue` that lacks carb-ice, so README.md, IDEAS.md and queue.md would conflict with PR #4 whichever merges second.
Blast radius: Schedule only. calibration-jars and kart-solid-axle are left `todo` after the window closes. To unblock: merge or trim PR #4 (the queue then says `merged`), or set slice-2 to `blocked`/`merged` by hand and fire the build routine again.
