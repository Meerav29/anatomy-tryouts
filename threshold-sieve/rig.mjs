// The model behind the figure. Pure: the build and the live page both read it.
// One bead = one example with a classifier score in [0, 1].

export const RIG = {
  NPOS: 28, // actual positives
  NNEG: 84, // actual negatives
  X0: -120, // bench x of score 0
  X1: 120, // bench x of score 1
  YMAX: 37, // bench half-width available to beads
  SEP: 6.2, // minimum spacing between bead centres
  BEAD_R: 2.6,
  BED_Z: 4, // bench top
  LIFT: 7, // how far a bead rises when called positive
};

function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const xOf = (score) => RIG.X0 + (RIG.X1 - RIG.X0) * score;

// negatives cluster low, positives high, with overlapping tails: the reason any threshold costs something
export function makeBeads() {
  const rand = mulberry(7311);
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
  const draw = (mean, sd) => Math.min(0.96, Math.max(0.04, mean + sd * gauss()));
  const all = [];
  for (let i = 0; i < RIG.NPOS; i++) all.push({ score: draw(0.68, 0.17), pos: true });
  for (let i = 0; i < RIG.NNEG; i++) all.push({ score: draw(0.3, 0.15), pos: false });
  all.sort(() => rand() - 0.5);
  const placed = [];
  for (const b of all) {
    b.x = Math.round(xOf(b.score) * 10) / 10;
    let sep = RIG.SEP;
    let y = 0;
    for (let tries = 0; tries < 4000; tries++) {
      y = (rand() * 2 - 1) * RIG.YMAX;
      if (placed.every((p) => Math.hypot(p.x - b.x, p.y - y) >= sep)) break;
      if (tries % 400 === 399) sep *= 0.93;
    }
    b.y = Math.round(y * 10) / 10;
    placed.push(b);
  }
  return all.map(({ x, y, score, pos }) => ({ x, y, score: Math.round(score * 1000) / 1000, pos }));
}

// confusion counts and the two scores a threshold produces
export function metricsOf(beads, t) {
  let tp = 0, fp = 0, fn = 0, tn = 0;
  for (const b of beads) {
    const called = b.score >= t;
    if (called && b.pos) tp++;
    else if (called) fp++;
    else if (b.pos) fn++;
    else tn++;
  }
  const precision = tp + fp ? tp / (tp + fp) : 1;
  const recall = tp + fn ? tp / (tp + fn) : 0;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  return { tp, fp, fn, tn, precision, recall, f1 };
}
