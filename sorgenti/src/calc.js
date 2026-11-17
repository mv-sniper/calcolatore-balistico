// Collega l'interfaccia al motore: raccoglie i dati, li controlla (nessun valore inventato:
// i dati mancanti fermano il calcolo) e prepara il risultato per la visualizzazione.
import { prepareZero, solveShotPrepared, splitCorrection } from './engine.js';
import { reticleSvg, holdDescription } from './reticle.js';
import { store, bulletById, MAX_RANGE_M, U } from './state.js';
import { num, toBase, fmt, stationPressureFromAltitude, FAMILIES } from './units.js';
import { esc } from './fields.js';

const IN = 25.4;

export function buildInputs() {
  const c = store.settings.calc;
  const errors = [], warnings = [], notes = [];
  const rifle = store.rifles.find((r) => r.id === c.rifleId);
  const cart = store.cartridges.find((x) => x.id === c.cartridgeId);
  const bullet = cart ? bulletById(cart.bulletId) : null;

  if (!rifle) errors.push('Scegli una carabina.');
  if (!cart) errors.push('Scegli una cartuccia.');
  if (cart && !bullet) errors.push('La cartuccia non ha una palla associata.');
  if (cart && !(cart.mvMps > 0)) errors.push('Manca la velocità iniziale della cartuccia.');
  if (rifle) {
    if (!(rifle.sightHeightMm > 0)) errors.push('Manca l\'altezza dell\'ottica sulla carabina.');
    if (!(rifle.twistIn > 0)) errors.push('Manca il passo di rigatura della carabina.');
    if (!(rifle.zeroDistM > 0)) errors.push('Manca la distanza di azzeramento della carabina.');
  }
  let model = null, bcv = null;
  if (cart && cart.bcOverride && cart.bcOverride.value > 0) {
    model = cart.bcOverride.model; bcv = cart.bcOverride.value;
    notes.push(`BC personalizzato della cartuccia in uso: ${model} ${num(bcv, 3)}.`);
  } else if (bullet) {
    const b = (bullet.bcs || []).find((x) => x.value > 0 && x.model === 'G7') || (bullet.bcs || []).find((x) => x.value > 0);
    if (!b) errors.push('La palla non ha un coefficiente balistico (BC).');
    else {
      model = b.model;
      if (Array.isArray(b.bands) && b.bands.length) {
        bcv = b.bands.map((x) => ({ vMps: x.fps * 0.3048, bc: x.value }));
        notes.push(`BC usato: ${model} a bande di velocità (${b.bands.map((x) => `${num(x.value, 3)} da ${Math.round(x.fps)} fps`).join(', ')}), come pubblicato dal produttore.`);
      } else {
        bcv = b.value;
        notes.push(`BC usato: ${model} ${num(bcv, 3)}${bullet.verified ? ' (pubblicato dal produttore)' : ' (dato non verificato dal produttore)'}.`);
      }
    }
  }
  if (bullet) {
    if (!(bullet.weightGr > 0)) errors.push('Manca il peso della palla.');
    if (!(bullet.diameterMm > 0)) errors.push('Manca il diametro della palla.');
    if (bullet.weightGr > 0 && (bullet.weightGr < 168 || bullet.weightGr > 185)) warnings.push('Peso della palla fuori dall\'intervallo 168-185 gr previsto per questa app.');
    if (!(bullet.lengthMm > 0)) warnings.push('Lunghezza della palla mancante: la deriva da rotazione non è calcolata.');
  }

  const tempC = c.tempC;
  let pressPa = null;
  if (c.pressureMode === 'altitude') {
    if (c.altitudeM != null) { pressPa = stationPressureFromAltitude(c.altitudeM); notes.push('Pressione stimata dalla quota in atmosfera standard: è un\'approssimazione, meglio la pressione di stazione misurata.'); }
  } else pressPa = c.stationPa;
  if (tempC == null) errors.push('Inserisci la temperatura.');
  if (pressPa == null) errors.push(c.pressureMode === 'altitude' ? 'Inserisci la quota.' : 'Inserisci la pressione di stazione.');
  if (c.rangeM == null || !(c.rangeM > 0)) errors.push('Inserisci la distanza del bersaglio.');
  if (c.rhPct == null) notes.push('Umidità non indicata: calcolata a 0 %.');

  if (c.rangeM > MAX_RANGE_M) warnings.push(`Distanza oltre ${MAX_RANGE_M} m: fuori dal campo previsto, risultato non verificato.`);
  if (cart && cart.mvTempC != null && tempC != null && Math.abs(tempC - cart.mvTempC) >= 10) {
    warnings.push(`Velocità misurata a ${num(cart.mvTempC, 0)} °C, oggi ${num(tempC, 0)} °C: la velocità può cambiare con la temperatura e la sensibilità della polvere non è ancora considerata.`);
  }

  let p = null, env = null, zeroEnv = null, shot = null;
  if (!errors.length) {
    p = {
      dragModel: model, bc: bcv, v0Mps: cart.mvMps, massGr: bullet.weightGr, diameterIn: bullet.diameterMm / IN,
      lengthIn: bullet.lengthMm > 0 ? bullet.lengthMm / IN : null,
      twistIn: rifle.twistIn, twistDir: rifle.twistDir === 'L' ? -1 : 1,
      sightHeightM: rifle.sightHeightMm / 1000, zeroDistanceM: rifle.zeroDistM, dt: 0.002,
    };
    if (c.coriolis) {
      if (c.latDeg != null && c.azDeg != null) { p.latitudeDeg = c.latDeg; p.azimuthDeg = c.azDeg; notes.push('Coriolis attivo.'); }
      else warnings.push('Coriolis attivo ma mancano latitudine o direzione di tiro: non applicato.');
    }
    env = { tempC, stationPressurePa: pressPa, rh: (c.rhPct ?? 0) / 100 };
    const z = rifle.zeroEnv || {};
    if (z.tempC != null && z.stationPa != null) zeroEnv = { tempC: z.tempC, stationPressurePa: z.stationPa, rh: (z.rhPct ?? 0) / 100 };
    else notes.push('Condizioni di azzeramento non indicate: nessuna correzione per differenze di atmosfera tra zero e tiro (effetto atteso minimo a 100 m).');
    shot = { rangeM: c.rangeM, angleDeg: c.angleDeg ?? 0, windMps: c.windMps ?? 0, windClock: c.windClock ?? 12 };
  }
  return { ok: errors.length === 0, errors, warnings, notes, p, env, zeroEnv, shot, rifle, cart, bullet };
}

