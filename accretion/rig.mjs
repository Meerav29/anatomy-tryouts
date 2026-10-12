// The model behind the figure. Pure: the build and the live page both read it.
// Units are the drawing's own world units (about 1 px). Masses count beads.

export const RIG = {
  A: 60, // orbit radius of the protoplanet
  TRAY_Z: 6, // height of the dust tray
  RB: 1.8, // bead radius (one bead = one unit of mass)
  K: 0.4, // (v_esc / v_rel)^2 per m^(2/3): gravitational focusing strength
  ZONE: [42, 78], // radial extent of the dust disc
  N: 64, // beads in the disc
  SEED_MASS: 6,
  MAX_MASS: 100, // full scale of the mass gauge
  LAP: 10, // seconds per orbit at 1x
  FLIGHT: 0.7, // seconds a captured bead takes to fall in
};

// radius of a body of m beads at constant density
export const radiusOf = (m) => RIG.RB * Math.cbrt(m);
// focusing factor: (reach / r)^2 = 1 + (v_esc / v_rel)^2, and v_esc^2 grows as m / r = m^(2/3)
export const focusOf = (m) => 1 + RIG.K * Math.pow(m, 2 / 3);
// capture radius of the hoop
export const reachOf = (m) => radiusOf(m) * Math.sqrt(focusOf(m));
// horizontal distance at which a bead on the tray touches a ball resting on it
export const contactOf = (m) => 2 * Math.sqrt(radiusOf(m) * RIG.RB);

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

// scatter N beads over the annulus with a minimum spacing, away from the starting spot
export function scatter(start = 0) {
  const rand = mulberry(20260);
  const [r0, r1] = RIG.ZONE;
  const out = [];
  const sx = RIG.A * Math.cos(start);
  const sy = RIG.A * Math.sin(start);
  let guard = 0;
  while (out.length < RIG.N && guard++ < 20000) {
    const rho = Math.sqrt(r0 * r0 + rand() * (r1 * r1 - r0 * r0));
    const phi = rand() * Math.PI * 2;
    const x = rho * Math.cos(phi);
    const y = rho * Math.sin(phi);
    if (Math.hypot(x - sx, y - sy) < 10) continue;
    if (out.some((b) => Math.hypot(b[0] - x, b[1] - y) < 8.5)) continue;
    out.push([Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
  }
  return out;
}

export const START = 0.62; // starting angle of the arm

export function fresh(beads) {
  return {
    theta: START,
    mass: RIG.SEED_MASS, // mass that has landed
    shown: RIG.SEED_MASS, // mass the drawing follows (eased)
    beads: beads.map(([x, y]) => ({ x, y, state: 0, t: 0, px: 0, py: 0, dx: 0, dy: 0, alpha: 1 })), // 0 free, 1 falling, 2 absorbed
    swept: 0,
    rest: 0, // seconds since nothing was left to sweep
    born: 1,
  };
}

export const ballOf = (s) => [RIG.A * Math.cos(s.theta), RIG.A * Math.sin(s.theta)];

// true when no free bead lies within the body's present reach: nothing more can ever be swept
export function exhausted(s) {
  const reach = reachOf(s.mass);
  return !s.beads.some((b) => b.state === 0 && Math.abs(Math.hypot(b.x, b.y) - RIG.A) < reach);
}

export function step(s, dt, rate) {
  s.theta += ((Math.PI * 2) / RIG.LAP) * rate * dt;
  const [bx, by] = ballOf(s);
  const reach = reachOf(s.shown);
  for (const b of s.beads) {
    if (b.state === 0 && Math.hypot(b.x - bx, b.y - by) < reach) {
      b.state = 1;
      b.t = 0;
      b.px = b.x - bx; // position relative to the body when captured
      b.py = b.y - by;
    }
    if (b.state === 1) {
      b.t += (dt * rate) / RIG.FLIGHT;
      const u = Math.min(1, b.t);
      const pull = u * u; // falls in faster as it nears
      const bend = Math.sin(Math.PI * u) * 0.22; // path curves: focusing bends the approach
      const rx = b.px * (1 - pull) - b.py * bend * (1 - pull);
      const ry = b.py * (1 - pull) + b.px * bend * (1 - pull);
      b.dx = bx + rx;
      b.dy = by + ry;
      if (Math.hypot(rx, ry) <= contactOf(s.shown) || b.t >= 1) {
        b.state = 2;
        s.mass += 1;
        s.swept += 1;
      }
    }
  }
  s.shown += (s.mass - s.shown) * (1 - Math.exp(-dt * rate / 0.22));
  if (Math.abs(s.mass - s.shown) < 0.002) s.shown = s.mass;
}
