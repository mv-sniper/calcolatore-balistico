// Interfaccia dell'app: schermate, form ed eventi.
import { store, ui, persist, U, replaceStore, allBullets, bulletById, getPath, setPath, clone, createStarterProfile, newRifle, newBullet, newCartridge, APP_VERSION, MAX_RANGE_M } from './state.js';
import { FAMILIES, toBase, parseNum, fmt, num } from './units.js';
import { esc, numField, textField, selectField, checkField } from './fields.js';
import { compute, resultsHtml, summaryHtml } from './calc.js';
import { parseShotViewCsv, shotStats, flagOutliers } from './csv_garmin.js';
import { upsert, remove, exportBackup, importBackup, emptyStore, uid } from './store.js';
import { SEED_BULLETS, SUGGEST } from './db_seed.js';

const $ = (sel, root = document) => root.querySelector(sel);
const TABS = [['calc', 'Calcola'], ['rifles', 'Carabine'], ['cartridges', 'Cartucce'], ['bullets', 'Palle'], ['more', 'Altro']];

// ---------- viste ----------
function emptyState() {
  return `<h1>Calcola</h1><section class="card"><h2>Per iniziare</h2>
  <p>Servono una carabina e una cartuccia (con palla e velocità iniziale).</p>
  <div class="btnrow"><button class="primary" data-act="starter">Crea il profilo di partenza</button></div>
  <p class="sub">Il profilo di partenza contiene la tua Remington 700 .308 Win (22", 1:10" destrorsa, ottica a 62,4 mm, base 20 MOA) e la Sierra TMK 175 gr con la velocità della sessione Garmin del 25/09/2026 (58 colpi, esclusi 5, 7 e 9). Puoi modificarlo.</p>
  <div class="btnrow"><button data-act="new" data-kind="rifle">Nuova carabina</button><button data-act="new" data-kind="cartridge">Nuova cartuccia</button></div></section>`;
}

function viewCalc() {
  const c = store.settings.calc;
  if (!store.rifles.length || !store.cartridges.length) return emptyState();
  const clockOpts = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => [h, h === 12 ? 'ore 12 (frontale)' : h === 3 ? 'ore 3 (da destra)' : h === 6 ? 'ore 6 (alle spalle)' : h === 9 ? 'ore 9 (da sinistra)' : `ore ${h}`]);
  const stepOpts = [25, 50, 100].map((v) => [v, `${v} ${FAMILIES.distance.units[U('distance')].label}`]);
  const pressureField = c.pressureMode === 'altitude'
    ? numField({ scope: 'calc', path: 'altitudeM', label: 'Quota (m)', value: c.altitudeM, hint: 'Stima in atmosfera standard: meno precisa della pressione misurata.' })
    : numField({ scope: 'calc', path: 'stationPa', label: 'Pressione di stazione', fam: 'pressure', value: c.stationPa, hint: 'Pressione assoluta misurata sul posto (non quella ridotta al livello del mare dei siti meteo).' });
  return `<h1>Calcola</h1>
<div id="summary"></div>
<section class="card">
  ${selectField({ scope: 'calc', path: 'rifleId', label: 'Carabina', value: c.rifleId, options: store.rifles.map((r) => [r.id, r.name || '(senza nome)']) })}
  ${selectField({ scope: 'calc', path: 'cartridgeId', label: 'Cartuccia', value: c.cartridgeId, options: store.cartridges.map((x) => [x.id, x.name || '(senza nome)']) })}
</section>
<section class="card"><h2>Condizioni ambientali</h2>
  <div class="grid2">
    ${numField({ scope: 'calc', path: 'tempC', label: 'Temperatura', fam: 'temperature', value: c.tempC })}
    ${numField({ scope: 'calc', path: 'rhPct', label: 'Umidità relativa (%)', value: c.rhPct, hint: 'Se vuota: 0 %.' })}
  </div>
  ${selectField({ scope: 'calc', path: 'pressureMode', label: 'Pressione da', value: c.pressureMode, options: [['station', 'Pressione di stazione (misurata)'], ['altitude', 'Quota (stima)']] })}
  ${pressureField}
</section>
<section class="card"><h2>Bersaglio e vento</h2>
  <div class="grid2">
    ${numField({ scope: 'calc', path: 'rangeM', label: 'Distanza', fam: 'distance', value: c.rangeM })}
    ${numField({ scope: 'calc', path: 'angleDeg', label: 'Angolo di tiro (°)', value: c.angleDeg, hint: '+ in salita, − in discesa. Vuoto = 0.' })}
    ${numField({ scope: 'calc', path: 'windMps', label: 'Velocità del vento', fam: 'wind', value: c.windMps })}
    ${selectField({ scope: 'calc', path: 'windClock', label: 'Direzione del vento', value: c.windClock, options: clockOpts, kind: 'selnum' })}
  </div>
</section>
<details class="card"><summary>Coriolis e visualizzazione</summary>
  ${checkField({ scope: 'calc', path: 'coriolis', label: 'Applica Coriolis / Eötvös', value: c.coriolis, hint: 'Rilevante soprattutto oltre 800-1000 m.' })}
  ${c.coriolis ? `<div class="grid2">${numField({ scope: 'calc', path: 'latDeg', label: 'Latitudine (°, nord +)', value: c.latDeg })}${numField({ scope: 'calc', path: 'azDeg', label: 'Direzione di tiro (° da nord, orario)', value: c.azDeg })}</div>` : ''}
  ${selectField({ scope: 'calc', path: 'tableStep', label: 'Passo della tabella', value: c.tableStep, options: stepOpts, kind: 'selnum' })}
  ${selectField({ scope: 'calc', path: 'splitMode', label: 'Dove mettere l\'alzo', value: c.splitMode, options: [['reticle-first', 'Prima nel reticolo, torretta solo per l\'eccedenza'], ['turret-first', 'Prima in torretta, il resto nel reticolo']] })}
  ${checkField({ scope: 'calc', path: 'windInReticle', label: 'Deriva solo nel reticolo', value: c.windInReticle, hint: 'Se disattivato, la deriva viene girata in torretta e nel reticolo resta il residuo.' })}
</details>
<div id="results"></div>`;
}

