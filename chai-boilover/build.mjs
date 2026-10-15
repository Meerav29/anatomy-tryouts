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

const PLATE = { x: -134, y: -78, w: 268, d: 182, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;

// two glass pots on one plate, side by side; the water pot's handle points left, the milk pot's right
const POT_R = 34;
const POT_Y = -22;
const POTS = [
  { key: "water", label: "WATER", x: -66, side: -1 },
  { key: "milk", label: "MILK", x: 66, side: 1 },
];
const PAD_R = 27;
const PAD_H = 3;
const FLOOR_H = 3;
const Z0 = PAD_H + FLOOR_H; // bottom of the glass
const SPAN = 52; // glass height, which is one rim height of liquid
const RIM_Z = Z0 + SPAN;
const LIQ_R = POT_R - 1.4;
const LEVEL_MAX = 1.3;
const levelZ = (level) => Z0 + Math.min(level, 1.25) * SPAN;

const GAUGES = [
  { at: [-66, 72], label: "WATER", key: "water", count: 13, every: 5, arc: [1 / LEVEL_MAX, 1] },
  { at: [0, 72], label: "HEAT", key: "heat", count: 10, every: 5 },
  { at: [66, 72], label: "MILK", key: "milk", count: 13, every: 5, arc: [1 / LEVEL_MAX, 1] },
];
const GAUGE_R = 17;
const GAUGE_Z = 24;
const GAUGE_H = 10;
const GAUGE_TOP = GAUGE_Z + GAUGE_H;
const GAUGE_FROM = (-135 * Math.PI) / 180;
const GAUGE_SPAN = (270 * Math.PI) / 180;

const BUBBLES = Array.from({ length: 16 }, (_, i) => {
  const a = i * 2.399;
  const r = (POT_R - 8) * Math.sqrt((i + 0.5) / 16);
  return [Math.round(r * Math.cos(a) * 10) / 10, Math.round(r * Math.sin(a) * 10) / 10];
});

const START_CLOCK = 15;
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
    ...POTS.flatMap((p) => [[p.x - POT_R - 24, POT_Y, RIM_Z + 12], [p.x + POT_R + 24, POT_Y, RIM_Z + 12]]),
    ...GAUGES.map((g) => [g.at[0], g.at[1], GAUGE_TOP + 2]),
  ],
  WIDTH,
  HEIGHT,
  { pad: 14, azimuth: 62, elevation: 38 },
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
  // vents down the left side
  for (let i = 0; i < 8; i++) out.push(L(k.planOutline({ x: -142, y: -70 + i * 10, w: 2.6, d: 6, r: 1.3 }, 0, P, 3), { tone: "lo" }));
  // pot labels on the plate, in front of each burner
  for (const p of POTS) out.push(k.faceTextSvg(k.topMatrix([p.x, POT_Y + POT_R + 12], 0, P, "x"), p.label, { size: 2.6, tone: "lo", anchor: "middle" }));
  return out.join("");
}

