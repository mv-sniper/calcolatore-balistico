// Controlli di coerenza dell'archivio incorporato e prova di calcolo con le bande di BC.
import { SEED_BULLETS, SEED_AMMO, SUGGEST } from '../src/db_seed.js';
import { prepareZero, solveShotPrepared } from '../src/engine.js';

let bad = 0;
const fail = (m) => { bad++; console.log('  FAIL', m); };
const ids = new Set();
for (const b of SEED_BULLETS) {
  if (ids.has(b.id)) fail('id duplicato ' + b.id);
  ids.add(b.id);
  if (!(b.weightGr > 0)) fail('peso mancante ' + b.id);
  if (!(b.bcs || []).some((x) => x.value > 0)) fail('BC mancante ' + b.id);
  for (const x of b.bcs) {
    if (!['G1', 'G7'].includes(x.model)) fail('modello BC ' + b.id);
    if (x.value && (x.value < 0.1 || x.value > 0.8)) fail('BC fuori misura ' + b.id + ' ' + x.value);
    if (x.model === 'G7' && x.value && b.bcs.find((y) => y.model === 'G1' && y.value) && x.value > b.bcs.find((y) => y.model === 'G1').value) fail('G7 > G1 ' + b.id);
  }
  if (b.lengthMm && (b.lengthMm < 25 || b.lengthMm > 45)) fail('lunghezza strana ' + b.id);
  if (!b.sources || !b.sources.length) fail('fonte mancante ' + b.id);
  if (b.weightGr < 167 || b.weightGr > 185) fail('peso fuori 167-185 ' + b.id);
}
const aids = new Set();
for (const a of SEED_AMMO) {
  if (aids.has(a.id)) fail('id munizione duplicato ' + a.id);
  aids.add(a.id);
  if (!ids.has(a.bulletId)) fail('palla inesistente per ' + a.id + ' -> ' + a.bulletId);
  if (!(a.mvMps > 600 && a.mvMps < 950)) fail('velocità strana ' + a.id + ' ' + a.mvMps);
  if (!a.sources.length) fail('fonte mancante ' + a.id);
}
for (const [k, l] of Object.entries(SUGGEST)) if (new Set(l).size !== l.length) fail('duplicati in ' + k);
console.log(`archivio: ${SEED_BULLETS.length} palle, ${SEED_AMMO.length} munizioni, ${SUGGEST.powders.length} polveri`);

// Hornady 168 ELD Match: BC a bande, 794,56 m/s, atmosfera standard
const h = SEED_BULLETS.find((b) => b.id === 'seed-hornady-eld-match-168');
const g7 = h.bcs.find((x) => x.model === 'G7');
const base = { dragModel: 'G7', v0Mps: 794.5586, massGr: 168, diameterIn: 0.308, lengthIn: null, twistIn: 10, twistDir: 1, sightHeightM: 0.0624, zeroDistanceM: 100 };
const env = { tempC: 15, stationPressurePa: 101325, rh: 0 };
const run = (bc) => { const p = { ...base, bc }; const prep = prepareZero(p, env, null); return solveShotPrepared(p, prep, { rangeM: 1100, windMps: 0, windClock: 3, angleDeg: 0 }).elevationMrad; };
const eBand = run(g7.bands.map((x) => ({ vMps: x.fps * 0.3048, bc: x.value })));
const eTop = run(g7.value);
const eLow = run(g7.bands[2].value);
console.log(`Hornady 168 ELD Match, 1100 m: bande ${eBand.toFixed(2)} | BC unico 0,263 ${eTop.toFixed(2)} | BC unico 0,251 ${eLow.toFixed(2)} MRAD`);
if (!(eBand > eTop && eBand < eLow)) fail('le bande devono dare un valore tra BC alto e BC basso');
console.log(bad ? `${bad} ERRORI` : 'archivio: ok');
process.exit(bad ? 1 : 0);
