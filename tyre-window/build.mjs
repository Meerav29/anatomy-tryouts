import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../kit/iso-kit.mjs";
import { kitScript } from "../scripts/inline-kit.mjs";
import * as R from "./rig.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";
const OUT = theme === "light" ? "tyre-window-light.html" : "tyre-window.html";

const { SLATS, STEP, T0, T1 } = R.RIG;
const WIDTH = 640;
const HEIGHT = 420;

const PLATE = { x: -150, y: -118, w: 300, d: 226, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;

const Y0 = -21; // the line the block, platen and spring all lie on
const PLATEN = { x: -40, y: -52, w: 80, d: 62, r: 3 };
const PLATEN_Z = 4;
const PLATEN_TOP = 14;
const STROKE = 14;
const BLOCK = { x: -7, y: Y0 - 6, w: 14, d: 12, r: 1.5 };
const BLOCK_TOP = PLATEN_TOP + 8;
const HOLDER = { x: -9, y: Y0 - 8, w: 18, d: 16, r: 2 };
const BEAM = { x: -11, y: -64, w: 22, d: 64, r: 2 };
const BEAM_Z = 44;
const BEAM_TOP = 50;
const POST = [0, -60];
const BRACKET_X = 25;
const SPRING_Z = 31;
const SPRING_FROM = 7.5;
const SLOT_LEN = 14;
const MAX_DEFLECT = 5;

const COMB_Y = 68;
const COMB_D = 14;
const COMB_X0 = -110.2;
const COMB_PITCH = 7.6;
const SLAT_W = 6.4;
const slatX = (i) => COMB_X0 + COMB_PITCH * i;
const heightOf = (mu) => 6 + 36 * mu;
const cursorX = (T) => COMB_X0 + (COMB_PITCH / STEP) * (T - T0);
const ARM_Z = 46;

const GAUGES = [
  { at: [-80, -100], label: "TEMP", key: "temp", count: 12, every: 2 },
  { at: [0, -100], label: "GRIP", key: "grip", count: 10, every: 5 },
  { at: [80, -100], label: "WEAR", key: "wear", count: 8, every: 4 },
];
const GAUGE_R = 17;
const GAUGE_Z = 24;
const GAUGE_H = 10;
const GAUGE_TOP = GAUGE_Z + GAUGE_H;
const GAUGE_FROM = (-135 * Math.PI) / 180;
const GAUGE_SPAN = (270 * Math.PI) / 180;
const WEAR_FULL = 4;

const START_T = 60;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), ...GAUGES.map((g) => [g.at[0], g.at[1], GAUGE_TOP + 2]), [0, Y0, 60]],
  WIDTH,
  HEIGHT,
  { pad: 16, azimuth: 62, elevation: 38 },
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

  // temperature ruler along the near edge: one tick per slat, a major every 20 deg
  const strip = { x: -116, y: 90, w: 232, d: 8, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(slatX(0), slatX(SLATS - 1), COMB_PITCH, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 5.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 5.5, 0.6])], { size: 0.45 }));
  for (const i of [0, 15, 25]) out.push(k.faceTextSvg(k.topMatrix([slatX(i), strip.y + 7], 0.6, P, "x"), String(R.slatT(i)), { size: 2.2, tone: "lo", anchor: "middle" }));

  // label plate
  const label = { x: 104, y: 70, w: 40, d: 10, r: 1.6 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 4), { tone: "faint" }));
  const rule = (x0, x1, y) => L(k.lineOnTop([x0, y], [x1, y], 0.8, P), { tone: "lo", free: true });
  out.push(rule(label.x + 5, label.x + 28, label.y + 3.4), rule(label.x + 5, label.x + 21, label.y + 5.2), rule(label.x + 5, label.x + 26, label.y + 7));
  out.push(D([at([label.x + 3.2, label.y + 5, 0.8]), at([label.x + label.w - 3.2, label.y + 5, 0.8])], { size: 0.4 }));

  // vents down the left side
  for (let i = 0; i < 8; i++) out.push(L(k.planOutline({ x: -142, y: -40 + i * 10, w: 2.6, d: 6, r: 1.3 }, 0, P, 3), { tone: "lo" }));
  return out.join("");
}

