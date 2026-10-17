import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../kit/iso-kit.mjs";
import { kitScript } from "../scripts/inline-kit.mjs";
import * as R from "./rig.mjs";
import * as W from "./wing.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--dark") ? "dark" : "light";
const OUT = theme === "dark" ? "drs-slot-gap-dark.html" : "drs-slot-gap.html";

const WIDTH = 640;
const HEIGHT = 340;

const PLATE = { x: -142, y: -34, w: 314, d: 120, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;

// the tunnel: air flows along +x; you look in through the glass on the near side
const TX0 = -90;
const TX1 = 156;
const TY = 22; // half-depth: the glass is at +TY, the back wall at -TY
const FLOOR_H = 3;
const TOP = 98;
const WING_Y0 = -14;
const WING_Y1 = 14;
const SMOKE_Y = 15.5;
const WZ = FLOOR_H + 1; // the section is drawn in its own z, lifted onto the belt's surface
const lift = (z) => z + WZ;

const RAIL = { x: -90, y: 36, w: 232, d: 7, r: 3.5 };
const KNOB_Y = RAIL.y + RAIL.d / 2;
const KNOB_X0 = -82;
const KNOB_SPAN = 216;
const METERS = [
  { key: "drag", label: "DRAG", y: 64 },
  { key: "down", label: "DOWNFORCE", y: 74 },
];
const BAR_X = -50;
const BAR_W = 150;

const START_F = 0.82;

const P = k.fitProjection([...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [0, 0, 112], [-122, 0, 80]], WIDTH, HEIGHT, { pad: 10, azimuth: 68, elevation: 22 });
const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const flat = (pts, tone = "mid", lit = false) => {
  const d = k.pathOf(pts.map(at), true);
  return `<g class="iso-solid"${lit ? ' data-lit=""' : ""}><path class="iso-fill" d="${d}"/><path class="iso-line iso-edge" data-tone="${tone}" d="${d}"/></g>`;
};
const circleYZ = (x, cy, cz, r, n = 36) => Array.from({ length: n }, (_, i) => [x, cy + r * Math.cos((i / n) * Math.PI * 2), cz + r * Math.sin((i / n) * Math.PI * 2)]);

/* ---------------------------------------------------------------- plate */
function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 24))) {
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

/* ---------------------------------------------------------------- the tunnel */
const FAN = { x: -112, z: FLOOR_H + 48, r: 34 };
function fan() {
  const out = [];
  // a round duct: four rings from the far end to the near one, then the grille
  for (let i = 0; i < 4; i++) out.push(flat(circleYZ(FAN.x - 14 + i * 5, 0, FAN.z, FAN.r), i === 3 ? "hi" : "mid"));
  out.push(L([8, 18, 28].map((r) => k.pathOf(circleYZ(FAN.x + 2, 0, FAN.z, r).map(at), true)).join(""), { tone: "faint" }));
  out.push(`<g data-part="blades"></g>`);
  out.push(S(k.slabOf({ x: FAN.x + 6, y: -3.4, w: 3, d: 6.8, r: 1 }, FLOOR_H, 14, P, 2), { tone: "mid" }));
  return out.join("");
}
function tunnel() {
  const out = [];
  // moving road: the belt under the wing, with its lanes running
  out.push(S(k.slabOf({ x: TX0, y: -TY, w: TX1 - TX0, d: TY * 2, r: 1 }, 0, FLOOR_H, P, 3, 0.4), { tone: "hi" }));
  out.push(`<g data-part="belt"></g>`);
  // back wall with a faint grid so the smoke has something to be seen against
  out.push(S(k.slabOf({ x: TX0, y: -TY - 2, w: TX1 - TX0, d: 2, r: 0.6 }, FLOOR_H, TOP - FLOOR_H, P, 2, 0.3), { tone: "mid", crease: "none" }));
  const grid = [];
  for (let x = TX0 + 12; x < TX1; x += 12) grid.push(k.segment([x, -TY, FLOOR_H + 1], [x, -TY, TOP - 1], P));
  for (let z = FLOOR_H + 12; z < TOP; z += 12) grid.push(k.segment([TX0 + 1, -TY, z], [TX1 - 1, -TY, z], P));
  out.push(L(grid.join(""), { tone: "faint", free: true }));
  // side posts and the glass frame
  for (const x of [TX0 - 1.5, TX1 - 1.5]) out.push(S(k.slabOf({ x, y: -TY - 2, w: 3, d: TY * 2 + 4, r: 0.6 }, FLOOR_H, TOP - FLOOR_H + 2, P, 2, 0.3), { tone: "mid" }));
  return out.join("");
}
function rakeAndMount() {
  const out = [];
  // smoke rake: a pipe with a row of nozzles
  out.push(S(k.slabOf({ x: -86, y: SMOKE_Y - 4, w: 2.4, d: 5, r: 1 }, FLOOR_H, TOP - FLOOR_H - 4, P, 3, 0.2), { tone: "mid" }));
  const nozzles = [46, 54, 62, 70, 78, 87, 32, 39.5, 22.5, 17, 11.5, 6].map((z) => at([-83.4, SMOKE_Y, lift(z)]));
  out.push(D(nozzles, { size: 1.1, tone: "hi" }));
  // the strut that holds the wing
  out.push(S(k.slabOf({ x: 26, y: -3, w: 6, d: 6, r: 1 }, FLOOR_H, lift(26) - FLOOR_H, P, 3, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: 12, y: -9, w: 34, d: 18, r: 2 }, FLOOR_H, 2, P, 3, 0.3), { tone: "mid" }));
  return out.join("");
}
function glass() {
  const out = [];
  const pane = [[TX0, TY, FLOOR_H], [TX1, TY, FLOOR_H], [TX1, TY, TOP], [TX0, TY, TOP]].map(at);
  out.push(L(k.pathOf(pane, true), { tone: "mid" }));
  out.push(L(k.segment([TX0 + 10, TY, TOP - 4], [TX0 + 26, TY, TOP - 36], P) + k.segment([TX0 + 19, TY, TOP - 3], [TX0 + 31, TY, TOP - 28], P), { tone: "faint", free: true }));
  return out.join("");
}

