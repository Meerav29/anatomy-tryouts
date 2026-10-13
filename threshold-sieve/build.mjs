import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { kitScript } from "../scripts/inline-kit.mjs";
import * as R from "./rig.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";
const OUT = theme === "light" ? "threshold-sieve-light.html" : "threshold-sieve.html";

const { BED_Z, BEAD_R, LIFT, X0, X1 } = R.RIG;
const WIDTH = 640;
const HEIGHT = 400;

const PLATE = { x: -150, y: -110, w: 300, d: 196, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const BED = { x: -128, y: -44, w: 256, d: 88, r: 5 };
const RAIL_BACK = { x: -138, y: -52, w: 276, d: 5, r: 1 };
const RAIL_FRONT = { x: -138, y: 47, w: 276, d: 5, r: 1 };
const RAIL_H = 3;
const BLADE_Z = 12;
const BLADE_TOP = 28;
const CAR_Z = 3;
const CAR_TOP = 16;

const GAUGES = [
  { at: [-72, -88], label: "PRECISION", key: "precision" },
  { at: [72, -88], label: "RECALL", key: "recall" },
];
const GAUGE_R = 17;
const GAUGE_Z = 24;
const GAUGE_H = 10;
const GAUGE_TOP = GAUGE_Z + GAUGE_H;
const GAUGE_FROM = (-135 * Math.PI) / 180;
const GAUGE_SPAN = (270 * Math.PI) / 180;

const BEADS = R.makeBeads();
const START_T = 0.15;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [GAUGES[0].at[0], GAUGES[0].at[1], GAUGE_TOP + 2], [GAUGES[1].at[0], GAUGES[1].at[1], GAUGE_TOP + 2], [0, 0, BLADE_TOP + 6]],
  WIDTH,
  HEIGHT,
  { pad: 20, azimuth: 62, elevation: 38 },
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

  // score ruler along the front edge: 0 to 1 in steps of 0.05, a major every 0.25
  const strip = { x: -126, y: 57, w: 252, d: 8, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(X0, X1, 12, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 5, 0.6]), at([strip.x + strip.w - 2, strip.y + 5, 0.6])], { size: 0.45 }));
  for (const [x, text] of [[X0, "0"], [0, "0.5"], [X1, "1"]]) out.push(k.faceTextSvg(k.topMatrix([x, strip.y + 6.9], 0.6, P, "x"), text, { size: 2.3, tone: "lo", anchor: "middle" }));

  // label plate
  const label = { x: 84, y: 69, w: 52, d: 10, r: 1.6 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 4), { tone: "faint" }));
  const rule = (x0, x1, y) => L(k.lineOnTop([x0, y], [x1, y], 0.8, P), { tone: "lo", free: true });
  out.push(rule(label.x + 5, label.x + 38, label.y + 3.4), rule(label.x + 5, label.x + 28, label.y + 5.2), rule(label.x + 5, label.x + 34, label.y + 7));
  out.push(D([at([label.x + 3.2, label.y + 5, 0.8]), at([label.x + label.w - 3.2, label.y + 5, 0.8])], { size: 0.4 }));

  // vents along the back edge
  for (let i = 0; i < 8; i++) out.push(L(k.planOutline({ x: -30 + i * 9.5, y: -104, w: 6, d: 2.6, r: 1.3 }, 0, P, 3), { tone: "lo" }));
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

/* ---------------------------------------------------------------- bench */
function rail(plan) {
  const out = [S(k.slabOf(plan, 0, RAIL_H, P, 3, 0.4), { tone: "mid" })];
  out.push(D([plan.x + 6, plan.x + plan.w - 6].map((x) => at([x, plan.y + plan.d / 2, RAIL_H])), { size: 0.4 }));
  return out.join("");
}
function railStops(y0, y1) {
  const out = [];
  for (const x of [-142, 137]) {
    out.push(S(k.slabOf({ x, y: y0, w: 5, d: y1 - y0, r: 1.2 }, 0, 8, P, 3, 0.5), { tone: "mid" }));
    out.push(D([at([x + 2.5, y0 + 3, 8]), at([x + 2.5, y1 - 3, 8])], { size: 0.45 }));
  }
  return out.join("");
}

function bench() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BED, 0, BED_Z, P)}" style="filter:blur(4px)"/>`];
  out.push(S(k.slabOf(BED, 0, BED_Z, P, 6, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(BED, 3), BED_Z, P, 5), { tone: "faint" }));
  out.push(D(k.corners(BED, 6).map(([x, y]) => at([x, y, BED_Z])), { size: 0.45 }));
  // score gridlines every 0.25: closed to the bench edges
  for (const score of [0.25, 0.5, 0.75]) {
    const x = R.xOf(score);
    out.push(L(k.lineOnTop([x, BED.y], [x, BED.y + BED.d], BED_Z, P), { tone: "faint" }));
  }
  return out.join("");
}

