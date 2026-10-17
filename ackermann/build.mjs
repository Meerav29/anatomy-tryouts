import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../kit/iso-kit.mjs";
import { kitScript } from "../scripts/inline-kit.mjs";
import * as R from "./rig.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--dark") ? "dark" : "light";
const OUT = theme === "dark" ? "ackermann-dark.html" : "ackermann.html";

const WIDTH = 640;
const HEIGHT = 420;

const PLATE = { x: -118, y: -90, w: 178, d: 208, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const { L, W, MAX_DEG } = R.RIG;

// two karts on one pad: the same steering, linked two different ways
const KARTS = [
  { key: "parallel", kind: "parallel", label: "PARALLEL STEERING", x: 0, y: -64, cls: "kart-p", note: "AXLES MISS EACH OTHER: THE TYRES SCRUB", colour: "#7a4ff0" },
  { key: "ackermann", kind: "ackermann", label: "ACKERMANN STEERING", x: 0, y: 20, cls: "kart-a", note: "ALL FOUR WHEELS AIM AT ONE CENTRE", colour: "#12a89d" },
];

const RAIL = { x: -108, y: 98, w: 162, d: 7, r: 3.5 };
const KNOB_Y = RAIL.y + RAIL.d / 2;
const KNOB_X0 = -100;
const KNOB_SPAN = 146;
const knobX = (f) => KNOB_X0 + KNOB_SPAN * f;

const GAUGE_R = 11;
const GAUGE_Z = 7;
const GAUGE_H = 4;
const GAUGE_TOP = GAUGE_Z + GAUGE_H;
const GAUGE_FROM = (-135 * Math.PI) / 180;
const GAUGE_SPAN = (270 * Math.PI) / 180;
const SCRUB_FULL = 12;
const GAUGES = KARTS.map((kt) => ({ key: kt.key, at: [kt.x + 36, kt.y + 14], label: "SCRUB" }));

const START_F = 0.8;

const P = k.fitProjection([...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [0, -64, 40], [0, 20, 40]], WIDTH, HEIGHT, { pad: 10, azimuth: 62, elevation: 40 });
const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L_ = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const tint = (text, colour, bold = true) => text.replace("<text ", `<text style="fill:${colour}${bold ? ";font-weight:700" : ""}" `);

/* ---------------------------------------------------------------- pad */
function pad() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L_(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L_(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // a bay for each kart, and its name on the floor
  for (const kt of KARTS) {
    const bay = { x: kt.x - 24, y: kt.y - 14, w: 76, d: L + 40, r: 3 };
    out.push(L_(k.planOutline(bay, 0, P, 3), { tone: "faint", dashed: true }));
    out.push(tint(k.faceTextSvg(k.topMatrix([kt.x, kt.y + L + 24], 0, P, "x"), kt.label, { size: 3.2, anchor: "middle" }), kt.colour));
  }
  return out.join("");
}

/* ---------------------------------------------------------------- steering control */
function control() {
  const out = [];
  out.push(S(k.slabOf(RAIL, 0, 3, P, 4, 0.5), { tone: "mid" }));
  out.push(L_(k.lineOnTop([KNOB_X0, KNOB_Y], [KNOB_X0 + KNOB_SPAN, KNOB_Y], 3, P), { tone: "lo", free: true }));
  // the stretch of lock where parallel steering starts to scrub the tyres
  out.push(`<path class="iso-line" data-tone="red" d="${k.lineOnTop([knobX(R.scrubFrom()), KNOB_Y], [knobX(1), KNOB_Y], 3, P)}" style="stroke-width:2"/>`);
  const ticks = k.topTicks(KNOB_X0, KNOB_X0 + KNOB_SPAN, KNOB_SPAN / 13, 13, RAIL.y - 5, 0, [1.6, 3], P);
  out.push(L_(ticks.minor, { tone: "lo" }), L_(ticks.major, { tone: "mid" }));
  const label = (x, text, style = {}) => k.faceTextSvg(k.topMatrix([x, RAIL.y + RAIL.d + 7], 0, P, "x"), text, { size: 2.9, tone: "hi", anchor: "middle", ...style });
  out.push(label(knobX(0.02), "STRAIGHT"), label(knobX(0.93), "FULL LOCK"), label(knobX((R.scrubFrom() + 0.8) / 2), "PARALLEL SCRUBS").replace("<text ", '<text style="fill:var(--anatomy-red)" '));
  return out.join("");
}
function knob() {
  const out = [];
  out.push(S(k.cylinder(0, KNOB_Y, 6.4, 3, 8, P, 40, 0.8), { tone: "hi", lit: true, crease: "lo" }));
  out.push(L_(k.knurl(0, KNOB_Y, 6.4, 3, 6, 36, P, 0.3), { tone: "lo" }));
  out.push(L_(k.ring(0, KNOB_Y, 4.2, 11, P, 32), { tone: "lo" }));
  out.push(`<path class="iso-line" data-tone="lit" data-free="both" d="${k.lineOnTop([0, KNOB_Y + 0.6], [0, KNOB_Y + 5.2], 11.2, P)}" style="stroke-width:1.2"/>`);
  return out.join("");
}

/* ---------------------------------------------------------------- scrub dials */
function gauge({ at: [x, y], label }) {
  const out = [`<path class="iso-halo" d="${k.cylinder(x, y, 8, 0, 0.1, P, 32).fill}" style="filter:blur(3px)"/>`];
  out.push(S(k.cylinder(x, y, 7, 0, 2.5, P, 32, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 3, 2.5, GAUGE_Z - 2.5, P, 20), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(x, y, GAUGE_R, GAUGE_Z, GAUGE_H, P, 48, 0.6), { tone: "hi", crease: "lo" }));
  out.push(L_(k.ring(x, y, GAUGE_R - 1.6, GAUGE_TOP, P, 48), { tone: "lo" }));
  const ticks = k.radialTicks(x, y, GAUGE_R - 2.3, 9, 3, GAUGE_TOP, [0.9, 1.9], P, GAUGE_FROM, GAUGE_SPAN);
  out.push(L_(ticks.minor, { tone: "lo" }), L_(ticks.major, { tone: "mid" }));
  const a0 = GAUGE_FROM + GAUGE_SPAN * (R.RIG.SCRUB_BAD / SCRUB_FULL);
  const a1 = GAUGE_FROM + GAUGE_SPAN;
  const pts = Array.from({ length: 10 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / 9; return [x + Math.sin(a) * (GAUGE_R - 4.6), y - Math.cos(a) * (GAUGE_R - 4.6)]; });
  out.push(`<path class="iso-line" data-tone="red" data-free="both" d="${k.onTop(pts, GAUGE_TOP, P)}" style="stroke-width:1.4"/>`);
  out.push(L_(k.ring(x, y, 1.2, GAUGE_TOP, P, 12), { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([x, y + 6.6], GAUGE_TOP, P, "x"), label, { size: 1.9, tone: "lo", anchor: "middle" }));
  return out.join("");
}
const needleAt = ({ at: [x, y] }, deg) => {
  const angle = GAUGE_FROM + GAUGE_SPAN * Math.min(1, Math.max(0, deg / SCRUB_FULL));
  const sx = Math.sin(angle);
  const sy = -Math.cos(angle);
  return k.lineOnTop([x - sx * 2.2, y - sy * 2.2], [x + sx * (GAUGE_R - 3), y + sy * (GAUGE_R - 3)], GAUGE_TOP + 0.2, P);
};

/* ---------------------------------------------------------------- live source */
const source = (file) => readFileSync(join(HERE, file), "utf8").replace(/^export /gm, "");

const live = `
const P = ${JSON.stringify(P)};
const KARTS = ${JSON.stringify(KARTS)};
const GAUGES = ${JSON.stringify(GAUGES)};
const GAUGE_R = ${GAUGE_R}, GAUGE_TOP = ${GAUGE_TOP}, GAUGE_FROM = ${GAUGE_FROM}, GAUGE_SPAN = ${GAUGE_SPAN}, SCRUB_FULL = ${SCRUB_FULL};
const KNOB_X0 = ${KNOB_X0}, KNOB_SPAN = ${KNOB_SPAN};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const $ = (name) => svg.querySelector('[data-part="' + name + '"]');
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const needles = GAUGES.map((g) => $("needle-" + g.key));
const el = {};
for (const kt of KARTS) el[kt.key] = { floor: $("floor-" + kt.key), kart: $("kart-" + kt.key), note: $("note-" + kt.key) };
const knob = $("knob");

let f = ${START_F}, target = f, clock = 0, frame = 0, last = 0, visible = false, touring = !still.matches, idleTimer = 0;

const needleAt = (g, scrub) => {
  const angle = GAUGE_FROM + GAUGE_SPAN * clamp(scrub / SCRUB_FULL, 0, 1), sx = Math.sin(angle), sy = -Math.cos(angle);
  return lineOnTop([g.at[0] - sx * 2.2, g.at[1] - sy * 2.2], [g.at[0] + sx * (GAUGE_R - 3), g.at[1] + sy * (GAUGE_R - 3)], GAUGE_TOP + 0.2, P);
};
const rotAbout = (px, py, a, pts) => pts.map(([x, y]) => [px + x * Math.cos(a) - y * Math.sin(a), py + x * Math.sin(a) + y * Math.cos(a)]);
const box = (cx, cy, w, l) => [[cx - w / 2, cy - l / 2], [cx + w / 2, cy - l / 2], [cx + w / 2, cy + l / 2], [cx - w / 2, cy + l / 2]];
const colourLine = (d, colour, width, extra) => '<path class="iso-line" data-free="both" d="' + d + '" style="stroke:' + colour + ';stroke-width:' + width + (extra || "") + '"/>';

// the floor: each front axle line run back to the rear axle's line, and where they land
function floor(kt, s) {
  const { x: cx, y: cy } = kt;
  const w = (lx, ly) => [cx + lx, cy + ly];
  let out = "";
  if (s.xc === null) return out;
  const wheels = [[s.KL, s.dIn, s.xIn, s.slipIn], [s.KR, s.dOut, s.xOut, s.slipOut]];
  const REACH = -104, onPad = s.xIn > REACH && s.xOut > REACH;
  out += lineSvg(onTop([w(Math.max(REACH, Math.min(s.xIn, s.xOut) - 10), 0), w(RIG.W / 2 + 22, 0)], 0.2, P), { tone: "mid", dashed: true, free: true });
  for (const [K, d, xInt, slip] of wheels) {
    const dir = [Math.cos(d), Math.sin(d)];
    const endX = Math.max(xInt, REACH), tt = (endX - K[0]) / dir[0], endY = K[1] + tt * dir[1];
    out += colourLine(onTop([w(K[0] + dir[0] * 9, K[1] + dir[1] * 9), w(endX, endY)], 0.3, P), kt.colour, 1.1);
    // scuff marks ahead of a tyre that is being dragged sideways
    const bad = Math.abs(slip);
    if (bad > 0.8) {
      const len = Math.min(10, 3 + bad * 1.6), heading = [-Math.sin(d), Math.cos(d)], side = [Math.cos(d), Math.sin(d)];
      const marks = [-1.2, 1.2].map((o) => onTop([w(K[0] + side[0] * (K[0] < 0 ? -2.6 : 2.6) + side[0] * o + heading[0] * 5, K[1] + side[1] * (K[0] < 0 ? -2.6 : 2.6) + side[1] * o + heading[1] * 5), w(K[0] + side[0] * (K[0] < 0 ? -2.6 : 2.6) + side[0] * o + heading[0] * (5 + len), K[1] + side[1] * (K[0] < 0 ? -2.6 : 2.6) + side[1] * o + heading[1] * (5 + len))], 0.3, P)).join("");
      out += '<g opacity="' + clamp(bad / 3, 0.25, 1).toFixed(2) + '">' + lineSvg(marks, { tone: "red", free: true }) + "</g>";
    }
  }
  // where the lines land: one point, or two that miss
  const pts = [s.xIn, s.xOut].map((x) => iso([cx + x, cy, 0.3], P));
  if (!onPad) return out;
  if (s.miss < 2.5) out += dotsSvg([iso([cx + s.xc, cy, 0.3], P)], { size: 2.4, tone: "hi" }).replace("<g ", '<g style="fill:' + kt.colour + '" ');
  else {
    out += lineSvg(onTop([w(s.xIn, 0), w(s.xOut, 0)], 0.35, P), { tone: "red", free: true }).replace("<path ", '<path style="stroke-width:2" ');
    out += dotsSvg(pts, { size: 1.8, tone: "hi" }).replace("<g ", '<g style="fill:' + kt.colour + '" ');
  }
  return out;
}

function kart(kt, s) {
  const { x: cx, y: cy, cls } = kt;
  const parts = [];
  const add = (pts, z0, h, c, bevel = 0.3) => {
    const world = pts.map(([x, y]) => [cx + x, cy + y]);
    const ctr = world.reduce((m, [x, y]) => [m[0] + x / world.length, m[1] + y / world.length], [0, 0]);
    parts.push([depthOf([ctr[0], ctr[1], z0], P), solidSvg(extrude(world, z0, h, P, { convex: true, bevel }), { tone: "hi", crease: "lo", className: c })]);
  };
  const quad = (a, b, wd) => { const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.hypot(dx, dy) || 1, px = (-dy / n) * wd, py = (dx / n) * wd; return [[a[0] + px, a[1] + py], [b[0] + px, b[1] + py], [b[0] - px, b[1] - py], [a[0] - px, a[1] - py]]; };
  const link = cls + " kart-link";
  // wheels: the back pair fixed, the front pair turned about their kingpins
  for (const sx of [-1, 1]) add(box(sx * 15.6, 0, 6.6, 9.6), 0, 6.6, "car-tyre", 1.3);
  for (const [K, d, side] of [[s.KL, s.dIn, -1], [s.KR, s.dOut, 1]]) add(rotAbout(K[0], K[1], d, box(side * 2.8, 0, 4.2, 9.2)), 0, 6, "car-tyre", 1.2);
  // frame: side rails, rear cross tube, front axle beam
  for (const sx of [-1, 1]) add(box(sx * 9.6, (RIG.L - 6) / 2, 2.4, RIG.L + 14), 3.6, 2, "kart-frame");
  add(box(0, -5, 22, 2.4), 3.6, 2, "kart-frame");
  add(box(0, RIG.L, 31, 2.6), 3.6, 2, "kart-frame");
  // seat, side pods, bumpers and engine
  add(box(0, 9, 13, 15), 5.6, 3, cls);
  add(box(0, 2.4, 13, 3.4), 5.6, 11, cls, 0.5);
  for (const sx of [-1, 1]) add(box(sx * 12.2, 14, 3, 15), 5.2, 5.6, cls);
  add(box(0, RIG.L + 9, 24, 2.8), 4.6, 3.2, cls);
  add(box(0, -10, 21, 2.6), 4.6, 3.8, cls);
  add(box(0, -2, 7.5, 6), 5.6, 7, "car-dark");
  // the steering linkage, in a darker shade of the kart's colour: kingpins, arms and the tie rod
  for (const K of [s.KL, s.KR]) add(box(K[0], K[1], 3.4, 3.4), 5.6, 2.2, "kart-frame", 0.8);
  add(quad(s.KL, s.tipL, 0.9), 5.8, 1.6, link, 0.1);
  add(quad(s.KR, s.tipR, 0.9), 5.8, 1.6, link, 0.1);
  add(quad(s.tipL, s.tipR, 0.8), 6.4, 1.4, link, 0.1);
  parts.sort((p, q) => p[0] - q[0]);
  let out = parts.map((p) => p[1]).join("");
  // driver's helmet, steering column and wheel
  out += solidSvg(cylinder(cx, cy + 8, 3, 9.6, 3.6, P, 20, 0.8), { tone: "hi", crease: "none", className: "car-helmet" });
  out += solidSvg(cylinder(cx, cy + RIG.L - 11, 0.9, 5.6, 10, P, 10), { tone: "hi", crease: "none", className: "car-dark" });
  const spin = s.dIn * 3;
  out += lineSvg(ring(cx, cy + RIG.L - 11, 4.2, 15.8, P, 28), { tone: "hi", free: true });
  out += lineSvg([0, 1, 2].map((i) => { const a = spin + (i * Math.PI * 2) / 3 + Math.PI / 2; return lineOnTop([cx, cy + RIG.L - 11], [cx + Math.cos(a) * 4.2, cy + RIG.L - 11 + Math.sin(a) * 4.2], 15.8, P); }).join(""), { tone: "hi", free: true });
  return out;
}

function draw() {
  const inner = f * RIG.MAX_DEG;
  const sims = KARTS.map((kt) => steer(kt.kind, inner));
  KARTS.forEach((kt, i) => {
    const s = sims[i], e = el[kt.key];
    e.floor.innerHTML = floor(kt, s);
    e.kart.innerHTML = kart(kt, s);
    const show = kt.kind === "ackermann" ? (s.xc !== null && s.miss < 6 && s.xIn > -104) : bad(s);
    e.note.setAttribute("opacity", show ? "1" : "0");
    needles[i].setAttribute("d", needleAt(GAUGES[i], s.scrub));
  });
  knob.setAttribute("transform", translateAlong(P, [KNOB_X0 + KNOB_SPAN * f, 0, 0]));
  const text = "inner wheel " + Math.round(inner) + "\\u00b0 \\u00b7 outer " + sims[1].outer.toFixed(0) + "\\u00b0 (Ackermann) vs " + sims[0].outer.toFixed(0) + "\\u00b0 (parallel)";
  if (readout.textContent !== text) readout.textContent = text;
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (touring) { clock += dt; target = sweepAt(clock); }
  f += (target - f) * (still.matches ? 1 : 1 - Math.exp(-dt / 0.18));
  draw();
  stage.setAttribute("aria-valuenow", String(Math.round(f * 100)));
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const resume = () => { idleTimer = setTimeout(() => { if (!still.matches) { touring = true; clock = (Math.acos(clamp(1 - 2 * target, -1, 1)) / (Math.PI * 2)) * 9; run(); } }, 5000); };
const steerTo = (next) => { touring = false; target = clamp(next, 0, 1); clearTimeout(idleTimer); resume(); run(); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  steerTo(((event.clientX - box.left) / box.width - 0.1) / 0.8);
});
stage.addEventListener("keydown", (event) => {
  let next = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") next = target + (event.shiftKey ? 0.25 : 0.05);
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = target - (event.shiftKey ? 0.25 : 0.05);
  if (event.key === "Home") next = 0;
  if (event.key === "End") next = 1;
  if (next === null) return;
  event.preventDefault();
  steerTo(next);
});
draw();
`;

const carColour = (cls, c) => `.${cls}>.iso-fill{fill:${c.fill}}.${cls}>.iso-top{fill:${c.top}}.${cls}>.iso-shade[data-shade="0"]{fill:${c.s0}}.${cls}>.iso-shade[data-shade="1"]{fill:${c.s1}}.${cls}>.iso-shade[data-shade="2"]{fill:${c.s2}}.${cls}>.iso-shade[data-shade="3"]{fill:${c.s3}}.${cls}>.iso-edge{stroke:${c.edge}}`;
const CSS =
  carColour("kart-a", { fill: "#12b3a8", top: "#7ee6dc", s0: "#0b7d75", s1: "#0e948b", s2: "#11a79d", s3: "#17bfb3", edge: "#08524d" }) +
  carColour("kart-p", { fill: "#7a4ff0", top: "#b9a3f8", s0: "#4f2bb8", s1: "#5f38d0", s2: "#7045e6", s3: "#8660f2", edge: "#35188a" }) +
  `.kart-link.kart-a>.iso-fill,.kart-link.kart-a>.iso-top{fill:#0b7d75}.kart-link.kart-p>.iso-fill,.kart-link.kart-p>.iso-top{fill:#4f2bb8}.kart-link>.iso-shade{fill:inherit}` +
  `.car-dark>.iso-fill,.car-dark>.iso-top{fill:#34343a}.car-dark>.iso-shade{fill:#2a2a30}.car-dark>.iso-edge{stroke:#111}` +
  `.car-helmet>.iso-fill,.car-helmet>.iso-top{fill:#fff}.car-helmet>.iso-shade{fill:#d8d8d4}.car-helmet>.iso-edge{stroke:#333}` +
  `.car-tyre>.iso-fill{fill:#1a1a1c}.car-tyre>.iso-top{fill:#3a3a3e}.car-tyre>.iso-shade{fill:#202024}.car-tyre>.iso-edge{stroke:#000}` +
  `.kart-frame>.iso-fill,.kart-frame>.iso-top{fill:#9a9aa0}.kart-frame>.iso-shade{fill:#84848a}.kart-frame>.iso-edge{stroke:#4a4a50}`;

const noteAt = (kt) => `<g data-part="note-${kt.key}" opacity="0">${tint(k.faceTextSvg(k.topMatrix([kt.x, kt.y + L + 31], 0, P, "x"), kt.note, { size: 2.6, anchor: "middle" }), kt.colour, false)}</g>`;

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "Two go-karts on one pad, seen from above and to the side, with the same steering input. The left kart, in violet, has parallel steering, so both front wheels turn the same angle, and the lines drawn from their axles run back to the rear axle's line and miss each other by a car's width; its tyres scuff the floor and its scrub dial climbs into the red. The right kart, in teal, has Ackermann steering, so its inner wheel turns more than the outer, and the lines from both axles land at almost the same point on the rear axle's line; its scrub dial barely moves. A knob on a rail sets the steering lock.",
  body: [
    `<style>${CSS}</style>`,
    pad(),
    ...GAUGES.map((g) => gauge(g) + `<path data-part="needle-${g.key}" class="iso-line" data-tone="lit" data-free="both" d="${needleAt(g, 0)}" style="stroke-width:1.1"/>`),
    ...KARTS.map((kt) => `<g data-part="floor-${kt.key}"></g><g data-part="kart-${kt.key}"></g>${noteAt(kt)}`),
    control(),
    `<g data-part="knob" transform="${k.translateAlong(P, [knobX(START_F), 0, 0])}">${knob()}</g>`,
  ],
});

const s1 = R.steer("ackermann", MAX_DEG);
const s0 = R.steer("parallel", MAX_DEG);
const body = k.plateHtml({
  fig: "Fig 8",
  title: "Ackermann steering",
  hint: "Move across to turn the wheel",
  readout: `inner wheel ${Math.round(START_F * MAX_DEG)}° · outer ${R.steer("ackermann", START_F * MAX_DEG).outer.toFixed(0)}° (Ackermann) vs ${R.steer("parallel", START_F * MAX_DEG).outer.toFixed(0)}° (parallel)`,
  keys: [
    { mark: "lit", label: "The knob you steer with, and the dial needles" },
    { mark: "raised", label: "The frame and wheels; the arms and tie rod are the darker shade" },
    { mark: "red", label: "Tyre scrub, and the lock where parallel steering starts to scrub" },
  ],
  caption: `In a turn, every wheel has to roll about the same point, and that point sits on the line through the rear axle. The inside wheel is closer to it, so it has to turn more than the outside one. Parallel steering turns both wheels the same, so their axle lines are always a track width apart where they meet the rear axle's line, and the tyres drag sideways. Angle the steering arms in toward the middle of the rear axle and the linkage turns the inside wheel more all by itself: at full lock here it is ${s1.inner.toFixed(0)}° against ${s1.outer.toFixed(0)}°, and the two lines land within ${s1.miss.toFixed(0)} units of each other, against ${s0.miss.toFixed(0)} for parallel.`,
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Ackermann steering: arrow keys change the steering lock" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(START_F * 100)}">${svg}</div>`,
});

const script = kitScript() + "\n" + source("rig.mjs") + "\n" + live;
writeFileSync(join(HERE, OUT), k.pageHtml({ title: "Ackermann steering", theme, body, script }));
console.log("wrote", OUT, "svg", Math.round(svg.length / 1024) + " KB");
