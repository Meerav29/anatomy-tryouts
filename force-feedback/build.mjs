import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../kit/iso-kit.mjs";
import { kitScript } from "../scripts/inline-kit.mjs";
import * as R from "./rig.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";
const OUT = theme === "light" ? "force-feedback-light.html" : "force-feedback.html";

const { SLIP_MAX, SCALE_MAX, MOTOR_MAX, RATIO, GAIN_MIN, GAIN_MAX } = R.FFB;
const WIDTH = 640;
const HEIGHT = 440;

const PLATE = { x: -165, y: -130, w: 330, d: 256, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;

/* plotter: two cards, one behind the other, sharing the slip axis */
const CARD_X0 = -120;
const CARD_W = 240;
const CARD_D = 38;
const CARDS = { rack: { x: CARD_X0, y: 12, w: CARD_W, d: CARD_D, r: 1 }, ffb: { x: CARD_X0, y: 60, w: CARD_W, d: CARD_D, r: 1 } };
const CARD_Z = 1.6;
const RAILS = [2, 103.6];
const RAIL_D = 4.4;
const RAIL_H = 3.5;
const BLOCK_TOP = 10;
const BRIDGE = { x: -5, y: -1.2, w: 10, d: 110.4, r: 1.6 };
const BRIDGE_TOP = 15;
const xOf = (slip) => CARD_X0 + (CARD_W * slip) / SLIP_MAX;
const yOf = (card, T) => card.y + card.d - (card.d * Math.min(T, SCALE_MAX)) / SCALE_MAX;

/* the real side: a tyre on a slip turntable, a rack held by a spring */
const TT = [-82, -64];
const TT_R = 30;
const TREAD = { w: 34, d: 20 }; // contact block, long along its heading
const RY = -112; // the rack's line
const HOUSING = { x: -146, y: RY - 6, w: 60, d: 12, r: 3 };
const RACK_Z = 10;
const COLLAR_X = -70; // collar at rest
const STOP_X = -36;
const TRAVEL = 16; // collar travel at full scale

/* the sim side: a direct-drive motor, a wheel on top */
const M = [74, -70];
const MOUNT = { x: 30, y: -112, w: 98, d: 86, r: 4 };
const CAN_R = 24;
const CAN_TOP = 32;
const FLANGE_TOP = 35;
const WHEEL_R = 36;
const WHEEL_Z = 38;
const WHEEL_TOP = 42;
const KNOB = [116, -38];
const LAMPS = Array.from({ length: 8 }, (_, i) => [38 + i * 7.4, -33]);

const GAUGES = [
  { at: [-140, -36], label: "RACK", key: "rack" },
  { at: [146, -46], label: "FFB", key: "ffb" },
];
const GAUGE_R = 16;
const GAUGE_Z = 24;
const GAUGE_H = 9;
const GAUGE_TOP = GAUGE_Z + GAUGE_H;
const GAUGE_FROM = (-135 * Math.PI) / 180;
const GAUGE_SPAN = (270 * Math.PI) / 180;

const START = { slip: 2.4, gain: 0.6 };
const m0 = { rack: R.rackOf(START.slip), ffb: R.outputOf(START.slip, START.gain) };

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), ...GAUGES.map((g) => [g.at[0], g.at[1], GAUGE_TOP + 2]), [M[0], M[1] - WHEEL_R, WHEEL_TOP + 6], [M[0] + WHEEL_R, M[1], WHEEL_TOP + 6]],
  WIDTH,
  HEIGHT,
  { pad: 16, azimuth: 56, elevation: 36 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const deg = Math.PI / 180;

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
  const label = { x: 104, y: 110, w: 40, d: 9, r: 1.6 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 4), { tone: "faint" }));
  const rule = (x0, x1, y) => L(k.lineOnTop([x0, y], [x1, y], 0.8, P), { tone: "lo", free: true });
  out.push(rule(label.x + 5, label.x + 28, label.y + 3), rule(label.x + 5, label.x + 21, label.y + 4.6), rule(label.x + 5, label.x + 26, label.y + 6.2));
  out.push(D([at([label.x + 3.2, label.y + 4.5, 0.8]), at([label.x + label.w - 3.2, label.y + 4.5, 0.8])], { size: 0.4 }));

  // vents down the left side
  for (let i = 0; i < 7; i++) out.push(L(k.planOutline({ x: -158, y: 10 + i * 12, w: 2.6, d: 7, r: 1.3 }, 0, P, 3), { tone: "lo" }));
  return out.join("");
}