/* ---------------------------------------------------------------- gauges */
function gauge({ at: [x, y], label, count, every, key }) {
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
  const ticks = k.radialTicks(x, y, GAUGE_R - 3.2, count, every, GAUGE_TOP, [1.2, 2.6], P, GAUGE_FROM, GAUGE_SPAN);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  // the window, as a bold arc inside the temperature dial's ticks
  if (key === "temp") {
    const a0 = GAUGE_FROM + GAUGE_SPAN * ((80 - T0) / (T1 - T0));
    const a1 = GAUGE_FROM + GAUGE_SPAN * ((102 - T0) / (T1 - T0));
    const pts = Array.from({ length: 12 }, (_, i) => {
      const a = a0 + ((a1 - a0) * i) / 11;
      return [x + Math.sin(a) * (GAUGE_R - 6.4), y - Math.cos(a) * (GAUGE_R - 6.4)];
    });
    out.push(`<path class="iso-line" data-tone="lit" data-free="both" d="${k.onTop(pts, GAUGE_TOP, P)}" style="stroke-width:1.5"/>`);
  }
  out.push(L(k.ring(x, y, 1.7, GAUGE_TOP, P, 16), { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([x, y + 9], GAUGE_TOP, P, "x"), label, { size: 2.1, tone: "lo", anchor: "middle" }));
  return out.join("");
}
const valueOf = (key, v) => (key === "temp" ? (v - T0) / (T1 - T0) : key === "wear" ? v / WEAR_FULL : v);
const needleAt = ({ at: [x, y], key }, v) => {
  const angle = GAUGE_FROM + GAUGE_SPAN * Math.min(1, Math.max(0, valueOf(key, v)));
  const sx = Math.sin(angle);
  const sy = -Math.cos(angle);
  return k.lineOnTop([x - sx * 3.4, y - sy * 3.4], [x + sx * (GAUGE_R - 4), y + sy * (GAUGE_R - 4)], GAUGE_TOP + 0.2, P);
};

/* ---------------------------------------------------------------- rig */
function rails() {
  const out = [];
  for (const y of [-50, 2]) {
    out.push(S(k.slabOf({ x: -72, y, w: 144, d: 5, r: 1 }, 0, 4, P, 3, 0.4), { tone: "mid" }));
    out.push(D([-66, 66].map((x) => at([x, y + 2.5, 4])), { size: 0.4 }));
  }
  // rear rail for the comb's probe carriage
  out.push(S(k.slabOf({ x: -122, y: COMB_Y - 10.4, w: 244, d: 4.4, r: 1 }, 0, 3, P, 3, 0.4), { tone: "mid" }));
  out.push(D([-116, 116].map((x) => at([x, COMB_Y - 8.2, 3])), { size: 0.4 }));
  for (const x of [-126, 121]) {
    out.push(S(k.slabOf({ x, y: COMB_Y - 12, w: 5, d: 8, r: 1.2 }, 0, 7, P, 3, 0.5), { tone: "mid" }));
    out.push(D([at([x + 2.5, COMB_Y - 8, 7])], { size: 0.45 }));
  }
  for (const x of [-77, 72]) {
    out.push(S(k.slabOf({ x, y: -53, w: 5, d: 63, r: 1.2 }, 0, 8, P, 3, 0.5), { tone: "mid" }));
    out.push(D([at([x + 2.5, -48, 8]), at([x + 2.5, 5, 8])], { size: 0.45 }));
  }
  return out.join("");
}

// debris: crumbs of rubber that collect on the platen as the block wears; fixed positions, shown one by one
const CRUMBS = (() => {
  let seed = 4421;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  return Array.from({ length: 40 }, () => [Math.round((-30 + rand() * 60) * 10) / 10, Math.round((-38 + rand() * 34) * 10) / 10]);
})();
const LAMPS = Array.from({ length: 8 }, (_, i) => [-28 + i * 8, 6.4]);

function platen() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATEN, PLATEN_Z, 0.1, P)}" style="filter:blur(4px)"/>`];
  out.push(S(k.slabOf(PLATEN, PLATEN_Z, PLATEN_TOP - PLATEN_Z, P, 4, 0.8), { tone: "mid" }));
  // heated track insert
  out.push(L(k.planOutline({ x: -34, y: -42, w: 68, d: 38, r: 2 }, PLATEN_TOP, P, 3), { tone: "lo" }));
  out.push(L(k.planOutline({ x: -35.4, y: -43.4, w: 70.8, d: 40.8, r: 2.6 }, PLATEN_TOP, P, 3), { tone: "faint" }));
  out.push(D(k.corners(PLATEN, 3.2).map(([x, y]) => at([x, y, PLATEN_TOP])), { size: 0.45 }));
  // vent slots along the back margin
  for (let i = 0; i < 7; i++) out.push(L(k.planOutline({ x: -27 + i * 9, y: -49, w: 6, d: 2.2, r: 1.1 }, PLATEN_TOP, P, 3), { tone: "lo" }));
  // temperature lamps along the front margin
  out.push(LAMPS.map(([x, y], i) => `<g data-lamp="${i}">${S(k.cylinder(x, y, 1.9, PLATEN_TOP, 1.2, P, 16, 0.2), { tone: "hi" })}</g>`).join(""));
  // crumbs
  out.push(CRUMBS.map(([x, y], i) => `<g data-crumb="${i}" style="display:none">${D([at([x, y, PLATEN_TOP])], { size: 0.7, tone: "mid" })}</g>`).join(""));
  return out.join("");
}

