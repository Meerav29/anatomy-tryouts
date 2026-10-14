import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../kit/iso-kit.mjs";
import { kitScript } from "../scripts/inline-kit.mjs";
import * as R from "./rig.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";
const OUT = theme === "light" ? "friction-circle-light.html" : "friction-circle.html";

const { K, PUCK_R, PEG_R } = R.RIG;
const WIDTH = 640;
const HEIGHT = 420;

const PLATE = { x: -132, y: -118, w: 264, d: 212, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const DISH_R = 64;
const DISH_Z = 3;
const RAIL_X = 78;
const PUCK_TOP = DISH_Z + 5;
const BAR_Z = 14;
const BAR_TOP = 20;
const CARR_Z = 12;
const CARR_TOP = 24;
const CARR_OFF = 7; // the carriage hangs on the near face of the bar

const GAUGES = [
  { at: [-72, -94], label: "LAT G", key: "lat", signed: true },
  { at: [0, -94], label: "LONG G", key: "long", signed: true },
  { at: [72, -94], label: "GRIP", key: "grip", signed: false },
];
const GAUGE_R = 17;
const GAUGE_Z = 24;
const GAUGE_H = 10;
const GAUGE_TOP = GAUGE_Z + GAUGE_H;
const GAUGE_FROM = (-135 * Math.PI) / 180;
const GAUGE_SPAN = (270 * Math.PI) / 180;

const SEL_BOX = { x: 94, y: 18, w: 30, d: 36, r: 3 };
const SEL_BOX_H = 14;
const SEL = [SEL_BOX.x + 15, SEL_BOX.y + 12];
const SEL_R = 7;
const SEL_TOP = SEL_BOX_H + 4;
const LAMP = [SEL_BOX.x + 15, SEL_BOX.y + 28];

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), ...GAUGES.map((g) => [g.at[0], g.at[1], GAUGE_TOP + 2]), [0, 0, CARR_TOP + 4]],
  WIDTH,
  HEIGHT,
  { pad: 18, azimuth: 76, elevation: 40 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

/* ---------------------------------------------------------------- plate */
function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));

  // ruler along the near edge
  const strip = { x: -92, y: 76, w: 184, d: 8, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(-86, 86, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 5, 0.6]), at([strip.x + strip.w - 2, strip.y + 5, 0.6])], { size: 0.45 }));

  // label plate
  const label = { x: 82, y: 68, w: 42, d: 10, r: 1.6 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 4), { tone: "faint" }));
  const rule = (x0, x1, y) => L(k.lineOnTop([x0, y], [x1, y], 0.8, P), { tone: "lo", free: true });
  out.push(rule(label.x + 5, label.x + 30, label.y + 3.4), rule(label.x + 5, label.x + 22, label.y + 5.2), rule(label.x + 5, label.x + 27, label.y + 7));
  out.push(D([at([label.x + 3.2, label.y + 5, 0.8]), at([label.x + label.w - 3.2, label.y + 5, 0.8])], { size: 0.4 }));

  // vents down the left side
  for (let i = 0; i < 7; i++) out.push(L(k.planOutline({ x: -124, y: -26 + i * 10, w: 2.6, d: 6, r: 1.3 }, 0, P, 3), { tone: "lo" }));
  return out.join("");
}

