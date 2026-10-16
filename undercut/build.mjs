import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../kit/iso-kit.mjs";
import { kitScript } from "../scripts/inline-kit.mjs";
import * as R from "./rig.mjs";
import * as T from "./track.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";
const OUT = theme === "light" ? "undercut-light.html" : "undercut.html";

const WIDTH = 640;
const HEIGHT = 420;

const PLATE = { x: -160, y: -70, w: 320, d: 162, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;

const TRACK_OUT = { x: -150, y: -60, w: 300, d: 120, r: 60 };
const TRACK_H = 2.4;
const INFIELD = { x: -128, y: -38, w: 256, d: 76, r: 38 };
const INFIELD_H = 3.4;
const PIT_HALF = 7;

const SLATS = R.RIG.P_MAX - R.RIG.P_MIN + 1;
const COMB_PITCH = 10;
const COMB_X0 = -((SLATS - 1) * COMB_PITCH) / 2;
const COMB_Y = -8;
const COMB_D = 16;
const SLAT_W = 8.2;
const slatX = (i) => COMB_X0 + COMB_PITCH * i;
const M_LO = -4.5;
const heightOf = (m) => 3 + 2.3 * (Math.min(8.5, Math.max(M_LO, m)) - M_LO);
const ZERO_H = heightOf(0);

const GAUGES = [
  { at: [-114, 0], label: "A AGE", key: "A" },
  { at: [114, 0], label: "B AGE", key: "B" },
];
const GAUGE_R = 14;
const GAUGE_Z = 10;
const GAUGE_H = 5;
const GAUGE_TOP = INFIELD_H + GAUGE_Z + GAUGE_H;
const GAUGE_FROM = (-135 * Math.PI) / 180;
const GAUGE_SPAN = (270 * Math.PI) / 180;
const AGE_FULL = 30;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [0, COMB_Y, 44], [-100, 0, 20], [100, 0, 20]],
  WIDTH,
  HEIGHT,
  { pad: 10, azimuth: 42, elevation: 42 },
);
const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const red = (text) => text.replace("<text ", '<text style="fill:var(--anatomy-red)" ');
const flat = (pts, tone = "mid", lit = false) => {
  const d = k.pathOf(pts.map(at), true);
  return `<g class="iso-solid"${lit ? ' data-lit=""' : ""}><path class="iso-fill" d="${d}"/><path class="iso-line iso-edge" data-tone="${tone}" d="${d}"/></g>`;
};

/* ---------------------------------------------------------------- plate */
function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 24))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  return out.join("");
}

/* ---------------------------------------------------------------- track and pit lane */
function pitLane() {
  const out = [];
  const xs = Array.from({ length: 41 }, (_, i) => -78 + (i * 156) / 40);
  const yAt = (x) => T.pitAt((x + T.TRACK.HX) / T.LOOP)[1];
  const upper = xs.map((x) => [x, yAt(x) + PIT_HALF, 0.2]);
  const lower = xs.map((x) => [x, yAt(x) - PIT_HALF, 0.2]).reverse();
  out.push(flat([...upper, ...lower], "hi"));
  // the box: where the car stands while the tyres change
  out.push(L(k.planOutline({ x: -9, y: T.TRACK.PIT_Y - 4.5, w: 18, d: 9, r: 1 }, 0.3, P, 3), { tone: "hi" }));
  out.push(k.faceTextSvg(k.topMatrix([0, T.TRACK.PIT_Y + 13], 0, P, "x"), "PIT BOX", { size: 3, tone: "hi", anchor: "middle" }));
  return out.join("");
}
function track() {
  const out = [];
  out.push(S(k.slabOf(TRACK_OUT, 0, TRACK_H, P, 28, 0.5), { tone: "hi" }));
  out.push(S(k.slabOf(INFIELD, 0, INFIELD_H, P, 24, 0.6), { tone: "mid" }));
  // racing line, dashed
  const line = Array.from({ length: 160 }, (_, i) => T.loopAt(i / 160));
  out.push(L(k.onTop(line, TRACK_H + 0.05, P, true), { tone: "faint", dashed: true }));
  // start and finish line
  const x = -T.TRACK.HX;
  out.push(L(k.lineOnTop([x, 38.5], [x, 59.5], TRACK_H + 0.05, P) + k.lineOnTop([x + 2.4, 38.5], [x + 2.4, 59.5], TRACK_H + 0.05, P), { tone: "hi", free: true }));
  out.push(k.faceTextSvg(k.topMatrix([x - 6, 66], 0, P, "x"), "LINE", { size: 2.6, tone: "mid", anchor: "end" }));
  return out.join("");
}

