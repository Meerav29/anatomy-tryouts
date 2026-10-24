import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { kitScript } from "../scripts/inline-kit.mjs";
import * as R from "./rig.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";
const OUT = theme === "light" ? "carb-ice-light.html" : "carb-ice.html";

const { T_MIN, T_MAX, RH_MIN, RH_MAX, DIAL_MIN, DIAL_MAX, HEAT_RISE } = R.CARB;
const WIDTH = 640;
const HEIGHT = 440;

const PLATE = { x: -150, y: -112, w: 300, d: 224, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;

/* the carburettor: an airbox with a cold and a hot inlet, an updraft venturi on top */
const AIRBOX = { x: -92, y: -106, w: 60, d: 74, r: 3 };
const AIRBOX_TOP = 24;
const C = [-62, -66]; // the venturi's axis
const FLANGE_TOP = AIRBOX_TOP + 3;
const VENTURI_L = 54;
const THROAT_S = 21;
const R_IN = 19;
const R_THROAT = 11;
const R_OUT = 15.5;
const BODY_Z = FLANGE_TOP + VENTURI_L; // throttle body bottom
const BODY_R = 17.5;
const BODY_TOP = BODY_Z + 15;
const BORE_R = 13.8;
const PLATE_DROP = 4.4; // throttle plate below the rim
const PLATE_R = 13.2;
const OPEN = 24 * (Math.PI / 180); // throttle plate angle, cruise
const BOWL = [-62, -97];
const BOWL_R = 8;
const BOWL_TOP = AIRBOX_TOP + 26;
const FILTER = [-122, -66];
const STACK = [-10, -66];

/* the thermometer: one dial, two hands */
const DIAL = { at: [58, -60], r: 22, z: 28, h: 9 };
const DIAL_TOP = DIAL.z + DIAL.h;
const DIAL_FROM = (-135 * Math.PI) / 180;
const DIAL_SPAN = (270 * Math.PI) / 180;

/* the psychrometer: a dry bulb and a wet bulb on a scale board */
const PSY = { x: 98, y: -86, w: 30, d: 22, r: 2 };
const BOARD = { x: 100, y: -84, w: 26, d: 3, r: 0.6 };
const TUBES = [[106, -74], [120, -74]];
const TUBE_R = 1.9;
const COL0 = 13; // z of the scale's T_MIN
const COL1 = 47; // z of its T_MAX
const colZ = (t) => COL0 + ((COL1 - COL0) * (Math.min(T_MAX, Math.max(T_MIN, t)) - T_MIN)) / (T_MAX - T_MIN);

/* controls */
const CONSOLE = { x: 64, y: 0, w: 72, d: 62, r: 4 };
const CON_TOP = 7;
const KNOBS = [
  { key: "t", at: [84, 20], lo: T_MIN, hi: T_MAX },
  { key: "rh", at: [116, 20], lo: RH_MIN, hi: RH_MAX },
];
const KNOB_FROM = -0.75 * Math.PI;
const KNOB_SPAN = 1.5 * Math.PI;
const SLOT = { x: 76, y: 44, w: 50, d: 4, r: 2 };
const LEVER_COLD = 81;
const LEVER_HOT = 121;

/* the chart, lying on the bench */
const CHART = { x: -134, y: 4, w: 182, d: 90, r: 1 };
const CHART_Z = 1.6;
const xOf = (t) => CHART.x + (CHART.w * (t - T_MIN)) / (T_MAX - T_MIN);
const yOf = (rh) => CHART.y + CHART.d - (CHART.d * (rh - RH_MIN)) / (RH_MAX - RH_MIN);

const START = { t: 14, rh: 88, heat: false };
const s0 = R.stateOf(START.t, START.rh, START.heat);

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [C[0], C[1] - BODY_R, BODY_TOP + 4], [C[0] - BODY_R, C[1], BODY_TOP + 4], [STACK[0], STACK[1], 58]],
  WIDTH,
  HEIGHT,
  { pad: 18, azimuth: 50, elevation: 34 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const around = ([x, y], r, n, phase = 0) => Array.from({ length: n }, (_, i) => [x + r * Math.cos(phase + (i * 2 * Math.PI) / n), y + r * Math.sin(phase + (i * 2 * Math.PI) / n)]);
const halo = (x, y, r) => `<path class="iso-halo" d="${k.cylinder(x, y, r, 0, 0.1, P, 40).fill}" style="filter:blur(3px)"/>`;

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
  // label plate, front right
  const label = { x: 92, y: 86, w: 40, d: 9, r: 1.6 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 4), { tone: "faint" }));
  const rule = (x0, x1, y) => L(k.lineOnTop([x0, y], [x1, y], 0.8, P), { tone: "lo", free: true });
  out.push(rule(label.x + 5, label.x + 28, label.y + 3), rule(label.x + 5, label.x + 21, label.y + 4.6), rule(label.x + 5, label.x + 26, label.y + 6.2));
  out.push(D([at([label.x + 3.2, label.y + 4.5, 0.8]), at([label.x + label.w - 3.2, label.y + 4.5, 0.8])], { size: 0.4 }));
  // vents along the right edge, behind the console
  for (let i = 0; i < 6; i++) out.push(L(k.planOutline({ x: 141, y: -88 + i * 11, w: 2.6, d: 7, r: 1.3 }, 0, P, 3), { tone: "lo" }));
  return out.join("");
}