/* ---------------------------------------------------------------- dials */
function gauge({ at: [x, y], label, key }) {
  const out = [`<path class="iso-halo" d="${k.cylinder(x, y, 12, 0, 0.1, P, 32).fill}" style="filter:blur(3px)"/>`];
  out.push(S(k.cylinder(x, y, 11, 0, 3, P, 40, 0.5), { tone: "mid" }));
  out.push(D(Array.from({ length: 4 }, (_, i) => at([x + 8 * Math.cos(i * 1.5708 + 0.785), y + 8 * Math.sin(i * 1.5708 + 0.785), 3])), { size: 0.4 }));
  out.push(S(k.cylinder(x, y, 4, 3, GAUGE_Z - 6, P, 24), { tone: "mid", crease: "none" }));
  out.push(L([8, 13].map((z) => k.sideArc(x, y, 4, z, P, 12)).join(""), { tone: "faint" }));
  out.push(S(k.cylinder(x, y, 6.2, GAUGE_Z - 6, 3, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 7.4, GAUGE_Z - 3, 3, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, GAUGE_R, GAUGE_Z, GAUGE_H, P, 64, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(x, y, GAUGE_R, GAUGE_TOP - 3.2, GAUGE_TOP, 80, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(x, y, GAUGE_R, GAUGE_TOP - 3.2, P, 40), { tone: "faint" }));
  out.push(L(k.ring(x, y, GAUGE_R - 2.2, GAUGE_TOP, P, 64), { tone: "lo" }));
  // 0..24 Nm: a tick every 2 Nm, a major every 4
  const ticks = k.radialTicks(x, y, GAUGE_R - 3.1, 12, 2, GAUGE_TOP, [1.2, 2.5], P, GAUGE_FROM, GAUGE_SPAN);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  if (key === "ffb") {
    // the motor's limit: a band over the torque it can't reach, and a stop pin at 8 Nm
    const a0 = GAUGE_FROM + GAUGE_SPAN * (MOTOR_MAX / SCALE_MAX);
    const arc = (r) => Array.from({ length: 25 }, (_, i) => {
      const a = a0 + ((GAUGE_FROM + GAUGE_SPAN - a0) * i) / 24;
      return [x + Math.sin(a) * r, y - Math.cos(a) * r];
    });
    out.push(`<path class="iso-line" data-tone="mid" data-free="both" d="${k.onTop(arc(GAUGE_R - 6.2), GAUGE_TOP, P)}" style="stroke-width:1.4"/>`);
    const pin = [x + Math.sin(a0) * (GAUGE_R - 7.6), y - Math.cos(a0) * (GAUGE_R - 7.6)];
    out.push(S(k.cylinder(pin[0], pin[1], 0.9, GAUGE_TOP, 1.6, P, 14), { tone: "mid" }));
  }
  out.push(k.faceTextSvg(k.topMatrix([x, y + 8.6], GAUGE_TOP, P, "x"), label, { size: 2.1, tone: "lo", anchor: "middle" }));
  return out.join("");
}
const needleAt = ({ at: [x, y] }, T) => {
  const angle = GAUGE_FROM + GAUGE_SPAN * Math.min(1, Math.max(0, T / SCALE_MAX));
  const sx = Math.sin(angle);
  const sy = -Math.cos(angle);
  return k.lineOnTop([x - sx * 3.2, y - sy * 3.2], [x + sx * (GAUGE_R - 4), y + sy * (GAUGE_R - 4)], GAUGE_TOP + 0.2, P);
};
const hubOf = ({ at: [x, y] }) => S(k.cylinder(x, y, 1.6, GAUGE_TOP, 1, P, 16), { tone: "mid" });

/* ---------------------------------------------------------------- the real side */
function turntableBase() {
  const [cx, cy] = TT;
  const out = [`<path class="iso-halo" d="${k.cylinder(cx, cy, TT_R + 2, 0, 0.1, P, 48).fill}" style="filter:blur(3px)"/>`];
  out.push(S(k.cylinder(cx, cy, TT_R, 0, 4, P, 72, 0.6), { tone: "mid" }));
  out.push(L(k.sideArc(cx, cy, TT_R, 2, P, 48), { tone: "faint" }));
  // degree ring: a tick every 2 deg over +-16, a major every 10; the zero mark points along +x
  const span = 32 * deg;
  const ticks = k.radialTicks(cx, cy, TT_R - 0.6, 16, 5, 4, [1.6, 3], P, Math.PI / 2 - span / 2, span);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([TT_R - 4, -(TT_R - 4)].map((r) => at([cx, cy + r, 4])), { size: 0.45 }));
  // the bearing race the table turns on
  out.push(L(k.ring(cx, cy, TT_R - 5, 4, P, 64), { tone: "lo" }));
  return out.join("");
}
const rotate = ([x, y], [cx, cy], a) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)];
// the table and the tyre block on it, turned to the slip angle; rebuilt live
function table(slip) {
  const [cx, cy] = TT;
  const a = slip * deg;
  const out = [];
  out.push(S(k.cylinder(cx, cy, TT_R - 7, 4, 3, P, 64, 0.5), { tone: "mid" }));
  const pointer = [rotate([cx + TT_R - 9.5, cy], TT, a), rotate([cx + TT_R - 7, cy], TT, a)];
  out.push(L(k.onTop(pointer, 7, P), { tone: "hi" }));
  const block = k.ringOf({ x: cx - TREAD.w / 2, y: cy - TREAD.d / 2, w: TREAD.w, d: TREAD.d, r: 4 }, 4).map((p) => rotate(p, TT, a));
  out.push(S(k.extrude(block, 7, 6, P, { bevel: 0.5 }), { tone: "hi", lit: true, crease: "lo" }));
  // tread grooves run the block's length, edge to edge
  const grooves = [-5, 0, 5].map((dy) => k.onTop([rotate([cx - TREAD.w / 2, cy + dy], TT, a), rotate([cx + TREAD.w / 2, cy + dy], TT, a)], 13, P)).join("");
  out.push(L(grooves, { tone: "lo" }));
  return out.join("");
}
function rack() {
  const out = [];
  // two saddles and the housing
  for (const x of [HOUSING.x + 6, HOUSING.x + HOUSING.w - 14]) {
    out.push(S(k.slabOf({ x, y: RY - 8, w: 8, d: 16, r: 1.2 }, 0, RACK_Z - 6, P, 3, 0.4), { tone: "mid" }));
    out.push(D([at([x + 4, RY - 6.4, RACK_Z - 6]), at([x + 4, RY + 6.4, RACK_Z - 6])], { size: 0.4 }));
  }
  out.push(S(k.slabOf(HOUSING, RACK_Z - 6, 12, P, 4, 0.6), { tone: "mid", inner: L(k.sideSeam(HOUSING, RACK_Z - 1, P, 4), { tone: "faint" }) }));
  out.push(D(k.corners(HOUSING, 3).map(([x, y]) => at([x, y, RACK_Z + 6])), { size: 0.4 }));
  out.push(L(k.planOutline({ x: HOUSING.x + 12, y: RY - 2, w: 30, d: 4, r: 2 }, RACK_Z + 6, P, 4), { tone: "lo" }));
  // the stop bracket the spring pushes on
  out.push(S(k.slabOf({ x: STOP_X, y: RY - 8, w: 5, d: 16, r: 1 }, 0, RACK_Z + 8, P, 3, 0.4), { tone: "mid" }));
  out.push(D([at([STOP_X + 2.5, RY - 5, RACK_Z + 8]), at([STOP_X + 2.5, RY + 5, RACK_Z + 8])], { size: 0.4 }));
  return out.join("");
}
// the rack bar, its collar and the spring, at a collar travel of `d`; rebuilt live
function rackLive(d) {
  const cx = COLLAR_X + d;
  const out = [];
  const hx = HOUSING.x + HOUSING.w;
  out.push(S(k.slabOf({ x: hx, y: RY - 2, w: cx - hx, d: 4, r: 1.6 }, RACK_Z - 2, 4, P, 3), { tone: "hi", crease: "none" }));
  out.push(S(k.slabOf({ x: cx, y: RY - 6, w: 3, d: 12, r: 1 }, RACK_Z - 6, 12, P, 3, 0.3), { tone: "hi", lit: true, crease: "lo" }));
  const c = k.coil(cx + 3, STOP_X, [RY, RACK_Z], 4.2, 7, "x", P);
  out.push(L(c.back, { tone: "lo", free: true }));
  out.push(S(k.slabOf({ x: cx + 3, y: RY - 1, w: STOP_X - cx - 3, d: 2, r: 0.8 }, RACK_Z - 1, 2, P, 2), { tone: "mid", crease: "none" }));
  out.push(L(c.front, { tone: "mid", free: true }));
  return out.join("");
}
const travelOf = (T) => (TRAVEL * Math.min(T, SCALE_MAX)) / SCALE_MAX;

