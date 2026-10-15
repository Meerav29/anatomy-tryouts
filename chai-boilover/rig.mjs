// The model behind the figure. Pure: the build and the live page both read it.
// Two pots on one burner. Past ~100 C both make steam. In water the bubbles pop at once; in milk a skin
// of protein holds them in, so the foam builds faster than it bursts and climbs over the rim.

export const RIG = {
  T_AMB: 20, // deg C
  T_BOIL: 100,
  HEAT_RATE: 20, // deg C per second at full burner
  LOSS: 0.07, // per second, towards ambient
  COOL_BOOST: 3, // an unlit burner is a heat sink: the pot cools this much faster
  LIQUID: 0.62, // liquid line as a share of the rim height
  RIM: 1,
  FOAM_GAIN: 0.24, // foam added per second at full boil
  BURST_WATER: 3, // share of foam that pops per second
  BURST_MILK: 0.12, // the same, under a full skin
  BURST_OPEN: 0.7, // extra popping when there is no skin
  SKIN_RATE: 0.25, // per second at full skin temperature
  SKIN_FROM: [55, 85], // skin forms across this span
  SPILL: 0.6, // rim overshoot spilled per second
  PERIOD: 44, // seconds for the scripted run
};

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export const newPot = () => ({ T: RIG.T_AMB, skin: 0, foam: 0, vol: RIG.LIQUID, spilled: 0 });
// how hard it is boiling: 0 below the boil, 1 at full burner
export const vaporOf = (heat) => Math.max(0, (heat * RIG.HEAT_RATE - RIG.LOSS * (RIG.T_BOIL - RIG.T_AMB)) / (RIG.HEAT_RATE - RIG.LOSS * (RIG.T_BOIL - RIG.T_AMB)));
export const levelOf = (pot) => pot.vol + pot.foam;

export function step(pot, heat, dt, kind) {
  const loss = RIG.LOSS * (heat < 0.06 ? RIG.COOL_BOOST : 1);
  pot.T += (heat * RIG.HEAT_RATE - loss * (pot.T - RIG.T_AMB)) * dt;
  if (pot.T > RIG.T_BOIL) pot.T = RIG.T_BOIL;
  const boiling = pot.T >= RIG.T_BOIL - 0.5 ? vaporOf(heat) : 0;
  if (kind === "milk") pot.skin += RIG.SKIN_RATE * smooth(RIG.SKIN_FROM[0], RIG.SKIN_FROM[1], pot.T) * (1 - pot.skin) * dt;
  const burst = kind === "milk" ? RIG.BURST_MILK + RIG.BURST_OPEN * (1 - pot.skin) : RIG.BURST_WATER;
  pot.foam += (RIG.FOAM_GAIN * boiling - burst * pot.foam) * dt;
  // over the rim: foam runs down the side and the skin tears
  const over = Math.max(0, levelOf(pot) - RIG.RIM);
  if (over > 0 && kind === "milk") {
    const out = Math.min(pot.foam, over * RIG.SPILL * dt);
    pot.foam -= out;
    pot.vol -= out * 0.35;
    pot.spilled += out;
    pot.skin = Math.max(0, pot.skin - 0.02 * dt);
  }
  if (pot.T < 40) {
    pot.vol += (RIG.LIQUID - pot.vol) * Math.min(1, dt * 2);
    pot.spilled = Math.max(0, pot.spilled - dt * 0.4);
    pot.skin = Math.max(0, pot.skin - dt * 0.8);
  }
  return pot;
}
// a spoon through the pot: the skin breaks and the foam collapses
export function stir(pot) {
  pot.skin = 0;
  pot.foam *= 0.35;
}

// the scripted run: heat up, hold, spill, take it off, cool
export const heatAt = (clock) => {
  const t = clock % RIG.PERIOD;
  if (t < 2) return 0.04;
  if (t < 7) return 0.04 + 0.86 * smooth(2, 7, t);
  if (t < 27) return 0.9;
  if (t < 30) return 0.9 - 0.86 * smooth(27, 30, t);
  return 0.04;
};
