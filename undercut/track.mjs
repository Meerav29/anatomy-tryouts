// The circuit: a rounded oval with a pit lane on the near straight. Pure geometry, shared by the build and the live page.

export const TRACK = { HX: 90, RR: 49, PIT_Y: 76, LANE: 22 };
const STRAIGHT = 2 * TRACK.HX;
const ARC = Math.PI * TRACK.RR;
export const LOOP = 2 * (STRAIGHT + ARC);

const sm = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// a point on the racing line, u in laps from the line at the left end of the near straight
export function loopAt(u) {
  let s = (((u % 1) + 1) % 1) * LOOP;
  const { HX, RR } = TRACK;
  if (s < STRAIGHT) return [-HX + s, RR];
  s -= STRAIGHT;
  if (s < ARC) {
    const f = s / RR;
    return [HX + RR * Math.sin(f), RR * Math.cos(f)];
  }
  s -= ARC;
  if (s < STRAIGHT) return [HX - s, -RR];
  s -= STRAIGHT;
  const f = s / RR;
  return [-HX - RR * Math.sin(f), -RR * Math.cos(f)];
}
// the same lap through the pit lane: it peels off the near straight and rejoins it
export function pitAt(u) {
  const [x, y] = loopAt(u);
  if (y !== TRACK.RR || x < -75 || x > 75) return [x, y];
  const w = sm(-72, -50, x) * sm(72, 50, x);
  return [x, y + (TRACK.PIT_Y - TRACK.RR) * w];
}
export const poseAt = (u, pit) => {
  const f = pit ? pitAt : loopAt;
  const [x, y] = f(u);
  const [x2, y2] = f(u + 0.002);
  return { x, y, a: Math.atan2(y2 - y, x2 - x) };
};