/* ---------------------------------------------------------------- gauges */
function gauge({ at: [x, y], label, signed }) {
  const out = [`<path class="iso-halo" d="${k.cylinder(x, y, 12, 0, 0.1, P, 32).fill}" style="filter:blur(3px)"/>`];
  out.push(S(k.cylinder(x, y, 11, 0, 3, P, 40, 0.5), { tone: "mid" }));
  out.push(D(Array.from({ length: 4 }, (_, i) => at([x + 8 * Math.cos(i * 1.5708 + 0.785), y + 8 * Math.sin(i * 1.5708 + 0.785), 3])), { size: 0.4 }));
  out.push(S(k.cylinder(x, y, 4.2, 3, GAUGE_Z - 6, P, 24), { tone: "mid", crease: "none" }));
  out.push(L([8, 14].map((z) => k.sideArc(x, y, 4.2, z, P, 12)).join(""), { tone: "faint" }));
  out.push(S(k.cylinder(x, y, 6.4, GAUGE_Z - 6, 3, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, GAUGE_R, GAUGE_Z, GAUGE_H, P, 64, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(x, y, GAUGE_R, GAUGE_TOP - 3.4, GAUGE_TOP, 84, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(x, y, GAUGE_R, GAUGE_TOP - 3.4, P, 40), { tone: "faint" }));
  out.push(L(k.ring(x, y, GAUGE_R - 2.2, GAUGE_TOP, P, 64), { tone: "lo" }));
  const ticks = k.radialTicks(x, y, GAUGE_R - 3.2, signed ? 16 : 20, signed ? 4 : 5, GAUGE_TOP, [1.2, 2.6], P, GAUGE_FROM, GAUGE_SPAN);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(L(k.ring(x, y, 1.7, GAUGE_TOP, P, 16), { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([x, y + 8.4], GAUGE_TOP, P, "x"), label, { size: 2.1, tone: "lo", anchor: "middle" }));
  return out.join("");
}
const gaugeAngle = (g, v) => GAUGE_FROM + GAUGE_SPAN * (g.signed ? 0.5 + Math.max(-1, Math.min(1, v / R.RIG.G_MAX)) / 2 : Math.max(0, Math.min(1, v)));
const needleAt = (g, v) => {
  const [x, y] = g.at;
  const angle = gaugeAngle(g, v);
  const sx = Math.sin(angle);
  const sy = -Math.cos(angle);
  return k.lineOnTop([x - sx * 3.4, y - sy * 3.4], [x + sx * (GAUGE_R - 4), y + sy * (GAUGE_R - 4)], GAUGE_TOP + 0.2, P);
};

/* ---------------------------------------------------------------- rails, dish */
function rails() {
  const out = [];
  for (const sx of [-1, 1]) {
    const plan = { x: sx * RAIL_X - 3, y: -70, w: 6, d: 140, r: 1 };
    out.push(S(k.slabOf(plan, 0, 4, P, 3, 0.4), { tone: "mid" }));
    out.push(D([-60, 0, 60].map((y) => at([sx * RAIL_X, y, 4])), { size: 0.4 }));
    for (const y of [-76, 71]) {
      out.push(S(k.slabOf({ x: sx * RAIL_X - 6, y, w: 12, d: 5, r: 1.2 }, 0, 9, P, 3, 0.5), { tone: "mid" }));
      out.push(D([at([sx * RAIL_X - 2.5, y + 2.5, 9]), at([sx * RAIL_X + 2.5, y + 2.5, 9])], { size: 0.45 }));
    }
  }
  return out.join("");
}

function dish() {
  const out = [`<path class="iso-halo" d="${k.cylinder(0, 0, DISH_R, 0, 1, P, 96).fill}" style="filter:blur(5px)"/>`];
  out.push(S(k.cylinder(0, 0, DISH_R, 0, DISH_Z, P, 120, 0.7), { tone: "mid", crease: "lo" }));
  // the g-g chart: a ring every half g and the two axes, all closed on the rim
  const rim = DISH_R - 3.6;
  out.push(L(k.ring(0, 0, rim, DISH_Z, P, 120), { tone: "lo" }));
  for (const g of [0.5, 1, 1.5]) out.push(L(k.ring(0, 0, g * K, DISH_Z, P, 96), { tone: "faint" }));
  out.push(L(k.lineOnTop([-rim, 0], [rim, 0], DISH_Z, P), { tone: "faint" }));
  out.push(L(k.lineOnTop([0, -rim], [0, rim], DISH_Z, P), { tone: "faint" }));
  const ticks = k.radialTicks(0, 0, rim, 72, 6, DISH_Z, [1.8, 3.4], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(L(k.sideArc(0, 0, DISH_R, DISH_Z - 1.6, P, 60), { tone: "faint" }));
  // engraved cardinal labels, outside the chart rim
  const label = (x, y, text, along = "x") => k.faceTextSvg(k.topMatrix([x, y], DISH_Z, P, along), text, { size: 2.2, tone: "lo", anchor: "middle" });
  out.push(label(0, rim - 6.2, "BRAKE"), label(0, -rim + 8.4, "ACCEL"));
  out.push(label(-rim + 9, 0.8, "LEFT"), label(rim - 9, 0.8, "RIGHT"));
  // centre cross
  out.push(L(k.ring(0, 0, 1.6, DISH_Z, P, 14), { tone: "mid" }));
  return out.join("");
}

/* ---------------------------------------------------------------- moving parts (built at the origin) */
function puck() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.cylinder(0, 0, PUCK_R + 1, DISH_Z, 0.1, P, 24).fill}" style="filter:blur(2px)"/>`);
  out.push(S(k.cylinder(0, 0, PUCK_R, DISH_Z, 5, P, 28, 0.5), { tone: "hi", lit: true, crease: "lo" }));
  out.push(L(k.ring(0, 0, PUCK_R - 1.3, PUCK_TOP, P, 24), { tone: "faint" }));
  out.push(L(k.ring(0, 0, 1.2, PUCK_TOP, P, 12), { tone: "mid" }));
  return out.join("");
}
function bar() {
  const out = [];
  // end blocks riding the rails, and the cross bar between them
  for (const sx of [-1, 1]) {
    const blk = { x: sx * RAIL_X - 5.5, y: -6, w: 11, d: 12, r: 2 };
    out.push(S(k.slabOf(blk, 4, 18, P, 4, 0.5), { tone: "mid" }));
    out.push(D(k.corners(blk, 2.4).map(([x, y]) => at([x, y, 22])), { size: 0.4 }));
  }
  const body = { x: -RAIL_X + 5.5, y: -3, w: 2 * RAIL_X - 11, d: 6, r: 1 };
  out.push(S(k.slabOf(body, BAR_Z, BAR_TOP - BAR_Z, P, 3, 0.5), { tone: "hi", crease: "lo" }));
  const ticks = k.topTicks(-RAIL_X + 12, RAIL_X - 12, 4, 5, -2.2, BAR_TOP, [1.2, 2.4], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  return out.join("");
}
function carriage() {
  const out = [];
  out.push(S(k.cylinder(0, 0, 1.2, PUCK_TOP, CARR_Z - PUCK_TOP, P, 14), { tone: "mid", crease: "none" }));
  const blk = { x: -7, y: -4, w: 14, d: 8, r: 1.6 };
  out.push(S(k.slabOf(blk, CARR_Z, CARR_TOP - CARR_Z, P, 3, 0.5), { tone: "hi", crease: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(blk, 1.4), CARR_TOP, P, 3), { tone: "faint" }));
  out.push(D([at([-4.6, 0, CARR_TOP]), at([4.6, 0, CARR_TOP])], { size: 0.4 }));
  return out.join("");
}

/* ---------------------------------------------------------------- selector, lamp */
function selector() {
  const out = [`<path class="iso-halo" d="${k.haloOf(SEL_BOX, 0, 0.1, P)}" style="filter:blur(3px)"/>`];
  out.push(S(k.slabOf(SEL_BOX, 0, SEL_BOX_H, P, 5, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(SEL_BOX, 3), SEL_BOX_H, P, 4), { tone: "faint" }));
  out.push(D(k.corners(SEL_BOX, 4.4).map(([x, y]) => at([x, y, SEL_BOX_H])), { size: 0.45 }));
  // three detents, 135 degrees apart, on a ring
  out.push(L(k.ring(SEL[0], SEL[1], 10.4, SEL_BOX_H, P, 48), { tone: "lo" }));
  const t = k.radialTicks(SEL[0], SEL[1], 10.4, 2, 1, SEL_BOX_H, [2.4, 2.4], P, GAUGE_FROM, GAUGE_SPAN);
  out.push(L(t.major, { tone: "mid" }));
  // lamp: lit while the puck is held against the pegs
  out.push(S(k.cylinder(LAMP[0], LAMP[1], 4.2, SEL_BOX_H, 1.6, P, 24, 0.3), { tone: "mid" }));
  out.push(`<g data-part="lamp">${S(k.cylinder(LAMP[0], LAMP[1], 2.8, SEL_BOX_H + 1.6, 2, P, 20, 0.2), { tone: "hi" })}</g>`);
  return out.join("");
}
const selPointer = (index) => {
  const angle = GAUGE_FROM + (GAUGE_SPAN * index) / 2;
  const sx = Math.sin(angle);
  const sy = -Math.cos(angle);
  return k.lineOnTop([SEL[0] + sx * 1.8, SEL[1] + sy * 1.8], [SEL[0] + sx * SEL_R, SEL[1] + sy * SEL_R], SEL_TOP, P);
};
function selTop() {
  const out = [];
  out.push(S(k.cylinder(SEL[0], SEL[1], SEL_R, SEL_BOX_H, 4, P, 32, 0.4), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(SEL[0], SEL[1], SEL_R, SEL_BOX_H, SEL_TOP, 28, P, 0.4), { tone: "lo" }));
  out.push(L(k.ring(SEL[0], SEL[1], 1.1, SEL_TOP, P, 12), { tone: "mid" }));
  return out.join("");
}

/* ---------------------------------------------------------------- live source */
const rigSource = () => readFileSync(join(HERE, "rig.mjs"), "utf8").replace(/^export /gm, "");

const live = `
const P = ${JSON.stringify(P)};
const GAUGES = ${JSON.stringify(GAUGES)};
const GAUGE_R = ${GAUGE_R}, GAUGE_TOP = ${GAUGE_TOP}, GAUGE_FROM = ${GAUGE_FROM}, GAUGE_SPAN = ${GAUGE_SPAN};
const SEL = ${JSON.stringify(SEL)}, SEL_R = ${SEL_R}, SEL_TOP = ${SEL_TOP};
const DISH_Z = ${DISH_Z}, CARR_OFF = ${CARR_OFF};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const $ = (name) => svg.querySelector('[data-part="' + name + '"]');
const needles = GAUGES.map((g) => $("needle-" + g.key));
const parts = { pegs: $("pegs"), puck: $("puck"), bar: $("bar"), carriage: $("carriage"), trail: $("trail"), ring: $("limit"), pointer: $("pointer"), lamp: $("lamp").querySelector(".iso-solid") };
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const angleOf = (g, v) => GAUGE_FROM + GAUGE_SPAN * (g.signed ? 0.5 + clamp(v / RIG.G_MAX, -1, 1) / 2 : clamp(v, 0, 1));
const needleAt = (g, v) => {
  const angle = angleOf(g, v), sx = Math.sin(angle), sy = -Math.cos(angle);
  return lineOnTop([g.at[0] - sx * 3.4, g.at[1] - sy * 3.4], [g.at[0] + sx * (GAUGE_R - 4), g.at[1] + sy * (GAUGE_R - 4)], GAUGE_TOP + 0.2, P);
};
const selPointer = (index) => {
  const angle = GAUGE_FROM + (GAUGE_SPAN * index) / 2, sx = Math.sin(angle), sy = -Math.cos(angle);
  return lineOnTop([SEL[0] + sx * 1.8, SEL[1] + sy * 1.8], [SEL[0] + sx * SEL_R, SEL[1] + sy * SEL_R], SEL_TOP, P);
};

let compound = 0, mu = RIG.COMPOUNDS[0].mu;
let demand = [0, 1], px = 0, py = -RIG.K; // demand in g, puck on the dish
let shown = { lat: 0, long: 1, grip: 0 };
let frame = 0, last = 0, visible = false, touring = !still.matches, clock = 0, idleTimer = 0, lastMu = -1;
const trail = [];
const puckEl = parts.puck;

function buildPegs() {
  const rp = mu * RIG.K + RIG.PUCK_R + RIG.PEG_R;
  const items = [];
  for (let i = 0; i < RIG.PEGS; i++) {
    const a = (i / RIG.PEGS) * Math.PI * 2, x = rp * Math.cos(a), y = rp * Math.sin(a);
    items.push({ x, y, svg: solidSvg(cylinder(x, y, RIG.PEG_R, DISH_Z, 6, P, 12, 0.3), { tone: "mid" }) });
  }
  return items;
}
function placePegs(pegs) {
  // the puck sits among the pegs at its own depth
  const dp = depthOf([px, py, 0], P);
  const sorted = pegs.slice().sort((a, b) => depthOf([a.x, a.y, 0], P) - depthOf([b.x, b.y, 0], P));
  let html = "", put = false;
  for (const peg of sorted) {
    if (!put && depthOf([peg.x, peg.y, 0], P) > dp) { html += '<g data-part="puck" transform="' + translateAlong(P, [px, py, 0]) + '">' + PUCK + "</g>"; put = true; }
    html += peg.svg;
  }
  if (!put) html += '<g data-part="puck" transform="' + translateAlong(P, [px, py, 0]) + '">' + PUCK + "</g>";
  parts.pegs.innerHTML = html;
}
const PUCK = parts.puck.innerHTML;
parts.puck.remove();
let pegCache = null;

function draw(out) {
  if (mu !== lastMu) { pegCache = buildPegs(); lastMu = mu; parts.ring.setAttribute("d", ring(0, 0, mu * RIG.K, DISH_Z, P, 96)); }
  placePegs(pegCache);
  parts.bar.setAttribute("transform", translateAlong(P, [0, py - CARR_OFF, 0]));
  parts.carriage.setAttribute("transform", translateAlong(P, [px, py, 0]));
  GAUGES.forEach((g, i) => needles[i].setAttribute("d", needleAt(g, shown[g.key])));
  parts.pointer.setAttribute("d", selPointer(compound));
  if (out.slide) parts.lamp.setAttribute("data-lit", ""); else parts.lamp.removeAttribute("data-lit");
  // the pen trail: the last few seconds, fading with age
  const cut = clock - 2.6;
  while (trail.length && trail[0].t < cut) trail.shift();
  const buckets = [[], [], [], [], [], []];
  for (let i = 1; i < trail.length; i++) {
    const b = clamp(Math.floor(((trail[i].t - cut) / 2.6) * 6), 0, 5);
    buckets[b].push([trail[i - 1], trail[i]]);
  }
  parts.trail.innerHTML = buckets.map((segs, b) => segs.length ? '<g opacity="' + (0.15 + b * 0.17).toFixed(2) + '">' + lineSvg(segs.map(([a, c]) => lineOnTop([a.x, a.y], [c.x, c.y], DISH_Z, P)).join(""), { tone: "lit", free: true }) + "</g>" : "").join("");
  const text = "\\u03bc " + mu.toFixed(1) + " \\u00b7 lat " + out.lat.toFixed(1) + " \\u00b7 long " + out.long.toFixed(1) + " \\u00b7 grip " + Math.round(out.grip * 100) + "%";
  if (readout.textContent !== text) readout.textContent = text;
}

let pointer = null; // demand from the pointer, in g
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  clock += dt;
  let want = compound;
  if (touring) {
    const lap = clock / RIG.LAP;
    want = Math.floor(lap) % RIG.COMPOUNDS.length;
    demand = lapAt(lap);
  } else if (pointer) demand = pointer;
  if (want !== compound) { compound = want; }
  const goalMu = RIG.COMPOUNDS[compound].mu;
  mu = calm ? goalMu : mu + (goalMu - mu) * (1 - Math.exp(-dt / 0.3));
  if (Math.abs(goalMu - mu) < 0.002) mu = goalMu;
  const out = limitOf(demand[0], demand[1], mu);
  const tx = out.lat * RIG.K, ty = -out.long * RIG.K;
  const f = calm ? 1 : 1 - Math.exp(-dt / 0.07);
  px += (tx - px) * f; py += (ty - py) * f;
  const gl = { lat: out.lat, long: out.long, grip: out.grip };
  for (const key of ["lat", "long", "grip"]) shown[key] += (gl[key] - shown[key]) * (calm ? 1 : 1 - Math.exp(-dt / 0.12));
  if (!trail.length || Math.hypot(trail[trail.length - 1].x - px, trail[trail.length - 1].y - py) > 0.4) trail.push({ x: px, y: py, t: clock });
  draw(out);
  stage.setAttribute("aria-valuetext", "mu " + mu.toFixed(1) + ", lateral " + out.lat.toFixed(1) + " g, longitudinal " + out.long.toFixed(1) + " g");
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const take = () => { touring = false; clearTimeout(idleTimer); idleTimer = setTimeout(() => { if (!still.matches) { touring = true; clock = Math.ceil(clock / RIG.LAP) * RIG.LAP + compound * 0; } }, 5200); };
const cycle = (by) => { take(); compound = (compound + by + RIG.COMPOUNDS.length) % RIG.COMPOUNDS.length; if (!pointer) pointer = [0, 0]; run(); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const nx = (event.clientX - box.left) / box.width, ny = (event.clientY - box.top) / box.height;
  take();
  pointer = [clamp((nx - 0.5) / 0.3, -1, 1) * RIG.G_MAX, clamp((0.46 - ny) / 0.34, -1, 1) * RIG.G_MAX];
  run();
});
stage.addEventListener("click", () => cycle(1));
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowUp" || event.key === "ArrowRight") { event.preventDefault(); cycle(1); }
  if (event.key === "ArrowDown" || event.key === "ArrowLeft") { event.preventDefault(); cycle(-1); }
  if (event.key === " " || event.key === "Enter") { event.preventDefault(); touring = true; clock = 0; run(); }
});
draw(limitOf(0, 1, mu));
`;

const START = R.limitOf(0, 1, R.RIG.COMPOUNDS[0].mu);
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "An XY pen plotter over a round dish. A puck on a crosshead moves with the driver's demand: up for acceleration, down for braking, sideways for cornering. A ring of pegs at the tyre's grip limit stops it, and a pen draws the trace. Three dial gauges read lateral g, longitudinal g and how much of the grip is used. A selector switches between slick, intermediate and wet tyres, shrinking the ring.",
  body: [
    plate(),
    ...GAUGES.map((g) => gauge(g) + `<path data-part="needle-${g.key}" class="iso-line" data-tone="lit" data-free="both" d="${needleAt(g, START[g.key])}" style="stroke-width:1.1"/>`),
    rails(),
    dish(),
    `<path data-part="limit" class="iso-line" data-tone="lit" d="${k.ring(0, 0, R.RIG.COMPOUNDS[0].mu * K, DISH_Z, P, 96)}" style="stroke-width:0.9"/>`,
    `<g data-part="trail"></g>`,
    `<g data-part="pegs"><g data-part="puck">${puck()}</g></g>`,
    `<g data-part="bar" transform="${k.translateAlong(P, [0, -K - CARR_OFF + 0, 0])}">${bar()}</g>`,
    `<g data-part="carriage" transform="${k.translateAlong(P, [0, -K, 0])}">${carriage()}</g>`,
    selector(),
    selTop(),
    `<path data-part="pointer" class="iso-line" data-tone="hi" data-free="start" d="${selPointer(0)}"/>`,
  ],
});

const body = k.plateHtml({
  fig: "Fig 4",
  title: "Friction circle",
  hint: "Move to drive · click to change tyres",
  readout: `μ ${R.RIG.COMPOUNDS[0].mu.toFixed(1)} · lat ${START.lat.toFixed(1)} · long ${START.long.toFixed(1)} · grip ${Math.round(START.grip * 100)}%`,
  keys: [
    { mark: "lit", label: "Puck, trace and gauge needles: what the tyre delivers" },
    { mark: "edge", label: "Peg ring: the grip limit, μ times one g" },
  ],
  caption:
    "A tyre has one budget of grip, shared between braking, accelerating and turning: the two together can never exceed μ g, so the demand has to stay inside a circle. Brake hard and there is little left to turn with; turn hard and there is little left to accelerate. Switch to a wetter tyre and the circle shrinks, so the same driving gets pushed against the pegs and the lamp lights: a slide.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Friction circle: move the pointer to drive, arrow keys or a click change the tyre compound" aria-valuemin="0" aria-valuemax="2" aria-valuenow="1">${svg}</div>`,
});

const script = kitScript() + "\n" + rigSource() + "\n" + live;
writeFileSync(join(HERE, OUT), k.pageHtml({ title: "Friction circle", theme, body, script }));
console.log("wrote", OUT, "svg", Math.round(svg.length / 1024) + " KB");
