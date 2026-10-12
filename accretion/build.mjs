import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import { kitScript } from "../scripts/inline-kit.mjs";
import * as R from "./rig.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";
const OUT = theme === "light" ? "accretion-light.html" : "accretion.html";

const { A, TRAY_Z, RB } = R.RIG;
const WIDTH = 640;
const HEIGHT = 400;

const PLATE = { x: -120, y: -122, w: 240, d: 244, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;
const TRAY_R = 94;
const POST_TOP = 48;
const ARM_Z = 34;
const ARM_H = 3.5;
const CAP_H = 3.5;

const GAUGE = [-92, 84];
const GAUGE_R = 17;
const GAUGE_Z = 24;
const GAUGE_H = 10;
const GAUGE_TOP = GAUGE_Z + GAUGE_H;
const GAUGE_FROM = (-135 * Math.PI) / 180;
const GAUGE_SPAN = (270 * Math.PI) / 180;

const KNOB_BOX = { x: 70, y: -116, w: 38, d: 38, r: 3 };
const KNOB_BOX_H = 14;
const KNOB = [KNOB_BOX.x + KNOB_BOX.w / 2, KNOB_BOX.y + KNOB_BOX.d / 2];
const KNOB_R = 8.6;
const KNOB_TOP = KNOB_BOX_H + 5;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [0, 0, POST_TOP + 2],
    [GAUGE[0], GAUGE[1], GAUGE_TOP + 2],
    [-TRAY_R, 0, TRAY_Z],
    [TRAY_R, 0, TRAY_Z],
  ],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: 40 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

/* ---------------------------------------------------------------- base */
function base() {
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

  // ruler strip along the near edge
  const strip = { x: -84, y: 103, w: 96, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));

  // second ruler along the right edge, ticks hung from its inner edge
  const side = { x: 105, y: -62, w: 7, d: 92, r: 1 };
  out.push(S(k.slabOf(side, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const sideTicks = k.topTicks(side.y + 4, side.y + side.d - 4, 4, 5, side.x + 0.8, 0.6, [2, 3.6], P, "y");
  out.push(L(sideTicks.minor, { tone: "lo" }), L(sideTicks.major, { tone: "mid" }));
  out.push(D([at([side.x + 3.5, side.y + 2, 0.6]), at([side.x + 3.5, side.y + side.d - 2, 0.6])], { size: 0.45 }));

  // vent slots along the back edge
  for (let i = 0; i < 7; i++) out.push(L(k.planOutline({ x: -98 + i * 9.5, y: -111, w: 6, d: 2.6, r: 1.3 }, 0, P, 3), { tone: "lo" }));

  // label plate
  const label = { x: 26, y: 101, w: 58, d: 11, r: 1.6 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 4), { tone: "faint" }));
  const rule = (x0, x1, y) => L(k.lineOnTop([x0, y], [x1, y], 0.8, P), { tone: "lo", free: true });
  out.push(rule(label.x + 5, label.x + 41, label.y + 3.6), rule(label.x + 5, label.x + 31, label.y + 5.6), rule(label.x + 5, label.x + 38, label.y + 7.6));
  out.push(D([at([label.x + 3.2, label.y + 5.5, 0.8]), at([label.x + label.w - 3.2, label.y + 5.5, 0.8])], { size: 0.4 }));
  return out.join("");
}

