// Motore balistico a massa puntiforme (3 gradi di libertà) per calcolo correzioni in MRAD.
// Tutte le grandezze interne sono in unità SI: m, s, kg, Pa, K, rad.
// Assi: X = gittata orizzontale lungo la direzione di tiro, Y = alto, Z = destra (terna destrorsa).
import { G1, G7 } from './drag_tables.js';

const G_ACC = 9.80665;
const OMEGA_EARTH = 7.2921159e-5;
const BC_IMP_TO_SI = 703.06958; // 1 lb/in^2 in kg/m^2
const GRAIN_KG = 6.479891e-5;
const INCH_M = 0.0254;
const FPS_M = 0.3048;

const TABLES = { G1, G7 };

// ---------- atmosfera ----------
// Pressione di STAZIONE (assoluta, misurata sul posto) in Pa, temperatura in °C, umidità relativa 0..1.
export function airProperties({ tempC, stationPressurePa, rh = 0 }) {
  const T = tempC + 273.15;
  // pressione di saturazione del vapore (Arden-Buck)
  const es = 611.21 * Math.exp((18.678 - tempC / 234.5) * (tempC / (257.14 + tempC)));
  const pv = Math.min(Math.max(rh, 0), 1) * es;
  const Rd = 287.058, Rv = 461.495;
  const rho = (stationPressurePa - pv) / (Rd * T) + pv / (Rv * T);
  const x = pv / stationPressurePa; // frazione molare del vapore
  const Mmix = (1 - x) * 28.9647e-3 + x * 18.01528e-3;
  const c = Math.sqrt((1.4 * 8.314462618 * T) / Mmix);
  return { rho, c, tempC, stationPressurePa, rh };
}

// ---------- resistenza ----------
function makeCdFn(table) {
  const n = table.length;
  return (M) => {
    if (M <= table[0][0]) return table[0][1];
    if (M >= table[n - 1][0]) return table[n - 1][1];
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (table[mid][0] <= M) lo = mid; else hi = mid;
    }
    const f = (M - table[lo][0]) / (table[hi][0] - table[lo][0]);
    return table[lo][1] + f * (table[hi][1] - table[lo][1]);
  };
}

// bc: numero (lb/in^2) oppure [{vMps, bc}] ordinato per velocità crescente: si usa il BC
// della fascia più alta con vMps <= velocità corrente (come i BC "sopra 2400 fps" dei produttori).
function makeBcFn(bc) {
  if (typeof bc === 'number') return () => bc * BC_IMP_TO_SI;
  const bands = [...bc].sort((a, b) => a.vMps - b.vMps);
  return (v) => {
    let cur = bands[0].bc;
    for (const b of bands) if (v >= b.vMps) cur = b.bc;
    return cur * BC_IMP_TO_SI;
  };
}

// ---------- stabilità e deriva da rotazione ----------
// Miller: Sg; deriva Litz: SD[in] = 1.25 (Sg + 1.2) t^1.83
export function stabilitySg({ massGr, diameterIn, lengthIn, twistIn, v0Mps, tempC, stationPressurePa }) {
  const t = twistIn / diameterIn;
  const l = lengthIn / diameterIn;
  const base = (30 * massGr) / (t ** 2 * diameterIn ** 3 * l * (1 + l * l));
  const vf = Math.cbrt((v0Mps / FPS_M) / 2800);
  const tF = tempC * 9 / 5 + 32;
  const pIn = stationPressurePa / 3386.389;
  return base * vf * ((tF + 460) / 519) * (29.92 / pIn);
}
export function spinDriftM(sg, tof) {
  return 1.25 * (sg + 1.2) * Math.pow(tof, 1.83) * INCH_M;
}

// ---------- integrazione ----------
function makeSim(p, env, wind) {
  const cdFn = makeCdFn(TABLES[p.dragModel]);
  const bcFn = makeBcFn(p.bc);
  const { rho, c } = env;
  const k0 = (Math.PI / 8) * rho;
  const wx = wind.x, wy = 0, wz = wind.z;
  let cor = null;
  if (p.latitudeDeg != null && p.azimuthDeg != null && p.coriolis !== false) {
    const lat = (p.latitudeDeg * Math.PI) / 180, az = (p.azimuthDeg * Math.PI) / 180;
    cor = [OMEGA_EARTH * Math.cos(lat) * Math.cos(az), OMEGA_EARTH * Math.sin(lat), -OMEGA_EARTH * Math.cos(lat) * Math.sin(az)];
  }
  const acc = (s, out) => {
    const rx = s[3] - wx, ry = s[4] - wy, rz = s[5] - wz;
    const sp = Math.sqrt(rx * rx + ry * ry + rz * rz);
    const k = (k0 * cdFn(sp / c) / bcFn(sp)) * sp;
    out[0] = -k * rx;
    out[1] = -k * ry - G_ACC;
    out[2] = -k * rz;
    if (cor) {
      // a = -2 Ω × v
      out[0] -= 2 * (cor[1] * s[5] - cor[2] * s[4]);
      out[1] -= 2 * (cor[2] * s[3] - cor[0] * s[5]);
      out[2] -= 2 * (cor[0] * s[4] - cor[1] * s[3]);
    }
  };
  return acc;
}