/* ---------------------------------------------------------------- the sim side */
function motor() {
  const [cx, cy] = M;
  const out = [`<path class="iso-halo" d="${k.haloOf(MOUNT, 0, 0.1, P)}" style="filter:blur(4px)"/>`];
  out.push(S(k.slabOf(MOUNT, 0, 4, P, 4, 0.6), { tone: "mid" }));
  out.push(D(k.corners(MOUNT, 4).map(([x, y]) => at([x, y, 4])), { size: 0.45 }));
  out.push(L(k.planOutline(k.insetPlan(MOUNT, 2.4), 4, P, 4), { tone: "faint" }));
  // clip lamps along the front edge
  out.push(LAMPS.map(([x, y], i) => `<g data-lamp="${i}">${S(k.cylinder(x, y, 2, 4, 1.2, P, 16, 0.2), { tone: "lo" })}</g>`).join(""));
  // strength knob
  out.push(S(k.cylinder(KNOB[0], KNOB[1], 6.4, 4, 2, P, 28, 0.3), { tone: "mid" }));
  out.push(S(k.cylinder(KNOB[0], KNOB[1], 5, 6, 4, P, 28, 0.3), { tone: "mid" }));
  out.push(L(k.knurl(KNOB[0], KNOB[1], 5, 6, 10, 24, P, 0.3), { tone: "lo" }));
  // knob scale: a tick per 10% from 25% to 100%
  const kt = k.radialTicks(KNOB[0], KNOB[1], 7.4, 8, 4, 4, [1, 1.8], P, -0.75 * Math.PI, 1.5 * Math.PI);
  out.push(L(kt.minor, { tone: "lo" }), L(kt.major, { tone: "mid" }));
  // motor can: flange foot, finned body, front flange
  out.push(S(k.cylinder(cx, cy, CAN_R + 3, 4, 3, P, 64, 0.4), { tone: "mid" }));
  out.push(D(Array.from({ length: 6 }, (_, i) => [cx + (CAN_R + 1.5) * Math.cos((i * Math.PI) / 3 + 0.3), cy + (CAN_R + 1.5) * Math.sin((i * Math.PI) / 3 + 0.3)]).map(([x, y]) => at([x, y, 7])), { size: 0.45 }));
  out.push(S(k.cylinder(cx, cy, CAN_R, 7, CAN_TOP - 7, P, 72), { tone: "mid", crease: "none", inner: L([12, 27].map((z) => k.sideArc(cx, cy, CAN_R, z, P, 48)).join(""), { tone: "faint" }) }));
  out.push(L(k.knurl(cx, cy, CAN_R, 12, 27, 72, P, 0.3), { tone: "lo" }));
  out.push(S(k.cylinder(cx, cy, CAN_R + 1.6, CAN_TOP, FLANGE_TOP - CAN_TOP, P, 72, 0.5), { tone: "mid" }));
  out.push(D(Array.from({ length: 8 }, (_, i) => [cx + (CAN_R - 1.2) * Math.cos((i * Math.PI) / 4), cy + (CAN_R - 1.2) * Math.sin((i * Math.PI) / 4)]).map(([x, y]) => at([x, y, FLANGE_TOP])), { size: 0.4 }));
  out.push(S(k.cylinder(cx, cy, 7, FLANGE_TOP, WHEEL_Z - FLANGE_TOP, P, 32), { tone: "mid" }));
  // the wheel disc with its grip
  out.push(S(k.cylinder(cx, cy, WHEEL_R, WHEEL_Z, WHEEL_TOP - WHEEL_Z, P, 96, 0.6), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(cx, cy, WHEEL_R, WHEEL_Z + 0.4, WHEEL_TOP - 0.4, 120, P, 0), { tone: "lo" }));
  out.push(L(k.ring(cx, cy, WHEEL_R - 5, WHEEL_TOP, P, 96), { tone: "lo" }));
  return out.join("");
}
const bar = ([cx, cy], a, r0, r1, w) => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [[r0, -w], [r1, -w], [r1, w], [r0, w]].map(([r, t]) => [cx + r * c - t * s, cy + r * s + t * c]);
};
// spokes, hub and top mark turned to the wheel angle; rebuilt live
function wheelLive(slip) {
  const a = slip * RATIO * deg;
  const out = [];
  const spokes = [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6].map((s) => ({ s, mid: [M[0] + 18 * Math.cos(s + a), M[1] + 18 * Math.sin(s + a)] }));
  for (const { s } of spokes.sort((p, q) => k.depthOf([...p.mid, 0], P) - k.depthOf([...q.mid, 0], P))) out.push(S(k.extrude(bar(M, s + a, 6, WHEEL_R - 5, 3), WHEEL_TOP, 1.4, P), { tone: "mid" }));
  out.push(S(k.cylinder(M[0], M[1], 8, WHEEL_TOP, 2.4, P, 36, 0.4), { tone: "mid" }));
  out.push(L(k.ring(M[0], M[1], 4, WHEEL_TOP + 2.4, P, 24), { tone: "lo" }));
  // the top-centre mark on the rim
  out.push(S(k.extrude(bar(M, -Math.PI / 2 + a, WHEEL_R - 4.6, WHEEL_R - 0.6, 2.2), WHEEL_TOP, 0.8, P), { tone: "hi", lit: true, crease: "lo" }));
  return out.join("");
}
const knobLive = (gain) => {
  const a = -0.75 * Math.PI + 1.5 * Math.PI * ((gain - GAIN_MIN) / (GAIN_MAX - GAIN_MIN));
  return L(k.lineOnTop([KNOB[0] + Math.sin(a) * 1, KNOB[1] - Math.cos(a) * 1], [KNOB[0] + Math.sin(a) * 4.4, KNOB[1] - Math.cos(a) * 4.4], 10, P), { tone: "hi", free: true });
};