/* ---------------------------------------------------------------- tray */
function tray() {
  const out = [];
  out.push(`<path class="iso-halo" d="${k.cylinder(0, 0, TRAY_R, 0, 1, P, 96).fill}" style="filter:blur(5px)"/>`);
  out.push(S(k.cylinder(0, 0, TRAY_R, 0, TRAY_Z, P, 120, 0.8), { tone: "mid", crease: "lo" }));
  // rim band: two rings with a degree scale between them, ticks rooted on the inner ring
  out.push(L(k.ring(0, 0, TRAY_R - 8.8, TRAY_Z, P, 120), { tone: "lo" }));
  out.push(L(k.ring(0, 0, TRAY_R - 3.6, TRAY_Z, P, 120), { tone: "lo" }));
  const t = k.radialTicks(0, 0, TRAY_R - 8.8, 72, 6, TRAY_Z, [2, 3.6], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(L(k.sideArc(0, 0, TRAY_R, TRAY_Z - 2.4, P, 60), { tone: "faint" }));
  // eight screws on a bolt circle just inside the scale
  const screws = Array.from({ length: 8 }, (_, i) => [(TRAY_R - 12) * Math.cos(i * (Math.PI / 4) + 0.39), (TRAY_R - 12) * Math.sin(i * (Math.PI / 4) + 0.39)]);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 1.9, TRAY_Z, P, 12)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, TRAY_Z])), { size: 0.45 }));
  // the orbit groove the arm follows, and the seat of the hub
  out.push(L(k.ring(0, 0, A, TRAY_Z, P, 120), { tone: "faint" }));
  out.push(L(k.ring(0, 0, 20, TRAY_Z, P, 48), { tone: "faint" }));
  return out.join("");
}