function holder() {
  const out = [];
  out.push(S(k.slabOf(BLOCK, PLATEN_TOP, 8, P, 3, 0.4), { tone: "hi", lit: true, crease: "lo" }));
  // blister pits on the block's near face: they fade in as it overheats
  const pits = [[-4.2, 16.4, 1.3], [-1.4, 19.6, 1.0], [1.8, 16.8, 1.5], [4.4, 19.4, 1.1], [0.2, 18.2, 0.8], [-4.6, 19.8, 0.8]];
  const face = BLOCK.y + BLOCK.d;
  out.push(pits.map(([x, z, r], i) => `<g data-pit="${i}" opacity="0">${L(k.sideRing([x, face, z], r, "y", P, 14), { tone: "hi" })}</g>`).join(""));
  out.push(S(k.slabOf(HOLDER, BLOCK_TOP, 4, P, 4, 0.5), { tone: "mid" }));
  out.push(D(k.corners(HOLDER, 2.6).map(([x, y]) => at([x, y, BLOCK_TOP + 4])), { size: 0.4 }));
  // dead weights
  out.push(S(k.cylinder(0, Y0, 5.4, BLOCK_TOP + 4, 3.2, P, 28, 0.3), { tone: "mid" }));
  out.push(S(k.cylinder(0, Y0, 4.8, BLOCK_TOP + 7.2, 3.2, P, 28, 0.3), { tone: "mid" }));
  out.push(L(k.knurl(0, Y0, 4.8, BLOCK_TOP + 7.2, BLOCK_TOP + 10.4, 18, P, 0.3), { tone: "lo" }));
  // hanger rod up to the beam
  const top = BLOCK_TOP + 10.4;
  out.push(S(k.cylinder(0, Y0, 1.3, top, BEAM_Z - top, P, 14), { tone: "mid", crease: "none" }));
  // spring lug
  out.push(S(k.slabOf({ x: 4.8, y: Y0 - 2, w: 3, d: 4, r: 0.6 }, SPRING_Z - 2, 4, P, 2, 0.2), { tone: "mid" }));
  return out.join("");
}

