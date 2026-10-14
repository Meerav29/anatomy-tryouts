// The model behind the figure. Pure: the build and the live page both read it.
// A tyre can only give so much grip: sqrt(lat^2 + long^2) <= mu. Demand beyond that is a slide.

export const RIG = {
  K: 34, // world units per g on the dish
  COMPOUNDS: [
    { name: "slick", mu: 1.6 },
    { name: "inter", mu: 1.1 },
    { name: "wet", mu: 0.7 },
  ],
  LAP: 9, // seconds per scripted corner
  PUCK_R: 4.2,
  PEG_R: 1.6,
  PEGS: 30,
  G_MAX: 2, // full scale of the g gauges
};

// one corner, as the driver asks for it: [s, lateral g (right +), longitudinal g (accelerate +)]
const LAP = [
  [0.0, 0.0, 1.0],
  [0.14, 0.0, 0.6],
  [0.28, 0.0, -1.5],
  [0.4, 0.5, -1.15],
  [0.52, 1.25, -0.4],
  [0.66, 1.5, 0.1],
  [0.8, 1.05, 0.8],
  [0.92, 0.3, 1.2],
  [1.0, 0.0, 1.0],
];

export function lapAt(s) {
  const t = ((s % 1) + 1) % 1;
  let i = 0;
  while (i < LAP.length - 2 && t >= LAP[i + 1][0]) i++;
  const [s0, x0, y0] = LAP[i];
  const [s1, x1, y1] = LAP[i + 1];
  const u = (t - s0) / (s1 - s0);
  const e = 0.5 - 0.5 * Math.cos(Math.PI * u);
  return [x0 + (x1 - x0) * e, y0 + (y1 - y0) * e];
}

// what the tyre actually delivers for a demand: the demand, pulled back onto the circle if it is outside
export function limitOf(lat, long, mu) {
  const demand = Math.hypot(lat, long);
  const k = demand > mu ? mu / demand : 1;
  return { lat: lat * k, long: long * k, demand, grip: Math.min(1, demand / mu), slide: demand > mu + 1e-6 };
}
