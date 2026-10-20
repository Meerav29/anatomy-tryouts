# Autopilot: Oct 20-26, 2026

Scheduled cloud routines are building new figures from IDEAS.md while Meerav is travelling. **Everything lands on the `auto/queue` branch. `main` only has the setup commit** (this file, CLAUDE.md, the vendored skill).

- Queue and per-figure acceptance: [docs/autopilot/queue.md](docs/autopilot/queue.md) (read it on `auto/queue`; that copy is the live one)
- Calls a routine made on Meerav's behalf: [docs/autopilot/decisions.md](docs/autopilot/decisions.md)
- Daily log: issue [#2](https://github.com/Meerav29/anatomy-tryouts/issues/2)
- Shared design for all autopilot repos: `grid-prophet/docs/superpowers/specs/2026-09-19-autopilot-design.md`

## Schedule (ET)

| Day | Figure |
|---|---|
| Tue Oct 20 (evening) | undercut |
| Thu Oct 22 | drs-slot-gap |
| Sat Oct 24 | ackermann |
| Mon Oct 26 | chai-boilover |

Builds run around 9am ET and the review routine runs around 2pm ET (Tuesday's one-off build runs at 4pm and gets a 9pm review).

## Coming back

1. Read decisions.md.
2. Open each figure's HTML from `auto/queue` in a browser and move the pointer across it. The review checked the line ends and phone width, but not whether the figure actually *teaches* the idea. That's your call.
3. Merge `auto/queue` into `main` when you like what you see.

## If you're asking a cloud session to do something here

Read CLAUDE.md first. Branch from `auto/queue`, not `main`, if you're touching a figure the queue built. Don't edit a figure while its PR is open. Comment on the PR instead.
