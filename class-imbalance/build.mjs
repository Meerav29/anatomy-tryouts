import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { kitScript } from "../scripts/inline-kit.mjs";
import * as R from "./rig.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";
const OUT = theme === "light" ? "class-imbalance-light.html" : "class-imbalance.html";

const { BED_Z, BEAD_R } = R.RIG;
const WIDTH = 640;
const HEIGHT = 400;

const PLATE = { x: -165, y: -108, w: 330, d: 184, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const TRAY = { x: -98, y: -54, w: 196, d: 108, r: 6 };
const TRAY_H = BED_Z;

const GAUGES = [
  { at: [-80, -84], label: "LAZY ACC", key: "lazy" },
  { at: [0, -84], label: "MODEL P", key: "precision" },
  { at: [80, -84], label: "MODEL R", key: "recall" },
];
const GAUGE_R = 17;
const GAUGE_Z = 24;
const GAUGE_H = 10;
const GAUGE_TOP = GAUGE_Z + GAUGE_H;
const GAUGE_FROM = (-135 * Math.PI) / 180;
const GAUGE_SPAN = (270 * Math.PI) / 180;

const KNOB_BOX = { x: 114, y: -24, w: 44, d: 48, r: 3 };
const KNOB_BOX_H = 14;
const KNOB = [KNOB_BOX.x + KNOB_BOX.w / 2, KNOB_BOX.y + KNOB_BOX.d / 2];
const KNOB_R = 9;
const KNOB_TOP = KNOB_BOX_H + 5;
const KNOB_FROM = GAUGE_FROM;
const KNOB_SPAN = GAUGE_SPAN;
const START_KNOB = 0.0;

const CELLS = R.makeCells();

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), ...GAUGES.map((g) => [g.at[0], g.at[1], GAUGE_TOP + 2])],
  WIDTH,
  HEIGHT,
  { pad: 18, azimuth: 56, elevation: 36 },
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

  // column ruler along the tray's near edge: one tick per column
  const strip = { x: -100, y: 60, w: 200, d: 8, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(-90, 90, R.RIG.PITCH, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 5, 0.6]), at([strip.x + strip.w - 2, strip.y + 5, 0.6])], { size: 0.45 }));

  // label plate
  const label = { x: 108, y: 56, w: 52, d: 10, r: 1.6 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 4), { tone: "faint" }));
  const rule = (x0, x1, y) => L(k.lineOnTop([x0, y], [x1, y], 0.8, P), { tone: "lo", free: true });
  out.push(rule(label.x + 5, label.x + 38, label.y + 3.4), rule(label.x + 5, label.x + 28, label.y + 5.2), rule(label.x + 5, label.x + 34, label.y + 7));
  out.push(D([at([label.x + 3.2, label.y + 5, 0.8]), at([label.x + label.w - 3.2, label.y + 5, 0.8])], { size: 0.4 }));

  // vents down the left side
  for (let i = 0; i < 7; i++) out.push(L(k.planOutline({ x: -148, y: -34 + i * 10, w: 2.6, d: 6, r: 1.3 }, 0, P, 3), { tone: "lo" }));
  return out.join("");
}

