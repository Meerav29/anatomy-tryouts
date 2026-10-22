// The model behind the figure. Pure: the build and the live page both read it.
// What a real steering rack pushes back with (self-aligning torque) against what a sim's
// force-feedback motor can deliver: scaled by a strength setting, clipped at the motor's
// limit, held between 60 Hz updates and smoothed.

const DEG = Math.PI / 180;

export const FFB = {
  // --- the tyre (one front tyre of a GT-class car on slicks)
  // Vertical load: a ~1,400 kg GT3 car with driver, half its weight on the front axle,
  // split over two tyres: 1400 * 9.81 * 0.5 / 2 = 3,430 N; rounded.
  FZ: 3500, // N
  // Peak friction coefficient of a dry racing slick. Illustrative: slicks run about 1.3-1.6.
  MU: 1.3,
  // Pacejka "magic formula" lateral shape factor. C = 1.3 is the textbook value for lateral
  // force (Pacejka, Tyre and Vehicle Dynamics, ch. 4).
  C: 1.3,
  // Slip angle where lateral force peaks. Racing slicks peak around 6-8 deg; 7 chosen.
  // B is solved from it below (with E = 0 the peak sits where C * atan(B * a) = pi / 2).
  ALPHA_PEAK: 7, // deg
  // Contact patch length of a front slick, ~160 mm. The brush model puts the pneumatic trail
  // at zero slip at a / 3, with a the half-length: 80 / 3 = 26.7 mm.
  PATCH: 0.16, // m
  // Mechanical (caster) trail. Illustrative: road and race cars run roughly 10-30 mm.
  TRAIL_MECH: 0.015, // m
  // Overall steering ratio, wheel rim to road wheel. Illustrative: GT cars run ~11-14:1.
  RATIO: 12,
  // Unassisted: the rim torque is the kingpin moment of both front tyres over the ratio.

  // --- the sim's wheel base
  // A mid-range direct-drive base: Fanatec CSL DD with the boost kit, or GT DD Pro, 8 Nm
  // (Fanatec spec; the Moza R9 is 9 Nm, a Simucube 2 Pro 25 Nm).
  MOTOR_MAX: 8, // Nm
  // Force-feedback strength: how many Nm the motor is asked for per Nm of rack torque.
  GAIN_MIN: 0.25,
  GAIN_MAX: 1.0,
  // iRacing sends force feedback at 60 Hz (its physics runs at 360 Hz inside; an iRacing
  // developer, Granite Devices forum, "iRacing 360Hz FFB with Simucube 2").
  UPDATE_HZ: 60,
  // A one-pole smoothing filter in the wheel base. Illustrative setting: corner at 20 Hz.
  FILTER_HZ: 20,

  // --- the bench
  SLIP_MAX: 12, // deg, the plotter's travel
  SCALE_MAX: 24, // Nm, full scale of both cards and both dials
  PERIOD: 16, // s, the idle tour's sweep
};

// B so that lateral force peaks at ALPHA_PEAK: B * a_peak = tan(pi / (2C))
export const B_SHAPE = Math.tan(Math.PI / (2 * FFB.C)) / (FFB.ALPHA_PEAK * DEG);
// pneumatic trail at zero slip, brush model: (patch / 2) / 3
export const TRAIL0 = FFB.PATCH / 6;

// lateral force of one tyre, N (magic formula, E = 0)
export function lateralOf(slipDeg) {
  const a = Math.abs(slipDeg) * DEG;
  return FFB.MU * FFB.FZ * Math.sin(FFB.C * Math.atan(B_SHAPE * a));
}
// pneumatic trail, m: largest at zero slip, gone when the tyre reaches its peak and slides
// (the linear fall-off of the brush model; Wikipedia, "Self aligning torque")
export function trailOf(slipDeg) {
  return TRAIL0 * Math.max(0, 1 - Math.abs(slipDeg) / FFB.ALPHA_PEAK);
}
// torque at the steering-wheel rim from the real rack, Nm: two tyres, pneumatic plus
// mechanical trail, over the steering ratio
export function rackOf(slipDeg) {
  return (2 * lateralOf(slipDeg) * (trailOf(slipDeg) + FFB.TRAIL_MECH)) / FFB.RATIO;
}
// what the sim asks the motor for, and what the motor can give
export const wantedOf = (slipDeg, gain) => gain * rackOf(slipDeg);
export const outputOf = (slipDeg, gain) => Math.min(FFB.MOTOR_MAX, wantedOf(slipDeg, gain));
// share of the asked-for torque the motor cannot deliver, 0..1
export function clipOf(slipDeg, gain) {
  const want = wantedOf(slipDeg, gain);
  return want > FFB.MOTOR_MAX ? 1 - FFB.MOTOR_MAX / want : 0;
}
// mean delay between the rack and the rim: half an update period (a zero-order hold)
// plus the group delay of the one-pole filter, 1 / (2 pi fc)
export const HOLD_MS = 1000 / (2 * FFB.UPDATE_HZ);
export const FILTER_MS = 1000 / (2 * Math.PI * FFB.FILTER_HZ);
export const LATENCY_MS = HOLD_MS + FILTER_MS;
export const FILTER_TAU = 1 / (2 * Math.PI * FFB.FILTER_HZ); // s

// the slip where the rack torque peaks, found once by scanning (about 3 deg)
export const RACK_PEAK = (() => {
  let best = 0;
  for (let s = 0; s <= FFB.SLIP_MAX; s += 0.05) if (rackOf(s) > rackOf(best)) best = s;
  return Math.round(best * 20) / 20;
})();

// the idle tour: sweep the slip out and back while the strength drifts between its ends
export const tourSlip = (clock) => FFB.SLIP_MAX * (0.5 - 0.5 * Math.cos((clock / FFB.PERIOD) * Math.PI * 2));
export const tourGain = (clock) => 0.3 + 0.55 * (0.5 - 0.5 * Math.cos((clock / (FFB.PERIOD * 2.5)) * Math.PI * 2 + 2.2));
