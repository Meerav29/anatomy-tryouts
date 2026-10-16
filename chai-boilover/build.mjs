import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../kit/iso-kit.mjs";
import { kitScript } from "../scripts/inline-kit.mjs";
import * as R from "./rig.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";
const OUT = theme === "light" ? "chai-boilover-light.html" : "chai-boilover.html";

const WIDTH = 640;
const HEIGHT = 420;

// Two glass-fronted tanks, each a one-pot-thick slice, so the inside of the pot can be seen from the front.
const PLATE = { x: -112, y: -42, w: 224, d: 94, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;

const TW = 82; // tank outer width
const DP = 18; // tank depth
const WALL = 3;
const YF = -16; // the glass front
const YB = YF - DP;
const BASE_H = 3;
const FLOOR_H = 4;
const Z0 = BASE_H + FLOOR_H; // inside floor
const SPAN = 64; // inner height, which is one rim height of liquid
const RIM_Z = Z0 + SPAN;
const TOP_Z = RIM_Z + 2; // wall lip
const IX = TW - WALL * 2; // inner width
const IY0 = YB + WALL;
const IY1 = YF - 0.6;
const TANKS = [
  { key: "water", label: "WATER", x: -52 },
  { key: "milk", label: "MILK", x: 52 },
];
const THERMO = { water: -102, milk: 4 };
const THERMO_Y = YF + 2;
const THERMO_FULL = 50; // mercury height at 100 C

const RAIL = { x: -84, y: 28, w: 168, d: 7, r: 3.5 };
const KNOB_Y = RAIL.y + RAIL.d / 2;
const KNOB_X0 = -76;
const KNOB_SPAN = 152;
const knobX = (heat) => KNOB_X0 + KNOB_SPAN * heat;
const BOIL_OVER_HEAT = 0.5; // the burner setting above which the milk goes over

// packed bubbles that make up the foam: row k sits k * 5.6 above the liquid line
const FOAM = (() => {
  let seed = 90210;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const out = [];
  for (let row = 0; row < 14; row++) {
    const cols = row % 2 ? 10 : 11;
    for (let i = 0; i < cols; i++) {
      const r = Math.round((3.1 + rand() * 0.7) * 10) / 10;
      out.push([Math.round((-34.5 + i * 6.9 + (row % 2 ? 3.5 : 0) + (rand() - 0.5) * 0.8) * 10) / 10, Math.round((3.4 + row * 5.6 + (rand() - 0.5) * 0.8) * 10) / 10, r]);
    }
  }
  return out;
})();

const START_CLOCK = 16;
const sim = { heat: R.heatAt(0), water: R.newPot(), milk: R.newPot() };
for (let t = 0; t < START_CLOCK; t += 1 / 60) {
  sim.heat = R.heatAt(t);
  R.step(sim.water, sim.heat, 1 / 60, "water");
  R.step(sim.milk, sim.heat, 1 / 60, "milk");
}
const startState = { heat: sim.heat, water: sim.water, milk: sim.milk };

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    ...TANKS.flatMap((t) => [[t.x - TW / 2 - 6, YB, RIM_Z + 42], [t.x + TW / 2 + 6, YF + 12, RIM_Z + 42]]),
  ],
  WIDTH,
  HEIGHT,
  { pad: 12, azimuth: 66, elevation: 28 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const red = (text) => text.replace("<text ", '<text style="fill:var(--anatomy-red)" ');

/* ---------------------------------------------------------------- plate and heat control */
function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 20))) {
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

function control() {
  const out = [];
  out.push(S(k.slabOf(RAIL, 0, 3, P, 4, 0.5), { tone: "mid" }));
  out.push(L(k.lineOnTop([KNOB_X0, KNOB_Y], [KNOB_X0 + KNOB_SPAN, KNOB_Y], 3, P), { tone: "lo", free: true }));
  // the span of burner settings that boils the milk over
  out.push(`<path class="iso-line" data-tone="red" d="${k.lineOnTop([knobX(BOIL_OVER_HEAT), KNOB_Y], [knobX(1), KNOB_Y], 3, P)}" style="stroke-width:2"/>`);
  const ticks = k.topTicks(KNOB_X0, KNOB_X0 + KNOB_SPAN, KNOB_SPAN / 10, 5, RAIL.y - 5, 0, [1.6, 3], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  const label = (x, text, style = {}) => k.faceTextSvg(k.topMatrix([x, RAIL.y + RAIL.d + 7.5], 0, P, "x"), text, { size: 2.9, tone: "hi", anchor: "middle", ...style });
  out.push(label(knobX(0), "OFF"), label(knobX(0.3), "SIMMER"), red(label(knobX(0.78), "ROLLING BOIL: MILK GOES OVER")));
  return out.join("");
}
function knob() {
  const out = [];
  out.push(S(k.cylinder(0, KNOB_Y, 6.4, 3, 8, P, 40, 0.8), { tone: "hi", lit: true, crease: "lo" }));
  out.push(L(k.knurl(0, KNOB_Y, 6.4, 3, 6, 36, P, 0.3), { tone: "lo" }));
  out.push(L(k.ring(0, KNOB_Y, 4.2, 11, P, 32), { tone: "lo" }));
  out.push(`<path class="iso-line" data-tone="lit" data-free="both" d="${k.lineOnTop([0, KNOB_Y + 0.6], [0, KNOB_Y + 5.2], 11.2, P)}" style="stroke-width:1.2"/>`);
  return out.join("");
}

/* ---------------------------------------------------------------- tanks */
function tankBack(t) {
  const out = [];
  const x0 = t.x - TW / 2;
  const baseFront = YF + 9;
  out.push(S(k.slabOf({ x: x0 - 2, y: YB - 2, w: TW + 4, d: baseFront - YB + 2, r: 2 }, 0, BASE_H, P, 4, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf({ x: x0, y: YB, w: TW, d: DP, r: 1 }, BASE_H, FLOOR_H, P, 3, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: x0, y: YB, w: TW, d: WALL, r: 0.6 }, Z0, TOP_Z - Z0, P, 2, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: x0, y: YB, w: WALL, d: DP, r: 0.6 }, Z0, TOP_Z - Z0, P, 2, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: x0 + TW - WALL, y: YB, w: WALL, d: DP, r: 0.6 }, Z0, TOP_Z - Z0, P, 2, 0.3), { tone: "mid" }));
  // the label strip and heater lamps on the base's front margin
  out.push(k.faceTextSvg(k.topMatrix([x0 + 5, YF + 6.3], BASE_H, P, "x"), t.label, { size: 3, tone: "hi", anchor: "start" }));
  out.push(t.key === "water" ? "" : "");
  out.push(Array.from({ length: 6 }, (_, i) => `<g data-lamp="${t.key}-${i}">${S(k.cylinder(x0 + 38 + i * 6.8, YF + 4.6, 1.7, BASE_H, 1.2, P, 16, 0.2), { tone: "hi" })}</g>`).join(""));
  return out.join("");
}
function tankFront(t) {
  const out = [];
  const x0 = t.x - TW / 2;
  const x1 = t.x + TW / 2;
  // the glass pane
  const pane = [[x0, YF, BASE_H], [x1, YF, BASE_H], [x1, YF, TOP_Z], [x0, YF, TOP_Z]].map(at);
  out.push(L(k.pathOf(pane, true), { tone: "mid" }));
  out.push(L(k.segment([x0 + 7, YF, TOP_Z - 6], [x0 + 15, YF, TOP_Z - 24], P) + k.segment([x0 + 12, YF, TOP_Z - 5], [x0 + 18, YF, TOP_Z - 19], P), { tone: "faint", free: true }));
  // the rim line
  out.push(L(k.segment([x0, YF, RIM_Z], [x1, YF, RIM_Z], P), { tone: "red", dashed: true }));
  const note = t.key === "water" ? "STEAM ESCAPES" : "STEAM TRAPPED UNDER THE SKIN";
  out.push(`<g data-part="note-${t.key}" opacity="0">${k.faceTextSvg(k.sideMatrix([t.x, YF], RIM_Z + 38, P, "left"), note, { size: 3.3, tone: "hi", anchor: "middle" })}</g>`);
  return out.join("");
}

