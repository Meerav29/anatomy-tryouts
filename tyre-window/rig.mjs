// The model behind the figure. Pure: the build and the live page both read it.
// Grip of a rubber compound against temperature: a narrow window, slow to reach and quick to lose.

export const RIG = {
  T0: 40, // coldest temperature on the bench, deg C
  T1: 160, // hottest
  T_OPT: 95, // temperature of peak grip
  COLD_W: 40, // width of the cold flank
  HOT_W: 18, // width of the hot flank: sharper
  FLOOR: 0.3, // grip of a stone-cold or cooked tyre, relative to peak
  SLATS: 30, // slats in the grip comb, one per 4 deg C
  STEP: 4,
  WINDOW: 0.9, // the window is where grip is at least this share of peak
  OVERHEAT: [105, 135], // blistering ramps in across this span
  COLD_GRAIN: [75, 45], // cold graining ramps in as it falls across this span
  PERIOD: 30, // seconds for the scripted warm-up and cool-down
};

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// relative grip, 0.3 .. 1.0
export function muOf(T) {
  const d = T - RIG.T_OPT;
  const g = Math.exp(-Math.pow(d / (d < 0 ? RIG.COLD_W : RIG.HOT_W), 2));
  return RIG.FLOOR + (1 - RIG.FLOOR) * g;
}
// relative wear rate: low in the window, graining when cold, blistering when hot
export function wearOf(T) {
  return 0.2 + 3.6 * smooth(RIG.OVERHEAT[0], RIG.OVERHEAT[1], T) + 0.9 * smooth(RIG.COLD_GRAIN[0], RIG.COLD_GRAIN[1], T);
}
export const blisterOf = (T) => smooth(RIG.OVERHEAT[0], RIG.OVERHEAT[1] + 10, T);
export const inWindow = (T) => muOf(T) >= RIG.WINDOW;
export const slatT = (i) => RIG.T0 + RIG.STEP * i;

// the scripted warm-up: from cold up through the window to cooked, and back
export const tourAt = (clock) => RIG.T0 + 10 + (RIG.T1 - RIG.T0 - 18) * (0.5 - 0.5 * Math.cos((clock / RIG.PERIOD) * Math.PI * 2));