function listCard(title, lines, id, kind, extra = '') {
  return `<article class="card item"><div><h3>${esc(title)}</h3>${lines.map((l) => `<p>${esc(l)}</p>`).join('')}${extra}</div>
  <div class="btnrow"><button data-act="edit" data-kind="${kind}" data-id="${esc(id)}">Modifica</button><button data-act="dup" data-kind="${kind}" data-id="${esc(id)}">Duplica</button><button class="danger" data-act="del" data-kind="${kind}" data-id="${esc(id)}">Elimina</button></div></article>`;
}

function viewRifles() {
  const items = store.rifles.map((r) => listCard(r.name || '(senza nome)', [
    `${r.make || ''}`.trim(),
    `Canna ${fmt('length', U('length'), r.barrelLenMm) || '?'} ${FAMILIES.length.units[U('length')].label} · rigatura 1:${r.twistIn ?? '?'}" ${r.twistDir === 'L' ? 'sinistra' : 'destra'}${r.grooves ? ` · ${r.grooves} righe` : ''}`,
    `Ottica a ${fmt('length', U('length'), r.sightHeightMm) || '?'} ${FAMILIES.length.units[U('length')].label} · zero ${fmt('distance', U('distance'), r.zeroDistM)} ${FAMILIES.distance.units[U('distance')].label} · torretta ${num(r.turretUpMrad, 1)} MRAD sopra lo zero`,
    r.mount || '',
  ].filter(Boolean), r.id, 'rifle')).join('');
  return `<h1>Carabine</h1>${items || '<p class="sub">Nessuna carabina.</p>'}<div class="btnrow"><button class="primary" data-act="new" data-kind="rifle">Nuova carabina</button></div>`;
}

function viewCartridges() {
  const items = store.cartridges.map((x) => {
    const b = bulletById(x.bulletId);
    const lines = [b ? `${b.brand} ${b.name}` : 'Palla non associata'];
    if (x.kind === 'handload') lines.push([x.powder, x.chargeGr ? `${num(x.chargeGr, 1)} gr` : '', x.caseBrand, x.primer].filter(Boolean).join(' · ') || 'Ricarica');
    else lines.push(`Munizione commerciale${x.brand ? ` ${x.brand}` : ''}`);
    lines.push(x.mvMps ? `${fmt('speed', U('speed'), x.mvMps, 1)} ${FAMILIES.speed.units[U('speed')].label}${x.mvSdMps != null ? ` · SD ${num(x.mvSdMps, 1)} m/s` : ''}${x.mvN ? ` · ${x.mvN} colpi` : ''}${x.mvSource === 'garmin' ? ' · Garmin' : ''}` : 'Velocità iniziale mancante');
    return listCard(x.name || '(senza nome)', lines, x.id, 'cartridge');
  }).join('');
  return `<h1>Cartucce</h1>${items || '<p class="sub">Nessuna cartuccia.</p>'}<div class="btnrow"><button class="primary" data-act="new" data-kind="cartridge">Nuova cartuccia</button></div>`;
}

