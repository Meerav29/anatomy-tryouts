// The wing section and the smoke lines round it, in the plane of the flow: x along the flow, z up.
// Pure geometry, shared by the build and the live page.

export const WING = {
  MAIN: { le: [0, 28], chord: 56, thick: 8, camber: 3.4, angle: 14 },
  FLAP: { le: [51, 46], chord: 42, thick: 6, camber: 2.8 },
  X0: -80, // where the smoke starts
  X1: 150, // and where the window ends
};

const rot = ([x, z], a) => [x * Math.cos(a) - z * Math.sin(a), x * Math.sin(a) + z * Math.cos(a)];
const rad = (d) => (d * Math.PI) / 180;

// an upside-down wing section (suction surface underneath) as a closed outline, leading edge first along the top
function section(chord, thick, camber, angleDeg, pivot, pivotAt) {
  const n = 22;
  const upper = [];
  const lower = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = chord * (1 - Math.cos(t * Math.PI)) * 0.5;
    const u = x / chord;
    const body = thick * 5 * 0.2969 * Math.sqrt(u) - thick * 5 * (0.126 * u + 0.3516 * u * u - 0.2843 * u * u * u + 0.1015 * u * u * u * u);
    const half = Math.max(0.12, body);
    const z = -camber * 4 * u * (1 - u); // the camber bows down
    upper.push([x, z + half]);
    lower.push([x, z - half]);
  }
  const a = rad(angleDeg);
  const origin = pivotAt === "te" ? [chord, 0] : [0, 0];
  const place = ([x, z]) => { const [rx, rz] = rot([x - origin[0], z], a); return [pivot[0] + rx, pivot[1] + rz]; };
  return { pts: [...upper.map(place), ...lower.reverse().map(place)], upper: upper.map(place), lower: lower.slice().reverse().map(place) };
}

// the wing for a flap angle: the main plane fixed, the flap turned about its trailing edge
export function geometry(flapDeg, flapShut) {
  const m = WING.MAIN;
  const f = WING.FLAP;
  const main = section(m.chord, m.thick, m.camber, m.angle, m.le, "le");
  const shut = rad(flapShut);
  const hinge = [f.le[0] + f.chord * Math.cos(shut), f.le[1] + f.chord * Math.sin(shut)];
  const flap = section(f.chord, f.thick, f.camber, flapDeg, hinge, "te");
  return { main, flap, hinge, flapLe: flap.pts[0], mainTe: main.pts[Math.floor(main.pts.length / 2) - 1] };
}

// the smallest distance between the two elements, in the figure's units
export function gap(g) {
  let best = Infinity;
  for (const a of g.main.pts) for (const b of g.flap.pts) best = Math.min(best, Math.hypot(a[0] - b[0], a[1] - b[1]));
  return best;
}

/* ---------------------------------------------------------------- smoke */
const N = 72;
export const xs = Array.from({ length: N }, (_, i) => WING.X0 + ((WING.X1 - WING.X0) * i) / (N - 1));

function edgeAt(polys, x, take) {
  let best = null;
  for (const poly of polys) {
    for (let i = 0; i < poly.length; i++) {
      const [x1, z1] = poly[i];
      const [x2, z2] = poly[(i + 1) % poly.length];
      if ((x1 - x) * (x2 - x) > 0 || x1 === x2) continue;
      const z = z1 + ((x - x1) / (x2 - x1)) * (z2 - z1);
      best = best === null ? z : take === "max" ? Math.max(best, z) : Math.min(best, z);
    }
  }
  return best;
}
function blur(arr, sigma) {
  const step = (WING.X1 - WING.X0) / (N - 1);
  const r = Math.ceil((sigma * 3) / step);
  return arr.map((_, i) => {
    let s = 0;
    let w = 0;
    for (let j = -r; j <= r; j++) {
      const k = Math.min(N - 1, Math.max(0, i + j));
      const g = Math.exp(-0.5 * Math.pow((j * step) / sigma, 2));
      s += arr[k] * g;
      w += g;
    }
    return s / w;
  });
}
const lse = (a, b, s) => { const m = Math.max(a, b); return m + s * Math.log(Math.exp((a - m) / s) + Math.exp((b - m) / s)); };
const lsn = (a, b, s) => -lse(-a, -b, s);

