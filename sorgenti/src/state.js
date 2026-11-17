// Stato condiviso dell'app: archivio persistente, stato dell'interfaccia e funzioni di accesso.
import { loadStore, saveStore, uid } from './store.js';
import { defaultUnits } from './units.js';
import { SEED_BULLETS } from './db_seed.js';

export const APP_VERSION = '0.1.0';
export const MAX_RANGE_M = 1100;

export function defaultCalc() {
  return {
    rifleId: null, cartridgeId: null,
    tempC: null, pressureMode: 'station', stationPa: null, altitudeM: null, rhPct: null,
    rangeM: null, angleDeg: null, windMps: null, windClock: 3,
    coriolis: false, latDeg: null, azDeg: null,
    tableStep: 100, splitMode: 'reticle-first', windInReticle: true,
  };
}

export const store = loadStore();
store.settings.units = { ...defaultUnits(), ...(store.settings.units || {}) };
store.settings.calc = { ...defaultCalc(), ...(store.settings.calc || {}) };

export const ui = { tab: 'calc', form: null, toast: '' };

export const persist = () => saveStore(store);
export const U = (fam) => store.settings.units[fam];

export function replaceStore(next) {
  for (const k of Object.keys(store)) delete store[k];
  Object.assign(store, next);
  store.settings.units = { ...defaultUnits(), ...(store.settings.units || {}) };
  store.settings.calc = { ...defaultCalc(), ...(store.settings.calc || {}) };
}

export const allBullets = () => [...SEED_BULLETS, ...store.bullets];
export const bulletById = (id) => allBullets().find((b) => b.id === id);

export function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
export function setPath(obj, path, value) {
  const keys = path.split('.');
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (o[k] == null || typeof o[k] !== 'object') o[k] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    o = o[k];
  }
  o[keys[keys.length - 1]] = value;
}

export const clone = (o) => JSON.parse(JSON.stringify(o));

// Profilo di partenza con i dati forniti dall'utente (carabina e sessione Garmin del 25/09/2026).
export function createStarterProfile() {
  const rifle = {
    id: uid('rifle'), name: 'Remington 700 Magpul .308 Win', make: 'Remington 700, calcio Magpul',
    barrelLenMm: 558.8, twistIn: 10, twistDir: 'R', grooves: 5,
    sightHeightMm: 62.4, zeroDistM: 100, turretUpMrad: 10, mount: 'Base inclinata 20 MOA', zeroEnv: {}, notes: 'Altezza ottica = asse canna - asse ottica, misurata.',
  };
  const cart = {
    id: uid('cart'), kind: 'handload', name: 'Sierra TMK 175 gr - sessione Garmin 25/09/2026',
    bulletId: 'seed-sierra-tmk-175-308', mvMps: 794.5586, mvSdMps: 3.3844, mvEsMps: 12.6, mvN: 58, mvTempC: 24,
    chronoDistMm: 300, mvSource: 'garmin', bcOverride: { model: 'G7', value: null },
    notes: 'Colpi 5, 7 e 9 esclusi (caricati con una quantità di polvere diversa). Polvere e carica non indicate.',
  };
  store.rifles.push(rifle);
  store.cartridges.push(cart);
  store.settings.calc.rifleId = rifle.id;
  store.settings.calc.cartridgeId = cart.id;
  persist();
}

export function newRifle() {
  return { id: uid('rifle'), name: '', make: '', barrelLenMm: null, twistIn: null, twistDir: 'R', grooves: null, sightHeightMm: null, zeroDistM: 100, turretUpMrad: 10, mount: '', zeroEnv: {}, notes: '' };
}
export function newBullet() {
  return { id: uid('bullet'), brand: '', name: '', caliberName: '.308', weightGr: null, diameterMm: 7.8232, lengthMm: null, bcs: [{ model: 'G7', value: null, note: '' }, { model: 'G1', value: null, note: '' }], sources: [], verified: false, notes: '' };
}
export function newCartridge() {
  return { id: uid('cart'), kind: 'handload', name: '', bulletId: '', brand: '', caseBrand: '', primer: '', powder: '', chargeGr: null, coalMm: null, lot: '', mvMps: null, mvSdMps: null, mvEsMps: null, mvN: null, mvTempC: null, chronoDistMm: null, mvSource: 'manual', bcOverride: { model: 'G7', value: null }, chrono: null, notes: '' };
}