function decorate(r, c, rifle) {
  const opts = { turretMaxMrad: rifle.turretUpMrad > 0 ? rifle.turretUpMrad : 10, reticleMaxMrad: 10, clickMrad: 0.1, mode: c.splitMode };
  const el = splitCorrection(r.elevationMrad, opts);
  const D = r.driftMrad;
  const windDial = c.windInReticle ? 0 : Math.round(D / 0.1) * 0.1; // + = girare a SINISTRA
  r.corr = { dialUp: el.dialMrad, holdDown: el.holdMrad, windDial, holdRight: D - windDial, overflow: el.overflow };
  return r;
}

export function compute() {
  const inp = buildInputs();
  if (!inp.ok) return inp;
  const c = store.settings.calc;
  const prep = prepareZero(inp.p, inp.env, inp.zeroEnv);
  const single = prep.ok ? solveShotPrepared(inp.p, prep, inp.shot) : { ok: false };
  if (!single.ok) { inp.errors.push('Calcolo non riuscito con questi dati (il proiettile non raggiunge il bersaglio?).'); inp.ok = false; return inp; }
  decorate(single, c, inp.rifle);
  const rows = [];
  const step = c.tableStep > 0 ? c.tableStep : 100;
  for (let k = 1; k < 200; k++) {
    const dm = toBase('distance', U('distance'), step * k);
    if (dm > MAX_RANGE_M + 1e-6) break;
    const r = solveShotPrepared(inp.p, prep, { ...inp.shot, rangeM: dm });
    if (r.ok) rows.push(decorate(r, c, inp.rifle));
  }
  return { ...inp, single, rows };
}