/* ---------------------------------------------------------------- plotter */
const TRACE_N = 97;
const traceOf = (card, f) => k.onTop(Array.from({ length: TRACE_N }, (_, i) => {
  const s = (SLIP_MAX * i) / (TRACE_N - 1);
  return [xOf(s), yOf(card, f(s))];
}), CARD_Z, P);
function cards() {
  const out = [];
  for (const [name, card] of Object.entries(CARDS)) {
    const tray = k.insetPlan(card, -3);
    out.push(S(k.slabOf(tray, 0, 0.8, P, 3), { tone: "lo", crease: "none" }));
    out.push(S(k.slabOf(card, 0.8, CARD_Z - 0.8, P, 2), { tone: "hi", crease: "none" }));
    // grid: every 4 Nm across, every 1 deg along
    const grid = [];
    for (let T = 4; T < SCALE_MAX; T += 4) grid.push(k.lineOnTop([card.x, yOf(card, T)], [card.x + card.w, yOf(card, T)], CARD_Z, P));
    for (let s = 1; s < SLIP_MAX; s += 1) grid.push(k.lineOnTop([xOf(s), card.y], [xOf(s), card.y + card.d], CARD_Z, P));
    out.push(L(grid.join(""), { tone: "faint" }));
    // slip ticks hang from the back edge: every 0.5 deg, a major every 2
    const t = k.topTicks(card.x, card.x + card.w, CARD_W / (SLIP_MAX * 2), 4, card.y, CARD_Z, [1.2, 2.4], P);
    out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
    // corner clips
    for (const x of [card.x - 3, card.x + card.w - 3]) out.push(S(k.slabOf({ x, y: card.y - 3, w: 6, d: 6, r: 1 }, CARD_Z, 1.2, P, 2, 0.2), { tone: "mid" }), D([at([x + 3, card.y, CARD_Z + 1.2])], { size: 0.4 }));
    if (name === "rack") {
      out.push(L(traceOf(card, R.rackOf), { tone: "hi" }) .replace("<path", '<path style="stroke-width:1.3"'));
      // where the rack torque peaks: a short mark on the trace's own line
    } else {
      out.push(`<g data-part="wanted">${L(traceOf(card, (s) => R.wantedOf(s, START.gain)), { tone: "mid" })}</g>`);
      out.push(L(k.lineOnTop([card.x, yOf(card, MOTOR_MAX)], [card.x + card.w, yOf(card, MOTOR_MAX)], CARD_Z, P), { tone: "mid" }));
      out.push(`<g data-part="output">${L(traceOf(card, (s) => R.outputOf(s, START.gain)), { tone: "hi" }).replace("<path", '<path style="stroke-width:1.1"')}</g>`);
    }
  }
  return out.join("");
}
function rails() {
  const out = [];
  for (const y of RAILS) {
    out.push(S(k.slabOf({ x: -136, y, w: 272, d: RAIL_D, r: 1 }, 0, RAIL_H, P, 3, 0.4), { tone: "mid" }));
    out.push(D([-130, 130].map((x) => at([x, y + RAIL_D / 2, RAIL_H])), { size: 0.4 }));
    for (const x of [-141, 136]) {
      out.push(S(k.slabOf({ x, y: y - 1.8, w: 5, d: RAIL_D + 3.6, r: 1.2 }, 0, 7, P, 3, 0.5), { tone: "mid" }));
      out.push(D([at([x + 2.5, y + RAIL_D / 2, 7])], { size: 0.45 }));
    }
  }
  return out.join("");
}
// the gantry, built at x = 0 and moved along the slip axis
const blockAt = (y) => S(k.slabOf({ x: -4.4, y: y - 2.2, w: 8.8, d: RAIL_D + 4.4, r: 1.2 }, RAIL_H, BLOCK_TOP - RAIL_H, P, 3, 0.4), { tone: "mid" }) + D([at([-2.4, y + RAIL_D / 2, BLOCK_TOP]), at([2.4, y + RAIL_D / 2, BLOCK_TOP])], { size: 0.4 });
const penAt = (key, y) => `<g data-part="pen-${key}" transform="${k.translateAlong(P, [0, y, 0])}">${S(k.cylinder(0, 0, 0.9, CARD_Z, BLOCK_TOP - CARD_Z, P, 14), { tone: "mid", crease: "none", lit: true })}${D([at([0, 0, CARD_Z])], { size: 0.9, tone: "hi" })}</g>`;
const sliderAt = (key, y) => `<g data-part="slider-${key}" transform="${k.translateAlong(P, [0, y, 0])}">${S(k.slabOf({ x: -6.4, y: -3, w: 12.8, d: 6, r: 1.2 }, BRIDGE_TOP, 4, P, 3, 0.4), { tone: "hi", lit: true, crease: "lo" })}${D([at([-4.2, 0, BRIDGE_TOP + 4]), at([4.2, 0, BRIDGE_TOP + 4])], { size: 0.4 })}</g>`;
function gantry(m) {
  const out = [];
  out.push(blockAt(RAILS[0]));
  out.push(penAt("rack", yOf(CARDS.rack, m.rack)), penAt("ffb", yOf(CARDS.ffb, m.ffb)));
  out.push(blockAt(RAILS[1]));
  out.push(S(k.slabOf(BRIDGE, BLOCK_TOP, BRIDGE_TOP - BLOCK_TOP, P, 3, 0.5), { tone: "mid" }));
  out.push(L(k.planOutline({ x: -1.2, y: CARDS.rack.y, w: 2.4, d: CARDS.ffb.y + CARD_D - CARDS.rack.y, r: 1.2 }, BRIDGE_TOP, P, 4), { tone: "lo" }));
  out.push(sliderAt("rack", yOf(CARDS.rack, m.rack)), sliderAt("ffb", yOf(CARDS.ffb, m.ffb)));
  return out.join("");
}