/* ---------------------------------------------------------------- the carburettor */
// cold inlet: a pleated air filter and a square duct into the airbox
function filter() {
  const [x, y] = FILTER;
  const out = [halo(x, y, 15)];
  out.push(S(k.cylinder(x, y, 16, 0, 3, P, 56, 0.5), { tone: "lo" }));
  out.push(D(around(FILTER, 14.4, 6, 0.4).map(([px, py]) => at([px, py, 3])), { size: 0.4 }));
  out.push(S(k.cylinder(x, y, 14, 3, 25, P, 56), { tone: "mid", crease: "none", inner: L([5, 26].map((z) => k.sideArc(x, y, 14, z, P, 40)).join(""), { tone: "faint" }) }));
  out.push(L(k.knurl(x, y, 14, 5, 26, 52, P, 0.3), { tone: "lo" }));
  out.push(S(k.cylinder(x, y, 15.4, 28, 3, P, 56, 0.6), { tone: "mid" }));
  out.push(L(k.ring(x, y, 10.5, 31, P, 40), { tone: "faint" }));
  // wing nut on the lid
  out.push(S(k.cylinder(x, y, 2.6, 31, 2.4, P, 18), { tone: "mid" }));
  out.push(S(k.slabOf({ x: x - 6, y: y - 1, w: 12, d: 2, r: 0.8 }, 33.4, 1.8, P, 2, 0.2), { tone: "mid" }));
  // the duct
  const duct = { x: x + 14, y: C[1] - 6, w: AIRBOX.x - x - 14, d: 12, r: 1 };
  out.push(S(k.slabOf(duct, 7, 12, P, 2, 0.4), { tone: "mid", inner: L(k.sideSeam(duct, 13, P, 2), { tone: "faint" }) }));
  return out.join("");
}
// hot inlet: an exhaust stack wearing a finned heater muff, its own duct into the airbox
function stack() {
  const [x, y] = STACK;
  const out = [halo(x, y, 14)];
  const duct = { x: AIRBOX.x + AIRBOX.w, y: y - 6, w: x - 11.6 - AIRBOX.x - AIRBOX.w, d: 12, r: 1 };
  out.push(S(k.slabOf(duct, 7, 12, P, 2, 0.4), { tone: "mid", inner: L(k.sideSeam(duct, 13, P, 2), { tone: "faint" }) }));
  out.push(S(k.cylinder(x, y, 10.5, 0, 3, P, 40, 0.4), { tone: "lo" }));
  out.push(D(around(STACK, 9, 4, 0.8).map(([px, py]) => at([px, py, 3])), { size: 0.4 }));
  out.push(S(k.cylinder(x, y, 6.5, 3, 4, P, 32), { tone: "mid", crease: "none" }));
  // the heater muff: a finned shroud round the exhaust pipe
  out.push(S(k.cylinder(x, y, 12, 7, 28, P, 56, 0.4), { tone: "mid", crease: "none", inner: L(Array.from({ length: 8 }, (_, i) => k.sideArc(x, y, 12, 10.5 + i * 3, P, 40)).join(""), { tone: "lo" }) }));
  out.push(S(k.cylinder(x, y, 6.5, 35, 17, P, 32), { tone: "mid", crease: "none", inner: L(k.sideArc(x, y, 6.5, 44, P, 24), { tone: "faint" }) }));
  out.push(S(k.cylinder(x, y, 7.6, 52, 2.4, P, 32, 0.3), { tone: "mid" }));
  out.push(L(k.ring(x, y, 5, 54.4, P, 24), { tone: "lo" }));
  return out.join("");
}
function airbox() {
  const out = [`<path class="iso-halo" d="${k.haloOf(AIRBOX, 0, 0.1, P)}" style="filter:blur(4px)"/>`];
  out.push(S(k.slabOf(AIRBOX, 0, 3, P, 4, 0.4), { tone: "lo" }));
  out.push(S(k.slabOf(k.insetPlan(AIRBOX, 1.5), 3, AIRBOX_TOP - 3, P, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(k.insetPlan(AIRBOX, 1.5), 15, P, 4), { tone: "faint" }) }));
  out.push(D(k.corners(AIRBOX, 4).map(([x, y]) => at([x, y, AIRBOX_TOP])), { size: 0.45 }));
  out.push(L(k.planOutline(k.insetPlan(AIRBOX, 4.4), AIRBOX_TOP, P, 4), { tone: "faint" }));
  // the float bowl behind the venturi, with the jet arm that feeds the throat
  const [bx, by] = BOWL;
  out.push(S(k.cylinder(bx, by, BOWL_R, AIRBOX_TOP, BOWL_TOP - AIRBOX_TOP - 2, P, 40), { tone: "mid", crease: "none", inner: L(k.sideArc(bx, by, BOWL_R, AIRBOX_TOP + 6, P, 32), { tone: "faint" }) }));
  out.push(S(k.cylinder(bx, by, BOWL_R + 1, BOWL_TOP - 2, 2, P, 40, 0.3), { tone: "mid" }));
  out.push(D(around(BOWL, BOWL_R - 1.6, 4, 0.5).map(([px, py]) => at([px, py, BOWL_TOP])), { size: 0.4 }));
  const jetZ = FLANGE_TOP + 9;
  out.push(S(k.slabOf({ x: C[0] - 2, y: by + BOWL_R - 1, w: 4, d: C[1] - R_THROAT - 2 - by - BOWL_R + 4, r: 0.8 }, jetZ, 3, P, 2), { tone: "mid" }));
  // flange the venturi stands on
  out.push(S(k.cylinder(C[0], C[1], 22, AIRBOX_TOP, FLANGE_TOP - AIRBOX_TOP, P, 64, 0.5), { tone: "mid" }));
  out.push(D(around(C, 20.4, 8, 0.2).map(([px, py]) => at([px, py, FLANGE_TOP])), { size: 0.45 }));
  return out.join("");
}
// the venturi: a bell mouth, the throat, a long diffuser; analytic so it shades smoothly
const radius = (s) => (s <= THROAT_S ? R_THROAT + (R_IN - R_THROAT) * ((THROAT_S - s) / THROAT_S) ** 2 : R_THROAT + (R_OUT - R_THROAT) * ((s - THROAT_S) / (VENTURI_L - THROAT_S)) ** 1.5);
const slope = (s) => (s <= THROAT_S ? (-2 * (R_IN - R_THROAT) * (THROAT_S - s)) / THROAT_S ** 2 : (1.5 * (R_OUT - R_THROAT) * ((s - THROAT_S) / (VENTURI_L - THROAT_S)) ** 0.5) / (VENTURI_L - THROAT_S));
function venturi() {
  const F = G.frameOf([C[0], C[1], FLANGE_TOP], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  const profile = Array.from({ length: 25 }, (_, i) => {
    const s = (VENTURI_L * i) / 24;
    return [s, radius(s), 1];
  });
  const seams = [4, THROAT_S, 32].map((s) => G.arcOf(F, s, radius(s), P, { slope: slope(s) })).join("");
  return S(G.solidOf(profile, F, P, { smooth: { slope, rows: 5 } }), { tone: "hi", inner: L(seams, { tone: "faint" }) });
}
function throttleBody() {
  const [x, y] = C;
  const out = [];
  out.push(S(k.cylinder(x, y, BODY_R, BODY_Z, BODY_TOP - BODY_Z, P, 64, 0.5), { tone: "mid", inner: L(k.sideArc(x, y, BODY_R, BODY_Z + 3, P, 48), { tone: "faint" }) }));
  out.push(D(around(C, (BODY_R + BORE_R) / 2, 4, Math.PI / 4).map(([px, py]) => at([px, py, BODY_TOP])), { size: 0.45 }));
  return out.join("");
}
// the throttle shaft boss and the throttle arm, on the +x side
function arm() {
  const F = G.frameOf([C[0] + BODY_R - 0.4, C[1], BODY_TOP - PLATE_DROP], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const out = [S(G.disc(0, 3.4, 2.6, F, P), { tone: "mid" })];
  const ax = C[0] + BODY_R + 3;
  out.push(S(k.slabOf({ x: ax, y: C[1] - 2, w: 2, d: 13, r: 0.8 }, BODY_TOP - PLATE_DROP - 1.6, 3.2, P, 2, 0.2), { tone: "mid" }));
  out.push(S(k.cylinder(ax + 1, C[1] + 9.5, 1.2, BODY_TOP - PLATE_DROP + 1.6, 1.6, P, 12), { tone: "mid" }));
  return out.join("");
}
// the bore seen from above: dark, with the throttle plate inside; frost grows on it
const SEEDS = Array.from({ length: 70 }, (_, i) => {
  const a = i * 2.39996;
  const r = Math.sqrt((i + 0.5) / 70);
  return { a, r, at: ((i * 0.6180339) % 1) };
});
function bore(frost) {
  const [x, y] = C;
  const zc = BODY_TOP - PLATE_DROP;
  const rim = k.onTop(k.circleRing(x, y, BORE_R, 64), BODY_TOP, P, true);
  const onPlate = (r, a) => [x + r * Math.cos(a), y + r * Math.sin(a) * Math.cos(OPEN), zc + r * Math.sin(a) * Math.sin(OPEN)];
  const disc = Array.from({ length: 48 }, (_, i) => at(onPlate(PLATE_R, (i * 2 * Math.PI) / 48)));
  const d = "M" + disc.map((p) => p.join(" ")).join("L") + "Z";
  const out = [`<clipPath id="ci-bore"><path d="${rim}"/></clipPath>`];
  out.push(`<path class="iso-shade" data-shade="0" d="${rim}"/>`);
  out.push(`<g clip-path="url(#ci-bore)"><path class="iso-top" d="${d}"/>`);
  out.push(`<path class="iso-line" data-tone="mid" d="${d}"/>`);
  out.push(`<path class="ci-frost" d="${d}" style="stroke-width:${(0.2 + 2.6 * frost).toFixed(2)};opacity:${Math.min(1, frost * 3).toFixed(2)}"/>`);
  const specks = SEEDS.filter((s) => s.at < frost).map((s) => at(onPlate(s.r * (PLATE_R - 0.8), s.a)));
  out.push(`<g class="ci-specks">${specks.map(([sx, sy]) => `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="0.55"/>`).join("")}</g>`);
  out.push(D([at(onPlate(1.6, 0)), at(onPlate(1.6, Math.PI))], { size: 0.35 }));
  out.push(`</g>`);
  out.push(`<path class="iso-line" data-tone="lo" d="${rim}"/>`);
  out.push(`<path class="ci-frost" d="${rim}" style="stroke-width:${(1.6 * frost).toFixed(2)};opacity:${Math.min(1, frost * 2.5).toFixed(2)}"/>`);
  return out.join("");
}

/* ---------------------------------------------------------------- thermometer */
const dialAngle = (t) => DIAL_FROM + DIAL_SPAN * Math.min(1, Math.max(0, (t - DIAL_MIN) / (DIAL_MAX - DIAL_MIN)));
const dialArc = (t0, t1, r) => {
  const [x, y] = DIAL.at;
  const a0 = dialAngle(t0);
  const a1 = dialAngle(t1);
  const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 0.06));
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return [x + Math.sin(a) * r, y - Math.cos(a) * r];
  });
};
function dial() {
  const [x, y] = DIAL.at;
  const out = [halo(x, y, 13)];
  out.push(S(k.cylinder(x, y, 12, 0, 3, P, 40, 0.5), { tone: "mid" }));
  out.push(D(around(DIAL.at, 9, 4, Math.PI / 4).map(([px, py]) => at([px, py, 3])), { size: 0.4 }));
  out.push(S(k.cylinder(x, y, 4, 3, DIAL.z - 9, P, 24), { tone: "mid", crease: "none", inner: L([8, 13].map((z) => k.sideArc(x, y, 4, z, P, 12)).join(""), { tone: "faint" }) }));
  out.push(S(k.cylinder(x, y, 6.4, DIAL.z - 6, 3, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 7.6, DIAL.z - 3, 3, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, DIAL.r, DIAL.z, DIAL.h, P, 72, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(x, y, DIAL.r, DIAL_TOP - 3.2, DIAL_TOP, 90, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(x, y, DIAL.r, DIAL_TOP - 3.2, P, 48), { tone: "faint" }));
  out.push(L(k.ring(x, y, DIAL.r - 2.2, DIAL_TOP, P, 72), { tone: "lo" }));
  // -40..60 C: a tick every 2 C, a major every 10; the zero mark is long and bright
  const ticks = k.radialTicks(x, y, DIAL.r - 3.1, (DIAL_MAX - DIAL_MIN) / 2, 5, DIAL_TOP, [1.2, 2.6], P, DIAL_FROM, DIAL_SPAN);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  const a0 = dialAngle(0);
  out.push(L(k.lineOnTop([x + Math.sin(a0) * (DIAL.r - 3.1), y - Math.cos(a0) * (DIAL.r - 3.1)], [x + Math.sin(a0) * (DIAL.r - 7), y - Math.cos(a0) * (DIAL.r - 7)], DIAL_TOP, P), { tone: "hi" }));
  // below freezing: a band inside the scale
  out.push(`<path class="iso-line" data-tone="lo" data-free="both" d="${k.onTop(dialArc(DIAL_MIN, 0, DIAL.r - 7.4), DIAL_TOP, P)}" style="stroke-width:1.6"/>`);
  out.push(k.faceTextSvg(k.topMatrix([x, y + 10], DIAL_TOP, P, "x"), "°C", { size: 2.4, tone: "lo", anchor: "middle" }));
  return out.join("");
}
const handOf = (t, r) => {
  const [x, y] = DIAL.at;
  const a = dialAngle(t);
  return k.lineOnTop([x - Math.sin(a) * 3.2, y + Math.cos(a) * 3.2], [x + Math.sin(a) * r, y - Math.cos(a) * r], DIAL_TOP + 0.2, P);
};
const dropOf = (tIn, venturi) => k.onTop(dialArc(venturi, tIn, DIAL.r - 9.6), DIAL_TOP + 0.1, P);
const dialHub = () => S(k.cylinder(DIAL.at[0], DIAL.at[1], 1.6, DIAL_TOP, 1, P, 16), { tone: "mid" });

/* ---------------------------------------------------------------- psychrometer */
function psychrometer() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PSY, 0, 0.1, P)}" style="filter:blur(4px)"/>`];
  out.push(S(k.slabOf(PSY, 0, 4, P, 3, 0.5), { tone: "mid" }));
  out.push(D(k.corners(PSY, 2.6).map(([x, y]) => at([x, y, 4])), { size: 0.4 }));
  out.push(S(k.slabOf(BOARD, 4, COL1 + 5, P, 2, 0.3), { tone: "mid" }));
  // the scale: a tick every 1 C, a major every 5, both edges of the board's front face
  const minor = [];
  const major = [];
  const fy = BOARD.y + BOARD.d;
  for (let t = T_MIN; t <= T_MAX; t += 1) {
    const big = t % 5 === 0;
    const len = t === 0 ? 4 : big ? 2.6 : 1.3;
    const z = colZ(t);
    (big ? major : minor).push(k.segment([BOARD.x, fy, z], [BOARD.x + len, fy, z], P), k.segment([BOARD.x + BOARD.w, fy, z], [BOARD.x + BOARD.w - len, fy, z], P));
  }
  out.push(L(minor.join(""), { tone: "lo" }), L(major.join(""), { tone: "mid" }));
  for (const [i, [x, y]] of TUBES.entries()) {
    out.push(S(k.cylinder(x, y, 3, 4, 2, P, 20, 0.2), { tone: "mid" }));
    // a clip arm from the board, then the tube, then the band that holds it
    out.push(S(k.slabOf({ x: x - 1, y: BOARD.y + BOARD.d, w: 2, d: y - BOARD.y - BOARD.d, r: 0.4 }, COL1 - 6, 1.4, P, 2), { tone: "mid" }));
    out.push(S(k.cylinder(x, y, TUBE_R, 6, COL1 - 4, P, 20), { tone: "hi", crease: "none" }));
    out.push(`<g data-part="col-${i}">${column(i, i ? R.wetBulbOf(START.t, START.rh) : START.t)}</g>`);
    out.push(S(k.cylinder(x, y, TUBE_R + 0.6, COL1 - 6, 1.4, P, 20), { tone: "mid" }));
    out.push(S(k.cylinder(x, y, 2.6, COL1 + 2, 2, P, 20, 0.2), { tone: "mid" }));
    if (i === 1) {
      // the wet bulb wears a wick sleeve
      out.push(S(k.cylinder(x, y, 2.7, 6, 7, P, 20), { tone: "lo", crease: "none", inner: L([8, 10.5].map((z) => k.sideArc(x, y, 2.7, z, P, 16)).join(""), { tone: "faint" }) }));
    }
  }
  return out.join("");
}
// the two liquid columns, rebuilt live
const column = (i, t) => {
  const [x, y] = TUBES[i];
  return `<path class="iso-line" data-tone="hi" data-free="end" d="${k.segment([x + 0.2, y + TUBE_R * 0.6, i ? 13 : 6], [x + 0.2, y + TUBE_R * 0.6, colZ(t)], P)}" style="stroke-width:1.5"/>`;
};

