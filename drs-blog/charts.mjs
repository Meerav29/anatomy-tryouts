// Three static charts for the DRS post, as SVG inside one page, then screenshotted to PNG for Substack.
import { writeFileSync } from "node:fs";

const C = { surface: "#fcfcfb", ink: "#0b0b0b", ink2: "#52514e", muted: "#8a8984", grid: "#e6e5e1", orange: "#eb6834", blue: "#2a78d6", slate: "#9a9892" };
const FONT = `Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const text = (x, y, s, { size = 13, fill = C.ink2, anchor = "start", weight = 400 } = {}) => `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="${anchor}" font-weight="${weight}">${esc(s)}</text>`;
const lines = (x, y, arr, o = {}) => arr.map((s, i) => text(x, y + i * (o.size || 13) * 1.3, s, o)).join("");
// a bar with a rounded data end and a square baseline end, growing to the right
const hbar = (x, y, w, h, fill) => `<path d="M${x} ${y} H${x + w - 4} a4 4 0 0 1 4 4 V${y + h - 4} a4 4 0 0 1 -4 4 H${x} Z" fill="${fill}"/>`;

/* ------------------------------------------------ 1: overtakes per race */
function overtakes() {
  const W = 760, H = 270, x0 = 118, x1 = 690, max = 50;
  const sx = (v) => x0 + ((x1 - x0) * v) / max;
  const rows = [
    { year: "2010", v: 23.8, c: C.slate },
    { year: "2011", v: 43.2, c: C.orange },
    { year: "2012", v: 43.5, c: C.orange },
    { year: "2015", v: 26.8, c: C.orange },
  ];
  let g = "";
  for (const t of [0, 10, 20, 30, 40, 50]) g += `<line x1="${sx(t)}" x2="${sx(t)}" y1="118" y2="300" stroke="${C.grid}" stroke-width="1"/>` + text(sx(t), 318, String(t), { size: 12, fill: C.muted, anchor: "middle" });
  rows.forEach((r, i) => {
    const y = 134 + i * 42;
    g += text(x0 - 14, y + 17, r.year, { size: 14, fill: C.ink, anchor: "end" }) + hbar(x0, y, sx(r.v) - x0, 24, r.c) + text(sx(r.v) + 10, y + 17, r.v.toFixed(1), { size: 14, fill: C.ink, weight: 600 });
  });
  // the moment DRS arrives, drawn between the first two rows
  const yMid = 134 + 42 - 9;
  g += `<path d="M${sx(26)} ${yMid - 2} h0" stroke="none"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family='${FONT}'>
  <rect width="${W}" height="${H}" fill="${C.surface}"/>
  <g transform="translate(0,-60)">
  <circle cx="${x0 + 6}" cy="100" r="5" fill="${C.slate}"/>${text(x0 + 18, 105, "Before DRS", { size: 12.5 })}
  <circle cx="${x0 + 116}" cy="100" r="5" fill="${C.orange}"/>${text(x0 + 128, 105, "With DRS", { size: 12.5 })}
  ${g}
  </g>
  </svg>`;
}

/* ------------------------------------------------ 2: teams invent, regulators respond */
function timeline() {
  const W = 760, H = 540, left = 46, step = 37;
  const X = (y) => left + (y - 2009) * step;
  const yTop = 270, yAxis = 332, yBot = 394;
  let g = `<line x1="${X(2009) - 12}" x2="${X(2026) + 12}" y1="${yAxis}" y2="${yAxis}" stroke="${C.grid}" stroke-width="1.5"/>`;
  for (let y = 2009; y <= 2026; y++) {
    if ([2009, 2011, 2013, 2015, 2017, 2019, 2021, 2023, 2025].includes(y)) g += text(X(y), yAxis + 4, String(y), { size: 11.5, fill: C.muted, anchor: "middle" });
    else g += `<line x1="${X(y)}" x2="${X(y)}" y1="${yAxis - 3}" y2="${yAxis + 3}" stroke="${C.grid}"/>`;
  }
  // arrows from an invention to the rule that answered it
  const pairs = [[2010, 2011], [2012, 2013], [2020, 2021], [2025, 2025.0]];
  for (const [a, b] of pairs) g += `<line x1="${X(a)}" x2="${X(b)}" y1="${yTop + 8}" y2="${yBot - 8}" stroke="${C.slate}" stroke-width="1.5" stroke-dasharray="3 4"/>`;
  const dot = (x, y, fill) => `<circle cx="${x}" cy="${y}" r="6" fill="${fill}" stroke="${C.surface}" stroke-width="2"/>`;
  const team = [
    [2010, 2, "anchor", ["McLaren", "F-duct"]],
    [2012, 1, "middle", ["Mercedes", "double DRS"]],
    [2020, 1, "middle", ["Mercedes", "DAS"]],
    [2023, 2, "middle", ["Red Bull", "DRS advantage"]],
    [2025, 3, "end", ["Flexing", "rear wings"]],
  ];
  const rule = [
    [2009, 1, "start", ["Adjustable", "front wing"]],
    [2011, 2, "middle", ["DRS introduced"]],
    [2013, 1, "middle", ["Double DRS", "banned"]],
    [2019, 1, "middle", ["Rear wing wider and", "taller, slot 65 to 85mm"]],
    [2021, 2, "middle", ["DAS", "banned"]],
    [2025, 1, "middle", ["Flex tests", "tightened"]],
    [2026, 3, "end", ["DRS replaced", "by active aero"]],
  ];
  for (const [yr, lv, an, ls] of team) {
    const lx = an === "anchor" ? X(yr) - 6 : X(yr);
    const anchor = an === "anchor" ? "start" : an;
    const ty = yTop - 22 - (lv - 1) * 0 - ls.length * 16 - (lv - 1) * 52 + 14;
    g += `<line x1="${X(yr)}" x2="${X(yr)}" y1="${yTop - 8}" y2="${ty + ls.length * 16 - 6}" stroke="${C.grid}"/>` + lines(anchor === "end" ? X(yr) + 4 : lx, ty, ls, { size: 12.5, fill: C.ink, anchor, weight: 400 }) + dot(X(yr), yTop, C.orange);
  }
  for (const [yr, lv, an, ls] of rule) {
    const ty = yBot + 30 + (lv - 1) * 52;
    g += `<line x1="${X(yr)}" x2="${X(yr)}" y1="${yBot + 8}" y2="${ty - 14}" stroke="${C.grid}"/>` + lines(an === "end" ? X(yr) + 4 : X(yr), ty, ls, { size: 12.5, fill: C.ink, anchor: an === "start" ? "start" : an }) + dot(X(yr), yBot, C.blue);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family='${FONT}'>
  <rect width="${W}" height="${H}" fill="${C.surface}"/>
  <g transform="translate(0,-60)">
  <circle cx="34" cy="94" r="5" fill="${C.orange}"/>${text(46, 99, "A team found something", { size: 12.5 })}
  <circle cx="206" cy="94" r="5" fill="${C.blue}"/>${text(218, 99, "The rules changed", { size: 12.5 })}
  ${g}
  </g>
  </svg>`;
}