const dial = (g) => gauge(g) + `<path data-part="needle-${g.key}" class="iso-line" data-tone="lit" data-free="both" d="${needleAt(g, m0[g.key])}" style="stroke-width:1.1"/>` + hubOf(g);

/* ---------------------------------------------------------------- live source */
const rigSource = () => readFileSync(join(HERE, "rig.mjs"), "utf8").replace(/^export /gm, "");
const fn = (f) => f.toString();

const live = `
const P = ${JSON.stringify(P)};
const GAUGES = ${JSON.stringify(GAUGES)};
const CARDS = ${JSON.stringify(CARDS)};
const deg = Math.PI / 180;
const TT = ${JSON.stringify(TT)}, TT_R = ${TT_R}, TREAD = ${JSON.stringify(TREAD)}, RY = ${RY}, HOUSING = ${JSON.stringify(HOUSING)}, RACK_Z = ${RACK_Z}, COLLAR_X = ${COLLAR_X}, STOP_X = ${STOP_X}, TRAVEL = ${TRAVEL};
const M = ${JSON.stringify(M)}, WHEEL_R = ${WHEEL_R}, WHEEL_TOP = ${WHEEL_TOP}, KNOB = ${JSON.stringify(KNOB)};
const GAUGE_R = ${GAUGE_R}, GAUGE_TOP = ${GAUGE_TOP}, GAUGE_FROM = ${GAUGE_FROM}, GAUGE_SPAN = ${GAUGE_SPAN};
const CARD_X0 = ${CARD_X0}, CARD_W = ${CARD_W}, CARD_Z = ${CARD_Z}, TRACE_N = ${TRACE_N};
const { SLIP_MAX, SCALE_MAX, MOTOR_MAX, RATIO, GAIN_MIN, GAIN_MAX } = FFB;
const S = (paths, style) => solidSvg(paths, style), L = (d, style) => lineSvg(d, style);
const xOf = ${fn(xOf)}, yOf = ${fn(yOf)};
const rotate = ${fn(rotate)}, bar = ${fn(bar)}, travelOf = ${fn(travelOf)};
const traceOf = ${fn(traceOf)};
${fn(table)}
${fn(rackLive)}
${fn(wheelLive)}
const knobLive = ${fn(knobLive)};
const needleAt = ${fn(needleAt)};
const k = { cylinder, ringOf, extrude, onTop, lineOnTop, coil, slabOf, ring, depthOf, translateAlong };
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const $ = (name) => svg.querySelector('[data-part="' + name + '"]');
const el = { table: $("table"), rack: $("rack"), wheel: $("wheel"), knob: $("knob"), gantry: $("gantry"), wanted: $("wanted"), output: $("output"),
  penRack: $("pen-rack"), penFfb: $("pen-ffb"), sliderRack: $("slider-rack"), sliderFfb: $("slider-ffb"), needleRack: $("needle-rack"), needleFfb: $("needle-ffb") };
const lamps = [...svg.querySelectorAll("[data-lamp]")].map((g) => g.querySelector(".iso-solid"));
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

let slip = ${START.slip}, gain = ${START.gain}, target = { slip, gain };
let held = wantedOf(slip, gain), smooth1 = held, holdClock = 0, shownRack = rackOf(slip), drawnGain = -1, lampsOn = -1;
let frame = 0, last = 0, visible = false, touring = !still.matches, clock = 0, idleTimer = 0;
// start the tour where the bench already is
clock = FFB.PERIOD * Math.acos(clamp(1 - 2 * (slip / SLIP_MAX), -1, 1)) / (Math.PI * 2);

function draw() {
  el.table.innerHTML = table(slip);
  el.rack.innerHTML = rackLive(travelOf(shownRack));
  el.wheel.innerHTML = wheelLive(slip);
  el.knob.innerHTML = knobLive(gain);
  if (Math.abs(gain - drawnGain) > 0.002) {
    drawnGain = gain;
    el.wanted.firstChild.setAttribute("d", traceOf(CARDS.ffb, (s) => wantedOf(s, gain)));
    el.output.firstChild.setAttribute("d", traceOf(CARDS.ffb, (s) => outputOf(s, gain)));
  }
  const ffb = Math.min(MOTOR_MAX, smooth1);
  el.gantry.setAttribute("transform", translateAlong(P, [xOf(slip), 0, 0]));
  const yr = yOf(CARDS.rack, shownRack), yf = yOf(CARDS.ffb, ffb);
  el.penRack.setAttribute("transform", translateAlong(P, [0, yr, 0]));
  el.sliderRack.setAttribute("transform", translateAlong(P, [0, yr, 0]));
  el.penFfb.setAttribute("transform", translateAlong(P, [0, yf, 0]));
  el.sliderFfb.setAttribute("transform", translateAlong(P, [0, yf, 0]));
  el.needleRack.setAttribute("d", needleAt(GAUGES[0], shownRack));
  el.needleFfb.setAttribute("d", needleAt(GAUGES[1], ffb));
  const clip = clipOf(slip, gain);
  // one lamp per 6.25% of the asked-for torque lost: all eight lit at half of it clipped
  const n = Math.round(clip * 2 * lamps.length);
  if (n !== lampsOn) { lampsOn = n; lamps.forEach((s, i) => (i < n ? s.setAttribute("data-lit", "") : s.removeAttribute("data-lit"))); }
  const text = slip.toFixed(1) + "\\u00b0 \\u00b7 rack " + rackOf(slip).toFixed(1) + " \\u00b7 FFB " + outputOf(slip, gain).toFixed(1) + " Nm \\u00b7 clip " + Math.round(clip * 100) + "% \\u00b7 " + Math.round(LATENCY_MS) + " ms";
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", text + ", strength " + Math.round(gain * 100) + "%");
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) { clock += dt; target.slip = tourSlip(clock); target.gain = tourGain(clock); }
  const f = calm ? 1 : 1 - Math.exp(-dt / 0.5);
  slip += (target.slip - slip) * f;
  gain += (target.gain - gain) * f;
  // the real rack answers at once; the sim samples it at 60 Hz, holds, smooths
  shownRack = rackOf(slip);
  holdClock += dt;
  if (calm || holdClock >= 1 / FFB.UPDATE_HZ) { holdClock = calm ? 0 : holdClock % (1 / FFB.UPDATE_HZ); held = wantedOf(slip, gain); }
  smooth1 = calm ? held : smooth1 + (held - smooth1) * (1 - Math.exp(-dt / FILTER_TAU));
  draw();
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const resume = () => { if (!still.matches) { touring = true; clock = FFB.PERIOD * Math.acos(clamp(1 - 2 * (target.slip / SLIP_MAX), -1, 1)) / (Math.PI * 2); run(); } };
const steer = (s, g) => { touring = false; target.slip = clamp(s, 0, SLIP_MAX); target.gain = clamp(g, GAIN_MIN, GAIN_MAX); clearTimeout(idleTimer); idleTimer = setTimeout(resume, 4200); run(); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const fx = clamp(((event.clientX - box.left) / box.width - 0.1) / 0.8, 0, 1);
  const fy = clamp(((event.clientY - box.top) / box.height - 0.1) / 0.8, 0, 1);
  steer(fx * SLIP_MAX, GAIN_MAX - fy * (GAIN_MAX - GAIN_MIN));
});
stage.addEventListener("keydown", (event) => {
  let s = target.slip, g = target.gain;
  if (event.key === "ArrowRight") s += event.shiftKey ? 2 : 0.5;
  else if (event.key === "ArrowLeft") s -= event.shiftKey ? 2 : 0.5;
  else if (event.key === "ArrowUp") g += 0.05;
  else if (event.key === "ArrowDown") g -= 0.05;
  else if (event.key === "Home") s = 0;
  else if (event.key === "End") s = SLIP_MAX;
  else return;
  event.preventDefault();
  steer(s, g);
});
draw();
`;

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A force-feedback test bench. On the left a tyre block on a turntable is turned to a slip angle, and a steering rack pushes its collar into a coil spring by the torque the tyre sends back; a dial reads it. On the right a direct-drive motor turns a wheel to the same steering angle, and its dial has a stop pin at the motor's 8 newton-metre limit. At the front a two-pen plotter draws torque against slip: the real rack's curve rises, peaks near 3 degrees and falls, while the sim's curve is the same curve scaled by the strength knob and flattened where the motor clips.",
  body: [
    plate(),
    dial(GAUGES[0]),
    rack(),
    `<g data-part="rack">${rackLive(travelOf(m0.rack))}</g>`,
    turntableBase(),
    `<g data-part="table">${table(START.slip)}</g>`,
    motor(),
    `<g data-part="wheel">${wheelLive(START.slip)}</g>`,
    `<g data-part="knob">${knobLive(START.gain)}</g>`,
    dial(GAUGES[1]),
    cards(),
    rails(),
    `<g data-part="gantry" transform="${k.translateAlong(P, [xOf(START.slip), 0, 0])}">${gantry(m0)}</g>`,
  ],
});