/* ---------------------------------------------------------------- the DRS lever and the two meters */
function control() {
  const out = [];
  out.push(S(k.slabOf(RAIL, 0, 3, P, 4, 0.5), { tone: "mid" }));
  out.push(L(k.lineOnTop([KNOB_X0, KNOB_Y], [KNOB_X0 + KNOB_SPAN, KNOB_Y], 3, P), { tone: "lo", free: true }));
  out.push(`<path class="iso-line" data-tone="red" d="${k.lineOnTop([KNOB_X0 + KNOB_SPAN * R.lockAt(), KNOB_Y], [KNOB_X0 + KNOB_SPAN, KNOB_Y], 3, P)}" style="stroke-width:2"/>`);
  const ticks = k.topTicks(KNOB_X0, KNOB_X0 + KNOB_SPAN, KNOB_SPAN / 12, 12, RAIL.y - 5, 0, [1.6, 3], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  const label = (x, text, style = {}) => k.faceTextSvg(k.topMatrix([x, RAIL.y + RAIL.d + 7], 0, P, "x"), text, { size: 3, tone: "hi", anchor: "middle", ...style });
  out.push(label(KNOB_X0 + 8, "DRS SHUT"), label(KNOB_X0 + KNOB_SPAN - 8, "DRS OPEN"), label(KNOB_X0 + KNOB_SPAN * ((R.lockAt() + 1) / 2), "FLOW LETS GO").replace("<text ", '<text style="fill:var(--anatomy-red)" '));
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
function meter({ key, label, y }) {
  const out = [];
  out.push(S(k.slabOf({ x: BAR_X, y, w: BAR_W + 4, d: 5.2, r: 2.6 }, 0, 2.2, P, 6, 0.3), { tone: "mid", crease: "none" }));
  out.push(L(k.segment([BAR_X + 2 + BAR_W, y - 1.2, 0.2], [BAR_X + 2 + BAR_W, y - 3, 0.2], P), { tone: "mid", free: true }));
  out.push(k.faceTextSvg(k.topMatrix([BAR_X - 5, y + 3.8], 0, P, "x"), label, { size: 3, tone: "hi", anchor: "end" }));
  out.push(`<g data-part="fill-${key}"></g>`);
  return out.join("");
}

/* ---------------------------------------------------------------- live source */
const source = (file) => readFileSync(join(HERE, file), "utf8").replace(/^export /gm, "").replace(/^import .*$/gm, "");

const live = `
const P = ${JSON.stringify(P)};
const TX0 = ${TX0}, TX1 = ${TX1}, TY = ${TY}, FLOOR_H = ${FLOOR_H}, WING_Y0 = ${WING_Y0}, WING_Y1 = ${WING_Y1}, SMOKE_Y = ${SMOKE_Y}, WZ = ${WZ}, TOP = ${TOP};
const KNOB_X0 = ${KNOB_X0}, KNOB_SPAN = ${KNOB_SPAN};
const METERS = ${JSON.stringify(METERS)}, BAR_X = ${BAR_X}, BAR_W = ${BAR_W};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = document.querySelector("[data-readout]");
const $ = (name) => svg.querySelector('[data-part="' + name + '"]');
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const el = { wing: $("wing"), smoke: $("smoke"), wake: $("wake"), gap: $("gapmark"), belt: $("belt"), blades: $("blades"), knob: $("knob"), kept: $("note-kept"), lost: $("note-lost"), drag: $("fill-drag"), down: $("fill-down") };
const WING_SHADES = ["#a8360d", "#c9440f", "#e5531a", "#ff7d45"];
const cosA = Math.cos((P.azimuth * Math.PI) / 180), sinA = Math.sin((P.azimuth * Math.PI) / 180), cosE = Math.cos((P.elevation * Math.PI) / 180), sinE = Math.sin((P.elevation * Math.PI) / 180);

let f = ${START_F}, target = f, clock = 0, time = 0, frame = 0, last = 0, visible = false, touring = !still.matches, idleTimer = 0;
clock = (Math.acos(clamp(1 - 2 * f, -1, 1)) / (Math.PI * 2)) * RIG.PERIOD;

const at3 = (x, y, z) => iso([x, y, z + WZ], P);
// the section swept across the wing's span: the sides that face us, then the near face
function sweep(poly, edge) {
  const n = poly.length;
  let area = 0;
  for (let i = 0; i < n; i++) { const [x1, z1] = poly[i], [x2, z2] = poly[(i + 1) % n]; area += x1 * z2 - x2 * z1; }
  const dir = area > 0 ? 1 : -1;
  let out = "";
  for (let i = 0; i < n; i++) {
    const [x1, z1] = poly[i], [x2, z2] = poly[(i + 1) % n];
    const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz) || 1;
    const nx = (dir * dz) / len, nz = (-dir * dx) / len;
    if (nx * cosA * cosE + nz * sinE <= 0) continue;
    const shade = clamp(Math.round(((-nx * 0.35 + nz * 0.65 + 1) / 2) * 3), 0, 3);
    out += '<path d="' + pathOf([at3(x1, WING_Y0, z1), at3(x2, WING_Y0, z2), at3(x2, WING_Y1, z2), at3(x1, WING_Y1, z1)], true) + '" fill="' + WING_SHADES[shade] + '" stroke="' + WING_SHADES[shade] + '" stroke-width="0.5" stroke-linejoin="round"/>';
  }
  const cap = pathOf(poly.map(([x, z]) => at3(x, WING_Y1, z)), true);
  return out + '<path d="' + cap + '" fill="#f2601f" stroke="#7a2406" stroke-width="0.7" stroke-linejoin="round"/>';
}

function draw() {
  const sep = separation(f), ang = flapAngle(f);
  const s = smoke(ang, RIG.FLAP_SHUT, sep), g = s.g;
  const dragV = dragOf(f), downV = downforceOf(f), gapMm = gap(g) * 4;
  // wing: main plane, flap, and the hinge the flap turns on
  const hinge = at3(g.hinge[0], WING_Y1 + 0.2, g.hinge[1]);
  el.wing.innerHTML = sweep(g.main.pts) + sweep(g.flap.pts) + '<circle cx="' + hinge[0].toFixed(1) + '" cy="' + hinge[1].toFixed(1) + '" r="1.3" fill="#2a2a2e" stroke="#000" stroke-width="0.4"/>';
  // smoke: dashed lines that run along the flow, faster where the air is sped up
  const off = (sp) => (-time * 26 * sp).toFixed(1);
  let sm = "";
  for (const l of s.lines) {
    const d = pathOf(l.pts.map(([x, z]) => at3(x, SMOKE_Y, z)));
    sm += '<path class="iso-line" data-tone="' + (l.kind === "slot" ? "hi" : "mid") + '" data-free="both" d="' + d + '" style="stroke-dasharray:3.2 5.4;stroke-dashoffset:' + off(l.speed) + ';stroke-width:' + (l.kind === "slot" ? 1.25 : 1) + '"/>';
  }
  el.smoke.innerHTML = sm;
  // the stalled wake: wandering red lines behind the flap
  let wk = "";
  if (s.wake.length) {
    s.wake.forEach((pts, w) => {
      const wob = pts.map(([x, z], i) => at3(x, SMOKE_Y + 0.3, z + Math.sin(time * 5.2 + i * 0.9 + w * 1.7) * (0.6 + i * 0.07) * sep));
      wk += '<path class="iso-line" data-tone="red" data-free="both" d="' + pathOf(wob) + '" opacity="' + clamp(sep * 1.1, 0, 1).toFixed(2) + '" style="stroke-width:1.1;stroke-dasharray:2 3.4;stroke-dashoffset:' + off(0.35) + '"/>';
    });
  }
  el.wake.innerHTML = wk;
  // the slot gap, measured
  const a = g.mainTe, b = g.flapLe;
  const pa = at3(a[0], SMOKE_Y + 0.6, a[1]), pb = at3(b[0], SMOKE_Y + 0.6, b[1]);
  el.gap.innerHTML = lineSvg(pathOf([pa, pb]), { tone: "red", free: true }) + faceTextSvg(sideMatrix([a[0] + 4, SMOKE_Y + 0.6], a[1] - 15 + WZ, P, "left"), "SLOT " + Math.round(gapMm) + " mm", { size: 3.4, tone: "hi", anchor: "start" });
  el.kept.setAttribute("opacity", sep < 0.25 ? "1" : "0");
  el.lost.setAttribute("opacity", sep > 0.6 ? "1" : "0");
  // the meters
  for (const m of METERS) {
    const v = m.key === "drag" ? dragV : downV;
    el[m.key].innerHTML = solidSvg(slabOf({ x: BAR_X + 2, y: m.y + 1, w: Math.max(2.4, BAR_W * v), d: 3.2, r: 1.6 }, 1.6, 2.2, P, 6, 0.2), { tone: "hi", lit: true, crease: "none" });
  }
  // the lane lines on the rolling road and the fan's blades
  let belt = "";
  for (const y of [-11, 0, 11]) belt += '<path class="iso-line" data-tone="lo" data-free="both" d="' + onTop([[TX0 + 3, y], [TX1 - 3, y]], FLOOR_H + 0.05, P) + '" style="stroke-dasharray:6 9;stroke-dashoffset:' + off(1.3) + '"/>';
  el.belt.innerHTML = belt;
  let bl = "";
  for (let i = 0; i < 6; i++) {
    const aa = time * 9 + (i * Math.PI) / 3, dy = Math.cos(aa), dz = Math.sin(aa), py = -dz, pz = dy, c = [-112 + 2, 0, FLOOR_H + 48];
    const q = (r, w) => iso([c[0], c[1] + r * dy + w * py, c[2] + r * dz + w * pz], P);
    const d = pathOf([q(6, -2.6), q(30, -1.6), q(30, 1.6), q(6, 2.6)], true);
    bl += '<path d="' + d + '" fill="#9a9aa2" stroke="#4a4a50" stroke-width="0.6" stroke-linejoin="round"/>';
  }
  el.blades.innerHTML = bl + solidSvg(cylinder(0, 0, 0.1, 0, 0.1, P, 6), {}).slice(0, 0);
  el.knob.setAttribute("transform", translateAlong(P, [KNOB_X0 + KNOB_SPAN * f, 0, 0]));
  const text = "slot " + Math.round(gapMm) + " mm \\u00b7 drag " + (dragV >= 0.995 ? "" : "\\u2212") + Math.round((1 - dragV) * 100) + "% \\u00b7 " + (gainOf(f) < 0.5 ? "top speed unchanged" : "+" + Math.round(gainOf(f)) + " km/h");
  if (readout.textContent !== text) readout.textContent = text;
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  time += dt;
  if (touring) { clock += dt; target = sweepAt(clock); }
  f += (target - f) * (still.matches ? 1 : 1 - Math.exp(-dt / 0.14));
  draw();
  stage.setAttribute("aria-valuenow", String(Math.round(f * 100)));
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const resume = () => { idleTimer = setTimeout(() => { if (!still.matches) { touring = true; clock = (Math.acos(clamp(1 - 2 * target, -1, 1)) / (Math.PI * 2)) * RIG.PERIOD; run(); } }, 5000); };
const setTo = (next) => { touring = false; target = clamp(next, 0, 1); clearTimeout(idleTimer); resume(); run(); };
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  setTo(((event.clientX - box.left) / box.width - 0.1) / 0.8);
});
stage.addEventListener("keydown", (event) => {
  let next = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") next = target + (event.shiftKey ? 0.25 : 0.05);
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = target - (event.shiftKey ? 0.25 : 0.05);
  if (event.key === "Home") next = 0;
  if (event.key === "End") next = 1;
  if (next === null) return;
  event.preventDefault();
  setTo(next);
});
draw();
`;

const noteAt = (key, text, colour) => `<g data-part="note-${key}" opacity="0">${k.faceTextSvg(k.sideMatrix([-6, TY], TOP + 18, P, "left"), text, { size: 4.2, tone: "hi", anchor: "middle" }).replace("<text ", `<text style="fill:${colour};font-weight:700" `)}</g>`;

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A wind tunnel seen through its glass side, with a Formula 1 rear wing in the middle: a main plane with a flap above and behind it, and a narrow slot between them. A row of smoke lines flows left to right. With the flap shut the smoke hugs the wing and two lines thread the slot, fast; as you open it the gap grows, and past a critical gap the flow over the flap lets go and a red turbulent wake appears behind it. Two meters beside the tunnel show drag and downforce falling, and a lever on the front sets how far the flap is open.",
  body: [
    plate(),
    fan(),
    tunnel(),
    rakeAndMount(),
    `<g data-part="wing"></g>`,
    `<g data-part="smoke"></g>`,
    `<g data-part="wake"></g>`,
    `<g data-part="gapmark"></g>`,
    glass(),
    noteAt("kept", "SLOT FEEDS THE FLAP: FLOW STAYS ATTACHED", "#4b4b52"),
    noteAt("lost", "SLOT TOO WIDE: FLOW LETS GO", "#e5484d"),
    ...METERS.map(meter),
    control(),
    `<g data-part="knob" transform="${k.translateAlong(P, [KNOB_X0 + KNOB_SPAN * START_F, 0, 0])}">${knob()}</g>`,
  ],
});

