// The model behind the figure. Pure: the build and the live page both read it.
// Two cars, B a few seconds behind A. B pits on lap p, A answers one lap later. Fresh rubber is quicker than old,
// so the longer B waits, the more it gains on the lap A stays out; past a crossover that beats the gap.

export const RIG = {
  T0: 90, // seconds for a lap on brand-new tyres
  D: 0.25, // seconds lost per lap of tyre age
  CLIFF_AGE: 14, // past this age the tyre falls off a cliff
  CLIFF: 0.5, // extra seconds per lap of age beyond it
  S: 8, // age of both cars' tyres when the window opens, at lap 0
  GAP0: 7, // seconds B is behind A
  L: 22, // seconds a pit stop costs
  SLOW: 0.55, // pit-lane speed relative to track speed
  P_MIN: 3,
  P_MAX: 21,
  SPEEDUP: 36, // replay seconds per real second
  LAPS: 5, // laps in the replay: the one before B stops, to three after
  U_IN: 0.03, // where the pit lane starts, the box and where it ends, as a share of a lap from the line
  U_BOX: 0.135,
  U_OUT: 0.243,
};

export const lapTime = (age) => RIG.T0 + RIG.D * age + RIG.CLIFF * Math.max(0, age - RIG.CLIFF_AGE);

// a car that stops on lap `stop`, over replay laps p-1 .. p+3: its tyre age on each, and which one is the pit lap
function carLaps(p, stop) {
  return Array.from({ length: RIG.LAPS }, (_, i) => {
    const n = p - 1 + i;
    const age = n <= stop ? RIG.S + n : n - stop;
    return { n, age, T: lapTime(age), pit: n === stop };
  });
}

// the lap as time -> distance, in laps, as a list of straight pieces. B starts a gap behind the line.
function build(laps, behindSeconds) {
  const segs = [];
  let t = 0;
  let d = 0;
  if (behindSeconds > 0) {
    const share = behindSeconds / laps[0].T;
    segs.push({ t0: 0, t1: behindSeconds, d0: -share, d1: 0, kind: "main", u0: 1 - share, u1: 1, lap: -1 });
    t = behindSeconds;
  }
  laps.forEach((lap, i) => {
    const push = (dur, u0, u1, kind) => {
      segs.push({ t0: t, t1: t + dur, d0: d + u0, d1: d + u1, kind, u0, u1, lap: i });
      t += dur;
    };
    if (!lap.pit) push(lap.T, 0, 1, "main");
    else {
      const { U_IN, U_BOX, U_OUT, SLOW, L } = RIG;
      const slowExtra = (U_OUT - U_IN) * lap.T * (1 / SLOW - 1);
      const dwell = Math.max(1, L - slowExtra);
      push(U_IN * lap.T, 0, U_IN, "pit");
      push(((U_BOX - U_IN) * lap.T) / SLOW, U_IN, U_BOX, "pit");
      push(dwell, U_BOX, U_BOX, "box");
      push(((U_OUT - U_BOX) * lap.T) / SLOW, U_BOX, U_OUT, "pit");
      push((1 - U_OUT) * lap.T, U_OUT, 1, "pit");
    }
    d += 1;
  });
  return { segs, ages: laps.map((l) => l.age), end: t };
}

export function race(p) {
  const A = build(carLaps(p, p + 1), 0);
  const B = build(carLaps(p, p), RIG.GAP0);
  return { p, A, B, end: Math.max(A.end, B.end) };
}

// where a car is at time t: distance in laps from the line (negative = still behind it), and what it is doing
export function stateAt(car, t) {
  const segs = car.segs;
  let lo = 0;
  let hi = segs.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (segs[mid].t1 < t) lo = mid + 1;
    else hi = mid;
  }
  const s = segs[lo];
  const f = s.t1 > s.t0 ? Math.min(1, Math.max(0, (t - s.t0) / (s.t1 - s.t0))) : 1;
  const u = s.u0 + (s.u1 - s.u0) * f;
  const lap = Math.max(0, s.lap);
  return { d: s.d0 + (s.d1 - s.d0) * f, u: u - Math.floor(u + 1e-9), lap, kind: s.kind, age: s.lap < 0 ? car.ages[0] : car.ages[lap] + u };
}
// the time at which a car reaches distance d
export function timeAt(car, d) {
  const segs = car.segs;
  for (const s of segs) {
    if (s.d1 >= d - 1e-9 && s.d1 > s.d0) return s.t0 + ((d - s.d0) / (s.d1 - s.d0)) * (s.t1 - s.t0);
  }
  return segs[segs.length - 1].t1;
}
// seconds B is behind A at time t (negative: ahead)
export function gapAt(r, t) {
  const dB = stateAt(r.B, t).d;
  return t - timeAt(r.A, dB);
}
// the gap once both have stopped and are on fresh tyres: the end of the lap after A's stop
export function result(p) {
  const r = race(p);
  const d = 4;
  return timeAt(r.B, d) - timeAt(r.A, d);
}
export const margin = (p) => -result(p); // seconds B is ahead after both stops
export const works = (p) => margin(p) > 0;
export const crossover = () => {
  for (let p = RIG.P_MIN; p <= RIG.P_MAX; p++) if (works(p)) return p;
  return RIG.P_MAX + 1;
};

// the replay's script when nobody is steering
export const TOUR = [7, 10, 13, 17];