function thermometer(key) {
  const x = THERMO[key];
  const out = [];
  out.push(S(k.cylinder(x, THERMO_Y, 4.6, BASE_H, 3, P, 24, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf({ x: x - 2.2, y: THERMO_Y - 2.2, w: 4.4, d: 4.4, r: 2.2 }, BASE_H + 3, THERMO_FULL + 14, P, 8, 0.2), { tone: "mid", crease: "none" }));
  const zb = BASE_H + 3 + 2 + THERMO_FULL * 0.0;
  for (const [T, len] of [[20, 2.4], [60, 2.4], [100, 4.4]]) {
    const z = 8 + ((T - 20) / 80) * THERMO_FULL;
    const sx = key === "water" ? 1 : -1;
    out.push(L(k.segment([x + sx * 2.2, THERMO_Y + 2.2, z], [x + sx * (2.2 + len), THERMO_Y + 2.2, z], P), { tone: T === 100 ? "red" : "mid", free: true }));
  }
  return out.join("");
}

/* ---------------------------------------------------------------- live source */
const rigSource = () => readFileSync(join(HERE, "rig.mjs"), "utf8").replace(/^export /gm, "");

const live = `
const P = ${JSON.stringify(P)};
const TANKS = ${JSON.stringify(TANKS)};
const THERMO = ${JSON.stringify(THERMO)};
const FOAM = ${JSON.stringify(FOAM)};
const TW = ${TW}, YF = ${YF}, YB = ${YB}, WALL = ${WALL}, BASE_H = ${BASE_H}, Z0 = ${Z0}, SPAN = ${SPAN}, RIM_Z = ${RIM_Z}, IX = ${IX}, IY0 = ${IY0}, IY1 = ${IY1};
const THERMO_Y = ${THERMO_Y}, THERMO_FULL = ${THERMO_FULL}, KNOB_Y = ${KNOB_Y}, KNOB_X0 = ${KNOB_X0}, KNOB_SPAN = ${KNOB_SPAN};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const $ = (name) => svg.querySelector('[data-part="' + name + '"]');
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const levelZ = (level) => (level <= 1 ? Z0 + level * SPAN : RIM_Z + Math.min(24, (level - 1) * SPAN * 2.4));
const rnd = (a, b) => a + Math.random() * (b - a);

const start = ${JSON.stringify(startState)};
const pots = { water: Object.assign(newPot(), start.water), milk: Object.assign(newPot(), start.milk) };
const fx = { water: { bubbles: [], pops: [], steam: [], spawn: 0 }, milk: { bubbles: [], pops: [], steam: [], spawn: 0, drops: [] } };
let heat = start.heat, target = heat, clock = ${START_CLOCK}, stirT = 0, time = 0;
let frame = 0, last = 0, visible = false, touring = !still.matches, idleTimer = 0;
const el = {};
for (const t of TANKS) el[t.key] = { dyn: $("dyn-" + t.key), over: $("over-" + t.key), fill: $("fill-" + t.key), lamps: [...svg.querySelectorAll('[data-lamp^="' + t.key + '-"]')].map((g) => g.querySelector(".iso-solid")) };
const knob = $("knob");
const notes = { water: $("note-water"), milk: $("note-milk") };

// the bubbles the burner makes at the floor: each rises, then pops in water, or is stopped by the skin in milk
function bubbles(t, pot, dt) {
  const f = fx[t.key], milk = t.key === "milk";
  const surface = Z0 + pot.vol * SPAN;
  const boil = pot.T >= RIM_T() ? 0.35 + 0.65 * vaporOf(heat) : smooth(65, 100, pot.T) * 0.3;
  f.spawn += boil * 22 * dt;
  while (f.spawn >= 1 && f.bubbles.length < 70) { f.spawn -= 1; f.bubbles.push({ x: rnd(-IX / 2 + 4, IX / 2 - 4), z: Z0 + 1.5, r0: rnd(0.9, 1.9), vz: rnd(20, 32), ph: rnd(0, 6), held: 0 }); }
  f.spawn = Math.min(f.spawn, 1);
  const kept = [];
  for (const b of f.bubbles) {
    if (b.held) { b.held += dt; if (b.held < 0.4) kept.push(b); continue; }
    b.z += b.vz * dt; b.x += Math.sin(time * 4 + b.ph) * 3 * dt;
    const r = b.r0 * (1 + ((b.z - Z0) / SPAN) * 0.8);
    if (b.z + r >= surface) {
      if (milk && pot.skin > 0.35) { b.held = 0.001; b.z = surface - r; kept.push(b); }
      else { f.pops.push({ x: b.x, z: surface, t: 0 }); for (let i = 0; i < 2; i++) f.steam.push({ x: b.x + rnd(-3, 3), z: surface + 2, t: 0, vz: rnd(14, 24) }); }
    } else kept.push(b);
  }
  f.bubbles = kept;
  f.pops = f.pops.filter((p) => (p.t += dt) < 0.3);
  f.steam = f.steam.filter((s) => { s.t += dt; s.z += s.vz * dt; return s.t < 1.2 && f.steam.length < 60; });
}
function RIM_T() { return RIG.T_BOIL - 0.5; }

const faceY = IY1;
const ringAt = (x, y, z, r) => sideRing([x, y, z], r, "y", P, 14);
function tank(t, pot, hn) {
  const milk = t.key === "milk", f = fx[t.key];
  const x0 = t.x - IX / 2, level = levelOf(pot), top = levelZ(level), surface = Z0 + pot.vol * SPAN;
  const over = Math.max(0, level - 1), capB = Math.min(4, over * 28), capTop = top > RIM_Z + 0.5;
  let out = "";
  // liquid
  out += solidSvg(slabOf({ x: x0, y: IY0, w: IX, d: IY1 - IY0, r: 0.4 }, Z0, Math.max(1, Math.min(surface, RIM_Z) - Z0), P, 2, 0.3), { tone: milk ? "hi" : "mid", lit: milk, crease: "lo" });
  // bubbles rising from the heated floor
  const rings = [];
  for (const b of f.bubbles) {
    const r = b.r0 * (1 + ((b.z - Z0) / SPAN) * 0.8);
    rings.push([ringAt(t.x + b.x, faceY, b.z, r), b.held ? 1 - b.held / 0.4 : 1]);
  }
  for (const p of f.pops) rings.push([ringAt(t.x + p.x, faceY, p.z, 1.2 + (p.t / 0.3) * 6), 1 - p.t / 0.3]);
  out += fadedSvg(rings, { tone: milk ? "mid" : "hi", free: true });
  if (milk && level > pot.vol + 0.01) {
    // foam: packed bubbles between the liquid and the skin
    const foamTop = top, cut = Math.min(foamTop, RIM_Z);
    out += solidSvg(slabOf({ x: x0, y: IY0, w: IX, d: IY1 - IY0, r: 0.4 }, Math.min(surface, RIM_Z), Math.max(0.6, cut - Math.min(surface, RIM_Z)), P, 2, 0.3), { tone: "hi", lit: true, crease: "none" });
    if (capTop) out += solidSvg(slabOf({ x: x0 - capB, y: IY0 - capB, w: IX + capB * 2, d: IY1 - IY0 + capB * 2, r: 3 }, RIM_Z, top - RIM_Z, P, 6, 0.8), { tone: "hi", lit: true, crease: "lo" });
    const foam = [];
    const fh = top - surface;
    for (const [fxp, fz, fr] of FOAM) {
      const z = surface + fz;
      if (z + fr > top - 0.8) continue;
      const above = z - fr > RIM_Z - 0.5;
      foam.push([ringAt(t.x + fxp * (above ? 1 + capB / 40 : 1), above ? IY1 + capB : faceY, z, fr), 1]);
    }
    out += fadedSvg(foam, { tone: "mid", free: true });
  }
  if (milk && pot.skin > 0.03) {
    // the skin: a film over the top, thicker as it sets
    const plan = capTop ? { x: x0 - capB, y: IY0 - capB, w: IX + capB * 2, d: IY1 - IY0 + capB * 2, r: 3 } : { x: x0 - 0.3, y: IY0 - 0.3, w: IX + 0.6, d: IY1 - IY0 + 0.6, r: 0.6 };
    out += solidSvg(slabOf(plan, top, 0.5 + 1.5 * pot.skin, P, 6, 0.3), { tone: "hi", crease: "none" });
  }
  return out;
}
// the tongues of milk hanging off the rim: where they are and how long
function tongues(pot, level) {
  const spill = clamp(pot.spilled / 0.9, 0, 1), over = Math.max(0, level - 1);
  const list = [-29, -17, -6, 7, 19, 30].map((c, j) => ({ c, s: 3 + 0.9 * Math.abs(Math.sin(j * 1.9)), len: Math.min(24, 1.5 + spill * 22 * (0.3 + 0.7 * Math.abs(Math.sin(j * 2.3 + 1))) + over * 20 + (spill > 0.05 ? 0.7 * Math.sin(time * 1.3 + j * 2) : 0)) }));
  return { list, base: 1.2 + spill * 1.6 + over * 5 };
}
function runoff(pot, dt) {
  const f = fx.milk, level = levelOf(pot), spill = clamp(pot.spilled / 0.9, 0, 1);
  if (level > 0.99 && spill > 0.08 && f.drops.length < 6 && Math.random() < dt * (1 + spill * 2)) {
    const g = tongues(pot, level), tg = g.list[Math.floor(Math.random() * g.list.length)];
    if (tg.len > 9) f.drops.push({ x: tg.c, z: RIM_Z - g.base - tg.len, vz: 0 });
  }
  f.drops = f.drops.filter((d) => { d.vz += 110 * dt; d.z -= d.vz * dt; return d.z > BASE_H + 0.5; });
}
function above(t, pot) {
  const milk = t.key === "milk", f = fx[t.key];
  const level = levelOf(pot), top = levelZ(level), x0 = t.x - IX / 2;
  let out = "";
  // steam escaping out of the open top (it is trapped under a skin)
  out += dotsSvg(f.steam.map((s) => { const [px, py] = iso([t.x + s.x, (IY0 + IY1) / 2, s.z], P); return [px, py, 0.9 * (1 - s.t / 1.2)]; }), { size: 0.9, tone: "hi" });
  // milk running down the glass, drops off the tips, and the puddle on the plate
  if (milk) {
    const spill = clamp(pot.spilled / 0.9, 0, 1), wet = clamp((level - 0.92) / 0.08, 0, 1);
    const tg = tongues(pot, level);
    if (wet > 0.02) {
      const xs = [];
      for (let x = -IX / 2 + 1; x <= IX / 2 - 1 + 1e-6; x += 1.4) xs.push(x);
      const bottom = xs.map((x) => [t.x + x, YF + 0.3, RIM_Z - tg.base - tg.list.reduce((a, g) => a + g.len * Math.exp(-Math.pow((x - g.c) / g.s, 2)), 0)]);
      const topEdge = [[t.x + IX / 2 - 1, YF + 0.3, RIM_Z + 1.2], [t.x - IX / 2 + 1, YF + 0.3, RIM_Z + 1.2]];
      const outline = pathOf([...bottom, ...topEdge].map((p) => iso(p, P)), true);
      const inner = pathOf(bottom.map(([x, y, z]) => iso([x, y, z + 1.1], P)));
      out += '<g opacity="' + wet.toFixed(2) + '"><g class="iso-solid" data-lit=""><path class="iso-fill" d="' + outline + '"/><path class="iso-line iso-edge" data-tone="hi" d="' + outline + '"/></g>' + lineSvg(inner, { tone: "mid", free: true }) + '</g>';
      out += dotsSvg(fx.milk.drops.map((d) => iso([t.x + d.x, YF + 0.6, d.z], P)), { size: 1.25, tone: "hi" });
    }
    if (spill > 0.03) {
      // milk collects at the foot of the glass, finds the one gap between label and lamps, and runs off the base
      const px = t.x - 12, pr = 6 + spill * 24;
      const pool = Array.from({ length: 36 }, (_, i) => { const a = (i / 36) * Math.PI * 2; return iso([t.x - 4 + Math.cos(a) * pr * (1 + 0.06 * Math.sin(4 * a)), YF + 1.9 + Math.sin(a) * (0.9 + spill * 0.8), BASE_H + 0.2], P); });
      const pd = pathOf(pool, true);
      out += '<g class="iso-solid" data-lit=""><path class="iso-fill" d="' + pd + '"/><path class="iso-line iso-edge" data-tone="hi" d="' + pd + '"/></g>';
      if (spill > 0.1) {
        const face = YF + 9.1, w = 1.2 + spill * 0.5;
        const run = pathOf([[px - w, YF + 2.5, BASE_H + 0.2], [px + w, YF + 2.5, BASE_H + 0.2], [px + w, face, BASE_H + 0.2], [px + w * 0.8, face, 0.4], [px - w * 0.8, face, 0.4], [px - w, face, BASE_H + 0.2]].map((p) => iso(p, P)), true);
        out += '<g class="iso-solid" data-lit=""><path class="iso-fill" d="' + run + '"/><path class="iso-line iso-edge" data-tone="hi" d="' + run + '"/></g>';
      }
      const rx = 8 + spill * 17, ry = 3.4 + spill * 6, cy = YF + 9.6 + ry * 1.3;
      const blob = Array.from({ length: 48 }, (_, i) => {
        const a = (i / 48) * Math.PI * 2, r = 1 + 0.1 * Math.sin(3 * a + 1) + 0.07 * Math.sin(5 * a + 2) + 0.05 * Math.sin(2 * a);
        return iso([px + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r, 0.4], P);
      });
      const bd = pathOf(blob, true);
      out += '<g class="iso-solid" data-lit=""><path class="iso-fill" d="' + bd + '"/><path class="iso-line iso-edge" data-tone="hi" d="' + bd + '"/></g>';
      const gloss = Array.from({ length: 10 }, (_, i) => { const a = 3.6 + (i / 9) * 1.5; return iso([px + Math.cos(a) * rx * 0.6, cy + Math.sin(a) * ry * 0.55, 0.4], P); });
      out += lineSvg(pathOf(gloss), { tone: "mid", free: true });
    }
  }
  // the spoon
  if (milk && stirT > 0) {
    const sx = t.x + Math.sin((1 - stirT / 0.8) * 14) * 24, zt = RIM_Z + 34;
    out += solidSvg(slabOf({ x: sx - 1.3, y: (IY0 + IY1) / 2 - 1.3, w: 2.6, d: 2.6, r: 1.2 }, top, zt - top, P, 6, 0.3), { tone: "hi", lit: true, crease: "none" });
  }
  return out;
}

function draw() {
  for (const t of TANKS) {
    const pot = pots[t.key], e = el[t.key];
    e.dyn.innerHTML = tank(t, pot);
    e.over.innerHTML = above(t, pot);
    const h = clamp((pot.T - 20) / 80, 0, 1) * THERMO_FULL;
    e.fill.innerHTML = solidSvg(slabOf({ x: THERMO[t.key] - 1.1, y: THERMO_Y - 1.1, w: 2.2, d: 2.2, r: 1.1 }, 8, Math.max(0.5, h), P, 6), { tone: "hi", lit: true, crease: "none" });
    const n = Math.round(heat * 6);
    e.lamps.forEach((s, i) => (i < n ? s.setAttribute("data-lit", "") : s.removeAttribute("data-lit")));
  }
  notes.water.setAttribute("opacity", pots.water.T > 96 && heat > 0.4 ? "1" : "0");
  notes.milk.setAttribute("opacity", pots.milk.T > 96 && heat > 0.4 && pots.milk.skin > 0.5 ? "1" : "0");
  knob.setAttribute("transform", translateAlong(P, [KNOB_X0 + KNOB_SPAN * heat, 0, 0]));
  const m = pots.milk, lvl = levelOf(m), w = pots.water;
  const text = "heat " + Math.round(heat * 100) + "% \\u00b7 " + Math.round(Math.max(w.T, m.T)) + "\\u00b0C \\u00b7 milk " + lvl.toFixed(2) + "\\u00d7 rim";
  if (readout.textContent !== text) readout.textContent = text;
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  time += dt;
  if (touring) { clock += dt; target = heatAt(clock); }
  heat += (target - heat) * (still.matches ? 1 : 1 - Math.exp(-dt / 0.35));
  for (let left = dt; left > 1e-6; left -= 1 / 60) {
    const h = Math.min(left, 1 / 60);
    step(pots.water, heat, h, "water");
    step(pots.milk, heat, h, "milk");
  }
  for (const t of TANKS) bubbles(t, pots[t.key], dt);
  runoff(pots.milk, dt);
  stirT = Math.max(0, stirT - dt);
  draw();
  stage.setAttribute("aria-valuenow", String(Math.round(heat * 100)));
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const resume = () => { idleTimer = setTimeout(() => { if (!still.matches) { touring = true; clock = target > 0.5 ? 12 : pots.milk.T > 60 ? 31 : 0; run(); } }, 4200); };
const steer = (next) => { touring = false; target = clamp(next, 0, 1); clearTimeout(idleTimer); resume(); run(); };
const stirMilk = () => { stir(pots.milk); stirT = 0.8; clearTimeout(idleTimer); resume(); run(); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  steer(((event.clientX - box.left) / box.width - 0.1) / 0.8);
});
stage.addEventListener("click", stirMilk);
stage.addEventListener("keydown", (event) => {
  let next = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") next = target + (event.shiftKey ? 0.2 : 0.05);
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = target - (event.shiftKey ? 0.2 : 0.05);
  if (event.key === "Home") next = 0;
  if (event.key === "End") next = 1;
  if (event.key === " " || event.key === "Enter" || event.key === "s") { event.preventDefault(); stirMilk(); return; }
  if (next === null) return;
  event.preventDefault();
  steer(next);
});
for (let i = 0; i < 150; i++) { time += 1 / 60; for (const t of TANKS) bubbles(t, pots[t.key], 1 / 60); }
draw();
`;

const tankGroup = (t) =>
  [
    tankBack(t),
    `<g data-part="dyn-${t.key}"></g>`,
    tankFront(t),
    `<g data-part="over-${t.key}"></g>`,
  ].join("");

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "Two glass-fronted tanks on one burner, water on the left and milk on the right, with a thermometer by each and a heat knob on a rail at the front. At a rolling boil both read 100 degrees. In the water, bubbles rise from the heated floor and pop at the surface, letting the steam escape, so the level stays put. In the milk a skin forms on top and stops the bubbles, so foam piles up under it, passes the dashed rim line and runs down the outside.",
  body: [
    plate(),
    tankGroup(TANKS[0]),
    thermometer("water"),
    `<g data-part="fill-water"></g>`,
    thermometer("milk"),
    `<g data-part="fill-milk"></g>`,
    tankGroup(TANKS[1]),
    control(),
    `<g data-part="knob" transform="${k.translateAlong(P, [knobX(startState.heat) - 0, 0, 0])}">${knob()}</g>`,
  ],
});

