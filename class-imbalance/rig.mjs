// The model behind the figure. Pure: the build and the live page both read it.
// 200 examples in a grid. The share of positives is turned down by a knob; a fixed model flags beads.

export const RIG = {
  COLS: 20,
  ROWS: 10,
  PITCH: 9,
  TPR: 0.9, // true-positive rate of the model, fixed
  FPR: 0.05, // false-positive rate of the model, fixed
  P_HI: 0.5, // knob at 0: half the examples are positive
  P_LO: 0.01, // knob at 1: one in a hundred
  BED_Z: 4,
  BEAD_R: 3.3,
  LIFT: 6,
};
RIG.N = RIG.COLS * RIG.ROWS;

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

// every cell gets a fixed rank (which cells are positive first) and a fixed draw u (which the model flags)
export function makeCells() {
  const rand = mulberry(9041);
  const ranks = Array.from({ length: RIG.N }, (_, i) => i).sort(() => rand() - 0.5);
  const cells = [];
  for (let r = 0; r < RIG.ROWS; r++) {
    for (let c = 0; c < RIG.COLS; c++) {
      const i = r * RIG.COLS + c;
      cells.push({
        x: (c - (RIG.COLS - 1) / 2) * RIG.PITCH,
        y: (r - (RIG.ROWS - 1) / 2) * RIG.PITCH,
        rank: ranks[i],
        u: Math.round(rand() * 1000) / 1000,
      });
    }
  }
  return cells;
}

// knob 0..1 -> share of positives, on a log scale
export const shareOf = (knob) => RIG.P_HI * Math.pow(RIG.P_LO / RIG.P_HI, knob);
export const countOf = (knob) => Math.max(2, Math.round(shareOf(knob) * RIG.N));

export function stateOf(cells, positives) {
  return cells.map((c) => {
    const pos = c.rank < positives;
    return { pos, flagged: pos ? c.u < RIG.TPR : c.u < RIG.FPR };
  });
}

export function metricsOf(cells, positives) {
  let tp = 0, fp = 0, fn = 0, tn = 0;
  for (const s of stateOf(cells, positives)) {
    if (s.flagged && s.pos) tp++;
    else if (s.flagged) fp++;
    else if (s.pos) fn++;
    else tn++;
  }
  return {
    tp, fp, fn, tn,
    share: positives / RIG.N,
    lazy: 1 - positives / RIG.N, // accuracy of "always negative"
    precision: tp + fp ? tp / (tp + fp) : 1,
    recall: positives ? tp / positives : 0,
  };
}