function beam() {
  const out = [];
  out.push(S(k.slabOf(BEAM, BEAM_Z, BEAM_TOP - BEAM_Z, P, 4, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline({ x: -SLOT_LEN / 2, y: Y0 - 1.7, w: SLOT_LEN, d: 3.4, r: 1.7 }, BEAM_TOP, P, 5), { tone: "lo" }));
  out.push(D(k.corners(BEAM, 3.4).map(([x, y]) => at([x, y, BEAM_TOP])), { size: 0.4 }));
  out.push(L(k.planOutline(k.insetPlan(BEAM, 2.2), BEAM_TOP, P, 3), { tone: "faint" }));
  return out.join("");
}
function postAndBracket() {
  const out = [];
  out.push(S(k.cylinder(POST[0], POST[1], 8, 0, 3, P, 36, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(POST[0], POST[1], 5, 3, BEAM_Z - 3, P, 32), { tone: "mid", crease: "none" }));
  out.push(L([14, 26, 36].map((z) => k.sideArc(POST[0], POST[1], 5, z, P, 16)).join(""), { tone: "faint" }));
  return out.join("");
}
function bracket() {
  const out = [];
  out.push(S(k.slabOf({ x: BRACKET_X, y: Y0 - 5, w: 3, d: 10, r: 0.8 }, SPRING_Z - 6, BEAM_Z - SPRING_Z + 6, P, 2, 0.3), { tone: "mid" }));
  out.push(D([at([BRACKET_X + 1.5, Y0 - 2.5, SPRING_Z + 3]), at([BRACKET_X + 1.5, Y0 + 2.5, SPRING_Z + 3])], { size: 0.4 }));
  return out.join("");
}
function topCap() {
  return S(k.cylinder(0, Y0, 1.3, BEAM_TOP, 4, P, 14), { tone: "mid", crease: "none" }) + S(k.cylinder(0, Y0, 2.8, BEAM_TOP + 4, 2, P, 20, 0.2), { tone: "mid" });
}

/* ---------------------------------------------------------------- the grip comb and its cursor */
function comb() {
  const out = [];
  const order = Array.from({ length: SLATS }, (_, i) => i).sort((a, b) => k.depthOf([slatX(a), 0, 0], P) - k.depthOf([slatX(b), 0, 0], P));
  for (const i of order) {
    const T = R.slatT(i);
    const h = heightOf(R.muOf(T));
    const plan = { x: slatX(i) - SLAT_W / 2, y: COMB_Y, w: SLAT_W, d: COMB_D, r: 0.8 };
    out.push(`<g data-slat="${i}">${S(k.slabOf(plan, 0, h, P, 2, 0.4), { tone: R.inWindow(T) ? "hi" : "mid", crease: "lo" })}</g>`);
  }
  return out.join("");
}
function cursorLower() {
  const out = [];
  out.push(S(k.slabOf({ x: -6, y: COMB_Y - 11, w: 12, d: 7, r: 1.5 }, 3, 9, P, 3, 0.5), { tone: "mid" }));
  out.push(D([at([-3.6, COMB_Y - 7.5, 12]), at([3.6, COMB_Y - 7.5, 12])], { size: 0.4 }));
  out.push(S(k.cylinder(0, COMB_Y - 7.5, 2.2, 12, ARM_Z - 12, P, 18), { tone: "mid", crease: "none" }));
  return out.join("");
}
function cursorArm() {
  const out = [];
  const arm = { x: -2.2, y: COMB_Y - 9.7, w: 4.4, d: 9.7 + COMB_D / 2 + 2.2, r: 1 };
  out.push(S(k.slabOf(arm, ARM_Z, 4, P, 3, 0.4), { tone: "hi", crease: "lo" }));
  return out.join("");
}
const TIP_Y = COMB_Y + COMB_D / 2;
const tipAt = (T) => {
  const z0 = heightOf(R.muOf(T)) + 0.6;
  return S(k.cylinder(0, TIP_Y, 1, z0, ARM_Z - z0, P, 14), { tone: "mid", crease: "none", lit: true });
};

/* ---------------------------------------------------------------- live source */
const rigSource = () => readFileSync(join(HERE, "rig.mjs"), "utf8").replace(/^export /gm, "");

const live = `
const P = ${JSON.stringify(P)};
const GAUGES = ${JSON.stringify(GAUGES)};
const GAUGE_R = ${GAUGE_R}, GAUGE_TOP = ${GAUGE_TOP}, GAUGE_FROM = ${GAUGE_FROM}, GAUGE_SPAN = ${GAUGE_SPAN}, WEAR_FULL = ${WEAR_FULL};
const Y0 = ${Y0}, SPRING_Z = ${SPRING_Z}, SPRING_FROM = ${SPRING_FROM}, BRACKET_X = ${BRACKET_X}, STROKE = ${STROKE}, MAX_DEFLECT = ${MAX_DEFLECT};
const COMB_X0 = ${COMB_X0}, COMB_PITCH = ${COMB_PITCH}, TIP_Y = ${TIP_Y}, ARM_Z = ${ARM_Z};
const heightOf = (mu) => 6 + 36 * mu;
const cursorX = (T) => COMB_X0 + (COMB_PITCH / RIG.STEP) * (T - RIG.T0);
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const $ = (name) => svg.querySelector('[data-part="' + name + '"]');
const needles = GAUGES.map((g) => $("needle-" + g.key));
const el = { platen: $("platen"), holder: $("holder"), cap: $("cap"), spring: $("spring"), cursorA: $("cursorA"), cursorB: $("cursorB"), tip: $("tip") };
const lamps = [...svg.querySelectorAll("[data-lamp]")].map((g) => g.querySelector(".iso-solid"));
const crumbs = [...svg.querySelectorAll("[data-crumb]")];
const pits = [...svg.querySelectorAll("[data-pit]")];
const slats = [...svg.querySelectorAll("[data-slat]")].map((g) => g.querySelector(".iso-solid"));
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const needleAt = (g, value) => {
  const v = g.key === "temp" ? (value - RIG.T0) / (RIG.T1 - RIG.T0) : g.key === "wear" ? value / WEAR_FULL : value;
  const angle = GAUGE_FROM + GAUGE_SPAN * clamp(v, 0, 1), sx = Math.sin(angle), sy = -Math.cos(angle);
  return lineOnTop([g.at[0] - sx * 3.4, g.at[1] - sy * 3.4], [g.at[0] + sx * (GAUGE_R - 4), g.at[1] + sy * (GAUGE_R - 4)], GAUGE_TOP + 0.2, P);
};

let T = ${START_T}, target = T, phase = 0, deflect = 0, debris = 0, lampsOn = -1, litSlat = -1;
let shown = { temp: T, grip: muOf(T), wear: wearOf(T) };
let frame = 0, last = 0, visible = false, touring = !still.matches, clock = ${(((START_T - T0 - 10) / (T1 - T0 - 18)) * 2 - 1) > -2 ? 0 : 0}, idleTimer = 0;
// start the tour where the temperature already is
clock = RIG.PERIOD * Math.acos(clamp(1 - 2 * ((T - RIG.T0 - 10) / (RIG.T1 - RIG.T0 - 18)), -1, 1)) / (Math.PI * 2);

function draw() {
  const mu = muOf(T), wear = wearOf(T);
  const px = STROKE * Math.sin(phase);
  el.platen.setAttribute("transform", translateAlong(P, [px, 0, 0]));
  el.holder.setAttribute("transform", translateAlong(P, [deflect, 0, 0]));
  el.cap.setAttribute("transform", translateAlong(P, [deflect, 0, 0]));
  // the friction spring: its length is the grip
  const c = coil(SPRING_FROM + deflect, BRACKET_X, [Y0, SPRING_Z], 2.6, 5, "x", P);
  el.spring.innerHTML = lineSvg(c.back, { tone: "lo", free: true }) + solidSvg(slabOf({ x: SPRING_FROM + deflect, y: Y0 - 0.7, w: BRACKET_X - SPRING_FROM - deflect, d: 1.4, r: 0.6 }, SPRING_Z - 0.7, 1.4, P, 2), { tone: "mid", crease: "none" }) + lineSvg(c.front, { tone: "mid", free: true });
  // the probe riding the comb
  const cx = cursorX(T);
  el.cursorA.setAttribute("transform", translateAlong(P, [cx, 0, 0]));
  el.cursorB.setAttribute("transform", translateAlong(P, [cx, 0, 0]));
  const z0 = heightOf(mu) + 0.6;
  el.tip.innerHTML = solidSvg(cylinder(0, TIP_Y, 1, z0, ARM_Z - z0, P, 14), { tone: "mid", crease: "none", lit: true });
  GAUGES.forEach((g, i) => needles[i].setAttribute("d", needleAt(g, shown[g.key])));
  const nLamps = Math.round(((T - RIG.T0) / (RIG.T1 - RIG.T0)) * 8);
  if (nLamps !== lampsOn) { lampsOn = nLamps; lamps.forEach((s, i) => (i < nLamps ? s.setAttribute("data-lit", "") : s.removeAttribute("data-lit"))); }
  const slat = clamp(Math.round((T - RIG.T0) / RIG.STEP), 0, RIG.SLATS - 1);
  if (slat !== litSlat) { if (litSlat >= 0) slats[litSlat].removeAttribute("data-lit"); slats[slat].setAttribute("data-lit", ""); litSlat = slat; }
  const blister = blisterOf(T);
  pits.forEach((p, i) => p.setAttribute("opacity", String(clamp(blister * 1.6 - i * 0.18, 0, 1).toFixed(2))));
  const nCrumbs = Math.min(crumbs.length, Math.floor(debris));
  crumbs.forEach((c, i) => { const on = i < nCrumbs; if (c.style.display !== (on ? "" : "none")) c.style.display = on ? "" : "none"; });
  const text = "T " + Math.round(T) + "\\u00b0C \\u00b7 grip " + mu.toFixed(2) + " \\u00b7 wear " + wear.toFixed(1) + "\\u00d7" + (inWindow(T) ? " \\u00b7 in window" : "");
  if (readout.textContent !== text) readout.textContent = text;
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) { clock += dt; target = tourAt(clock); }
  T = calm ? target : T + (target - T) * (1 - Math.exp(-dt / 0.6));
  phase += dt * (Math.PI * 2 / 2.6);
  const dir = Math.tanh(Math.cos(phase) / 0.18);
  const want = dir * muOf(T) * MAX_DEFLECT;
  deflect += (want - deflect) * (calm ? 1 : 1 - Math.exp(-dt / 0.05));
  debris = Math.max(0, debris + (wearOf(T) - 0.9) * dt * 1.6);
  if (debris > crumbs.length) debris = crumbs.length;
  if (T < RIG.T0 + 14 && !touring) debris = Math.max(0, debris - dt * 4);
  const f = calm ? 1 : 1 - Math.exp(-dt / 0.18);
  shown.temp += (T - shown.temp) * f; shown.grip += (muOf(T) - shown.grip) * f; shown.wear += (wearOf(T) - shown.wear) * f;
  draw();
  stage.setAttribute("aria-valuenow", String(Math.round(T)));
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => { touring = false; target = clamp(next, RIG.T0, RIG.T1); clearTimeout(idleTimer); idleTimer = setTimeout(() => { if (!still.matches) { touring = true; clock = RIG.PERIOD * Math.acos(clamp(1 - 2 * ((target - RIG.T0 - 10) / (RIG.T1 - RIG.T0 - 18)), -1, 1)) / (Math.PI * 2); run(); } }, 4200); run(); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  steer(RIG.T0 + clamp(((event.clientX - box.left) / box.width - 0.1) / 0.8, 0, 1) * (RIG.T1 - RIG.T0));
});
stage.addEventListener("keydown", (event) => {
  let next = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") next = target + (event.shiftKey ? 20 : 4);
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = target - (event.shiftKey ? 20 : 4);
  if (event.key === "Home") next = RIG.T0;
  if (event.key === "End") next = RIG.T1;
  if (next === null) return;
  event.preventDefault();
  steer(next);
});
draw();
`;

const m0 = { temp: START_T, grip: R.muOf(START_T), wear: R.wearOf(START_T) };
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A reciprocating friction tester. A rubber block under dead weights is pressed on a heated platen that slides back and forth, and a coil spring measures the friction force. A row of 30 slats, one per four degrees, forms a bar chart of grip against temperature, with the tall slats showing the narrow window. A probe rides along the slats to the current temperature. Gauges read temperature, grip and wear.",
  body: [
    plate(),
    ...GAUGES.map((g) => gauge(g) + `<path data-part="needle-${g.key}" class="iso-line" data-tone="lit" data-free="both" d="${needleAt(g, m0[g.key])}" style="stroke-width:1.1"/>`),
    rails(),
    `<g data-part="cursorA" transform="${k.translateAlong(P, [cursorX(START_T), 0, 0])}">${cursorLower()}</g>`,
    postAndBracket(),
    `<g data-part="platen">${platen()}</g>`,
    `<g data-part="holder">${holder()}</g>`,
    bracket(),
    `<g data-part="spring"></g>`,
    beam(),
    `<g data-part="cap">${topCap()}</g>`,
    comb(),
    `<g data-part="cursorB" transform="${k.translateAlong(P, [cursorX(START_T), 0, 0])}">${cursorArm()}<g data-part="tip">${tipAt(START_T)}</g></g>`,
  ],
});

const body = k.plateHtml({
  fig: "Fig 5",
  title: "Tyre window",
  hint: "Move across to heat the platen",
  readout: `T ${START_T}°C · grip ${m0.grip.toFixed(2)} · wear ${m0.wear.toFixed(1)}×`,
  keys: [
    { mark: "lit", label: "Rubber block, probe and gauge needles" },
    { mark: "raised", label: "Grip comb: the tall slats are the window" },
  ],
  caption:
    "A rubber block is dragged across a heated plate while a spring measures how hard it grips. Too cold and the rubber is stiff and slippery; the grip builds slowly. In the window, around 80 to 100 degrees, it bites hardest. Past that it falls away quickly, and the block blisters, wears many times faster and sheds crumbs. The comb at the front is the same curve, one slat per four degrees.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Tyre window: arrow keys change the platen temperature" aria-valuemin="${T0}" aria-valuemax="${T1}" aria-valuenow="${START_T}">${svg}</div>`,
});

const script = kitScript() + "\n" + rigSource() + "\n" + live;
writeFileSync(join(HERE, OUT), k.pageHtml({ title: "Tyre window", theme, body, script }));
console.log("wrote", OUT, "svg", Math.round(svg.length / 1024) + " KB");
