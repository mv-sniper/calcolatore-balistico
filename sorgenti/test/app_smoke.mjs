// Prova di fumo dell'app costruita (web/app.js) in un browser simulato (jsdom).
// Uso: node test/app_smoke.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8').replace('<script src="app.js"></script>', '');
const bundle = fs.readFileSync(path.join(root, 'web/app.js'), 'utf8');

let failures = 0;
const ok = (c, msg) => { if (!c) { failures++; console.log('  FAIL', msg); } else console.log('  ok  ', msg); };
const near = (a, b, tol, msg) => ok(Math.abs(a - b) <= tol, `${msg} (${a?.toFixed?.(4)} vs ${b} ±${tol})`);

const errors = [];
const dom = new JSDOM(html, { url: 'https://prova.test/', runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window;
w.confirm = () => true;
w.scrollTo = () => {};
w.Element.prototype.scrollIntoView = () => {};
w.addEventListener('error', (e) => errors.push(e.message));
w.eval(bundle);
const doc = w.document;
const $ = (s) => doc.querySelector(s);
const $$ = (s) => [...doc.querySelectorAll(s)];
const tick = () => new Promise((r) => setTimeout(r, 0));
const click = (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
function typeInto(sel, value) {
  const el = $(sel); if (!el) throw new Error('campo mancante: ' + sel);
  el.value = value; el.dispatchEvent(new w.Event('input', { bubbles: true }));
}
function choose(sel, value) {
  const el = $(sel); if (!el) throw new Error('select mancante: ' + sel);
  el.value = String(value); el.dispatchEvent(new w.Event('change', { bubbles: true }));
}
const bal = () => w.__bal;

console.log('1. Avvio senza dati');
ok(!!$('[data-act=starter]'), 'compare il pulsante del profilo di partenza');
ok($$('nav button').length === 5, 'barra con 5 schede');

console.log('2. Profilo di partenza');
click($('[data-act=starter]'));
ok(!!$('[data-path=tempC]'), 'compaiono i campi ambientali');
ok($('#results .err') !== null, 'senza condizioni ambientali il risultato chiede i dati mancanti');

console.log('3. Atmosfera standard, 1100 m, nessun vento');
typeInto('[data-path=tempC]', '15');
typeInto('[data-path=stationPa]', '1013,25');
typeInto('[data-path=rhPct]', '0');
typeInto('[data-path=rangeM]', '1100');
let r = bal().compute();
ok(r.ok, 'calcolo riuscito: ' + (r.errors || []).join('; '));
console.log('     elevazione 1100 m:', r.single?.elevationMrad.toFixed(3), 'deriva:', r.single?.driftMrad.toFixed(3));
near(r.single.elevationMrad, 15.56, 0.1, 'alzo a 1100 m vicino al valore validato (G7 0,267, 794,6 m/s)');
near(r.single.driftMrad, 0.36, 0.05, 'deriva da rotazione a 1100 m (+ = proiettile a destra)');
ok(r.rows.length === 11, `tabella con 11 righe a passo 100 m (${r.rows.length})`);
ok(!!$('#results svg'), 'il reticolo con il punto rosso è disegnato');
ok($('#results svg').outerHTML.includes('d11a1a'), 'punto rosso presente');
near(r.rows[0].elevationMrad, 0, 0.02, 'alzo a 100 m = 0 (zero)');
ok(r.single.corr.overflow === false, 'nessun superamento della corsa a 1100 m');
ok(r.rows.every((x) => !x.corr.overflow && x.corr.holdDown <= 10 + 1e-9), 'nessuna riga della tabella supera torretta o reticolo (es. 1000 m)');
ok(/Alzo/.test($('#summary').textContent), 'riepilogo fisso in alto con alzo e deriva');
ok(/torretta/i.test($('#results').textContent), 'testo torretta/reticolo presente');
console.log('     torretta+reticolo:', r.single.corr.dialUp.toFixed(1), '+', r.single.corr.holdDown.toFixed(2));
near(r.single.corr.dialUp + r.single.corr.holdDown, r.single.elevationMrad, 0.06, 'torretta + reticolo = alzo totale (±1 click di arrotondamento)');

console.log('4. Cambio unità: pressione in inHg');
const pa = bal().store.settings.calc.stationPa;
near(pa, 101325, 1, 'pressione salvata in Pa');
choose('select[data-unit=pressure]', 'inHg');
near(Number($('[data-path=stationPa]').value.replace(',', '.')), 29.92, 0.01, 'il campo mostra 29,92 inHg');
near(bal().store.settings.calc.stationPa, pa, 0.001, 'il valore base non cambia');
choose('select[data-unit=pressure]', 'hPa');
typeInto('[data-path=stationPa]', '1013,25');
choose('select[data-unit=temperature]', 'F');
near(Number($('[data-path=tempC]').value.replace(',', '.')), 59, 0.01, '15 °C = 59 °F');
choose('select[data-unit=temperature]', 'C');

console.log('5. Vento da destra 5 m/s, 500 m');
typeInto('[data-path=rangeM]', '500');
typeInto('[data-path=windMps]', '5');
choose('[data-path=windClock]', 3);
r = bal().compute();
console.log('     deriva a 500 m:', r.single.driftMrad.toFixed(3), 'mrad (vento da destra: il proiettile va a sinistra)');
ok(r.single.driftMrad < -1, 'il proiettile devia a sinistra (valore negativo)');
{
  const lag = -5 * (r.single.tofS - 500 / bal().store.cartridges[0].mvMps) / 500 * 1000;
  console.log('     regola del ritardo (vento x (TOF - R/V0)):', lag.toFixed(3), 'mrad; motore:', r.single.windMrad.toFixed(3));
  near(r.single.windMrad, lag, 0.04, 'deriva da vento a 500 m coerente con la regola del ritardo');
}
ok(/DX/.test($('#results .big').textContent), 'la correzione in torretta è verso DX');
choose('select[data-unit=wind]', 'kmh');
near(Number($('[data-path=windMps]').value.replace(',', '.')), 18, 0.01, '5 m/s = 18 km/h');
choose('select[data-unit=wind]', 'mps');
choose('[data-path=windClock]', 12);
r = bal().compute();
near(r.single.windMrad, 0, 0.02, 'vento frontale: nessuna deriva laterale');

console.log('6. Coriolis');
typeInto('[data-path=windMps]', '0');
typeInto('[data-path=rangeM]', '1100');
const e0 = bal().compute().single.elevationMrad;
click($('summary'));
const chk = $('[data-path=coriolis]');
chk.checked = true; chk.dispatchEvent(new w.Event('change', { bubbles: true }));
ok(!!$('[data-path=latDeg]'), 'compaiono latitudine e direzione');
r = bal().compute();
ok(r.ok && r.warnings.concat(r.notes).length >= 0, 'Coriolis senza latitudine non rompe il calcolo');
typeInto('[data-path=latDeg]', '44');
typeInto('[data-path=azDeg]', '90');
r = bal().compute();
near(r.single.elevationMrad - e0, -0.093, 0.02, 'Coriolis verso est a 44°N: variazione di alzo (−0,093)');
chk.checked = false; chk.dispatchEvent(new w.Event('change', { bubbles: true }));

console.log('7. Modifica carabina');
click($$('nav button')[1]);
ok(/Remington 700/.test($('main').textContent), 'la carabina è elencata');
click($('[data-act=edit][data-kind=rifle]'));
typeInto('[data-path=name]', '');
click($('[data-act=save]'));
ok(!!$('.card.err'), 'senza nome il salvataggio è rifiutato');
typeInto('[data-path=name]', 'Remington 700 Magpul .308 Win');
typeInto('[data-path=sightHeightMm]', '62,4');
click($('[data-act=save]'));
ok(!bal().ui.form, 'salvataggio riuscito');
ok(bal().store.rifles.length === 1, 'una sola carabina');

console.log('8. Nuova carabina duplicata');
click($('[data-act=dup][data-kind=rifle]'));
click($('[data-act=save]'));
ok(bal().store.rifles.length === 2, 'duplicazione');
click($('[data-act=del][data-kind=rifle]:last-of-type') || $$('[data-act=del][data-kind=rifle]')[1]);
ok(bal().store.rifles.length === 1, 'eliminazione');

console.log('9. Palla: copia dell’archivio, nuova palla');
click($$('nav button')[3]);
ok(/Sierra/.test($('main').textContent) && /non verificato/.test($('main').textContent), 'palla dell’archivio con indicazione "non verificato"');
click($('[data-act=dup][data-kind=bullet]'));
ok(/\(copia\)/.test($('[data-path=name]').value), 'la copia è modificabile');
typeInto('[data-path=weightGr]', '168');
typeInto('[data-path="bcs.0.value"]', '0,218');
click($('[data-act=save]'));
ok(bal().store.bullets.length === 1 && bal().store.bullets[0].weightGr === 168, 'palla salvata (168 gr)');
ok(bal().store.bullets[0].verified === false, 'palla utente non marcata come verificata');

console.log('10. Cartuccia da CSV Garmin');
const dir = '/mnt/user-data/uploads';
const csvName = fs.existsSync(dir) ? fs.readdirSync(dir).find((x) => x.endsWith('.csv')) : null;
if (!csvName) console.log('  (CSV non disponibile: prova saltata)');
else {
  const text = fs.readFileSync(path.join(dir, csvName), 'utf8');
  click($$('nav button')[2]);
  click($('[data-act=new][data-kind=cartridge]'));
  const input = $('[data-act=csv-file]');
  const file = { name: csvName, text: async () => text };
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new w.Event('change', { bubbles: true }));
  await tick(); await tick();
  ok(!!$('#csvPanel'), 'pannello di importazione visibile');
  ok($$('.shot').length === 61, `61 colpi elencati (${$$('.shot').length})`);
  ok($$('.shot.flag').length === 3, `3 colpi segnalati come anomali (${$$('.shot.flag').length})`);
  console.log('     ', $('#csvStats').textContent);
  click($('[data-act=csv-apply]'));
  const d = bal().ui.form.draft;
  near(d.mvMps, 794.5586, 0.01, 'velocità media 794,56 m/s (58 colpi)');
  near(d.mvSdMps, 3.3844, 0.01, 'SD 3,38 m/s');
  ok(d.mvN === 58 && d.mvSource === 'garmin', 'n = 58, origine Garmin');
  choose('[data-path=bulletId]', 'seed-sierra-tmk-175-308');
  typeInto('[data-path=name]', 'TMK 175 prova CSV');
  click($('[data-act=save]'));
  ok(bal().store.cartridges.length === 2, 'seconda cartuccia salvata');
}

console.log('11. Cartuccia commerciale con la palla utente 168 gr (G7 0,218)');
{
  click($$('nav button')[2]);
  click($('[data-act=new][data-kind=cartridge]'));
  choose('[data-path=kind]', 'factory');
  typeInto('[data-path=brand]', 'Prova 168');
  choose('[data-path=bulletId]', bal().store.bullets[0].id);
  typeInto('[data-path=mvMps]', '790');
  click($('[data-act=save]'));
  ok(bal().store.cartridges.length === 3, 'terza cartuccia salvata');
  click($$('nav button')[0]);
  const sel = $('[data-path=cartridgeId]');
  const opt = [...sel.options].find((o) => /168/.test(o.textContent) || /copia/.test(o.textContent));
  choose('[data-path=cartridgeId]', opt.value);
  r = bal().compute();
  ok(r.ok, 'calcolo riuscito con la palla utente: ' + (r.errors || []).join('; '));
  console.log('     168 gr G7 0,218 @790 m/s, 1100 m: alzo', r.single.elevationMrad.toFixed(2), 'warning:', r.warnings.join(' | ') || '-');
  ok(r.single.elevationMrad > 15.56, 'BC più basso e velocità più bassa: alzo maggiore del caso TMK 175');
  ok(!r.warnings.some((x) => /peso/i.test(x)), 'nessun avviso di peso per 168 gr');
  ok(r.single.spinApplied === true, 'la copia mantiene la lunghezza: deriva da rotazione calcolata');
  const keepLen = bal().store.bullets[0].lengthMm;
  bal().store.bullets[0].lengthMm = null;
  r = bal().compute();
  ok(r.warnings.some((x) => /lunghezza/i.test(x)) && r.single.spinApplied === false, 'senza lunghezza: avviso e niente deriva da rotazione');
  bal().store.bullets[0].lengthMm = keepLen;
  bal().store.bullets[0].weightGr = 200;
  r = bal().compute();
  ok(r.warnings.some((x) => /peso/i.test(x)), 'avviso di peso fuori intervallo a 200 gr');
  bal().store.bullets[0].weightGr = 168;
}

console.log('12. Backup e ripristino');
{
  click($$('nav button')[4]);
  const snapshot = JSON.stringify(bal().store);
  let dl = null;
  w.URL.createObjectURL = (b) => { dl = b; return 'blob:x'; };
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () {};
  click($('[data-act=backup-dl]'));
  ok(dl !== null, 'il backup viene generato');
  const backupText = await new Promise((res) => { const fr = new w.FileReader(); fr.onload = () => res(fr.result); fr.readAsText(dl); });
  const parsed = JSON.parse(backupText);
  ok(parsed.app === 'calcolatore-balistico', 'il backup è riconoscibile');
  click($('[data-act=reset]'));
  ok(bal().store.rifles.length === 0, 'dati cancellati');
  click($$('nav button')[4]);
  const input = $('[data-act=backup-file]');
  Object.defineProperty(input, 'files', { value: [{ text: async () => backupText }], configurable: true });
  input.dispatchEvent(new w.Event('change', { bubbles: true }));
  await tick(); await tick();
  ok(JSON.stringify(bal().store) === snapshot, 'ripristino identico all’originale');
  click($$('nav button')[4]);
  const bad = $('[data-act=backup-file]');
  Object.defineProperty(bad, 'files', { value: [{ text: async () => '{"x":1}' }], configurable: true });
  bad.dispatchEvent(new w.Event('change', { bubbles: true }));
  await tick(); await tick();
  ok(bal().store.rifles.length >= 1, 'un file non valido non cancella i dati');
}

console.log('12b. Archivio palle e munizioni commerciali');
{
  click($$('nav button')[3]);
  const n0 = $$('article').length;
  ok(n0 > 40, `elenco palle dell'archivio (${n0} voci)`);
  choose('[data-act=filter-bullet-brand]', 'Berger');
  ok($$('article').length === 15 && /Berger/.test($('main').textContent), 'filtro per marca: 15 palle Berger');
  ok(/lunghezza 32,\d|lunghezza 3\d,\d/.test($('main').textContent) || /lunghezza/.test($('main').textContent), 'lunghezza mostrata');
  choose('[data-act=filter-bullet-brand]', '');
  click($$('nav button')[2]);
  choose('[data-act=filter-ammo-brand]', 'Federal');
  ok($$('[data-act=seed-ammo]').length === 2, 'due munizioni Federal Gold Medal');
  const btn = $$('[data-act=seed-ammo]').find((b) => b.dataset.id === 'seed-ammo-federal-gmm-175');
  click(btn);
  const d = bal().ui.form.draft;
  near(d.mvMps, 2600 * 0.3048, 0.1, 'velocità dichiarata 2600 fps = 792,5 m/s');
  ok(d.kind === 'factory' && d.mvSource === 'declared', 'tipo commerciale, origine "dichiarata"');
  ok(d.bcOverride.model === 'G7' && d.bcOverride.value === 0.25, 'BC G7 0,25 dichiarato da Federal');
  click($('[data-act=save]'));
  const saved = bal().store.cartridges.at(-1);
  ok(!bal().ui.form && /Federal/.test(saved.name), 'cartuccia salvata: ' + saved.name);
  click($$('nav button')[0]);
  choose('[data-path=cartridgeId]', saved.id);
  r = bal().compute();
  ok(r.ok, 'calcolo riuscito con la munizione Federal: ' + (r.errors || []).join('; '));
  console.log('     Federal 175 gr, 2600 fps, 1100 m: alzo', r.single.elevationMrad.toFixed(2));
  ok(/personalizzato/i.test(r.notes.join(' ')), 'nota: BC personalizzato (dichiarato dal produttore) in uso');
  // Hornady con bande
  click($$('nav button')[2]);
  choose('[data-act=filter-ammo-brand]', 'Hornady');
  click($$('[data-act=seed-ammo]').find((b) => b.dataset.id === 'seed-ammo-hornady-match-168-eld'));
  click($('[data-act=save]'));
  const hc = bal().store.cartridges.at(-1);
  click($$('nav button')[0]);
  choose('[data-path=cartridgeId]', hc.id);
  r = bal().compute();
  ok(r.ok && /bande di velocità/.test(r.notes.join(' ')), 'Hornady: BC a bande di velocità usato');
  ok(r.single.spinApplied === false && r.warnings.some((x) => /lunghezza/i.test(x)), 'Hornady: lunghezza non pubblicata -> avviso');
}

console.log('13. Persistenza');
{
  const saved = JSON.parse(w.localStorage.getItem('ballistica.v1'));
  ok(saved.rifles.length === bal().store.rifles.length, 'i dati sono in localStorage');
  ok(saved.settings.calc.rangeM === 1100, 'le impostazioni di calcolo sono salvate');
}

ok(errors.length === 0, 'nessun errore JavaScript in pagina ' + errors.join('|'));
console.log(failures ? `\n${failures} PROVE FALLITE` : '\nTutte le prove superate');
process.exit(failures ? 1 : 0);