function beadGroup(b, index) {
  const paths = G.sphereOf([b.x, b.y, BED_Z + BEAD_R], BEAD_R, P, { steps: 18 });
  const svg = S(paths, b.pos ? { tone: "hi", lit: true } : { tone: "mid" });
  return `<g data-bead="${index}"><path class="iso-line" data-tone="lo" data-pin d="${k.rise([b.x, b.y], BED_Z, BED_Z, P)}"/><g data-ball>${svg}</g></g>`;
}
const seats = () => L(BEADS.map((b) => k.ring(b.x, b.y, BEAD_R - 0.1, BED_Z, P, 14)).join(""), { tone: "faint" }) + D(BEADS.map((b) => at([b.x, b.y, BED_Z])), { size: 0.4, tone: "lo" });

/* ---------------------------------------------------------------- the sieve gate (built at x = 0) */
function carriage(plan) {
  const out = [];
  out.push(S(k.slabOf(plan, CAR_Z, CAR_TOP - CAR_Z, P, 4, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(plan, 1.6), CAR_TOP, P, 3), { tone: "faint" }));
  out.push(D(k.corners(plan, 2.4).map(([x, y]) => at([x, y, CAR_TOP])), { size: 0.4 }));
  return out.join("");
}
function gate() {
  const back = { x: -7, y: -54, w: 14, d: 10, r: 2 };
  const front = { x: -7, y: 44, w: 14, d: 10, r: 2 };
  const out = [carriage(back)];
  // blade: a thin plate hanging between the carriages, hovering above the beads
  const blade = { x: -1.2, y: -44, w: 2.4, d: 88, r: 0.6 };
  out.push(S(k.slabOf(blade, BLADE_Z, BLADE_TOP - BLADE_Z, P, 2, 0.5), { tone: "hi", crease: "lo" }));
  out.push(carriage(front));
  // knurled knob on the near carriage
  const kx = 0, ky = 49;
  out.push(S(k.cylinder(kx, ky, 4.6, CAR_TOP, 5, P, 28, 0.4), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(kx, ky, 4.6, CAR_TOP, CAR_TOP + 5, 26, P, 0.4), { tone: "lo" }));
  out.push(L(k.lineOnTop([kx - 4.4, ky], [kx + 4.4, ky], CAR_TOP + 5, P), { tone: "hi" }));
  out.push(D([at([kx, ky, CAR_TOP + 5])], { size: 0.5, tone: "hi" }));
  return out.join("");
}

/* ---------------------------------------------------------------- live source */
const rigSource = () => readFileSync(join(HERE, "rig.mjs"), "utf8").replace(/^export /gm, "");

const live = `
const P = ${JSON.stringify(P)};
const BEADS = ${JSON.stringify(BEADS)};
const GAUGES = ${JSON.stringify(GAUGES)};
const GAUGE_R = ${GAUGE_R}, GAUGE_TOP = ${GAUGE_TOP}, GAUGE_FROM = ${GAUGE_FROM}, GAUGE_SPAN = ${GAUGE_SPAN};
const BED = ${JSON.stringify(BED)};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const gateEl = svg.querySelector('[data-part="gate"]');
const floorLine = svg.querySelector('[data-part="floor"]');
const needles = GAUGES.map((g) => svg.querySelector('[data-part="needle-' + g.key + '"]'));
const els = [...svg.querySelectorAll("[data-bead]")].sort((a, b) => a.dataset.bead - b.dataset.bead);
const pins = els.map((el) => el.querySelector("[data-pin]"));
const balls = els.map((el) => el.querySelector("[data-ball]"));
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const needleAt = ([x, y], value) => {
  const angle = GAUGE_FROM + GAUGE_SPAN * clamp(value, 0, 1);
  const sx = Math.sin(angle), sy = -Math.cos(angle);
  return lineOnTop([x - sx * 3.4, y - sy * 3.4], [x + sx * (GAUGE_R - 4), y + sy * (GAUGE_R - 4)], GAUGE_TOP + 0.2, P);
};
let t = ${START_T}, target = t;
const lift = BEADS.map((b) => (b.score >= t ? RIG.LIFT : 0));
let pv = metricsOf(BEADS, t), shown = [pv.precision, pv.recall];
let frame = 0, last = 0, visible = false, touring = !still.matches, clock = 0, idleTimer = 0, settledText = "";
const tourAt = (c) => 0.5 + 0.38 * Math.sin((c / 20) * Math.PI * 2 - Math.PI / 2);

function draw() {
  const g = xOf(t);
  gateEl.setAttribute("transform", translateAlong(P, [g, 0, 0]));
  floorLine.setAttribute("d", lineOnTop([g, BED.y], [g, BED.y + BED.d], RIG.BED_Z, P));
  BEADS.forEach((b, i) => {
    const h = lift[i];
    pins[i].setAttribute("d", rise([b.x, b.y], RIG.BED_Z, RIG.BED_Z + h, P));
    balls[i].setAttribute("transform", translateAlong(P, [0, 0, h]));
  });
  GAUGES.forEach((gg, i) => needles[i].setAttribute("d", needleAt(gg.at, shown[i])));
  const m = metricsOf(BEADS, t);
  const text = "t " + t.toFixed(2) + " \\u00b7 P " + m.precision.toFixed(2) + " \\u00b7 R " + m.recall.toFixed(2) + " \\u00b7 F1 " + m.f1.toFixed(2);
  if (readout.textContent !== text) readout.textContent = text;
  return m;
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring) { clock += dt; target = tourAt(clock); }
  t = calm ? target : t + (target - t) * (1 - Math.exp(-dt / 0.2));
  if (Math.abs(target - t) < 0.0004) t = target;
  let moving = Math.abs(target - t) > 0;
  BEADS.forEach((b, i) => {
    const want = b.score >= t ? RIG.LIFT : 0;
    lift[i] = calm ? want : lift[i] + (want - lift[i]) * (1 - Math.exp(-dt / 0.1));
    if (Math.abs(want - lift[i]) < 0.01) lift[i] = want; else moving = true;
  });
  const m = metricsOf(BEADS, t);
  const want = [m.precision, m.recall];
  shown = shown.map((v, i) => { const next = calm ? want[i] : v + (want[i] - v) * (1 - Math.exp(-dt / 0.16)); if (Math.abs(next - want[i]) < 0.0005) return want[i]; moving = true; return next; });
  draw();
  stage.setAttribute("aria-valuenow", t.toFixed(2));
  frame = visible && (touring || moving) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (next) => { touring = false; target = clamp(next, 0.02, 0.98); clearTimeout(idleTimer); idleTimer = setTimeout(() => { if (!still.matches) { touring = true; clock = 20 * (Math.asin((target - 0.5) / 0.38) + Math.PI / 2) / (Math.PI * 2) || 0; run(); } }, 3600); run(); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  steer(clamp(((event.clientX - box.left) / box.width - 0.1) / 0.8, 0, 1));
});
stage.addEventListener("keydown", (event) => {
  let next = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") next = target + (event.shiftKey ? 0.1 : 0.025);
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = target - (event.shiftKey ? 0.1 : 0.025);
  if (event.key === "Home") next = 0.02;
  if (event.key === "End") next = 0.98;
  if (next === null) return;
  event.preventDefault();
  steer(next);
});
draw();
`;