/* ---------------------------------------------------------------- gauges */
function gauge({ at: [x, y], label }) {
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
  const ticks = k.radialTicks(x, y, GAUGE_R - 3.2, 20, 5, GAUGE_TOP, [1.2, 2.6], P, GAUGE_FROM, GAUGE_SPAN);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(L(k.ring(x, y, 1.7, GAUGE_TOP, P, 16), { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([x, y + 8.4], GAUGE_TOP, P, "x"), label, { size: 2.1, tone: "lo", anchor: "middle" }));
  return out.join("");
}
const needleAt = ([x, y], value) => {
  const angle = GAUGE_FROM + GAUGE_SPAN * Math.min(1, Math.max(0, value));
  const sx = Math.sin(angle);
  const sy = -Math.cos(angle);
  return k.lineOnTop([x - sx * 3.4, y - sy * 3.4], [x + sx * (GAUGE_R - 4), y + sy * (GAUGE_R - 4)], GAUGE_TOP + 0.2, P);
};

/* ---------------------------------------------------------------- tray */
function tray() {
  const out = [`<path class="iso-halo" d="${k.haloOf(TRAY, 0, TRAY_H, P)}" style="filter:blur(4px)"/>`];
  out.push(S(k.slabOf(TRAY, 0, TRAY_H, P, 6, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(TRAY, 3), TRAY_H, P, 5), { tone: "faint" }));
  out.push(D(k.corners(TRAY, 6).map(([x, y]) => at([x, y, TRAY_H])), { size: 0.45 }));
  // one well ring and a centre dot under every bead
  out.push(L(CELLS.map((c) => k.ring(c.x, c.y, BEAD_R + 0.5, TRAY_H, P, 14)).join(""), { tone: "faint" }));
  out.push(D(CELLS.map((c) => at([c.x, c.y, TRAY_H])), { size: 0.4, tone: "lo" }));
  return out.join("");
}

const START_STATE = R.stateOf(CELLS, R.countOf(START_KNOB));
function beadGroup(c, index) {
  const paths = G.sphereOf([c.x, c.y, BED_Z + BEAD_R], BEAD_R, P, { steps: 14 });
  const svg = S(paths, START_STATE[index].pos ? { tone: "hi", lit: true } : { tone: "mid" });
  return `<g data-bead="${index}"><path class="iso-line" data-tone="lo" data-pin d="${k.rise([c.x, c.y], BED_Z, BED_Z, P)}"/><g data-ball>${svg}</g></g>`;
}

/* ---------------------------------------------------------------- the prevalence knob */
function knobBox() {
  const out = [`<path class="iso-halo" d="${k.haloOf(KNOB_BOX, 0, 0.1, P)}" style="filter:blur(3px)"/>`];
  out.push(S(k.slabOf(KNOB_BOX, 0, KNOB_BOX_H, P, 5, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(KNOB_BOX, 3), KNOB_BOX_H, P, 4), { tone: "faint" }));
  out.push(D(k.corners(KNOB_BOX, 4.4).map(([x, y]) => at([x, y, KNOB_BOX_H])), { size: 0.45 }));
  out.push(L(k.ring(KNOB[0], KNOB[1], 14, KNOB_BOX_H, P, 56), { tone: "lo" }));
  const t = k.radialTicks(KNOB[0], KNOB[1], 14, 12, 4, KNOB_BOX_H, [1.4, 2.8], P, KNOB_FROM, KNOB_SPAN);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  return out.join("");
}
const knobPointer = (u) => {
  const angle = KNOB_FROM + KNOB_SPAN * u;
  const sx = Math.sin(angle);
  const sy = -Math.cos(angle);
  return k.lineOnTop([KNOB[0] + sx * 2.6, KNOB[1] + sy * 2.6], [KNOB[0] + sx * KNOB_R, KNOB[1] + sy * KNOB_R], KNOB_TOP, P);
};
function knobTop() {
  const out = [];
  out.push(S(k.cylinder(KNOB[0], KNOB[1], KNOB_R, KNOB_BOX_H, 5, P, 40, 0.5), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(KNOB[0], KNOB[1], KNOB_R, KNOB_BOX_H, KNOB_TOP, 36, P, 0.4), { tone: "lo" }));
  out.push(L(k.ring(KNOB[0], KNOB[1], KNOB_R - 1.6, KNOB_TOP, P, 40), { tone: "faint" }));
  out.push(L(k.ring(KNOB[0], KNOB[1], 1.3, KNOB_TOP, P, 12), { tone: "mid" }));
  return out.join("");
}

/* ---------------------------------------------------------------- live source */
const rigSource = () => readFileSync(join(HERE, "rig.mjs"), "utf8").replace(/^export /gm, "");

const live = `
const P = ${JSON.stringify(P)};
const CELLS = ${JSON.stringify(CELLS)};
const GAUGES = ${JSON.stringify(GAUGES)};
const GAUGE_R = ${GAUGE_R}, GAUGE_TOP = ${GAUGE_TOP}, GAUGE_FROM = ${GAUGE_FROM}, GAUGE_SPAN = ${GAUGE_SPAN};
const KNOB = ${JSON.stringify(KNOB)}, KNOB_R = ${KNOB_R}, KNOB_TOP = ${KNOB_TOP};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const needles = GAUGES.map((g) => svg.querySelector('[data-part="needle-' + g.key + '"]'));
const pointer = svg.querySelector('[data-part="pointer"]');
const els = [...svg.querySelectorAll("[data-bead]")].sort((a, b) => a.dataset.bead - b.dataset.bead);
const pins = els.map((el) => el.querySelector("[data-pin]"));
const balls = els.map((el) => el.querySelector("[data-ball]"));
const solids = balls.map((el) => el.querySelector(".iso-solid"));
const edges = solids.map((el) => el.querySelector(".iso-edge"));
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const needleAt = ([x, y], value) => {
  const angle = GAUGE_FROM + GAUGE_SPAN * clamp(value, 0, 1);
  const sx = Math.sin(angle), sy = -Math.cos(angle);
  return lineOnTop([x - sx * 3.4, y - sy * 3.4], [x + sx * (GAUGE_R - 4), y + sy * (GAUGE_R - 4)], GAUGE_TOP + 0.2, P);
};
const knobPointer = (u) => {
  const angle = GAUGE_FROM + GAUGE_SPAN * u;
  const sx = Math.sin(angle), sy = -Math.cos(angle);
  return lineOnTop([KNOB[0] + sx * 2.6, KNOB[1] + sy * 2.6], [KNOB[0] + sx * KNOB_R, KNOB[1] + sy * KNOB_R], KNOB_TOP, P);
};

let knob = ${START_KNOB}, target = knob;
let shownPos = CELLS.map((c, i) => stateOf(CELLS, countOf(knob))[i].pos);
const lift = CELLS.map(() => 0);
const want = CELLS.map(() => 0);
let shown = [1, 1, 1];
let frame = 0, last = 0, visible = false, touring = !still.matches, clock = 0, idleTimer = 0;
// sweep from half positive down to 1 in 100 and back
const tourAt = (c) => 0.5 - 0.5 * Math.cos((c / 24) * Math.PI * 2);

function paintBead(i, pos) {
  if (pos) { solids[i].setAttribute("data-lit", ""); edges[i].setAttribute("data-tone", "hi"); }
  else { solids[i].removeAttribute("data-lit"); edges[i].setAttribute("data-tone", "mid"); }
}
paintAll();
function paintAll() { shownPos.forEach((p, i) => paintBead(i, p)); }

function draw(m) {
  CELLS.forEach((c, i) => {
    pins[i].setAttribute("d", rise([c.x, c.y], RIG.BED_Z, RIG.BED_Z + lift[i], P));
    balls[i].setAttribute("transform", translateAlong(P, [0, 0, lift[i]]));
  });
  GAUGES.forEach((g, i) => needles[i].setAttribute("d", needleAt(g.at, shown[i])));
  pointer.setAttribute("d", knobPointer(knob));
  const text = "pos " + Math.round(m.share * 100) + "% \\u00b7 lazy " + m.lazy.toFixed(2) + " \\u00b7 model P " + m.precision.toFixed(2);
  if (readout.textContent !== text) readout.textContent = text;
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) { clock += dt; target = tourAt(clock); }
  knob = calm ? target : knob + (target - knob) * (1 - Math.exp(-dt / 0.25));
  if (Math.abs(target - knob) < 0.0003) knob = target;
  const positives = countOf(knob);
  const states = stateOf(CELLS, positives);
  const m = metricsOf(CELLS, positives);
  let moving = knob !== target;
  states.forEach((s, i) => {
    let goal = s.flagged ? RIG.LIFT : 0;
    if (s.pos !== shownPos[i]) { // a bead that changes class pops up, turns over at the top, and settles
      goal = RIG.LIFT + 5;
      if (calm || lift[i] >= goal - 0.6) { shownPos[i] = s.pos; paintBead(i, s.pos); }
      moving = true;
    }
    want[i] = goal;
    lift[i] = calm ? goal : lift[i] + (goal - lift[i]) * (1 - Math.exp(-dt / 0.07));
    if (Math.abs(goal - lift[i]) < 0.02) lift[i] = goal; else moving = true;
  });
  const goals = [m.lazy, m.precision, m.recall];
  shown = shown.map((v, i) => { const next = calm ? goals[i] : v + (goals[i] - v) * (1 - Math.exp(-dt / 0.18)); if (Math.abs(next - goals[i]) < 0.0005) return goals[i]; moving = true; return next; });
  draw(m);
  stage.setAttribute("aria-valuenow", String(Math.round(m.share * 100)));
  frame = visible && (touring || moving) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => { touring = false; target = clamp(next, 0, 1); clearTimeout(idleTimer); idleTimer = setTimeout(() => { if (!still.matches) { touring = true; clock = (24 / (Math.PI * 2)) * Math.acos(clamp(1 - 2 * target, -1, 1)); run(); } }, 3600); run(); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  steer(clamp(((event.clientX - box.left) / box.width - 0.1) / 0.8, 0, 1));
});
stage.addEventListener("keydown", (event) => {
  let next = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") next = target + (event.shiftKey ? 0.15 : 0.04);
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = target - (event.shiftKey ? 0.15 : 0.04);
  if (event.key === "Home") next = 0;
  if (event.key === "End") next = 1;
  if (next === null) return;
  event.preventDefault();
  steer(next);
});
draw(metricsOf(CELLS, countOf(knob)));
`;

const m0 = R.metricsOf(CELLS, R.countOf(START_KNOB));
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A tray of 200 bead wells. A knob on the right sets how many of the beads are positive, from half down to one in a hundred, and the beads flip over as it turns. A model that flags beads lifts them on pins. Three dial gauges read the accuracy of a model that always says negative, and the precision and recall of a real model.",
  body: [
    plate(),
    ...GAUGES.map((g) => gauge(g) + `<path data-part="needle-${g.key}" class="iso-line" data-tone="lit" data-free="both" d="${needleAt(g.at, m0[g.key])}" style="stroke-width:1.1"/>`),
    tray(),
    ...CELLS.map((c, i) => [c, i]).sort((a, b) => k.depthOf([a[0].x, a[0].y, 0], P) - k.depthOf([b[0].x, b[0].y, 0], P)).map(([c, i]) => beadGroup(c, i)),
    knobBox(),
    knobTop(),
    `<path data-part="pointer" class="iso-line" data-tone="lit" data-free="both" d="${knobPointer(START_KNOB)}" style="stroke-width:1.1"/>`,
  ],
});

const body = k.plateHtml({
  fig: "Fig 3",
  title: "Class imbalance",
  hint: "Move across to turn the knob",
  readout: `pos ${Math.round(m0.share * 100)}% · lazy ${m0.lazy.toFixed(2)} · model P ${m0.precision.toFixed(2)}`,
  keys: [
    { mark: "lit", label: "Positive example, and the gauge needles" },
    { mark: "raised", label: "Negative example" },
  ],
  caption:
    "Two hundred examples, and a knob that makes positives rarer. A lazy model that always says negative gets more accurate as they thin out, reaching 99% at one in a hundred while finding nothing. A real model with a fixed 90% hit rate and 5% false-alarm rate keeps its recall, but its precision collapses, because the false alarms from a huge negative pile swamp the few true hits.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Class imbalance: arrow keys turn the prevalence knob" aria-valuemin="1" aria-valuemax="50" aria-valuenow="50">${svg}</div>`,
});

const script = kitScript() + "\n" + rigSource() + "\n" + live;
writeFileSync(join(HERE, OUT), k.pageHtml({ title: "Class imbalance", theme, body, script }));
console.log("wrote", OUT, "cells", CELLS.length, "svg", Math.round(svg.length / 1024) + " KB");