const body = k.plateHtml({
  fig: "Fig 10",
  title: "Force feedback",
  hint: "Across for slip, up for strength",
  readout: `${START.slip.toFixed(1)}° · rack ${m0.rack.toFixed(1)} · FFB ${m0.ffb.toFixed(1)} Nm · clip ${Math.round(R.clipOf(START.slip, START.gain) * 100)}% · ${Math.round(R.LATENCY_MS)} ms`,
  keys: [
    { mark: "lit", label: "Tyre block, rack collar, wheel mark, pens and needles" },
    { mark: "raised", label: "Back card: real rack torque. Front card: what the motor gives, with the line at its 8 Nm limit" },
  ],
  caption: `A tyre pushes back on the steering through its trail. The push grows with slip, peaks near ${R.RACK_PEAK.toFixed(1)} degrees and then falls away before the tyre reaches its grip limit at ${R.FFB.ALPHA_PEAK} degrees: that falling-off is how a driver feels the limit coming. A sim computes the same torque but must squeeze it into a motor that tops out at ${MOTOR_MAX} Nm. Turn the strength up and the peak and the fall-off are clipped flat, so the wheel goes quiet exactly where it should be talking. The sim also only updates ${R.FFB.UPDATE_HZ} times a second and is smoothed, so what you feel arrives about ${Math.round(R.LATENCY_MS)} ms late. Model: magic-formula tyre, brush-model trail, ${RATIO}:1 unassisted steering; numbers are illustrative of a GT car on slicks.`,
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Force feedback: left and right arrows change the slip angle, up and down the strength" aria-valuemin="0" aria-valuemax="${SLIP_MAX}" aria-valuenow="${START.slip}">${svg}</div>`,
});

const script = kitScript() + "\n" + rigSource() + "\n" + live;
writeFileSync(join(HERE, OUT), k.pageHtml({ title: "Force feedback", theme, body, script }));
console.log("wrote", OUT, "svg", Math.round(svg.length / 1024) + " KB");