function viewBullets() {
  const items = allBullets().map((b) => {
    const bc = (b.bcs || []).filter((x) => x.value > 0).map((x) => `${x.model} ${num(x.value, 3)}`).join(' · ') || 'BC mancante';
    const badge = b.seed ? `<span class="pill">Archivio${b.verified ? '' : ' · non verificato'}</span>` : '<span class="pill alt">Tua</span>';
    const card = `<article class="card item"><div><h3>${esc(`${b.brand} ${b.name}`)} ${badge}</h3><p>${fmt('mass', U('mass'), b.weightGr) || num(b.weightGr, 1)} ${FAMILIES.mass.units[U('mass')].label} · ${esc(bc)}${b.lengthMm ? ` · lunghezza ${fmt('length', U('length'), b.lengthMm)} ${FAMILIES.length.units[U('length')].label}` : ''}</p>${b.notes ? `<p class="sub">${esc(b.notes)}</p>` : ''}${(b.sources || []).map((s) => `<p class="sub">Fonte: ${esc(s)}</p>`).join('')}</div>
    <div class="btnrow">${b.seed ? `<button data-act="dup" data-kind="bullet" data-id="${esc(b.id)}">Copia per modificare</button>` : `<button data-act="edit" data-kind="bullet" data-id="${esc(b.id)}">Modifica</button><button data-act="dup" data-kind="bullet" data-id="${esc(b.id)}">Duplica</button><button class="danger" data-act="del" data-kind="bullet" data-id="${esc(b.id)}">Elimina</button>`}</div></article>`;
    return card;
  }).join('');
  return `<h1>Palle</h1><p class="sub">L'archivio incorporato contiene per ora ${SEED_BULLETS.length} palla con la fonte dei dati. Le altre le aggiungi tu o arrivano con gli aggiornamenti.</p>${items}<div class="btnrow"><button class="primary" data-act="new" data-kind="bullet">Nuova palla</button></div>`;
}

function viewMore() {
  const unitRows = Object.entries(FAMILIES).map(([fam, f]) => `<label class="fld"><span>${esc(f.label)}</span><select data-unit="${fam}">${Object.entries(f.units).map(([k, u]) => `<option value="${k}"${k === U(fam) ? ' selected' : ''}>${esc(u.label)}</option>`).join('')}</select></label>`).join('');
  return `<h1>Altro</h1>
<section class="card"><h2>Unità di misura</h2><div class="grid2">${unitRows}</div><p class="sub">I dati sono salvati in unità base; cambiare unità non altera i valori.</p></section>
<section class="card"><h2>Backup dei dati</h2>
  <p class="sub">Carabine, cartucce e palle sono salvate solo su questo dispositivo. Il sistema può cancellarle in certi casi: esporta un backup ogni tanto.</p>
  <div class="btnrow"><button data-act="backup-dl">Scarica il backup</button><button data-act="backup-copy">Copia il backup</button></div>
  <label class="fld"><span>Ripristina da un backup (sostituisce i dati attuali)</span><input type="file" accept=".json,application/json" data-act="backup-file"></label>
  <div class="btnrow"><button class="danger" data-act="reset">Cancella tutti i dati</button></div>
</section>
<section class="card"><h2>Informazioni</h2>
  <p>Versione ${APP_VERSION}. Calcolatore balistico a massa puntiforme per .308 Win, 168-185 gr, funzionante offline. Distanze fino a ${MAX_RANGE_M} m.</p>
  <ul class="notes">
    <li>Il calcolo è un modello: conferma sempre con tiri reali e correggi il BC o la velocità sui dati di campo.</li>
    <li>Non ancora considerata: sensibilità della polvere alla temperatura. La velocità iniziale è quella che inserisci.</li>
    <li>Il reticolo è ricostruito da un'immagine Vortex: il punto rosso è esatto in MRAD, il disegno è schematico.</li>
    <li>Collegamento Bluetooth con Kestrel e Garmin: non disponibile. Importa il CSV di ShotView; temperatura, pressione e vento si inseriscono a mano.</li>
    <li>I dati delle palle nell'archivio riportano la fonte; quelli "non verificati" non vengono dal produttore.</li>
  </ul>
</section>`;
}