// Catmull-Rom through control points, sampled at the figure's x grid
function spline(ctrl) {
  const pts = [];
  const c = ctrl;
  for (let i = 0; i < c.length - 1; i++) {
    const p0 = c[Math.max(0, i - 1)], p1 = c[i], p2 = c[i + 1], p3 = c[Math.min(c.length - 1, i + 2)];
    const steps = Math.max(4, Math.round((p2[0] - p1[0]) / 3));
    for (let s = 0; s < steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t;
      const f = (a, b, cc, d) => 0.5 * (2 * b + (-a + cc) * t + (2 * a - 5 * b + 4 * cc - d) * t2 + (-a + 3 * b - 3 * cc + d) * t3);
      pts.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  pts.push(c[c.length - 1]);
  return pts;
}

// the smoke for a flap angle and a separation 0..1
export function smoke(flapDeg, flapShut, sep) {
  const g = geometry(flapDeg, flapShut);
  const polys = [g.main.pts, g.flap.pts];
  const top = xs.map((x) => { const v = edgeAt(polys, x, "max"); return v === null ? 0 : v; });
  const bot = xs.map((x) => { const v = edgeAt(polys, x, "min"); return v === null ? 90 : v; });
  const topAtt = blur(top, 6);
  const topSep = blur(top, 15);
  const botS = blur(bot, 9);
  const teX = g.flap.pts[Math.floor(g.flap.pts.length / 2) - 1][0];
  const teZ = g.hinge[1];
  const lines = [];

  // above the wing: the line rides up over the flap, hugging it while attached and leaving it tangentially when it lets go
  const uppers = [46, 54, 62, 70, 78, 87];
  uppers.forEach((z0, k) => {
    const clear = 2.6 + k * 3.8;
    const pts = xs.map((x, i) => {
      const e = topAtt[i] * (1 - sep) + topSep[i] * sep;
      const up = (1 - sep) * 6.5 * Math.exp(-Math.pow((x - teX - 12) / 16, 2)) * Math.exp(-k * 0.35);
      const lift = lse(z0, e + clear * (1 + sep * 0.8), 1.6) + up;
      return [x, lift];
    });
    lines.push({ pts, kind: "over", k, speed: 1 + (1 - sep) * 0.35 * Math.exp(-k * 0.5) });
  });

  // below: pushed down under the main plane, where the suction surface speeds it up
  [22.5, 17, 11.5, 6].forEach((z0, k) => {
    const clear = 2 + k * 2.6;
    const pts = xs.map((x, i) => [x, lsn(z0, botS[i] - clear, 1.6) - (1 - sep) * 0.8 * Math.exp(-Math.pow((x - 50) / 36, 2))]);
    lines.push({ pts, kind: "under", k, speed: 1 + 0.25 * (1 - k * 0.2) });
  });

  // through the slot: the two lines that thread between main plane and flap, squeezed and sped up while it is narrow
  const mainUp = (x) => { const v = edgeAt([g.main.pts], x, "max"); return v === null ? WING.MAIN.le[1] : v; };
  const flapLow = (x) => { const v = edgeAt([g.flap.pts], x, "min"); return v === null ? g.flapLe[1] : v; };
  const mte = g.mainTe;
  const fle = g.flapLe;
  const slotC = [(mte[0] + fle[0]) / 2 + 1.5, (mte[1] + fle[1]) / 2];
  [0, 1].forEach((k) => {
    const off = (k - 0.5) * (1 - sep * 0.2) * Math.min(2.6, gap(g) * 0.5);
    const z0 = 32 + k * 7.5;
    const squeeze = 1 - sep * 0.65; // open and stalled, they just go straight through
    const ctrl = [
      [WING.X0, z0],
      [-48, z0 + 1],
      [8, mainUp(8) + 3.2 + k * 2],
      [slotC[0] - 14, mainUp(slotC[0] - 14) + 2.6 * squeeze + k * 1.2 * squeeze],
      [slotC[0], slotC[1] + off],
      [slotC[0] + 12, flapLow(slotC[0] + 12) - 2.2 + k * 0.6],
      [teX + 8, teZ + 2.2 + (1 - sep) * 3 + k],
      [WING.X1, teZ + 4 + (1 - sep) * 6 + k * 1.5 + sep * 1.5],
    ];
    ctrl.sort((a, b) => a[0] - b[0]);
    lines.push({ pts: spline(ctrl), kind: "slot", k, speed: 1.1 + squeeze * 0.9 });
  });

  // the stalled wake behind the flap, as wandering lines between its back and the line that left it
  const wake = [];
  if (sep > 0.03) {
    const over0 = lines[0].pts;
    const x0 = g.flapLe[0] + 8;
    for (let w = 0; w < 6; w++) {
      const f = (w + 0.6) / 6.4;
      const pts = [];
      for (let x = x0; x <= WING.X1 - 4; x += 3) {
        const i = Math.min(N - 1, Math.max(0, Math.round(((x - WING.X0) / (WING.X1 - WING.X0)) * (N - 1))));
        const lowZ = Math.max(edgeAt(polys, x, "max") ?? 0, teZ - 8 - (x - teX) * 0.1) - 0.5;
        const highZ = over0[i][1] - 1.2;
        pts.push([x, lowZ + (highZ - lowZ) * (f * 0.9 + 0.08) * Math.min(1, (x - x0) / 26)]);
      }
      wake.push(pts);
    }
  }
  return { g, lines, wake };
}