// Restituisce stato interpolato a x = xT per angolo di bocca theta (rad sopra l'orizzontale).
function flyTo(p, env, wind, theta, xT, dt = p.dt || 0.001) {
  const acc = makeSim(p, env, wind);
  const s = [0, 0, 0, p.v0Mps * Math.cos(theta), p.v0Mps * Math.sin(theta), 0];
  let t = 0;
  const a1 = [0, 0, 0], a2 = [0, 0, 0], a3 = [0, 0, 0], a4 = [0, 0, 0];
  const tmp = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 200000; i++) {
    const prev = s.slice();
    acc(s, a1);
    for (let j = 0; j < 3; j++) { tmp[j] = s[j] + 0.5 * dt * s[j + 3]; tmp[j + 3] = s[j + 3] + 0.5 * dt * a1[j]; }
    acc(tmp, a2);
    const v2 = [tmp[3], tmp[4], tmp[5]];
    for (let j = 0; j < 3; j++) { tmp[j] = s[j] + 0.5 * dt * v2[j]; tmp[j + 3] = s[j + 3] + 0.5 * dt * a2[j]; }
    acc(tmp, a3);
    const v3 = [tmp[3], tmp[4], tmp[5]];
    for (let j = 0; j < 3; j++) { tmp[j] = s[j] + dt * v3[j]; tmp[j + 3] = s[j + 3] + dt * a3[j]; }
    acc(tmp, a4);
    const v4 = [tmp[3], tmp[4], tmp[5]];
    for (let j = 0; j < 3; j++) {
      s[j] += (dt / 6) * (s[j + 3] + 2 * v2[j] + 2 * v3[j] + v4[j]);
      s[j + 3] += (dt / 6) * (a1[j] + 2 * a2[j] + 2 * a3[j] + a4[j]);
    }
    t += dt;
    if (s[0] >= xT) {
      const f = (xT - prev[0]) / (s[0] - prev[0]);
      const lerp = (a, b) => a + f * (b - a);
      return { y: lerp(prev[1], s[1]), z: lerp(prev[2], s[2]), t: t - dt + f * dt, vx: lerp(prev[3], s[3]), vy: lerp(prev[4], s[4]), vz: lerp(prev[5], s[5]) };
    }
    if (Math.hypot(s[3], s[4], s[5]) < 30) return null; // proiettile fermo prima del bersaglio
  }
  return null;
}

// Risolve theta tale che y(xT) = yTarget (secante con bracket di sicurezza).
function solveAngle(p, env, wind, xT, yTarget, guess = 0.003) {
  const f = (th) => {
    const r = flyTo(p, env, wind, th, xT);
    return r ? r.y - yTarget : NaN;
  };
  let a = guess, fa = f(a);
  let b = guess + 0.001, fb = f(b);
  for (let i = 0; i < 40; i++) {
    if (!Number.isFinite(fa) || !Number.isFinite(fb)) return NaN;
    if (Math.abs(fb) < 1e-5) return b;
    const c2 = b - (fb * (b - a)) / (fb - fa);
    a = b; fa = fb; b = c2; fb = f(b);
  }
  return Number.isFinite(fb) && Math.abs(fb) < 1e-4 ? b : NaN;
}

// ---------- API principale ----------
// p: { dragModel:'G1'|'G7', bc, v0Mps, massGr, diameterIn, lengthIn (opzionale), twistIn, twistDir:1|-1,
//      sightHeightM, zeroDistanceM, latitudeDeg?, azimuthDeg?, coriolis?, dt? }
// env: { tempC, stationPressurePa, rh }   zeroEnv: come env, oppure null (= stesse condizioni del tiro)
// shot: { rangeM (distanza in linea d'aria), angleDeg (sito, + in salita), windMps, windClock (ore, 12 = frontale) }
// Se lengthIn manca la deriva da rotazione non viene calcolata (spinApplied = false).
const spinOn = (p) => p.lengthIn > 0 && p.twistIn > 0;