// ---------- form ----------
function viewForm() {
  const f = ui.form, d = f.draft;
  const title = { rifle: 'Carabina', bullet: 'Palla', cartridge: 'Cartuccia' }[f.kind];
  const err = f.errors?.length ? `<section class="card err"><ul>${f.errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></section>` : '';
  let body = '';
  if (f.kind === 'rifle') body = rifleForm(d);
  else if (f.kind === 'bullet') body = bulletForm(d);
  else body = cartridgeForm(d);
  return `<h1>${f.isNew ? 'Nuova' : 'Modifica'} ${title.toLowerCase()}</h1>${err}${body}<div class="btnrow sticky"><button class="primary" data-act="save">Salva</button><button data-act="cancel">Annulla</button></div>`;
}

function rifleForm(d) {
  const S = 'draft';
  return `<section class="card">
  ${textField({ scope: S, path: 'name', label: 'Nome', value: d.name, ph: 'es. Remington 700 Magpul' })}
  ${textField({ scope: S, path: 'make', label: 'Marca / modello', value: d.make })}
  <p class="sub">Calibro: .308 Win (fisso).</p>
  <div class="grid2">
    ${numField({ scope: S, path: 'barrelLenMm', label: 'Lunghezza canna', fam: 'length', value: d.barrelLenMm })}
    ${numField({ scope: S, path: 'grooves', label: 'Numero di righe', value: d.grooves, dec: 0 })}
    ${numField({ scope: S, path: 'twistIn', label: 'Passo di rigatura 1: (pollici)', value: d.twistIn })}
    ${selectField({ scope: S, path: 'twistDir', label: 'Senso della rigatura', value: d.twistDir, options: [['R', 'Destrorsa'], ['L', 'Sinistrorsa']] })}
    ${numField({ scope: S, path: 'sightHeightMm', label: 'Altezza ottica (asse canna - asse ottica)', fam: 'length', value: d.sightHeightMm })}
    ${numField({ scope: S, path: 'zeroDistM', label: 'Distanza di azzeramento', fam: 'distance', value: d.zeroDistM })}
    ${numField({ scope: S, path: 'turretUpMrad', label: 'Corsa della torretta sopra lo zero (MRAD)', value: d.turretUpMrad })}
  </div>
  ${textField({ scope: S, path: 'mount', label: 'Base / anelli', value: d.mount, ph: 'es. Base inclinata 20 MOA' })}
  <p class="sub">La base inclinata non cambia il calcolo: conta l'altezza dell'ottica e lo zero.</p>
</section>
<section class="card"><h2>Condizioni dell'azzeramento (facoltative)</h2>
  <p class="sub">Se non le ricordi lascia vuoto: l'app non applicherà correzioni per le differenze di atmosfera tra zero e tiro.</p>
  <div class="grid2">
    ${numField({ scope: S, path: 'zeroEnv.tempC', label: 'Temperatura', fam: 'temperature', value: d.zeroEnv?.tempC })}
    ${numField({ scope: S, path: 'zeroEnv.stationPa', label: 'Pressione di stazione', fam: 'pressure', value: d.zeroEnv?.stationPa })}
    ${numField({ scope: S, path: 'zeroEnv.rhPct', label: 'Umidità (%)', value: d.zeroEnv?.rhPct })}
  </div>
  ${textField({ scope: S, path: 'notes', label: 'Note', value: d.notes })}
</section>`;
}

function bulletForm(d) {
  const S = 'draft';
  return `<section class="card">
  <div class="grid2">${textField({ scope: S, path: 'brand', label: 'Marca', value: d.brand, ph: 'es. Sierra' })}${textField({ scope: S, path: 'name', label: 'Modello', value: d.name, ph: 'es. MatchKing HPBT 175 gr' })}</div>
  <div class="grid2">
    ${numField({ scope: S, path: 'weightGr', label: 'Peso', fam: 'mass', value: d.weightGr })}
    ${numField({ scope: S, path: 'diameterMm', label: 'Diametro', fam: 'length', value: d.diameterMm })}
    ${numField({ scope: S, path: 'lengthMm', label: 'Lunghezza della palla', fam: 'length', value: d.lengthMm, hint: 'Serve per la deriva da rotazione.' })}
  </div>
  <p class="sub">Peso previsto: 168-185 gr (avviso, non blocco).</p>
</section>
<section class="card"><h2>Coefficiente balistico (BC)</h2>
  <div class="grid2">
    ${selectField({ scope: S, path: 'bcs.0.model', label: 'Modello 1', value: d.bcs?.[0]?.model, options: [['G7', 'G7'], ['G1', 'G1']] })}${numField({ scope: S, path: 'bcs.0.value', label: 'BC 1', value: d.bcs?.[0]?.value, dec: 4 })}
    ${selectField({ scope: S, path: 'bcs.1.model', label: 'Modello 2 (facoltativo)', value: d.bcs?.[1]?.model, options: [['G1', 'G1'], ['G7', 'G7']] })}${numField({ scope: S, path: 'bcs.1.value', label: 'BC 2', value: d.bcs?.[1]?.value, dec: 4 })}
  </div>
  <p class="sub">Il calcolo usa il G7 se presente. Il G7 è più adatto alle palle lunghe e affusolate.</p>
  ${textField({ scope: S, path: 'sourceText', label: 'Fonte dei dati (sito, scheda, misura)', value: d.sourceText ?? (d.sources || []).join(' ; ') })}
  ${textField({ scope: S, path: 'notes', label: 'Note', value: d.notes })}
</section>`;
}