const sgn = (x, d = 2) => `${x < -0.005 ? '−' : x > 0.005 ? '+' : ''}${num(Math.abs(x), d)}`;
const dirLabel = (driftRight) => (Math.abs(driftRight) < 0.005 ? '' : driftRight > 0 ? 'SX' : 'DX'); // verso della correzione
const clicks = (m) => Math.round(Math.abs(m) * 10);

function holdTexts(corr) {
  const hd = holdDescription(corr.holdDown, corr.holdRight);
  const v = hd.vertical;
  let vert;
  if (corr.holdDown >= 0) {
    vert = `${num(corr.holdDown, 2)} MRAD sotto il centro` + (v.row >= 1 ? (v.offsetMrad > 0.04 ? ` (riga ${v.row} + ${num(v.offsetMrad, 2)})` : ` (sulla riga ${v.row})`) : '');
  } else vert = `${num(-corr.holdDown, 2)} MRAD sopra il centro`;
  const horiz = Math.abs(corr.holdRight) < 0.005 ? 'nessuna tenuta laterale' : `${num(Math.abs(corr.holdRight), 2)} MRAD a ${corr.holdRight > 0 ? 'destra' : 'sinistra'} del centro`;
  return { vert, horiz };
}

export function resultsHtml(res) {
  const c = store.settings.calc;
  if (!res.ok) {
    return `<section class="card err"><h2>Dati mancanti</h2><ul>${res.errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></section>`;
  }
  const s = res.single;
  const cr = s.corr;
  const ht = holdTexts(cr);
  const { svg, inside } = reticleSvg({ holdDownMrad: cr.holdDown, holdRightMrad: cr.holdRight });
  const dUnit = FAMILIES.distance.units[U('distance')].label;
  const warn = [...res.warnings];
  if (cr.overflow) warn.push('La correzione supera la corsa della torretta più il reticolo: serve una correzione più grande di quella disponibile.');
  if (!inside) warn.push('Il punto è fuori dal reticolo disegnato: gira la torretta di più.');
  const windDialTxt = cr.windDial === 0 ? '—' : `${dirLabel(cr.windDial)} ${num(Math.abs(cr.windDial), 1)} MRAD (${clicks(cr.windDial)} click)`;
  const dialTxt = Math.abs(cr.dialUp) < 0.05 ? '—' : `${cr.dialUp > 0 ? '↑' : '↓'} ${num(Math.abs(cr.dialUp), 1)} MRAD (${clicks(cr.dialUp)} click)`;
  const speedUnit = U('speed');
  const rows = res.rows.map((r) => {
    const rc = r.corr;
    return `<tr class="${rc.overflow ? 'bad' : ''}"><td>${fmt('distance', U('distance'), r.rangeM)}</td><td>${sgn(r.elevationMrad)}</td><td>${Math.abs(rc.dialUp) < 0.05 ? '—' : sgn(rc.dialUp, 1)}</td><td>${num(rc.holdDown, 2)}</td><td>${dirLabel(r.driftMrad)} ${num(Math.abs(r.driftMrad), 2)}</td><td>${num(r.tofS, 2)}</td><td>${fmt('speed', speedUnit, r.velocityMps, 0)}</td></tr>`;
  }).join('');
  return `
<section class="card result">
  <h2>Risultato a ${fmt('distance', U('distance'), s.rangeM)} ${esc(dUnit)}</h2>
  <div class="big">
    <div><span class="k">Alzo</span><b>${sgn(s.elevationMrad)}</b><span class="u">MRAD</span><small>${num(Math.abs(s.elevationMrad) * 10, 0)} click da 0,1</small></div>
    <div><span class="k">Deriva (correzione)</span><b>${dirLabel(s.driftMrad) || '0'} ${Math.abs(s.driftMrad) < 0.005 ? '' : num(Math.abs(s.driftMrad), 2)}</b><span class="u">MRAD</span><small>vento + rotazione${s.spinApplied ? '' : ' (rotazione non calcolata)'}</small></div>
  </div>
  ${warn.length ? `<div class="warn"><ul>${warn.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></div>` : ''}
  <div class="split">
    <div class="box"><h3>Sulla torretta</h3><p>Elevazione: <b>${dialTxt}</b></p><p>Deriva: <b>${windDialTxt}</b></p></div>
    <div class="box"><h3>Nel reticolo</h3><p><b>${esc(ht.vert)}</b></p><p><b>${esc(ht.horiz)}</b></p></div>
  </div>
  <figure class="ret">${svg}<figcaption><b>Punto rosso = dove va messo il bersaglio nel reticolo.</b> Il proiettile arriverà in quel punto rispetto al centro della croce. Riga N = N MRAD sotto il centro. Reticolo ricostruito dall'immagine Vortex: verificalo con l'ottica.</figcaption></figure>
  <dl class="facts">
    <div><dt>Tempo di volo</dt><dd>${num(s.tofS, 3)} s</dd></div>
    <div><dt>Velocità al bersaglio</dt><dd>${fmt('speed', speedUnit, s.velocityMps, 0)} ${esc(FAMILIES.speed.units[speedUnit].label)} (Mach ${num(s.mach, 2)})</dd></div>
    <div><dt>Energia</dt><dd>${num(s.energyJ, 0)} J</dd></div>
    <div><dt>Densità dell'aria</dt><dd>${num(s.airDensity, 3)} kg/m³</dd></div>
    <div><dt>Velocità del suono</dt><dd>${num(s.speedOfSound, 1)} m/s</dd></div>
    ${s.spinApplied ? `<div><dt>Stabilità giroscopica (Miller)</dt><dd>${num(s.sg, 2)}</dd></div>` : ''}
    <div><dt>Deriva dal vento / dalla rotazione</dt><dd>${num(Math.abs(s.windMrad), 2)} / ${num(Math.abs(s.spinDriftMrad), 2)} MRAD</dd></div>
  </dl>
  ${res.notes.length ? `<ul class="notes">${res.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
</section>
<section class="card">
  <h2>Tabella fino a ${MAX_RANGE_M} m</h2>
  <p class="sub">Con le condizioni e il vento impostati. Alzo = correzione verso l'alto; "Torretta" = quanto girare; "Reticolo" = MRAD sotto il centro dove tenere. Deriva: SX/DX = verso in cui girare la torretta; il proiettile devia dal lato opposto, quindi nel reticolo il bersaglio va messo da quel lato opposto.</p>
  <div class="scroll"><table><thead><tr><th>Dist. (${esc(dUnit)})</th><th>Alzo</th><th>Torretta</th><th>Reticolo</th><th>Deriva</th><th>TOF s</th><th>Vel.</th></tr></thead><tbody>${rows}</tbody></table></div>
</section>`;
}

// Riepilogo compatto, sempre visibile in alto nella scheda Calcola.
export function summaryHtml(res) {
  if (!res.ok) return '<div class="sum"><span class="sd">Inserisci i dati mancanti</span></div>';
  const s = res.single, cr = s.corr;
  const dTxt = Math.abs(s.driftMrad) < 0.005 ? '0' : `${dirLabel(s.driftMrad)} ${num(Math.abs(s.driftMrad), 2)}`;
  const tTxt = Math.abs(cr.dialUp) < 0.05 ? '—' : `${cr.dialUp > 0 ? '↑' : '↓'} ${num(Math.abs(cr.dialUp), 1)}`;
  return `<div class="sum${cr.overflow ? ' bad' : ''}"><div><i>${fmt('distance', U('distance'), s.rangeM)} ${esc(FAMILIES.distance.units[U('distance')].label)}</i><b>Alzo ${sgn(s.elevationMrad)}</b></div><div><i>MRAD</i><b>Deriva ${dTxt}</b></div><div><i>Torretta</i><b>${tTxt}</b></div></div>`;
}
