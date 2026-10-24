// The model behind the figure. Pure: the build and the live page both read it.
// Air drawn through a carburettor speeds up in the venturi and has fuel sprayed into it.
// Both cool it: the speed-up a little, the fuel evaporating a lot. Moist air cooled below
// freezing leaves ice on the venturi and the throttle plate. Pilots read the risk off the
// carburettor icing probability chart (FAA SAIB CE-09-35, 2009; the same chart is
// PHAK FAA-H-8083-25 fig. 7-12, CAA SafetySense 14, Transport Canada TP 2228E-38).

export const CARB = {
  // --- the air and the fuel
  // Specific heat of dry air at constant pressure, kJ/(kg K) (textbook value near 300 K).
  CP: 1.005,
  // Latent heat of vaporisation of gasoline, kJ/kg. Published values for motor and aviation
  // gasoline run about 300-350 (Engineering ToolBox, "Fuels - latent heat of vaporization");
  // 349 is the commonly quoted figure for gasoline.
  LATENT: 349,
  // Air-fuel ratio by mass. Avgas is stoichiometric near 15:1; engines run rich of that at
  // high power, and ~12.5:1 is the usual "best power" mixture (Lycoming, Key Reprints).
  AFR: 12.5,
  // Air speed in the venturi throat at cruise, m/s. Illustrative: a carburettor venturi is
  // sized for roughly 60-120 m/s at full flow; 90 chosen.
  THROAT_V: 90,
  // --- carburettor heat
  // The heat rise a carb-heat system must give at 75% power: 90 F = 50 K. The certification
  // rule for venturi carburettors (14 CFR 23.1093(a)(1), before amendment 23-64).
  HEAT_RISE: 50, // K
  // --- the bench
  T_MIN: -15, T_MAX: 40, // C, the chart's temperature axis (the printed chart runs about -15..40)
  RH_MIN: 20, RH_MAX: 100, // %, the chart's humidity range
  DIAL_MIN: -40, DIAL_MAX: 60, // C, the thermometer dial (room for heated air)
  PERIOD: 22, // s, the idle tour's loop
};

// Cooling from evaporating the fuel: each kg of air carries 1/AFR kg of fuel, whose latent
// heat comes out of the air. All of it evaporating is the upper bound: L / (AFR cp) = 27.8 K.
export const DROP_EVAP = CARB.LATENT / (CARB.AFR * CARB.CP);
// Cooling from the speed-up: stagnation to static temperature, v^2 / (2 cp) = 4.0 K.
export const DROP_SPEED = (CARB.THROAT_V * CARB.THROAT_V) / (2 * CARB.CP * 1000);
// Together about 32 K: in line with the "up to 70 F (39 K)" usually quoted for the
// venturi and throttle plate (FAA PHAK ch. 7; Wikipedia, "Carburetor icing").
export const DROP = DROP_EVAP + DROP_SPEED;

// The chart's zones, mildest first. The printed chart is a graphic; these lobes are drawn to
// its published reading points, so the boundaries are approximate:
// - light icing is possible from about -12 to 38 C (10 F to over 100 F, FAA chart via
//   Boldmethod), down to about 30% humidity (SafetySense 14, 5-9; NTSB: "as low as 35%");
// - serious icing at descent power from about -7 to 32 C (20 F to over 90 F, same source);
// - icing is most likely below 21 C (70 F) with humidity above 80% (FAA PHAK ch. 7), the
//   chart's "serious icing, any power" zone.
// The moderate zone's edges (60%, -7..27 C) sit between those and are illustrative.
// A lobe needs rhMin at its centre temperature and more toward its ends: rhMin + (100 - rhMin) u^4.
export const ZONES = [
  { key: "light", name: "light icing", tLo: -12, tHi: 38, rhMin: 30 },
  { key: "descent", name: "serious at descent power", tLo: -7, tHi: 32, rhMin: 45 },
  { key: "moderate", name: "moderate at cruise", tLo: -7, tHi: 27, rhMin: 60 },
  { key: "serious", name: "serious, any power", tLo: -7, tHi: 21, rhMin: 80 },
];

// humidity a zone needs at temperature t, or Infinity outside its temperature range
export function needOf(zone, t) {
  const half = (zone.tHi - zone.tLo) / 2;
  const u = Math.abs(t - (zone.tLo + zone.tHi) / 2) / half;
  return u >= 1 ? Infinity : zone.rhMin + (100 - zone.rhMin) * u ** 4;
}
// 0 = no icing, 1..4 = the zones above
export function levelOf(t, rh) {
  let level = 0;
  ZONES.forEach((zone, i) => { if (rh >= needOf(zone, t)) level = i + 1; });
  return level;
}

// saturation vapour pressure over water, hPa (Magnus formula, WMO coefficients 6.112, 17.62, 243.12)
export const saturation = (t) => 6.112 * Math.exp((17.62 * t) / (243.12 + t));
// relative humidity of the same air heated from t to t2: the moisture stays, the room grows
export const heatedRh = (t, rh, t2) => (rh * saturation(t)) / saturation(t2);

// wet-bulb temperature, C, from temperature and humidity at sea-level pressure
// (Stull 2011, "Wet-bulb temperature from relative humidity and air temperature", J. Appl.
// Meteor. Climatol. 50: 2267; good to about 1 C for 5-99% humidity, -20..50 C)
export function wetBulbOf(t, rh) {
  return t * Math.atan(0.151977 * Math.sqrt(rh + 8.313659)) + Math.atan(t + rh) - Math.atan(rh - 1.676331) + 0.00391838 * rh ** 1.5 * Math.atan(0.023101 * rh) - 4.686035;
}

// everything the figure shows, for one ambient state
export function stateOf(t, rh, heat) {
  const tIn = heat ? t + CARB.HEAT_RISE : t;
  const rhIn = heat ? heatedRh(t, rh, tIn) : rh;
  const level = levelOf(tIn, rhIn);
  return { t, rh, heat, tIn, rhIn, venturi: tIn - DROP, level, zone: level ? ZONES[level - 1] : null };
}
// how much frost the throttle plate carries when it has settled: 0..1
export const frostOf = (level) => level / ZONES.length;

// the idle tour: a slow loop through the chart, carb heat pulled for part of each lap
export const tourOf = (clock) => {
  const a = (clock / CARB.PERIOD) * Math.PI * 2;
  return { t: 11 + 21 * Math.cos(a), rh: 62 + 33 * Math.sin(a), heat: ((clock / CARB.PERIOD) % 1) > 0.27 && ((clock / CARB.PERIOD) % 1) < 0.42 };
};
