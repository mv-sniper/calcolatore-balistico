// Unità di misura selezionabili. I dati sono sempre salvati in unità "base":
// pressione Pa, temperatura °C, velocità m/s, vento m/s, distanza m, massa grani, lunghezze mm.
// f = quante unità base ci sono in 1 unità scelta (to = unità -> base).

export const FAMILIES = {
  pressure: {
    label: 'Pressione', def: 'hPa',
    units: {
      hPa: { label: 'hPa (= mbar)', f: 100, dec: 1 },
      kPa: { label: 'kPa', f: 1000, dec: 2 },
      mmHg: { label: 'mmHg', f: 133.322387415, dec: 1 },
      inHg: { label: 'inHg', f: 3386.389, dec: 2 },
      psi: { label: 'psi', f: 6894.757293, dec: 2 },
    },
  },
  temperature: {
    label: 'Temperatura', def: 'C',
    units: {
      C: { label: '°C', to: (v) => v, from: (v) => v, dec: 1 },
      F: { label: '°F', to: (v) => ((v - 32) * 5) / 9, from: (v) => (v * 9) / 5 + 32, dec: 1 },
    },
  },
  speed: {
    label: 'Velocità palla', def: 'mps',
    units: { mps: { label: 'm/s', f: 1, dec: 1 }, fps: { label: 'fps', f: 0.3048, dec: 0 } },
  },
  wind: {
    label: 'Vento', def: 'mps',
    units: {
      mps: { label: 'm/s', f: 1, dec: 1 },
      kmh: { label: 'km/h', f: 1 / 3.6, dec: 1 },
      mph: { label: 'mph', f: 0.44704, dec: 1 },
      kn: { label: 'nodi', f: 0.514444, dec: 1 },
    },
  },
  distance: {
    label: 'Distanza', def: 'm',
    units: { m: { label: 'm', f: 1, dec: 0 }, yd: { label: 'yd', f: 0.9144, dec: 0 } },
  },
  mass: {
    label: 'Massa (palla, polvere)', def: 'gr',
    units: { gr: { label: 'grani', f: 1, dec: 1 }, g: { label: 'grammi', f: 15.4323584, dec: 2 } },
  },
  length: {
    label: 'Lunghezze piccole', def: 'mm',
    units: { mm: { label: 'mm', f: 1, dec: 1 }, in: { label: 'pollici', f: 25.4, dec: 3 } },
  },
};

export function defaultUnits() {
  const o = {};
  for (const [k, v] of Object.entries(FAMILIES)) o[k] = v.def;
  return o;
}

function unitDef(fam, unit) {
  const u = FAMILIES[fam]?.units[unit];
  if (!u) throw new Error(`Unità sconosciuta: ${fam}/${unit}`);
  return u;
}

export function toBase(fam, unit, v) {
  const u = unitDef(fam, unit);
  return u.to ? u.to(v) : v * u.f;
}

export function fromBase(fam, unit, v) {
  const u = unitDef(fam, unit);
  return u.from ? u.from(v) : v / u.f;
}

// Legge un numero scritto con virgola o punto. Vuoto o non valido -> null.
export function parseNum(s) {
  if (s == null) return null;
  const t = String(s).trim().replace(/\s+/g, '').replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

// Testo di un valore base nell'unità scelta, con virgola decimale.
export function fmt(fam, unit, baseValue, decimals) {
  if (baseValue == null || !Number.isFinite(baseValue)) return '';
  const d = decimals ?? unitDef(fam, unit).dec;
  return fromBase(fam, unit, baseValue).toFixed(d).replace('.', ',');
}

// Numero con virgola decimale per valori adimensionali (MRAD, secondi...).
export function num(v, d = 1) {
  if (v == null || !Number.isFinite(v)) return '';
  return v.toFixed(d).replace('.', ',');
}

// Pressione di stazione stimata da quota in atmosfera standard ICAO (solo se manca la misura).
export function stationPressureFromAltitude(altM) {
  return 101325 * Math.pow(1 - 2.25577e-5 * altM, 5.25588);
}