const m0 = R.metricsOf(BEADS, START_T);
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A bench of 112 beads laid out along a score ruler from 0 to 1, positives lit and negatives plain, overlapping in the middle. A sieve blade rides on rails across the bench. Beads right of the blade lift on pins: those are the ones the classifier calls positive. Two dial gauges read precision and recall.",
  body: [
    plate(),
    ...GAUGES.map((g) => gauge(g) + `<path data-part="needle-${g.key}" class="iso-line" data-tone="lit" data-free="start" d="${needleAt(g.at, m0[g.key])}" style="stroke-width:1.1"/>`),
    rail(RAIL_BACK),
    railStops(-53, -46),
    bench(),
    seats(),
    `<path data-part="floor" class="iso-line" data-tone="lit" d="${k.lineOnTop([xOf(START_T), BED.y], [xOf(START_T), BED.y + BED.d], BED_Z, P)}" style="stroke-width:0.9"/>`,
    ...BEADS.map((b, i) => [b, i]).sort((a, b) => k.depthOf([a[0].x, a[0].y, 0], P) - k.depthOf([b[0].x, b[0].y, 0], P)).map(([b, i]) => beadGroup(b, i)),
    rail(RAIL_FRONT),
    railStops(46, 53),
    `<g data-part="gate" transform="${k.translateAlong(P, [xOf(START_T), 0, 0])}">${gate()}</g>`,
  ],
});
function xOf(score) {
  return R.xOf(score);
}

const body = k.plateHtml({
  fig: "Fig 2",
  title: "Threshold sieve",
  hint: "Move across to slide the sieve",
  readout: `t ${START_T.toFixed(2)} · P ${m0.precision.toFixed(2)} · R ${m0.recall.toFixed(2)} · F1 ${m0.f1.toFixed(2)}`,
  keys: [
    { mark: "lit", label: "Positive example, and the two gauge needles" },
    { mark: "raised", label: "Negative example" },
    { mark: "edge", label: "Sieve line: the decision threshold" },
  ],
  caption:
    "Each bead is an example, placed along the bench by its classifier score. Everything right of the sieve is called positive and lifts on its pin. Precision is the share of lifted beads that are lit; recall is the share of all lit beads that lifted. The two score distributions overlap, so every position of the sieve trades one gauge for the other.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Threshold sieve: arrow keys slide the decision threshold" aria-valuemin="0" aria-valuemax="1" aria-valuenow="${START_T}">${svg}</div>`,
});

const script = kitScript() + "\n" + rigSource() + "\n" + live;
writeFileSync(join(HERE, OUT), k.pageHtml({ title: "Threshold sieve", theme, body, script }));
console.log("wrote", OUT, "beads", BEADS.length, "svg", Math.round(svg.length / 1024) + " KB");