/* ---------------------------------------------------------------- console */
function consoleBox() {
  const out = [`<path class="iso-halo" d="${k.haloOf(CONSOLE, 0, 0.1, P)}" style="filter:blur(4px)"/>`];
  out.push(S(k.slabOf(CONSOLE, 0, CON_TOP, P, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(CONSOLE, 2.4, P, 4), { tone: "faint" }) }));
  out.push(D(k.corners(CONSOLE, 4).map(([x, y]) => at([x, y, CON_TOP])), { size: 0.45 }));
  out.push(L(k.planOutline(k.insetPlan(CONSOLE, 2.4), CON_TOP, P, 4), { tone: "faint" }));
  for (const { at: [x, y], lo, hi } of KNOBS) {
    out.push(S(k.cylinder(x, y, 8, CON_TOP, 1.4, P, 32, 0.3), { tone: "mid" }));
    out.push(L(k.ring(x, y, 10.6, CON_TOP, P, 48), { tone: "lo" }));
    // a tick per 5 C (or 10% humidity), a major at the chart's grid lines
    const n = Math.round((hi - lo) / (lo < 0 ? 5 : 10));
    const t = k.radialTicks(x, y, 10.6, n, n > 8 ? 2 : 2, CON_TOP, [1, 2], P, KNOB_FROM, KNOB_SPAN);
    out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
    out.push(S(k.cylinder(x, y, 6, CON_TOP + 1.4, 5, P, 32, 0.3), { tone: "mid" }));
    out.push(L(k.knurl(x, y, 6, CON_TOP + 1.8, CON_TOP + 6, 28, P, 0.3), { tone: "lo" }));
  }
  // the carb heat lever's slot and its two stops
  out.push(L(k.planOutline(SLOT, CON_TOP, P, 3), { tone: "lo" }));
  out.push(`<path class="iso-shade" data-shade="0" d="${k.onTop(k.ringOf(k.insetPlan(SLOT, 0.6), 3), CON_TOP, P, true)}"/>`);
  for (const x of [SLOT.x - 3.4, SLOT.x + SLOT.w + 1.4]) out.push(S(k.slabOf({ x, y: SLOT.y - 1, w: 2, d: 6, r: 0.6 }, CON_TOP, 1.6, P, 2, 0.2), { tone: "mid" }));
  return out.join("");
}
const knobLive = ({ at: [x, y], lo, hi }, v) => {
  const a = KNOB_FROM + KNOB_SPAN * ((v - lo) / (hi - lo));
  return L(k.lineOnTop([x + Math.sin(a) * 1.2, y - Math.cos(a) * 1.2], [x + Math.sin(a) * 5, y - Math.cos(a) * 5], CON_TOP + 6.4, P), { tone: "hi", free: true });
};
// the lever, built at x = 0 and slid along the slot
function lever() {
  const y = SLOT.y + SLOT.d / 2;
  const out = [S(k.slabOf({ x: -4, y: y - 3.4, w: 8, d: 6.8, r: 1 }, CON_TOP, 1.4, P, 2, 0.3), { tone: "mid" })];
  out.push(S(k.cylinder(0, y, 1.1, CON_TOP + 1.4, 8, P, 14), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(0, y, 3.2, CON_TOP + 9.4, 3.6, P, 24, 0.3), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(0, y, 3.2, CON_TOP + 9.8, CON_TOP + 12.6, 16, P, 0.3), { tone: "lo" }));
  return out.join("");
}