function csvPanelInner() {
  const c = ui.form.csv;
  const u = FAMILIES.speed.units[U('speed')].label;
  const rows = c.shots.map((s, i) => `<label class="shot${c.flags[i] ? ' flag' : ''}"><input type="checkbox" data-act="csv-toggle" data-i="${i}"${c.include[i] ? ' checked' : ''}> #${s.n} · ${fmt('speed', U('speed'), s.v)} ${esc(u)}${c.flags[i] ? ' <em>lontano dalla mediana</em>' : ''}</label>`).join('');
  return `<h3>Sessione Garmin</h3><p>${esc(c.title)} · ${esc(c.date)} · ${c.shots.length} colpi${c.summary.bulletWeightGr ? ` · peso nel file: ${num(c.summary.bulletWeightGr, 1)} gr` : ''}</p>
  <p class="stats" id="csvStats">${csvStats()}</p>
  <div class="btnrow"><button data-act="csv-clean">Escludi i colpi anomali</button><button data-act="csv-all">Includi tutti</button></div>
  <div class="shots">${rows}</div>
  <div class="btnrow"><button class="primary" data-act="csv-apply">Usa questi colpi</button><button data-act="csv-cancel">Annulla</button></div>`;
}
function csvStats() {
  const c = ui.form.csv;
  const st = shotStats(c.shots.filter((_, i) => c.include[i]).map((s) => s.v));
  if (!st) return 'Nessun colpo selezionato.';
  const u = FAMILIES.speed.units[U('speed')].label;
  return `Usati ${st.n} su ${c.shots.length} · media ${fmt('speed', U('speed'), st.mean, 1)} ${esc(u)} · SD ${num(st.sd, 1)} m/s · ES ${num(st.es, 1)} m/s`;
}