const body = k.plateHtml({
  fig: "Fig 9",
  title: "DRS slot gap",
  hint: "Move across to open the flap",
  readout: "slot 27 mm",
  keys: [
    { mark: "lit", label: "The lever you move and the meters' fill" },
    { mark: "raised", label: "Tunnel, strut and fan" },
    { mark: "red", label: "The slot, the stalled wake, and the lever travel where the flow lets go" },
  ],
  caption:
    "A rear wing makes downforce by bending air upward, and it pays for it in drag. Shut, the narrow slot between the main plane and the flap squirts fast air onto the flap and keeps the flow stuck to it. DRS turns the flap flatter and opens the slot. Past a critical gap, about 45 mm in this model, the slot can no longer feed the flap, the flow lets go behind it, and drag and downforce both drop off a cliff. On the straight that is worth about 20 km/h, which is why it is allowed there and not in the corners. The numbers are illustrative, not from a real car.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="DRS slot gap: arrow keys open and close the flap" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(START_F * 100)}">${svg}</div>`,
});

const script = kitScript() + "\n" + source("rig.mjs") + "\n" + source("wing.mjs") + "\n" + live;
writeFileSync(join(HERE, OUT), k.pageHtml({ title: "DRS slot gap", theme, body, script }));
console.log("wrote", OUT, "svg", Math.round(svg.length / 1024) + " KB");