/* ---------------------------------------------------------------- the result comb */
function pin() {
  const y = COMB_Y + COMB_D / 2;
  return S(k.cylinder(0, y, 0.9, INFIELD_H, 9, P, 10), { tone: "hi", lit: true, crease: "none" }) + S(k.cylinder(0, y, 2.4, INFIELD_H + 9, 1.8, P, 16, 0.4), { tone: "hi", lit: true, crease: "none" });
}
function comb() {
  const out = [];
  const order = Array.from({ length: SLATS }, (_, i) => i).sort((a, b) => k.depthOf([slatX(a), 0, 0], P) - k.depthOf([slatX(b), 0, 0], P));
  for (const i of order) {
    const p = R.RIG.P_MIN + i;
    const plan = { x: slatX(i) - SLAT_W / 2, y: COMB_Y, w: SLAT_W, d: COMB_D, r: 0.8 };
    out.push(`<g data-slat="${i}">${S(k.slabOf(plan, INFIELD_H, heightOf(R.margin(p)), P, 2, 0.4), { tone: R.works(p) ? "hi" : "mid", crease: "lo" })}</g>`);
  }
  // the break-even line across the slats' faces
  const face = COMB_Y + COMB_D;
  const zz = INFIELD_H + ZERO_H;
  out.push(L(k.segment([slatX(0) - 5, face + 0.2, zz], [slatX(SLATS - 1) + 5, face + 0.2, zz], P), { tone: "red", dashed: true, free: true }));
  // ruler along the front: pit lap numbers
  const strip = { x: slatX(0) - 6, y: COMB_Y + COMB_D + 3, w: slatX(SLATS - 1) - slatX(0) + 12, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, INFIELD_H, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(slatX(0), slatX(SLATS - 1), COMB_PITCH, 3, strip.y + 0.6, INFIELD_H + 0.6, [1.4, 2.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  for (const i of [0, 3, 6, 9, 12, 15, 18]) out.push(k.faceTextSvg(k.topMatrix([slatX(i), strip.y + 6], INFIELD_H + 0.6, P, "x"), String(R.RIG.P_MIN + i), { size: 2.4, tone: "mid", anchor: "middle" }));
  out.push(k.faceTextSvg(k.topMatrix([slatX(0) - 6, strip.y + 6], INFIELD_H + 0.6, P, "x"), "PIT LAP", { size: 2.4, tone: "hi", anchor: "end" }));
  return out.join("");
}

/* ---------------------------------------------------------------- tyre age dials */
function gauge({ at: [x, y], label }) {
  const z = INFIELD_H;
  const out = [`<path class="iso-halo" d="${k.cylinder(x, y, 9, z, 0.1, P, 32).fill}" style="filter:blur(3px)"/>`];
  out.push(S(k.cylinder(x, y, 8, z, 2.5, P, 32, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 3.4, z + 2.5, GAUGE_Z - 5, P, 20), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(x, y, GAUGE_R, z + GAUGE_Z, GAUGE_H, P, 56, 0.6), { tone: "hi", crease: "lo" }));
  out.push(L(k.ring(x, y, GAUGE_R - 1.8, GAUGE_TOP, P, 56), { tone: "lo" }));
  const ticks = k.radialTicks(x, y, GAUGE_R - 2.6, 10, 5, GAUGE_TOP, [1, 2.2], P, GAUGE_FROM, GAUGE_SPAN);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  // the cliff: past this age the tyre falls off
  const a0 = GAUGE_FROM + GAUGE_SPAN * (R.RIG.CLIFF_AGE / AGE_FULL);
  const a1 = GAUGE_FROM + GAUGE_SPAN;
  const pts = Array.from({ length: 10 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / 9; return [x + Math.sin(a) * (GAUGE_R - 5.4), y - Math.cos(a) * (GAUGE_R - 5.4)]; });
  out.push(`<path class="iso-line" data-tone="red" data-free="both" d="${k.onTop(pts, GAUGE_TOP, P)}" style="stroke-width:1.4"/>`);
  out.push(L(k.ring(x, y, 1.4, GAUGE_TOP, P, 14), { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([x, y + 7.6], GAUGE_TOP, P, "x"), label, { size: 2, tone: "lo", anchor: "middle" }));
  return out.join("");
}
const needleAt = ({ at: [x, y] }, age) => {
  const angle = GAUGE_FROM + GAUGE_SPAN * Math.min(1, Math.max(0, age / AGE_FULL));
  const sx = Math.sin(angle);
  const sy = -Math.cos(angle);
  return k.lineOnTop([x - sx * 2.6, y - sy * 2.6], [x + sx * (GAUGE_R - 3.4), y + sy * (GAUGE_R - 3.4)], GAUGE_TOP + 0.2, P);
};

/* ---------------------------------------------------------------- live source */
const source = (file) => readFileSync(join(HERE, file), "utf8").replace(/^export /gm, "").replace(/^import .*$/gm, "");

const live = `
const P = ${JSON.stringify(P)};
const GAUGES = ${JSON.stringify(GAUGES)};
const SLAT_X = ${JSON.stringify(Array.from({ length: SLATS }, (_, i) => slatX(i)))}, SLAT_H = ${JSON.stringify(Array.from({ length: SLATS }, (_, i) => heightOf(R.margin(R.RIG.P_MIN + i))))};
const SLATS = ${SLATS}, GAUGE_R = ${GAUGE_R}, GAUGE_TOP = ${GAUGE_TOP}, GAUGE_FROM = ${GAUGE_FROM}, GAUGE_SPAN = ${GAUGE_SPAN}, AGE_FULL = ${AGE_FULL};
const TRACK_H = ${TRACK_H}, PIT_Y = ${T.TRACK.PIT_Y};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const $ = (name) => svg.querySelector('[data-part="' + name + '"]');
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const slats = [...svg.querySelectorAll("[data-slat]")].map((g) => g.querySelector(".iso-solid"));
const needles = GAUGES.map((g) => $("needle-" + g.key));
const el = { cars: $("cars"), band: $("band"), pin: $("pin") };

let p = ${13}, r = race(p), tau = 0, hold = 0, litSlat = -1, tourAt = 2;
tau = r.B.segs.find((s) => s.kind === "box").t0 + 2;
let frame = 0, last = 0, visible = false, touring = !still.matches, idleTimer = 0;

const needleAt = (g, age) => {
  const angle = GAUGE_FROM + GAUGE_SPAN * clamp(age / AGE_FULL, 0, 1), sx = Math.sin(angle), sy = -Math.cos(angle);
  return lineOnTop([g.at[0] - sx * 2.6, g.at[1] - sy * 2.6], [g.at[0] + sx * (GAUGE_R - 3.4), g.at[1] + sy * (GAUGE_R - 3.4)], GAUGE_TOP + 0.2, P);
};
const rot = (cx, cy, a, pts) => pts.map(([lx, ly]) => [cx + lx * Math.cos(a) - ly * Math.sin(a), cy + lx * Math.sin(a) + ly * Math.cos(a)]);
function car(pose, cls, stopped) {
  const { x, y, a } = pose;
  const z = TRACK_H;
  const parts = [];
  const SC = 1.2;
  const add = (pts, z0, h, c, bevel = 0.25) => {
    pts = pts.map(([px, py]) => [px * SC, py * SC]);
    z0 = TRACK_H + (z0 - TRACK_H) * 1.15; h *= 1.15;
    const ctr = pts.reduce((m, [px, py]) => [m[0] + px / pts.length, m[1] + py / pts.length], [0, 0]);
    const [wx, wy] = rot(x, y, a, [ctr])[0];
    parts.push([depthOf([wx, wy, z0], P), solidSvg(extrude(rot(x, y, a, pts), z0, h, P, { convex: true, bevel }), { tone: "hi", crease: "lo", className: c })]);
  };
  const box = (cx, cy, l, w) => [[cx + l / 2, cy + w / 2], [cx + l / 2, cy - w / 2], [cx - l / 2, cy - w / 2], [cx - l / 2, cy + w / 2]];
  // open wheels, the front pair narrower than the rear
  for (const [wx, wy, l, w] of [[7.4, 4.5, 3.4, 2], [7.4, -4.5, 3.4, 2], [-6.6, 4.8, 4.2, 2.6], [-6.6, -4.8, 4.2, 2.6]]) add(box(wx, wy, l, w), z, 2.7, "car-tyre", 0.5);
  // floor and tub, with the nose running out to a front wing
  add([[12, 0.8], [12, -0.8], [6, -1.9], [-3, -2.5], [-9, -2.2], [-9, 2.2], [-3, 2.5], [6, 1.9]], z + 0.7, 1.9, cls);
  add(box(10.7, 0, 1.7, 11), z + 0.5, 0.8, cls, 0.2);
  add(box(-2.6, 3.7, 7.5, 2), z + 0.8, 2.2, cls);
  add(box(-2.6, -3.7, 7.5, 2), z + 0.8, 2.2, cls);
  // cockpit, airbox and the driver's helmet
  add([[3, 0.9], [3, -0.9], [-2.4, -1.2], [-2.4, 1.2]], z + 2.6, 1.1, cls + " car-dark");
  add(box(-3.8, 0, 2.6, 1.8), z + 2.6, 2, cls + " car-dark");
  add(box(0.4, 0, 1.8, 1.8), z + 2.9, 1.2, "car-helmet", 0.5);
  // rear wing on its pillar
  add(box(-9.6, 0, 1.6, 10), z + 3.9, 1, cls, 0.2);
  add(box(-9.6, 0, 1.2, 1.2), z + 2.2, 1.7, "car-dark " + cls, 0.1);
  parts.sort((p, q) => p[0] - q[0]);
  let out = "";
  if (stopped) out += lineSvg(ring(x, y, 17, TRACK_H + 0.1, P, 28), { tone: "lit", dashed: true, free: true });
  return out + parts.map((p) => p[1]).join("");
}
const poseOf = (s) => poseAt(s.u, s.kind === "pit" || s.kind === "box");

function draw() {
  const sA = stateAt(r.A, tau), sB = stateAt(r.B, tau);
  const pA = poseOf(sA), pB = poseOf(sB);
  // the cars would overlap at gaps of a couple of seconds, so close gaps are drawn a little wider than true
  const shownB = sA.d + (sB.d - sA.d) + 0.025 * Math.tanh((sB.d - sA.d) / 0.012) - 0.0;
  const bShow = sB.kind === "main" ? poseAt(shownB, false) : pB;
  const gap = gapAt(r, tau);
  // the gap, as a band along the track between the two cars
  const lo = Math.min(sA.d, shownB), hi = Math.max(sA.d, shownB), pts = [];
  for (let u = lo; u < hi; u += 0.006) pts.push(loopAt(u));
  pts.push(loopAt(hi));
  const tone = gap > 0 ? "red" : "green";
  el.band.innerHTML = pts.length > 1 ? '<path class="iso-line" data-tone="' + tone + '" data-free="both" d="' + onTop(pts, TRACK_H + 1.6, P) + '" style="stroke-width:1.6"/>' : "";
  const items = [[pA, "car-a", sA.kind === "box"], [bShow, "car-b", sB.kind === "box"]].sort((a, b) => depthOf([a[0].x, a[0].y, 0], P) - depthOf([b[0].x, b[0].y, 0], P));
  el.cars.innerHTML = items.map(([pose, cls, stopped]) => car(pose, cls, stopped)).join("") + [[pA, "A"], [bShow, "B"]].map(([pose, name]) => faceTextSvg(topMatrix([pose.x, pose.y - 13], TRACK_H + 8, P, "x"), name, { size: 5, tone: "hi", anchor: "middle" }).replace("<text ", '<text style="fill:' + (name === "A" ? "#2f5bea" : "#f0481e") + ';font-weight:700" ')).join("");
  needles[0].setAttribute("d", needleAt(GAUGES[0], sA.age));
  needles[1].setAttribute("d", needleAt(GAUGES[1], sB.age));
  const slat = p - RIG.P_MIN;
  el.pin.setAttribute("transform", translateAlong(P, [SLAT_X[slat], 0, SLAT_H[slat]]));
  if (slat !== litSlat) { if (litSlat >= 0) slats[litSlat].removeAttribute("data-lit"); slats[slat].setAttribute("data-lit", ""); litSlat = slat; }
  const done = Math.max(timeAt(r.A, 4), timeAt(r.B, 4));
  const m = margin(p);
  const text = "pit lap " + p + " \\u00b7 " + (tau < done ? (gap > 0 ? "B " + gap.toFixed(1) + " s behind" : "B " + (-gap).toFixed(1) + " s ahead") : m > 0 ? "undercut works: B " + m.toFixed(1) + " s ahead" : "undercut fails: B " + (-m).toFixed(1) + " s behind");
  if (readout.textContent !== text) readout.textContent = text;
}
function restart(next) {
  p = clamp(next, RIG.P_MIN, RIG.P_MAX); r = race(p); tau = 0; hold = 0;
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (tau < r.end) tau = Math.min(r.end, tau + dt * RIG.SPEEDUP);
  else {
    hold += dt;
    if (hold > 2) {
      if (touring) { tourAt = (tourAt + 1) % TOUR.length; restart(TOUR[tourAt]); } else restart(p);
    }
  }
  draw();
  stage.setAttribute("aria-valuenow", String(p));
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => {
  touring = false; clearTimeout(idleTimer);
  if (clamp(next, RIG.P_MIN, RIG.P_MAX) !== p) restart(next);
  idleTimer = setTimeout(() => { if (!still.matches) { touring = true; run(); } }, 6000);
  run();
};
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  steer(Math.round(RIG.P_MIN + clamp(((event.clientX - box.left) / box.width - 0.1) / 0.8, 0, 1) * (RIG.P_MAX - RIG.P_MIN)));
});
stage.addEventListener("keydown", (event) => {
  let next = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") next = p + (event.shiftKey ? 4 : 1);
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = p - (event.shiftKey ? 4 : 1);
  if (event.key === "Home") next = RIG.P_MIN;
  if (event.key === "End") next = RIG.P_MAX;
  if (next === null) return;
  event.preventDefault();
  steer(next);
});
draw();
`;

const carColour = (cls, c) => `.${cls}>.iso-fill{fill:${c.fill}}.${cls}>.iso-top{fill:${c.top}}.${cls}>.iso-shade[data-shade="0"]{fill:${c.s0}}.${cls}>.iso-shade[data-shade="1"]{fill:${c.s1}}.${cls}>.iso-shade[data-shade="2"]{fill:${c.s2}}.${cls}>.iso-shade[data-shade="3"]{fill:${c.s3}}.${cls}>.iso-edge{stroke:${c.edge}}`;
const CAR_CSS =
  carColour("car-a", { fill: "#2f5bea", top: "#7d99f7", s0: "#1c3aa8", s1: "#2347c0", s2: "#2a52d6", s3: "#3862ea", edge: "#12247a" }) +
  carColour("car-b", { fill: "#f0481e", top: "#ff8a63", s0: "#a82c0c", s1: "#c43713", s2: "#dc4119", s3: "#ee5128", edge: "#7a1f06" }) +
  `.car-dark.car-a>.iso-fill,.car-dark.car-a>.iso-top{fill:#1c3aa8}.car-dark.car-b>.iso-fill,.car-dark.car-b>.iso-top{fill:#a82c0c}` +
  `.car-helmet>.iso-fill,.car-helmet>.iso-top{fill:#fff}.car-helmet>.iso-shade{fill:#d8d8d4}.car-helmet>.iso-edge{stroke:#333}` +
  `.car-tyre>.iso-fill{fill:#1a1a1c}.car-tyre>.iso-top{fill:#3a3a3e}.car-tyre>.iso-shade{fill:#202024}.car-tyre>.iso-edge{stroke:#000}`;
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "An oval circuit with a pit lane on the near straight, and two cars: A in front, B a few seconds behind. A band stretched along the track between them shows the gap. Car B pits on the lap you pick and A stops one lap later. A row of slats inside the oval shows, for each pit lap, how far ahead B ends up once both have stopped: the slats rise past a crossover lap where the fresh tyres have beaten the gap. Two dials show tyre age.",
  body: [
    `<style>${CAR_CSS}</style>`,
    plate(),
    pitLane(),
    track(),
    comb(),
    ...GAUGES.map((g) => gauge(g) + `<path data-part="needle-${g.key}" class="iso-line" data-tone="lit" data-free="both" d="${needleAt(g, R.RIG.S)}" style="stroke-width:1.1"/>`),
    `<g data-part="pin">${pin()}</g>`,
    `<g data-part="band"></g>`,
    `<g data-part="cars"></g>`,
  ],
});

const body = k.plateHtml({
  fig: "Fig 7",
  title: "Undercut",
  hint: "Move across to pick the pit lap",
  readout: `pit lap 13 · B behind`,
  keys: [
    { mark: "lit", label: "Chaser B, the pit lap you picked, needles" },
    { mark: "raised", label: "Leader A, track and pit lane" },
    { mark: "red", label: "The gap while B is behind; break-even line" },
  ],
  caption:
    `Car B is ${R.RIG.GAP0} seconds behind A. A stop costs about ${R.RIG.L} seconds, but fresh tyres are quicker every lap, and the older the old ones get, the more B gains on the lap A stays out. A answers one lap later. The slats show how far ahead B ends up once both have stopped: stop too early and the fresh tyres do not repay the gap, past lap ${R.crossover()} they do.`,
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Undercut: arrow keys change the lap car B pits on" aria-valuemin="${R.RIG.P_MIN}" aria-valuemax="${R.RIG.P_MAX}" aria-valuenow="13">${svg}</div>`,
});

const script = kitScript() + "\n" + source("rig.mjs") + "\n" + source("track.mjs") + "\n" + live;
writeFileSync(join(HERE, OUT), k.pageHtml({ title: "Undercut", theme, body, script }));
console.log("wrote", OUT, "svg", Math.round(svg.length / 1024) + " KB", "crossover", R.crossover());