function cartridgeForm(d) {
  const S = 'draft';
  const bOpts = [['', '— scegli la palla —'], ...allBullets().map((b) => [b.id, `${b.brand} ${b.name}`])];
  const isHL = d.kind === 'handload';
  const csv = ui.form.csv ? `<section class="card" id="csvPanel">${csvPanelInner()}</section>` : '';
  const chrono = d.chrono ? `<p class="sub">Sessione importata: ${esc(d.chrono.date || '')}, ${d.chrono.shots.length - d.chrono.excluded.length} colpi usati su ${d.chrono.shots.length}.</p>` : '';
  return `<section class="card">
  ${selectField({ scope: S, path: 'kind', label: 'Tipo', value: d.kind, options: [['handload', 'Ricarica'], ['factory', 'Munizione commerciale']] })}
  ${textField({ scope: S, path: 'name', label: 'Nome', value: d.name, ph: 'es. TMK 175 + N140' })}
  ${selectField({ scope: S, path: 'bulletId', label: 'Palla', value: d.bulletId, options: bOpts })}
  ${isHL ? `<div class="grid2">
    ${textField({ scope: S, path: 'caseBrand', label: 'Bossolo', value: d.caseBrand, list: SUGGEST.cases })}
    ${textField({ scope: S, path: 'primer', label: 'Innesco', value: d.primer, list: SUGGEST.primers })}
    ${textField({ scope: S, path: 'powder', label: 'Polvere', value: d.powder, list: SUGGEST.powders })}
    ${numField({ scope: S, path: 'chargeGr', label: 'Carica', fam: 'mass', value: d.chargeGr })}
    ${numField({ scope: S, path: 'coalMm', label: 'Lunghezza totale (OAL)', fam: 'length', value: d.coalMm })}
    ${textField({ scope: S, path: 'lot', label: 'Lotto / note di carica', value: d.lot })}
  </div><p class="sub">Polvere, bossolo e innesco sono solo registrazione: nel calcolo conta la velocità misurata. L'app non suggerisce cariche: usa i manuali dei produttori.</p>` : `${textField({ scope: S, path: 'brand', label: 'Marca e linea', value: d.brand, ph: 'es. Federal Gold Medal Match' })}${textField({ scope: S, path: 'lot', label: 'Lotto', value: d.lot })}`}
</section>
<section class="card"><h2>Velocità iniziale</h2>
  <div class="grid2">
    ${numField({ scope: S, path: 'mvMps', label: 'Velocità media', fam: 'speed', value: d.mvMps })}
    ${numField({ scope: S, path: 'mvSdMps', label: 'Deviazione standard', fam: 'speed', value: d.mvSdMps })}
    ${numField({ scope: S, path: 'mvEsMps', label: 'Dispersione estrema (ES)', fam: 'speed', value: d.mvEsMps })}
    ${numField({ scope: S, path: 'mvN', label: 'Numero di colpi', value: d.mvN, dec: 0 })}
    ${numField({ scope: S, path: 'mvTempC', label: 'Temperatura alla misura', fam: 'temperature', value: d.mvTempC })}
    ${numField({ scope: S, path: 'chronoDistMm', label: 'Distanza volata-cronografo', fam: 'length', value: d.chronoDistMm })}
  </div>
  ${selectField({ scope: S, path: 'mvSource', label: 'Origine del dato', value: d.mvSource, options: [['manual', 'Misurata (inserita a mano)'], ['garmin', 'Cronografo Garmin (CSV)'], ['declared', 'Dichiarata dal produttore (canna di prova)']] })}
  ${d.mvSource === 'declared' ? '<p class="warn">La velocità dichiarata è misurata su una canna di prova: nella tua carabina sarà diversa. Meglio misurarla.</p>' : ''}
  ${chrono}
  <label class="fld"><span>Importa da Garmin ShotView (file CSV)</span><input type="file" accept=".csv,text/csv,text/plain" data-act="csv-file"></label>
</section>
${csv}
<section class="card"><h2>BC personalizzato (facoltativo)</h2>
  <p class="sub">Per tarare il calcolo sui tiri reali: se compilato sostituisce il BC della palla.</p>
  <div class="grid2">${selectField({ scope: S, path: 'bcOverride.model', label: 'Modello', value: d.bcOverride?.model, options: [['G7', 'G7'], ['G1', 'G1']] })}${numField({ scope: S, path: 'bcOverride.value', label: 'BC', value: d.bcOverride?.value, dec: 4 })}</div>
  ${textField({ scope: S, path: 'notes', label: 'Note', value: d.notes })}
</section>`;
}

// ---------- rendering ----------
function nav() {
  return `<nav>${TABS.map(([k, l]) => `<button data-act="tab" data-tab="${k}"${!ui.form && ui.tab === k ? ' class="on"' : ''}>${l}</button>`).join('')}</nav>`;
}

export function render() {
  const views = { calc: viewCalc, rifles: viewRifles, cartridges: viewCartridges, bullets: viewBullets, more: viewMore };
  const html = ui.form ? viewForm() : views[ui.tab]();
  $('#app').innerHTML = `<main>${html}</main>${nav()}`;
  if (!ui.form && ui.tab === 'calc') updateResults();
}

export function updateResults() {
  const box = $('#results');
  if (!box) return;
  const sum = $('#summary');
  try {
    const res = compute();
    box.innerHTML = resultsHtml(res);
    if (sum) sum.innerHTML = summaryHtml(res);
  } catch (e) {
    box.innerHTML = `<section class="card err"><p>Errore nel calcolo: ${esc(e.message)}</p></section>`;
    if (sum) sum.innerHTML = '';
  }
}

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

// ---------- eventi ----------
function applyBinding(el) {
  const scope = el.dataset.scope, path = el.dataset.path, kind = el.dataset.kind;
  const root = scope === 'calc' ? store.settings.calc : ui.form?.draft;
  if (!root) return;
  let v;
  if (kind === 'bool') v = el.checked;
  else if (kind === 'num') {
    const raw = parseNum(el.value);
    v = raw == null ? null : el.dataset.fam ? toBase(el.dataset.fam, U(el.dataset.fam), raw) : raw;
  } else if (kind === 'selnum') v = Number(el.value);
  else v = el.value;
  setPath(root, path, v);
  if (scope === 'calc') persist();
}

function onInput(e) {
  const el = e.target;
  if (!el.dataset || !el.dataset.path) return;
  if (el.tagName === 'SELECT' || el.type === 'checkbox') return;
  applyBinding(el);
  if (el.dataset.scope === 'calc') updateResults();
}

async function onChange(e) {
  const el = e.target;
  if (!el.dataset) return;
  if (el.dataset.unit) { store.settings.units[el.dataset.unit] = el.value; persist(); render(); return; }
  if (el.dataset.act === 'csv-toggle') { ui.form.csv.include[Number(el.dataset.i)] = el.checked; $('#csvStats').textContent = csvStats(); return; }
  if (el.dataset.act === 'csv-file' && el.files && el.files[0]) { await loadCsv(el.files[0]); return; }
  if (el.dataset.act === 'backup-file' && el.files && el.files[0]) { await restoreBackup(el.files[0]); return; }
  if (el.dataset.path && (el.tagName === 'SELECT' || el.type === 'checkbox')) {
    applyBinding(el);
    const p = el.dataset.path;
    if (el.dataset.scope === 'calc') {
      if (p === 'pressureMode' || p === 'coriolis') render(); else updateResults();
    } else if (['kind', 'mvSource'].includes(p)) render();
  }
}

async function loadCsv(file) {
  const text = await file.text();
  const parsed = parseShotViewCsv(text);
  if (!parsed.ok) { toast(parsed.error); return; }
  const vs = parsed.shots.map((s) => s.v);
  const { flags } = flagOutliers(vs);
  ui.form.csv = { ...parsed, flags, include: flags.map((x) => !x), fileName: file.name };
  render();
  const panel = $('#csvPanel');
  if (panel && panel.scrollIntoView) panel.scrollIntoView({ block: 'start' });
}

async function restoreBackup(file) {
  const r = importBackup(await file.text());
  if (!r.ok) { toast(r.error); return; }
  if (!confirm('Sostituire tutti i dati attuali con quelli del backup?')) return;
  replaceStore(r.store); persist(); ui.tab = 'calc'; render(); toast('Backup ripristinato.');
}

function listFor(kind) { return kind === 'rifle' ? store.rifles : kind === 'bullet' ? store.bullets : store.cartridges; }
function tabFor(kind) { return kind === 'rifle' ? 'rifles' : kind === 'bullet' ? 'bullets' : 'cartridges'; }

function openForm(kind, id, duplicate = false) {
  let draft, isNew = true;
  const src = id ? (kind === 'bullet' ? allBullets().find((x) => x.id === id) : listFor(kind).find((x) => x.id === id)) : null;
  if (src) {
    draft = clone(src);
    if (duplicate || src.seed) { draft.id = uid(kind); draft.name = `${draft.name} (copia)`; delete draft.seed; draft.verified = false; }
    else isNew = false;
  } else draft = kind === 'rifle' ? newRifle() : kind === 'bullet' ? newBullet() : newCartridge();
  if (kind === 'bullet') {
    while ((draft.bcs || []).length < 2) (draft.bcs ||= []).push({ model: draft.bcs[0]?.model === 'G7' ? 'G1' : 'G7', value: null, note: '' });
  }
  ui.tab = tabFor(kind);
  ui.form = { kind, draft, isNew, csv: null, errors: [] };
  render();
  window.scrollTo && window.scrollTo(0, 0);
}

function validate(kind, d) {
  const e = [];
  if (kind === 'rifle') {
    if (!d.name?.trim()) e.push('Inserisci un nome.');
    if (!(d.sightHeightMm > 0)) e.push('Inserisci l\'altezza dell\'ottica.');
    if (!(d.twistIn > 0)) e.push('Inserisci il passo di rigatura.');
    if (!(d.zeroDistM > 0)) e.push('Inserisci la distanza di azzeramento.');
  } else if (kind === 'bullet') {
    if (!d.name?.trim()) e.push('Inserisci il modello della palla.');
    if (!(d.weightGr > 0)) e.push('Inserisci il peso.');
    if (!(d.diameterMm > 0)) e.push('Inserisci il diametro.');
    if (!(d.bcs || []).some((b) => b.value > 0)) e.push('Inserisci almeno un BC.');
  } else {
    if (!d.bulletId) e.push('Scegli la palla.');
  }
  return e;
}

function saveForm() {
  const { kind, draft: d } = ui.form;
  const errors = validate(kind, d);
  if (errors.length) { ui.form.errors = errors; render(); window.scrollTo && window.scrollTo(0, 0); return; }
  if (kind === 'bullet') {
    d.bcs = d.bcs.filter((b) => b.value > 0);
    if (d.sourceText !== undefined) {
      const s = d.sourceText.trim();
      d.sources = s ? s.split(/\s*;\s*/) : [];
    }
    delete d.sourceText;
    d.verified = false;
  }
  if (kind === 'cartridge' && !d.name?.trim()) {
    const b = bulletById(d.bulletId);
    d.name = `${b ? `${b.brand} ${b.name}` : 'Cartuccia'}${d.powder ? ` + ${d.powder}` : ''}`;
  }
  upsert(listFor(kind), d);
  if (kind === 'rifle' && !store.settings.calc.rifleId) store.settings.calc.rifleId = d.id;
  if (kind === 'cartridge' && !store.settings.calc.cartridgeId) store.settings.calc.cartridgeId = d.id;
  persist();
  ui.form = null; render(); toast('Salvato.');
}

function onClick(e) {
  const el = e.target.closest('[data-act]');
  if (!el || el.tagName === 'INPUT') return;
  const act = el.dataset.act;
  if (act === 'tab') { ui.form = null; ui.tab = el.dataset.tab; render(); window.scrollTo && window.scrollTo(0, 0); }
  else if (act === 'starter') { createStarterProfile(); render(); }
  else if (act === 'new') openForm(el.dataset.kind);
  else if (act === 'edit') openForm(el.dataset.kind, el.dataset.id);
  else if (act === 'dup') openForm(el.dataset.kind, el.dataset.id, true);
  else if (act === 'del') {
    if (!confirm('Eliminare questa voce?')) return;
    const kind = el.dataset.kind;
    remove(listFor(kind), el.dataset.id);
    const c = store.settings.calc;
    if (c.rifleId === el.dataset.id) c.rifleId = store.rifles[0]?.id ?? null;
    if (c.cartridgeId === el.dataset.id) c.cartridgeId = store.cartridges[0]?.id ?? null;
    persist(); render();
  }
  else if (act === 'save') saveForm();
  else if (act === 'cancel') { ui.form = null; render(); }
  else if (act === 'csv-clean') { const c = ui.form.csv; c.include = c.flags.map((x) => !x); $('#csvPanel').innerHTML = csvPanelInner(); }
  else if (act === 'csv-all') { const c = ui.form.csv; c.include = c.flags.map(() => true); $('#csvPanel').innerHTML = csvPanelInner(); }
  else if (act === 'csv-cancel') { ui.form.csv = null; render(); }
  else if (act === 'csv-apply') applyCsv();
  else if (act === 'backup-dl') downloadBackup();
  else if (act === 'backup-copy') copyBackup();
  else if (act === 'reset') { if (confirm('Cancellare TUTTI i dati (carabine, cartucce, palle, impostazioni)?')) { replaceStore(emptyStore()); persist(); ui.tab = 'calc'; render(); } }
}

function applyCsv() {
  const c = ui.form.csv, d = ui.form.draft;
  const used = c.shots.filter((_, i) => c.include[i]).map((s) => s.v);
  const st = shotStats(used);
  if (!st) { toast('Seleziona almeno un colpo.'); return; }
  d.mvMps = st.mean; d.mvSdMps = st.sd; d.mvEsMps = st.es; d.mvN = st.n; d.mvSource = 'garmin';
  d.chrono = { file: c.fileName, date: c.date, unit: c.unit, shots: c.shots.map((s) => s.v), excluded: c.include.map((inc, i) => (inc ? null : i)).filter((x) => x != null), bulletWeightGr: c.summary.bulletWeightGr ?? null };
  ui.form.csv = null; render(); toast(`Importati ${st.n} colpi.`);
}

function backupName() { return `calcolatore-balistico-backup-${new Date().toISOString().slice(0, 10)}.json`; }
function downloadBackup() {
  const blob = new Blob([exportBackup(store)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = backupName(); document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
async function copyBackup() {
  try { await navigator.clipboard.writeText(exportBackup(store)); toast('Backup copiato negli appunti.'); }
  catch (e) { toast('Copia non riuscita: usa "Scarica il backup".'); }
}

export function init() {
  const root = $('#app');
  root.addEventListener('input', onInput);
  root.addEventListener('change', onChange);
  root.addEventListener('click', onClick);
  render();
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
}
export const _test = { store, ui, compute, openForm, saveForm, render, updateResults };
if (typeof window !== 'undefined') window.__bal = _test;