/* ---------------------------------------------------------------- the chart */
const zonePath = (zone) => {
  const pts = [];
  const n = 72;
  for (let i = 0; i <= n; i++) {
    const t = zone.tLo + ((zone.tHi - zone.tLo) * i) / n;
    const need = R.needOf(zone, t);
    pts.push([xOf(t), yOf(Math.min(RH_MAX, Number.isFinite(need) ? need : RH_MAX))]);
  }
  return pts;
};
function chart() {
  const out = [];
  out.push(S(k.slabOf(k.insetPlan(CHART, -3), 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
  out.push(S(k.slabOf(CHART, 0.8, CHART_Z - 0.8, P, 2), { tone: "hi", crease: "none" }));
  // the four zones, mildest underneath; each lobe closes along the 100% edge
  R.ZONES.forEach((zone, i) => {
    const d = k.onTop(zonePath(zone), CHART_Z, P, true);
    out.push(`<path class="iso-shade" data-shade="${3 - i}" d="${d}"/>`);
    out.push(L(d, { tone: i === 3 ? "mid" : "lo" }));
  });
  // grid: every 5 C across, every 10% along
  const grid = [];
  for (let t = T_MIN + 5; t < T_MAX; t += 5) grid.push(k.lineOnTop([xOf(t), CHART.y], [xOf(t), CHART.y + CHART.d], CHART_Z, P));
  for (let rh = RH_MIN + 10; rh < RH_MAX; rh += 10) grid.push(k.lineOnTop([CHART.x, yOf(rh)], [CHART.x + CHART.w, yOf(rh)], CHART_Z, P));
  out.push(L(grid.join(""), { tone: "faint" }));
  // temperature ticks hang from the front edge, humidity ticks from the left edge
  const tMinor = [];
  const tMajor = [];
  for (let t = T_MIN; t <= T_MAX; t += 1) {
    const big = t % 5 === 0;
    (big ? tMajor : tMinor).push(k.lineOnTop([xOf(t), CHART.y + CHART.d], [xOf(t), CHART.y + CHART.d - (t === 0 ? 4.4 : big ? 2.6 : 1.3)], CHART_Z, P));
  }
  const rMinor = [];
  const rMajor = [];
  for (let rh = RH_MIN; rh <= RH_MAX; rh += 2) {
    const big = rh % 10 === 0;
    (big ? rMajor : rMinor).push(k.lineOnTop([CHART.x, yOf(rh)], [CHART.x + (big ? 2.6 : 1.3), yOf(rh)], CHART_Z, P));
  }
  out.push(L(tMinor.join("") + rMinor.join(""), { tone: "lo" }), L(tMajor.join("") + rMajor.join(""), { tone: "mid" }));
  // freezing line
  out.push(L(k.lineOnTop([xOf(0), CHART.y], [xOf(0), CHART.y + CHART.d], CHART_Z, P), { tone: "lo" }));
  // corner clips
  for (const [x, y] of [[CHART.x - 3, CHART.y - 3], [CHART.x + CHART.w - 3, CHART.y - 3]]) out.push(S(k.slabOf({ x, y, w: 6, d: 6, r: 1 }, CHART_Z, 1.2, P, 2, 0.2), { tone: "mid" }), D([at([x + 3, y + 3, CHART_Z + 1.2])], { size: 0.4 }));
  return out.join("");
}
const crossOf = (t, rh) => k.lineOnTop([xOf(t), CHART.y], [xOf(t), CHART.y + CHART.d], CHART_Z, P) + k.lineOnTop([CHART.x, yOf(rh)], [CHART.x + CHART.w, yOf(rh)], CHART_Z, P);
const marker = () => `${S(k.cylinder(0, 0, 3.8, CHART_Z, 1.4, P, 24, 0.3), { tone: "mid" })}${S(k.cylinder(0, 0, 1.4, CHART_Z + 1.4, 5, P, 14), { tone: "hi", crease: "lo" })}${S(k.cylinder(0, 0, 2.4, CHART_Z + 6.4, 2.4, P, 18, 0.3), { tone: "hi", lit: true, crease: "lo" })}`;

/* ---------------------------------------------------------------- live source */
const rigSource = () => readFileSync(join(HERE, "rig.mjs"), "utf8").replace(/^export /gm, "");
const fn = (f) => f.toString();

const live = `
const P = ${JSON.stringify(P)};
const C = ${JSON.stringify(C)}, BODY_TOP = ${BODY_TOP}, BORE_R = ${BORE_R}, PLATE_DROP = ${PLATE_DROP}, PLATE_R = ${PLATE_R}, OPEN = ${OPEN};
const DIAL = ${JSON.stringify(DIAL)}, DIAL_TOP = ${DIAL_TOP}, DIAL_FROM = ${DIAL_FROM}, DIAL_SPAN = ${DIAL_SPAN};
const CHART = ${JSON.stringify(CHART)}, CHART_Z = ${CHART_Z};
const KNOBS = ${JSON.stringify(KNOBS)}, KNOB_FROM = ${KNOB_FROM}, KNOB_SPAN = ${KNOB_SPAN}, CON_TOP = ${CON_TOP};
const LEVER_COLD = ${LEVER_COLD}, LEVER_HOT = ${LEVER_HOT};
const SEEDS = ${JSON.stringify(SEEDS.map((s) => ({ a: +s.a.toFixed(4), r: +s.r.toFixed(4), at: +s.at.toFixed(4) })))};
const { T_MIN, T_MAX, RH_MIN, RH_MAX, DIAL_MIN, DIAL_MAX, HEAT_RISE } = CARB;
const S = (paths, style) => solidSvg(paths, style), L = (d, style) => lineSvg(d, style), D = (points, style) => dotsSvg(points, style);
const at = (point) => iso(point, P);
const k = { onTop, lineOnTop, circleRing, cylinder, segment };
const xOf = ${fn(xOf)}, yOf = ${fn(yOf)};
const dialAngle = ${fn(dialAngle)}, dialArc = ${fn(dialArc)}, handOf = ${fn(handOf)}, dropOf = ${fn(dropOf)};
const knobLive = ${fn(knobLive)}, crossOf = ${fn(crossOf)};
const TUBES = ${JSON.stringify(TUBES)}, TUBE_R = ${TUBE_R}, COL0 = ${COL0}, COL1 = ${COL1};
const colZ = ${fn(colZ)}, column = ${fn(column)};
${fn(bore)}
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const $ = (name) => svg.querySelector('[data-part="' + name + '"]');
const el = { bore: $("bore"), handT: $("hand-t"), handV: $("hand-v"), drop: $("drop"), knobT: $("knob-t"), knobRh: $("knob-rh"), lever: $("lever"), col0: $("col-0"), col1: $("col-1"), cross: $("cross"), marker: $("marker") };
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

let t = ${START.t}, rh = ${START.rh}, heat = ${START.heat}, target = { t, rh };
let lever = heat ? 1 : 0, tIn = stateOf(t, rh, heat).tIn, frost = frostOf(stateOf(t, rh, heat).level), drawnFrost = -1;
let frame = 0, last = 0, visible = false, touring = !still.matches, clock = 0, idleTimer = 0, described = "";
clock = CARB.PERIOD * 0.12;

function draw() {
  const s = stateOf(t, rh, heat);
  const venturi = tIn - DROP;
  el.handT.setAttribute("d", handOf(tIn, DIAL.r - 5));
  el.handV.setAttribute("d", handOf(venturi, DIAL.r - 4));
  el.drop.setAttribute("d", dropOf(tIn, venturi));
  el.knobT.innerHTML = knobLive(KNOBS[0], t);
  el.knobRh.innerHTML = knobLive(KNOBS[1], rh);
  el.lever.setAttribute("transform", translateAlong(P, [LEVER_COLD + (LEVER_HOT - LEVER_COLD) * lever, 0, 0]));
  el.cross.setAttribute("d", crossOf(t, rh));
  el.col0.innerHTML = column(0, t);
  el.col1.innerHTML = column(1, wetBulbOf(t, rh));
  el.marker.setAttribute("transform", translateAlong(P, [xOf(t), yOf(rh), 0]));
  if (Math.abs(frost - drawnFrost) > 0.004) { drawnFrost = frost; el.bore.innerHTML = bore(frost); }
  const text = Math.round(t) + "\\u00b0C \\u00b7 " + Math.round(rh) + "% \\u00b7 " + (heat ? "heat \\u00b7 " : "") + "venturi " + Math.round(s.venturi) + "\\u00b0C \\u00b7 " + (s.zone ? s.zone.name : "no icing");
  if (readout.textContent !== text) readout.textContent = text;
  const words = Math.round(t) + " degrees, " + Math.round(rh) + " percent humidity, carb heat " + (heat ? "on" : "off") + ": " + (s.zone ? s.zone.name : "no icing");
  if (words !== described) { described = words; stage.setAttribute("aria-valuetext", words); }
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) { clock += dt; const tour = tourOf(clock); target.t = tour.t; target.rh = tour.rh; heat = tour.heat; }
  const f = calm ? 1 : 1 - Math.exp(-dt / 0.45);
  t += (target.t - t) * f;
  rh += (target.rh - rh) * f;
  const s = stateOf(t, rh, heat);
  // the heated air arrives over about a second; frost builds over seconds and melts faster in hot air
  lever += ((heat ? 1 : 0) - lever) * (calm ? 1 : 1 - Math.exp(-dt / 0.25));
  tIn += (s.tIn - tIn) * (calm ? 1 : 1 - Math.exp(-dt / 0.6));
  const want = frostOf(s.level);
  frost += (want - frost) * (calm ? 1 : 1 - Math.exp(-dt / (want > frost ? 2.4 : 1.1)));
  draw();
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const resume = () => { if (!still.matches) { touring = true; run(); } };
const hold = () => { touring = false; clearTimeout(idleTimer); idleTimer = setTimeout(resume, 4200); run(); };
const steer = (nt, nrh) => { target.t = clamp(nt, T_MIN, T_MAX); target.rh = clamp(nrh, RH_MIN, RH_MAX); hold(); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const fx = clamp(((event.clientX - box.left) / box.width - 0.1) / 0.8, 0, 1);
  const fy = clamp(((event.clientY - box.top) / box.height - 0.1) / 0.8, 0, 1);
  if (touring) heat = false;
  steer(T_MIN + fx * (T_MAX - T_MIN), RH_MAX - fy * (RH_MAX - RH_MIN));
});
stage.addEventListener("click", () => { if (touring) { touring = false; heat = false; } heat = !heat; hold(); });
stage.addEventListener("keydown", (event) => {
  let nt = target.t, nrh = target.rh;
  if (touring) heat = false;
  if (event.key === "ArrowRight") nt += event.shiftKey ? 5 : 1;
  else if (event.key === "ArrowLeft") nt -= event.shiftKey ? 5 : 1;
  else if (event.key === "ArrowUp") nrh += event.shiftKey ? 10 : 2;
  else if (event.key === "ArrowDown") nrh -= event.shiftKey ? 10 : 2;
  else if (event.key === " " || event.key === "Enter") { event.preventDefault(); heat = !heat; hold(); return; }
  else return;
  event.preventDefault();
  steer(nt, nrh);
});
draw();
`;

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A carburettor icing bench. At the back an updraft venturi stands on an airbox fed by a pleated air filter for cold air and a finned heater muff on an exhaust stack for hot air; a float bowl feeds fuel into the venturi's throat, and looking down into the throttle bore you see the throttle plate, where frost grows. A thermometer dial has two hands, the air coming in and the air in the venturi, about 32 degrees colder. At the front the carburettor icing probability chart lies on the bench, temperature across and humidity along, with four nested zones from light icing to serious icing at any power, and a pin marks the day's air. A console carries a temperature knob, a humidity knob and the carb heat lever.",
  body: [
    plate(),
    filter(),
    airbox(),
    venturi(),
    throttleBody(),
    `<g data-part="bore">${bore(R.frostOf(s0.level))}</g>`,
    arm(),
    stack(),
    psychrometer(),
    dial(),
    `<path data-part="drop" class="iso-line" data-tone="mid" data-free="both" d="${dropOf(s0.tIn, s0.venturi)}" style="stroke-width:2.2;opacity:.7"/>`,
    `<path data-part="hand-t" class="iso-line" data-tone="mid" data-free="both" d="${handOf(s0.tIn, DIAL.r - 5)}" style="stroke-width:0.9"/>`,
    `<path data-part="hand-v" class="iso-line" data-tone="lit" data-free="both" d="${handOf(s0.venturi, DIAL.r - 4)}" style="stroke-width:1.2"/>`,
    dialHub(),
    chart(),
    `<path data-part="cross" class="iso-line" data-tone="mid" d="${crossOf(START.t, START.rh)}"/>`,
    `<g data-part="marker" transform="${k.translateAlong(P, [xOf(START.t), yOf(START.rh), 0])}">${marker()}</g>`,
    consoleBox(),
    `<g data-part="knob-t">${knobLive(KNOBS[0], START.t)}</g>`,
    `<g data-part="knob-rh">${knobLive(KNOBS[1], START.rh)}</g>`,
    `<g data-part="lever" transform="${k.translateAlong(P, [LEVER_COLD, 0, 0])}">${lever()}</g>`,
  ],
});

const style = `<style>
.iso{--ci-frost:#d8ecf7}
.iso[data-theme="light"]{--ci-frost:#6f93ab}
.ci-frost{fill:none;stroke:var(--ci-frost);stroke-linecap:round;stroke-linejoin:round}
.ci-specks circle{fill:var(--ci-frost)}
</style>`;

const body = k.plateHtml({
  fig: "Fig 11",
  title: "Carburettor ice",
  hint: "Move for the air, click for heat",
  readout: `${START.t}°C · ${START.rh}% · venturi ${Math.round(s0.venturi)}°C · ${s0.zone ? s0.zone.name : "no icing"}`,
  keys: [
    { mark: "lit", label: "Venturi hand on the thermometer, and the pin on the chart" },
    { mark: "raised", label: "Chart zones, palest to darkest: light icing; serious at descent power; moderate at cruise; serious at any power" },
  ],
  caption: `Fuel evaporating in the venturi takes its heat from the air: about ${R.DROP_EVAP.toFixed(0)} degrees at a ${R.CARB.AFR}:1 mixture, and the speed-up in the throat takes ${R.DROP_SPEED.toFixed(0)} more, so the air reaching the throttle plate is some ${Math.round(R.DROP)} degrees colder than the air outside. On a mild, damp day that is well below freezing, and the water in the air comes out as ice on the plate and the bore. That is why the chart's worst zone sits between about -7 and 21 °C with high humidity, not in winter, and why light icing is possible up to 38 °C. Carb heat feeds air from a muff round the exhaust, ${HEAT_RISE} degrees warmer: the same moisture is then far from saturation and the frost melts. Zone edges are drawn from the published chart's reading points (FAA SAIB CE-09-35) and are approximate; use the real chart to fly.`,
  body: `${style}<div class="iso-stage" tabindex="0" role="slider" aria-label="Carburettor icing: left and right arrows change the temperature, up and down the humidity, space toggles carb heat" aria-valuemin="${T_MIN}" aria-valuemax="${T_MAX}" aria-valuenow="${START.t}">${svg}</div>`,
});

const script = kitScript() + "\n" + rigSource() + "\n" + live;
writeFileSync(join(HERE, OUT), k.pageHtml({ title: "Carburettor ice", theme, body, script }));
console.log("wrote", OUT, "svg", Math.round(svg.length / 1024) + " KB");
