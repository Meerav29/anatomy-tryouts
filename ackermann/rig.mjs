// The model behind the figure. Pure: the build and the live page both read it.
// A kart's front axle, seen from above: two kingpins, a steering arm on each, and a tie rod between the arm tips.
// Every wheel has to roll about one point on the rear axle's line. With the arms angled in toward the rear axle's
// middle (Ackermann) the two wheels turn by different amounts and nearly agree on that point; with the arms square
// to the axle (parallel steering) both wheels turn the same and their axle lines miss each other.

export const RIG = {
  L: 30, // wheelbase
  W: 28, // distance between the kingpins
  ARM: 8, // steering arm length
  MAX_DEG: 32, // steering lock of the inner wheel
  AFTER: 1.1, // how far past the line to the rear axle's middle the arms are angled
  SCRUB_BAD: 2.5, // degrees of combined tyre slip past which the tyres start to scrub
};

const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;
const turn = ([x, y], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

// kind: "ackermann" | "parallel"; inner: the inner wheel's angle in degrees (toward -x)
export function steer(kind, inner) {
  const { L, W, ARM } = RIG;
  const alpha = kind === "ackermann" ? Math.atan2(W / 2, L) * RIG.AFTER : 0; // tuned a little past the textbook line, as real linkages are
  const KL = [-W / 2, L];
  const KR = [W / 2, L];
  const vL = [ARM * Math.sin(alpha), -ARM * Math.cos(alpha)]; // the arm from each kingpin to its tip, wheels straight
  const vR = [-ARM * Math.sin(alpha), -ARM * Math.cos(alpha)];
  const tip = (K, v, a) => { const [rx, ry] = turn(v, a); return [K[0] + rx, K[1] + ry]; };
  const rod = Math.hypot(tip(KR, vR, 0)[0] - tip(KL, vL, 0)[0], tip(KR, vR, 0)[1] - tip(KL, vL, 0)[1]);
  const dIn = rad(inner);
  const tL = tip(KL, vL, dIn);
  // the outer wheel is whatever angle keeps the tie rod its length
  const gap = (a) => { const t = tip(KR, vR, a); return Math.hypot(t[0] - tL[0], t[1] - tL[1]) - rod; };
  let lo = 0;
  let hi = rad(60);
  for (let i = 0; i < 50; i++) { const mid = (lo + hi) / 2; if (gap(mid) < 0) lo = mid; else hi = mid; }
  const dOut = dIn < 1e-6 ? 0 : (lo + hi) / 2;
  const tR = tip(KR, vR, dOut);
  // where each wheel's axle line meets the rear axle's line (y = 0)
  const meet = (K, a) => (a < 1e-6 ? null : K[0] - L / Math.tan(a));
  const xIn = meet(KL, dIn);
  const xOut = meet(KR, dOut);
  // the chassis settles on a centre between the two; each wheel's slip is how far it points off that centre
  const xc = xIn === null ? null : (xIn + xOut) / 2;
  const ideal = (K) => (xc === null ? 0 : Math.atan2(L, K[0] - xc));
  const slipIn = deg(dIn - ideal(KL));
  const slipOut = deg(dOut - ideal(KR));
  return { kind, inner: inner, outer: deg(dOut), dIn, dOut, KL, KR, tipL: tL, tipR: tR, xIn, xOut, xc, miss: xIn === null ? 0 : Math.abs(xOut - xIn), slipIn, slipOut, scrub: Math.abs(slipIn) + Math.abs(slipOut) };
}
export const bad = (s) => s.scrub >= RIG.SCRUB_BAD;
// the steering lock fraction at which parallel steering starts to scrub
export const scrubFrom = () => {
  for (let f = 0; f <= 1.0001; f += 0.005) if (bad(steer("parallel", f * RIG.MAX_DEG))) return f;
  return 1;
};
// the scripted sweep when nobody is steering: straight, to full lock, and back
export const sweepAt = (clock) => 0.5 - 0.5 * Math.cos((clock / 9) * Math.PI * 2);
