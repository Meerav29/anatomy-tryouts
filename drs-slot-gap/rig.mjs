// The model behind the figure. Pure: the build and the live page both read it.
// A rear wing with a main plane and a flap. Closed, the narrow slot between them feeds fast air onto the flap and
// keeps it attached. DRS rotates the flap about its trailing edge, flattening it and opening the slot. Past a
// critical gap the slot can no longer do its job, the flow over the flap lets go and drag and downforce both fall.
// The numbers are illustrative: a stylised model, not data from a real car.

export const RIG = {
  GAP_CLOSED: 15, // mm, slot gap with the flap shut
  GAP_OPEN: 75, // mm, DRS fully open
  GAP_STALL: 38, // mm, the gap past which this model's flow separates
  STALL_BAND: 14, // mm, how quickly it lets go once past that
  FLAP_SHUT: 38, // degrees
  FLAP_OPEN: 12,
  WING_DRAG_SHARE: 0.3, // share of the whole car's drag that is the rear wing's
  TOP_SPEED: 300, // km/h with the wing shut
  PERIOD: 12, // seconds for the scripted open and close
};

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
// the lever: 0 shut .. 1 fully open; the slot gap it gives (the geometry's own measure is used for drawing)
export const gapOf = (open) => RIG.GAP_CLOSED + (RIG.GAP_OPEN - RIG.GAP_CLOSED) * open;
export const lockAt = () => (RIG.GAP_STALL - RIG.GAP_CLOSED) / (RIG.GAP_OPEN - RIG.GAP_CLOSED); // lever travel at which flow lets go
// 0 = flow attached, 1 = fully separated
export const separation = (open) => smooth(RIG.GAP_STALL - RIG.STALL_BAND * 0.4, RIG.GAP_STALL + RIG.STALL_BAND, gapOf(open));
export const flapAngle = (open) => RIG.FLAP_SHUT + (RIG.FLAP_OPEN - RIG.FLAP_SHUT) * open;
// relative to the wing shut
export const dragOf = (open) => 1 - 0.55 * separation(open) - 0.06 * open;
export const downforceOf = (open) => 1 - 0.78 * separation(open) - 0.06 * open;
// the whole car: top speed when power is the limit goes as the cube root of the drag
export const speedOf = (open) => RIG.TOP_SPEED * Math.pow(1 / (1 - RIG.WING_DRAG_SHARE * (1 - dragOf(open))), 1 / 3);
export const gainOf = (open) => speedOf(open) - RIG.TOP_SPEED;
export const sweepAt = (clock) => 0.5 - 0.5 * Math.cos((clock / RIG.PERIOD) * Math.PI * 2);