function hubLower() {
  const out = [];
  out.push(S(k.cylinder(0, 0, 14, TRAY_Z, 4, P, 40, 0.5), { tone: "mid" }));
  out.push(L(k.knurl(0, 0, 14, TRAY_Z, TRAY_Z + 4, 40, P, 0.3), { tone: "lo" }));
  out.push(S(k.cylinder(0, 0, 6.2, TRAY_Z + 4, 3, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(0, 0, 4.2, TRAY_Z + 7, ARM_Z - TRAY_Z - 7, P, 28), { tone: "mid", crease: "none" }));
  out.push(L([TRAY_Z + 12, TRAY_Z + 21].map((z) => k.sideArc(0, 0, 4.2, z, P, 14)).join(""), { tone: "faint" }));
  out.push(S(k.cylinder(0, 0, 6.2, ARM_Z - 4, 4, P, 28), { tone: "mid" }));
  return out.join("");
}

/* ---------------------------------------------------------------- the dust */
function bead([x, y], index) {
  const paths = G.sphereOf([x, y, TRAY_Z + RB], RB, P, { steps: 18 });
  return `<g data-bead="${index}">${S(paths, { tone: "mid" })}</g>`;
}

/* ---------------------------------------------------------------- instruments */
function gauge() {
  const [x, y] = GAUGE;
  const out = [`<path class="iso-halo" d="${k.cylinder(x, y, 12, 0, 0.1, P, 32).fill}" style="filter:blur(3px)"/>`];
  out.push(S(k.cylinder(x, y, 11, 0, 3, P, 40, 0.5), { tone: "mid" }));
  out.push(D(Array.from({ length: 4 }, (_, i) => at([x + 8 * Math.cos(i * 1.5708 + 0.785), y + 8 * Math.sin(i * 1.5708 + 0.785), 3])), { size: 0.4 }));
  out.push(S(k.cylinder(x, y, 4.2, 3, GAUGE_Z - 3 - 3, P, 24), { tone: "mid", crease: "none" }));
  out.push(L([8, 14].map((z) => k.sideArc(x, y, 4.2, z, P, 12)).join(""), { tone: "faint" }));
  out.push(S(k.cylinder(x, y, 6.4, GAUGE_Z - 6, 3, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, GAUGE_R, GAUGE_Z, GAUGE_H, P, 64, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(x, y, GAUGE_R, GAUGE_TOP - 3.4, GAUGE_TOP, 84, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(x, y, GAUGE_R, GAUGE_TOP - 3.4, P, 40), { tone: "faint" }));
  out.push(L(k.ring(x, y, GAUGE_R - 2.2, GAUGE_TOP, P, 64), { tone: "lo" }));
  const ticks = k.radialTicks(x, y, GAUGE_R - 3.2, 40, 5, GAUGE_TOP, [1.2, 2.6], P, GAUGE_FROM, GAUGE_SPAN);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(L(k.ring(x, y, 1.7, GAUGE_TOP, P, 16), { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([x, y + 8.4], GAUGE_TOP, P, "x"), "BEADS", { size: 2.3, tone: "lo", anchor: "middle" }));
  return out.join("");
}

const needleAt = (mass) => {
  const angle = GAUGE_FROM + GAUGE_SPAN * Math.min(1, mass / R.RIG.MAX_MASS);
  const [x, y] = GAUGE;
  const sx = Math.sin(angle);
  const sy = -Math.cos(angle);
  return k.lineOnTop([x - sx * 3.4, y - sy * 3.4], [x + sx * (GAUGE_R - 4), y + sy * (GAUGE_R - 4)], GAUGE_TOP + 0.2, P);
};

function knobBox() {
  const out = [`<path class="iso-halo" d="${k.haloOf(KNOB_BOX, 0, 0.1, P)}" style="filter:blur(3px)"/>`];
  out.push(S(k.slabOf(KNOB_BOX, 0, KNOB_BOX_H, P, 5, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(KNOB_BOX, 3), KNOB_BOX_H, P, 4), { tone: "faint" }));
  out.push(D(k.corners(KNOB_BOX, 4.4).map(([x, y]) => at([x, y, KNOB_BOX_H])), { size: 0.45 }));
  // scale: five stops, 1/4x .. 4x, over 270 degrees, rooted on a ring
  out.push(L(k.ring(KNOB[0], KNOB[1], 11.6, KNOB_BOX_H, P, 56), { tone: "lo" }));
  const t = k.radialTicks(KNOB[0], KNOB[1], 11.6, 16, 4, KNOB_BOX_H, [1.4, 2.8], P, GAUGE_FROM, GAUGE_SPAN);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  return out.join("");
}

const knobPointer = (u) => {
  const angle = GAUGE_FROM + GAUGE_SPAN * u;
  const sx = Math.sin(angle);
  const sy = -Math.cos(angle);
  return k.lineOnTop([KNOB[0] + sx * 2.4, KNOB[1] + sy * 2.4], [KNOB[0] + sx * (KNOB_R - 0.6), KNOB[1] + sy * (KNOB_R - 0.6)], KNOB_TOP, P);
};

function knobTop() {
  const out = [];
  out.push(S(k.cylinder(KNOB[0], KNOB[1], KNOB_R, KNOB_BOX_H, 5, P, 40, 0.5), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(KNOB[0], KNOB[1], KNOB_R, KNOB_BOX_H, KNOB_TOP, 36, P, 0.4), { tone: "lo" }));
  out.push(L(k.ring(KNOB[0], KNOB[1], KNOB_R - 1.5, KNOB_TOP, P, 40), { tone: "faint" }));
  out.push(L(k.ring(KNOB[0], KNOB[1], 1.3, KNOB_TOP, P, 12), { tone: "mid" }));
  return out.join("");
}

/* ---------------------------------------------------------------- live source */
const latheSource = () =>
  "const Lathe = (() => {" +
  readFileSync(join(HERE, "..", "kit", "lathe.mjs"), "utf8")
    .replace(/^import .*$/m, "")
    .replace(/^export /gm, "") +
  "\nreturn { sphereOf, viewOf };})();\nconst sphereOf = Lathe.sphereOf, viewOf = Lathe.viewOf;";
const rigSource = () => readFileSync(join(HERE, "rig.mjs"), "utf8").replace(/^export /gm, "");

const BEADS = R.scatter(R.START);
const FIRST = R.fresh(BEADS);

const live = `
const P = ${JSON.stringify(P)};
const GAUGE = ${JSON.stringify(GAUGE)}, GAUGE_R = ${GAUGE_R}, GAUGE_TOP = ${GAUGE_TOP}, GAUGE_FROM = ${GAUGE_FROM}, GAUGE_SPAN = ${GAUGE_SPAN};
const KNOB = ${JSON.stringify(KNOB)}, KNOB_R = ${KNOB_R}, KNOB_TOP = ${KNOB_TOP};
const ARM_Z = ${ARM_Z}, ARM_H = ${ARM_H}, CAP_H = ${CAP_H};
const BEADS = ${JSON.stringify(BEADS)};
const needleAt = ${needleAt.toString().replace(/k\./g, "").replace("R.RIG.MAX_MASS", "RIG.MAX_MASS")};
const knobPointer = ${knobPointer.toString().replace(/k\./g, "")};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const layer = (name) => svg.querySelector('[data-layer="' + name + '"]');
const L = { back: layer("beadsBack"), hoopBack: layer("hoopBack"), ball: layer("ball"), inside: layer("beadsIn"), hoopFront: layer("hoopFront"), outside: layer("beadsOut"), arm: layer("arm"), needle: svg.querySelector('[data-part="needle"]'), pointer: svg.querySelector('[data-part="pointer"]') };
const beadEls = [...svg.querySelectorAll("[data-bead]")].sort((a, b) => a.dataset.bead - b.dataset.bead);
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const V = viewOf(P);
const facing = Math.atan2(V[1], V[0]);
const toward = (x, y) => depthOf([x, y, 0], P);

let s = fresh(BEADS);
let knob = 0.5, knobTarget = 0.5; // 0..1 on the dial, rate = 1/4 * 16^knob
const rateOf = (u) => 0.25 * Math.pow(16, u);
let frame = 0, last = 0, visible = false, idleTimer = 0, touched = false, hold = 0, fade = 1;

const stadium = (a, b, r) => {
  const phi = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const pts = [];
  for (let i = 0; i <= 10; i++) { const t = phi + Math.PI / 2 + (i / 10) * Math.PI; pts.push([a[0] + r * Math.cos(t), a[1] + r * Math.sin(t)]); }
  for (let i = 0; i <= 10; i++) { const t = phi - Math.PI / 2 + (i / 10) * Math.PI; pts.push([b[0] + r * Math.cos(t), b[1] + r * Math.sin(t)]); }
  return pts;
};
const arcPath = (c, radius, z, from, to, n) => {
  const pts = [];
  for (let i = 0; i <= n; i++) { const t = from + (i / n) * (to - from); pts.push(iso([c[0] + radius * Math.cos(t), c[1] + radius * Math.sin(t), z], P)); }
  return pathOf(pts);
};
const wire = (d) => '<path class="iso-line" data-tone="mid" d="' + d + '" style="stroke-width:1.25"/>';

function draw() {
  const [bx, by] = ballOf(s);
  const r = radiusOf(s.shown), reach = reachOf(s.shown);
  const cz = RIG.TRAY_Z + r;
  const centre = [bx, by, cz];
  // hoop: back half before the ball, front half after
  const front0 = facing - Math.PI / 2, front1 = facing + Math.PI / 2;
  L.hoopBack.innerHTML = wire(arcPath([bx, by], reach, cz, front1, front0 + Math.PI * 2, 48)) +
    [0, 1, 2, 3].map((i) => i * Math.PI / 2 + 0.785).filter((a) => Math.cos(a - facing) < 0).map((a) => segLine(a, r, reach, cz, bx, by)).join("");
  L.hoopFront.innerHTML = wire(arcPath([bx, by], reach, cz, front0, front1, 48)) +
    [0, 1, 2, 3].map((i) => i * Math.PI / 2 + 0.785).filter((a) => Math.cos(a - facing) >= 0).map((a) => segLine(a, r, reach, cz, bx, by)).join("");
  L.ball.innerHTML = solidSvg(sphereOf(centre, r, P, { steps: 56 }), { tone: "hi", lit: true });
  // arm, pin and the bosses that cap it
  const top = RIG.TRAY_Z + 2 * r;
  let html = solidSvg(cylinder(bx, by, 1.3, top, ARM_Z - top, P, 14), { tone: "mid", crease: "none" });
  html += solidSvg(extrude(stadium([0, 0], [bx, by], 3.2), ARM_Z, ARM_H, P, { convex: true, bevel: 0.5 }), { tone: "mid" });
  html += lineSvg(lineOnTop([0, 0], [bx, by], ARM_Z + ARM_H, P), { tone: "faint" });
  html += solidSvg(cylinder(bx, by, 4.8, ARM_Z, ARM_H + 1.5, P, 24, 0.4), { tone: "mid" });
  html += lineSvg(ring(bx, by, 3.2, ARM_Z + ARM_H + 1.5, P, 20), { tone: "faint" });
  html += dotsSvg([iso([bx, by, ARM_Z + ARM_H + 1.5], P)], { size: 0.5, tone: "lo" });
  html += solidSvg(cylinder(0, 0, 6.8, ARM_Z + ARM_H, CAP_H, P, 32, 0.5), { tone: "mid" });
  html += lineSvg(knurl(0, 0, 6.8, ARM_Z + ARM_H, ARM_Z + ARM_H + CAP_H, 28, P, 0.3), { tone: "lo" });
  html += lineSvg(ring(0, 0, 4.4, ARM_Z + ARM_H + CAP_H, P, 24), { tone: "faint" });
  html += solidSvg(cylinder(0, 0, 2.2, ARM_Z + ARM_H + CAP_H, ${POST_TOP} - ARM_Z - ARM_H - CAP_H, P, 16), { tone: "mid", crease: "none" });
  L.arm.innerHTML = html;
  // beads: place each in the layer where it sits relative to the body, move the falling ones
  const dBall = toward(bx, by);
  s.beads.forEach((b, i) => {
    const el = beadEls[i];
    if (b.state === 2) { if (el.style.display !== "none") el.style.display = "none"; return; }
    if (el.style.display === "none") el.style.display = "";
    const x = b.state === 1 ? b.dx : b.x, y = b.state === 1 ? b.dy : b.y;
    el.setAttribute("transform", b.state === 1 ? translateAlong(P, [x - b.x, y - b.y, 0]) : "");
    el.setAttribute("opacity", String(fade));
    const near = Math.hypot(x - bx, y - by) < reach + 6;
    const behind = toward(x, y) < dBall;
    const home = near && b.state === 1 ? (behind ? L.back : L.inside) : (behind && near ? L.back : (near ? L.inside : L.outside));
    if (el.parentNode !== home) home.appendChild(el);
  });
  // instruments
  L.needle.setAttribute("d", needleAt(s.shown));
  L.pointer.setAttribute("d", knobPointer(knob));
  const text = "m " + s.shown.toFixed(0) + " · r " + r.toFixed(1) + " · reach " + reach.toFixed(1) + " · \u00d7" + (reach * reach / (r * r)).toFixed(1);
  const full = exhausted(s) && !s.beads.some((b) => b.state === 1);
  const end = full ? "zone swept · " + s.swept + "/" + BEADS.length : text;
  const spoken = end;
  if (readout.textContent !== spoken) readout.textContent = spoken;
}
function segLine(a, r, reach, cz, bx, by) {
  const x0 = bx + r * Math.cos(a), y0 = by + r * Math.sin(a), x1 = bx + reach * Math.cos(a), y1 = by + reach * Math.sin(a);
  return wire(segment([x0, y0, cz], [x1, y1, cz], P));
}

const SUB = 1 / 120;
let acc = 0;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  knob = calm ? knobTarget : knob + (knobTarget - knob) * (1 - Math.exp(-dt / 0.18));
  if (Math.abs(knobTarget - knob) < 0.0005) knob = knobTarget;
  const rate = rateOf(knob);
  if (hold > 0) {
    hold -= dt;
    fade = Math.min(1, fade + dt / 1.1);
    if (hold <= 0) { s = fresh(BEADS); fade = 0; }
  } else {
    fade = Math.min(1, fade + dt / 1.1);
    acc += dt;
    while (acc >= SUB) { step(s, SUB, rate); acc -= SUB; }
    if (exhausted(s) && !s.beads.some((b) => b.state === 1) && Math.abs(s.shown - s.mass) < 0.01) { s.rest += dt; if (s.rest > 3.2) { hold = 1.6; } }
  }
  draw();
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (u) => { knobTarget = clamp(u, 0, 1); touched = true; clearTimeout(idleTimer); idleTimer = setTimeout(() => { knobTarget = 0.5; touched = false; }, 4200); run(); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  steer(clamp(((event.clientX - box.left) / box.width - 0.15) / 0.7, 0, 1));
});
stage.addEventListener("pointerleave", () => { clearTimeout(idleTimer); idleTimer = setTimeout(() => { knobTarget = 0.5; }, 1200); });
stage.addEventListener("keydown", (event) => {
  let next = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") next = knobTarget + 0.125;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = knobTarget - 0.125;
  if (event.key === "Home") next = 0;
  if (event.key === "End") next = 1;
  if (event.key === "r" || event.key === "R" || event.key === "Enter" || event.key === " ") { event.preventDefault(); s = fresh(BEADS); fade = 0; hold = 0; run(); return; }
  if (next === null) return;
  event.preventDefault();
  steer(next);
  stage.setAttribute("aria-valuetext", rateOf(clamp(next, 0, 1)).toFixed(2) + " times time-lapse");
});
draw();
`;

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A table-top model of planetary accretion. A tray of dust beads circles a central post. An arm swings a ball round the tray; a hoop on spokes around the ball marks how far it reaches. Every bead inside the hoop falls into the ball, the ball swells, the hoop swells faster than the ball, and a dial gauge counts the mass.",
  body: [
    base(),
    tray(),
    hubLower(),
    gauge(),
    `<path data-part="needle" class="iso-line" data-tone="lit" data-free="start" d="${needleAt(R.RIG.SEED_MASS)}" style="stroke-width:1.1"/>`,
    knobBox(),
    knobTop(),
    `<path data-part="pointer" class="iso-line" data-tone="lit" data-free="start" d="${knobPointer(0.5)}" style="stroke-width:1.1"/>`,
    `<g data-layer="beadsBack"></g>`,
    `<g data-layer="hoopBack"></g>`,
    `<g data-layer="ball"></g>`,
    `<g data-layer="beadsIn"></g>`,
    `<g data-layer="hoopFront"></g>`,
    `<g data-layer="beadsOut">${BEADS.map(bead).join("")}</g>`,
    `<g data-layer="arm"></g>`,
  ],
});

const body = k.plateHtml({
  fig: "Fig 1",
  title: "Planetary accretion",
  hint: "Move across to change the time-lapse",
  readout: `m ${R.RIG.SEED_MASS} · r ${R.radiusOf(R.RIG.SEED_MASS).toFixed(1)} · reach ${R.reachOf(R.RIG.SEED_MASS).toFixed(1)} · ×${R.focusOf(R.RIG.SEED_MASS).toFixed(1)}`,
  keys: [
    { mark: "lit", label: "Protoplanet and gauge needle: mass in beads" },
    { mark: "edge", label: "Capture hoop: reach, set by size and gravity" },
  ],
  caption:
    "Dust on a tray, one body on an arm. Whatever lies inside the hoop falls in. Radius grows as the cube root of mass, but gravitational focusing makes the hoop widen as r times the square root of (1 + 0.4 m^2/3), so it outruns the body and growth speeds up until the ring of dust it can reach is gone.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Planetary accretion: arrow keys change the time-lapse, R restarts" aria-valuemin="0.25" aria-valuemax="4" aria-valuenow="1">${svg}</div>`,
});

const script = kitScript() + "\n" + latheSource() + "\n" + rigSource() + "\n" + live;
writeFileSync(join(HERE, OUT), k.pageHtml({ title: "Planetary accretion", theme, body, script }));
console.log("wrote", OUT, "beads", BEADS.length, "svg", Math.round(svg.length / 1024) + " KB");