/* ------------------------------------------------ 3: how much speed DRS gives, depending who you ask */
function speed() {
  const W = 760, H = 300, x0 = 270, x1 = 690, max = 25;
  const sx = (v) => x0 + ((x1 - x0) * v) / max;
  let g = "";
  for (const t of [0, 5, 10, 15, 20, 25]) g += `<line x1="${sx(t)}" x2="${sx(t)}" y1="128" y2="302" stroke="${C.grid}" stroke-width="1"/>` + text(sx(t), 322, String(t), { size: 12, fill: C.muted, anchor: "middle" });
  g += text((x0 + x1) / 2, 344, "Extra top speed with DRS open, km/h", { size: 12, fill: C.muted, anchor: "middle" });
  const rows = [
    ["Autosport, 2011 preview", 10, 15, C.blue],
    ["FIA figure, quoted on Wikipedia", 10, 12, C.blue],
    ["racecar-engineering, undated", 4, 5, C.blue],
    ["Red Bull 2023, as rivals saw it", 20, 20, C.orange],
  ];
  rows.forEach(([name, a, b, fill], i) => {
    const y = 148 + i * 42;
    g += text(x0 - 16, y + 5, name, { size: 13.5, fill: C.ink, anchor: "end" });
    if (a === b) g += `<circle cx="${sx(a)}" cy="${y}" r="7" fill="${fill}" stroke="${C.surface}" stroke-width="2"/>` + text(sx(a) + 16, y + 5, "~20", { size: 14, fill: C.ink, weight: 600 });
    else g += `<rect x="${sx(a)}" y="${y - 7}" width="${sx(b) - sx(a)}" height="14" rx="4" fill="${fill}"/>` + text(sx(b) + 12, y + 5, `${a} to ${b}`, { size: 14, fill: C.ink, weight: 600 });
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family='${FONT}'>
  <rect width="${W}" height="${H}" fill="${C.surface}"/>
  <g transform="translate(0,-60)">
  <circle cx="34" cy="100" r="5" fill="${C.blue}"/>${text(46, 105, "Published figure", { size: 12.5 })}
  <circle cx="176" cy="100" r="5" fill="${C.orange}"/>${text(188, 105, "Rivals' estimate", { size: 12.5 })}
  ${g}
  </g>
  </svg>`;
}

const charts = [["figure-1-overtakes", overtakes()], ["figure-3-teams-vs-rules", timeline()], ["figure-2-speed", speed()]];
const page = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#fcfcfb">${charts.map(([id, svg]) => `<div id="${id}" style="width:760px">${svg}</div>`).join("")}</body>`;
writeFileSync(new URL("./charts.html", import.meta.url), page);
console.log(charts.map(([id]) => id).join(" "));