export function prepareZero(p, env, zeroEnv) {
  const atm = airProperties(env);
  const zEnv = zeroEnv || env;
  const zatm = zeroEnv ? airProperties(zeroEnv) : atm;
  const dir = p.twistDir ?? 1;
  const spin = spinOn(p);
  const sgOf = (e) => (spin ? stabilitySg({ massGr: p.massGr, diameterIn: p.diameterIn, lengthIn: p.lengthIn, twistIn: p.twistIn, v0Mps: p.v0Mps, tempC: e.tempC, stationPressurePa: e.stationPressurePa }) : 0);
  const noWind = { x: 0, z: 0 };
  // azzeramento: terreno piano, nessun vento
  const th0 = solveAngle(p, zatm, noWind, p.zeroDistanceM, p.sightHeightM, 0.002);
  if (!Number.isFinite(th0)) return { ok: false };
  const z0 = flyTo(p, zatm, noWind, th0, p.zeroDistanceM);
  const zeroSpin = spin ? dir * spinDriftM(sgOf(zEnv), z0.t) : 0;
  const zeroLatMrad = ((z0.z + zeroSpin) / p.zeroDistanceM) * 1000;
  return { ok: true, atm, th0, zeroLatMrad, sg: sgOf(env), spin, dir };
}

export function solveShotPrepared(p, prep, shot) {
  if (!prep.ok) return { ok: false, rangeM: shot.rangeM };
  const { atm, th0, zeroLatMrad, sg, spin, dir } = prep;
  const noWind = { x: 0, z: 0 };
  const alpha = ((shot.angleDeg || 0) * Math.PI) / 180;
  const xT = shot.rangeM * Math.cos(alpha);
  const beta = ((shot.windClock ?? 12) * 30 * Math.PI) / 180;
  const ws = shot.windMps || 0;
  const wind = { x: -ws * Math.cos(beta), z: -ws * Math.sin(beta) };

  const yTarget = p.sightHeightM + xT * Math.tan(alpha);
  // l'alzo si risolve con il vento incluso (vento frontale/di coda e componente laterale cambiano la resistenza)
  const th = solveAngle(p, atm, wind, xT, yTarget, th0 + alpha + 0.001 * (shot.rangeM / 100));
  if (!Number.isFinite(th)) return { ok: false, rangeM: shot.rangeM };
  const r = flyTo(p, atm, wind, th, xT);
  const rNoWind = flyTo(p, atm, noWind, th, xT);
  const sd = spin ? dir * spinDriftM(sg, r.t) : 0;

  const elevMrad = (th - alpha - th0) * 1000;
  const driftMrad = ((r.z + sd) / xT) * 1000 - zeroLatMrad; // + = il proiettile finisce a destra del reticolo
  const windMrad = ((r.z - rNoWind.z) / xT) * 1000;
  const spinMrad = ((rNoWind.z + sd) / xT) * 1000 - zeroLatMrad;
  const v = Math.hypot(r.vx, r.vy, r.vz);
  const mass = p.massGr * GRAIN_KG;
  return {
    ok: true,
    rangeM: shot.rangeM,
    elevationMrad: elevMrad,       // correzione verso l'alto (torretta o tenuta sotto il centro)
    driftMrad,                     // deviazione totale a destra (+) / sinistra (-) del proiettile
    windMrad, spinDriftMrad: spinMrad, spinApplied: spin,
    tofS: r.t,
    velocityMps: v,
    mach: v / atm.c,
    energyJ: 0.5 * mass * v * v,
    sg,
    zeroAngleMrad: th0 * 1000,
    airDensity: atm.rho,
    speedOfSound: atm.c,
  };
}

export function solveShot(p, env, zeroEnv, shot) {
  return solveShotPrepared(p, prepareZero(p, env, zeroEnv), shot);
}

export function solveTable(p, env, zeroEnv, shot, distances) {
  const prep = prepareZero(p, env, zeroEnv);
  return distances.map((d) => solveShotPrepared(p, prep, { ...shot, rangeM: d }));
}

// Suddivisione tra torretta e reticolo. mode: 'reticle-first' (tiene nel reticolo fino a reticleMax e
// gira la torretta solo per il resto, arrotondato per eccesso al click) oppure 'turret-first'.
export function splitCorrection(totalMrad, { turretMaxMrad = 10, reticleMaxMrad = 10, clickMrad = 0.1, mode = 'reticle-first' } = {}) {
  const sign = totalMrad < 0 ? -1 : 1;
  const a = Math.abs(totalMrad);
  let dial, hold;
  if (mode === 'turret-first') {
    dial = Math.round(Math.min(a, turretMaxMrad) / clickMrad) * clickMrad;
  } else {
    // Torretta arrotondata per eccesso al click: il resto nel reticolo non supera mai il massimo.
    dial = Math.ceil(Math.max(0, a - reticleMaxMrad) / clickMrad - 1e-9) * clickMrad;
  }
  hold = a - dial;
  const overflow = dial > turretMaxMrad + 1e-9 || hold > reticleMaxMrad + 1e-9;
  return { dialMrad: sign * Number(dial.toFixed(3)), holdMrad: sign * hold, overflow };
}

// Esposte solo per i test.
export const _internal = { flyTo, solveAngle };