const body = k.plateHtml({
  fig: "Fig 6",
  title: "Chai boilover",
  hint: "Move for heat · click to stir",
  readout: `heat ${Math.round(startState.heat * 100)}% · ${Math.round(Math.max(startState.water.T, startState.milk.T))}°C · milk ${R.levelOf(startState.milk).toFixed(2)}× rim`,
  keys: [
    { mark: "lit", label: "Milk, its foam and the thermometers" },
    { mark: "raised", label: "Water, glass and burner" },
    { mark: "red", label: "Rim line and the heat that boils milk over" },
  ],
  caption:
    "Same burner, same heat, and both read 100 degrees. In water, steam bubbles rise and pop at the surface, so the steam escapes and the level stays put. Milk grows a skin of set protein, and it stops the bubbles. The steam piles up under it as foam, faster than it can burst, and pushes over the rim. Turn it down to a simmer, or click to stir and break the skin, and it settles.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Chai boilover: arrow keys change the burner heat, Enter stirs the milk" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(startState.heat * 100)}">${svg}</div>`,
});

const script = kitScript() + "\n" + rigSource() + "\n" + live;
writeFileSync(join(HERE, OUT), k.pageHtml({ title: "Chai boilover", theme, body, script }));
console.log("wrote", OUT, "svg", Math.round(svg.length / 1024) + " KB");