/* ---------------------------------------------------------------- gauges */
function gauge({ at: [x, y], label, count, every, arc }) {
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
  // the rim zone, as a bold arc inside the ticks: a needle in it means over the edge
  if (arc) {
    const a0 = GAUGE_FROM + GAUGE_SPAN * arc[0];
    const a1 = GAUGE_FROM + GAUGE_SPAN * arc[1];
    const pts = Array.from({ length: 10 }, (_, i) => {
      const a = a0 + ((a1 - a0) * i) / 9;
      return [x + Math.sin(a) * (GAUGE_R - 6.4), y - Math.cos(a) * (GAUGE_R - 6.4)];
    });
    out.push(`<path class="iso-line" data-tone="lit" data-free="both" d="${k.onTop(pts, GAUGE_TOP, P)}" style="stroke-width:1.5"/>`);
  }
  out.push(L(k.ring(x, y, 1.7, GAUGE_TOP, P, 16), { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([x, y + 9], GAUGE_TOP, P, "x"), label, { size: 2.1, tone: "lo", anchor: "middle" }));
  return out.join("");
}
const gaugeValue = (key, v) => Math.min(1, Math.max(0, key === "heat" ? v : v / LEVEL_MAX));
const needleAt = ({ at: [x, y], key }, v) => {
  const angle = GAUGE_FROM + GAUGE_SPAN * gaugeValue(key, v);
  const sx = Math.sin(angle);
  const sy = -Math.cos(angle);
  return k.lineOnTop([x - sx * 3.4, y - sy * 3.4], [x + sx * (GAUGE_R - 4), y + sy * (GAUGE_R - 4)], GAUGE_TOP + 0.2, P);
};

/* ---------------------------------------------------------------- pots */
// a ring split at the silhouette: the back half is drawn behind the liquid, the front half over it
function halves(cx, cy, r, z) {
  const a = (P.azimuth * Math.PI) / 180;
  const N = 48;
  const start = a + Math.PI / 2; // the tangent points are samples, so the vertical edges land exactly on the rings
  const pts = Array.from({ length: N + 1 }, (_, i) => {
    const t = start + (i / N) * Math.PI * 2;
    return [cx + r * Math.cos(t), cy + r * Math.sin(t), t];
  });
  const front = pts.slice(0, N / 2 + 1);
  const back = pts.slice(N / 2);
  return { front: k.onTop(front.map(([x, y]) => [x, y]), z, P), back: k.onTop(back.map(([x, y]) => [x, y]), z, P), edges: [pts[0], pts[N / 2]] };
}

function burner(p) {
  const out = [];
  out.push(`<g data-part="pad-${p.key}">${S(k.cylinder(p.x, POT_Y, PAD_R, 0, PAD_H, P, 40, 0.5), { tone: "mid" })}</g>`);
  out.push(L([9, 16, 23].map((r) => k.ring(p.x, POT_Y, r, PAD_H, P, 40)).join(""), { tone: "lo" }));
  return out.join("");
}
function potBack(p) {
  const out = [`<g data-part="puddle-${p.key}"></g>`];
  out.push(S(k.cylinder(p.x, POT_Y, POT_R + 1.2, PAD_H, FLOOR_H, P, 48, 0.4), { tone: "mid" }));
  const base = halves(p.x, POT_Y, POT_R, Z0);
  const rim = halves(p.x, POT_Y, POT_R, RIM_Z);
  out.push(L(base.back + rim.back, { tone: "lo" }));
  return out.join("");
}
function potFront(p) {
  const out = [];
  const base = halves(p.x, POT_Y, POT_R, Z0);
  const rim = halves(p.x, POT_Y, POT_R, RIM_Z);
  out.push(L(base.front + rim.front, { tone: "mid" }));
  const edge = (e) => k.segment([e[0], e[1], Z0], [e[0], e[1], RIM_Z], P);
  out.push(L(base.edges.map(edge).join(""), { tone: "mid" }));
  // rim bead and a faint fill-line ring
  out.push(L(k.ring(p.x, POT_Y, POT_R - 1.2, RIM_Z, P, 48), { tone: "faint" }));
  // handle
  const h = { x: p.side > 0 ? p.x + POT_R - 3 : p.x - POT_R - 22, y: POT_Y - 3.2, w: 25, d: 6.4, r: 2.2 };
  out.push(S(k.slabOf(h, RIM_Z - 14, 3.4, P, 4, 0.4), { tone: "mid" }));
  out.push(D([at([p.side > 0 ? h.x + h.w - 3 : h.x + 3, POT_Y, RIM_Z - 10.6])], { size: 0.45 }));
  return out.join("");
}

/* ---------------------------------------------------------------- live source */
const rigSource = () => readFileSync(join(HERE, "rig.mjs"), "utf8").replace(/^export /gm, "");

const live = `
const P = ${JSON.stringify(P)};
const GAUGES = ${JSON.stringify(GAUGES)};
const POTS = ${JSON.stringify(POTS)};
const BUBBLES = ${JSON.stringify(BUBBLES)};
const POT_R = ${POT_R}, POT_Y = ${POT_Y}, Z0 = ${Z0}, SPAN = ${SPAN}, RIM_Z = ${RIM_Z}, LIQ_R = ${LIQ_R}, PAD_H = ${PAD_H}, LEVEL_MAX = ${LEVEL_MAX};
const GAUGE_R = ${GAUGE_R}, GAUGE_TOP = ${GAUGE_TOP}, GAUGE_FROM = ${GAUGE_FROM}, GAUGE_SPAN = ${GAUGE_SPAN};
const AZ = P.azimuth * Math.PI / 180;
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const $ = (name) => svg.querySelector('[data-part="' + name + '"]');
const needles = GAUGES.map((g) => $("needle-" + g.key));
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const levelZ = (level) => Z0 + Math.min(level, 1.25) * SPAN;
const needleAt = (g, value) => {
  const v = g.key === "heat" ? value : value / LEVEL_MAX;
  const angle = GAUGE_FROM + GAUGE_SPAN * clamp(v, 0, 1), sx = Math.sin(angle), sy = -Math.cos(angle);
  return lineOnTop([g.at[0] - sx * 3.4, g.at[1] - sy * 3.4], [g.at[0] + sx * (GAUGE_R - 4), g.at[1] + sy * (GAUGE_R - 4)], GAUGE_TOP + 0.2, P);
};

const start = ${JSON.stringify(startState)};
const pots = { water: Object.assign(newPot(), start.water), milk: Object.assign(newPot(), start.milk) };
let heat = start.heat, target = heat, clock = ${START_CLOCK}, ripple = 0, time = 0;
let frame = 0, last = 0, visible = false, touring = !still.matches, idleTimer = 0;
const parts = {};
for (const p of POTS) parts[p.key] = { liquid: $("liquid-" + p.key), drips: $("drips-" + p.key), puddle: $("puddle-" + p.key), pad: $("pad-" + p.key).querySelector(".iso-solid") };

function liquid(p, pot) {
  const milk = p.key === "milk";
  const level = levelOf(pot);
  const top = levelZ(level);
  const over = Math.max(0, level - 1);
  let out = solidSvg(cylinder(p.x, POT_Y, LIQ_R, Z0, Math.max(1, top - Z0), P, 40, 0.4), { tone: milk ? "hi" : "mid", lit: milk, crease: "lo" });
  // bubbles on the surface: popping fast in water, standing in milk
  const boiling = pot.T >= RIG.T_BOIL - 0.5 ? vaporOf(heat) : 0;
  const n = milk ? Math.round(16 * clamp(pot.foam * 3.2, 0, 1)) : boiling > 0 ? Math.ceil(boiling * 14) + 2 : pot.T > 85 ? Math.round(((pot.T - 85) / 15) * 3) : 0;
  const rings = [];
  for (let i = 0; i < n; i++) {
    const [bx, by] = BUBBLES[i];
    if (milk) {
      const size = 1.8 + 2 * clamp(pot.foam / 0.45, 0, 1) + 0.25 * Math.sin(time * 2.6 + i * 1.7);
      rings.push([ring(p.x + bx, POT_Y + by, size, top + 0.3, P, 14), 1]);
    } else {
      const f = (time * 1.15 + i * 0.37) % 1;
      rings.push([ring(p.x + bx, POT_Y + by, 0.5 + 2.6 * f, top + 0.3, P, 12), 1 - f * f * f]);
    }
  }
  out += fadedSvg(rings, { tone: milk ? "lo" : "mid", free: true });
  if (milk) {
    // the skin: a film with an edge and wrinkles, fading in as it forms
    if (pot.skin > 0.03) {
      const wr = [[-14, -6, 8, 12], [-8, 8, 16, 2], [-18, 12, 4, 20]].map(([x0, y0, x1, y1]) => lineOnTop([p.x + x0 * 0.9, POT_Y + y0 * 0.9], [p.x + x1 * 0.9, POT_Y + y1 * 0.9], top + 0.4, P)).join("");
      out += '<g opacity="' + clamp(pot.skin * 1.2, 0, 1).toFixed(2) + '">' + lineSvg(ring(p.x, POT_Y, LIQ_R - 2.2, top + 0.4, P, 48), { tone: "mid" }) + lineSvg(wr, { tone: "lo", free: true }) + '</g>';
    }
    // foam piled over the rim
    if (level > 0.9) {
      const lumps = [];
      for (let j = 0; j < 7; j++) {
        const a = j * 0.9 + 0.35, h = 1 + (level - 0.9) * SPAN * 2.2 * (0.55 + 0.4 * Math.sin(j * 2.1 + time * 1.8));
        lumps.push([p.x + (LIQ_R - 6) * Math.cos(a), POT_Y + (LIQ_R - 6) * Math.sin(a), h]);
      }
      lumps.sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));
      for (const [lx, ly, h] of lumps) out += solidSvg(cylinder(lx, ly, 3.2, top, h, P, 16, 1.3), { tone: "hi", lit: true, crease: "none" });
    }
    if (ripple > 0) out += lineSvg(ring(p.x, POT_Y, 2 + (1 - ripple / 0.7) * (LIQ_R - 4), top + 0.5, P, 40), { tone: "lit", free: true });
  }
  return out;
}
function drips(p, pot) {
  const level = levelOf(pot), spill = clamp(pot.spilled / 0.9, 0, 1), over = Math.max(0, level - 1);
  if (spill < 0.01 && over < 0.005) return "";
  let out = "";
  for (let j = 0; j < 5; j++) {
    const a = AZ + (j - 2) * 0.5 + 0.08 * Math.sin(j * 5.3);
    const d = Math.min(28, 2 + spill * 30 * (0.55 + 0.45 * Math.sin(j * 1.7 + 1)) + over * 80);
    const dx = p.x + (POT_R + 0.6) * Math.cos(a), dy = POT_Y + (POT_R + 0.6) * Math.sin(a);
    out += solidSvg(cylinder(dx, dy, 1.5, RIM_Z - d, d + 1.4, P, 14, 0.5), { tone: "hi", lit: true, crease: "none" });
    out += solidSvg(cylinder(dx, dy, 2.4, RIM_Z - d - 1.2, 2.6, P, 14, 1), { tone: "hi", lit: true, crease: "none" });
  }
  return out;
}
function puddle(p, pot) {
  const spill = clamp(pot.spilled / 0.9, 0, 1);
  if (spill < 0.01) return "";
  return solidSvg(cylinder(p.x, POT_Y, POT_R + 2 + spill * 9, PAD_H - 0.4, 0.8, P, 48, 0.2), { tone: "mid", crease: "none" });
}

function draw() {
  for (const p of POTS) {
    const pot = pots[p.key], part = parts[p.key];
    part.liquid.innerHTML = liquid(p, pot);
    part.drips.innerHTML = drips(p, pot);
    part.puddle.innerHTML = puddle(p, pot);
    if (heat > 0.08) part.pad.setAttribute("data-lit", ""); else part.pad.removeAttribute("data-lit");
  }
  const shown = { heat, water: levelOf(pots.water), milk: levelOf(pots.milk) };
  GAUGES.forEach((g, i) => needles[i].setAttribute("d", needleAt(g, shown[g.key])));
  const m = pots.milk, lvl = levelOf(m);
  const text = "heat " + Math.round(heat * 100) + "% \\u00b7 milk " + Math.round(m.T) + "\\u00b0C \\u00b7 level " + lvl.toFixed(2) + "\\u00d7" + (m.spilled > 0.02 && lvl > 0.99 ? " \\u00b7 boiling over" : m.skin > 0.5 ? " \\u00b7 skin" : "");
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
  ripple = Math.max(0, ripple - dt);
  draw();
  stage.setAttribute("aria-valuenow", String(Math.round(heat * 100)));
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const resume = () => { idleTimer = setTimeout(() => { if (!still.matches) { touring = true; clock = target > 0.5 ? 12 : pots.milk.T > 60 ? 31 : 0; run(); } }, 4200); };
const steer = (next) => { touring = false; target = clamp(next, 0, 1); clearTimeout(idleTimer); resume(); run(); };
const stirMilk = () => { stir(pots.milk); ripple = 0.7; clearTimeout(idleTimer); resume(); run(); };
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
draw();
`;

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "Two glass pots on one electric burner, water on the left and milk on the right. At a rolling boil the water bubbles pop straight away and its level barely moves. The milk grows a skin that traps the steam, so foam builds up, climbs over the rim and runs down the side. Gauges show the heat and the level in each pot against the rim.",
  body: [
    plate(),
    ...byDepth(POTS.map((p) => [p.x, POT_Y, p])).map(([, , p]) =>
      [burner(p), potBack(p), `<g data-part="liquid-${p.key}"></g>`, potFront(p), `<g data-part="drips-${p.key}"></g>`].join(""),
    ),
    ...GAUGES.map((g) => gauge(g) + `<path data-part="needle-${g.key}" class="iso-line" data-tone="lit" data-free="both" d="${needleAt(g, startState[g.key] === undefined ? 0 : g.key === "heat" ? startState.heat : R.levelOf(startState[g.key]))}" style="stroke-width:1.1"/>`),
  ],
});

const body = k.plateHtml({
  fig: "Fig 6",
  title: "Chai boilover",
  hint: "Move across for heat · click to stir",
  readout: `heat ${Math.round(startState.heat * 100)}% · milk ${Math.round(startState.milk.T)}°C · level ${R.levelOf(startState.milk).toFixed(2)}×`,
  keys: [
    { mark: "lit", label: "Milk, foam and gauge needles" },
    { mark: "raised", label: "Glass pots, burners and plate" },
  ],
  caption:
    "Same burner, same heat, two pots. In water, steam bubbles reach the surface and pop, so the level barely moves. In milk, proteins steady the bubbles and, as it warms, a skin of set protein forms on top. The skin traps the steam, so foam builds faster than it bursts and climbs over the rim. Turn the heat down to a simmer, or click to stir and break the skin, and it settles.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Chai boilover: arrow keys change the burner heat, Enter stirs the milk" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(startState.heat * 100)}">${svg}</div>`,
});

const script = kitScript() + "\n" + rigSource() + "\n" + live;
writeFileSync(join(HERE, OUT), k.pageHtml({ title: "Chai boilover", theme, body, script }));
console.log("wrote", OUT, "svg", Math.round(svg.length / 1024) + " KB");
