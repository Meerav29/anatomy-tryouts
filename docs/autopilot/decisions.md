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
