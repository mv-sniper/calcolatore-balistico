import fs from 'fs';
import { parseShotViewCsv, shotStats, flagOutliers } from '../src/csv_garmin.js';
import { toBase, fromBase, parseNum, fmt, stationPressureFromAltitude, FAMILIES } from '../src/units.js';
import { emptyStore, saveStore, loadStore, exportBackup, importBackup, uid } from '../src/store.js';
import assert from 'assert';
const f = fs.readdirSync('/mnt/user-data/uploads').find(x=>x.endsWith('.csv'));
const txt = fs.readFileSync('/mnt/user-data/uploads/'+f,'utf8');
const r = parseShotViewCsv(txt);
assert(r.ok, r.error);
console.log('titolo:', r.title, '| unita', r.unit, '| colpi', r.shots.length, '| data', r.date, '| riepilogo Garmin', JSON.stringify(r.summary));
const vs = r.shots.map(s=>s.v);
const all = shotStats(vs); console.log('tutti: media', all.mean.toFixed(1), 'SD(n-1)', all.sd.toFixed(1), 'SD pop', all.sdPop.toFixed(1), 'ES', all.es.toFixed(1), '(Garmin 797,4 / 12,7 / 64,3)');
const fl = flagOutliers(vs); const idx = fl.flags.map((x,i)=>x?r.shots[i].n:null).filter(Boolean);
console.log('anomalie segnalate:', idx, 'mediana', fl.median.toFixed(1), 'soglia', fl.limit.toFixed(1));
const ok = shotStats(vs.filter((_,i)=>!fl.flags[i])); console.log('senza anomalie: n', ok.n, 'media', ok.mean.toFixed(2), 'SD(n-1)', ok.sd.toFixed(2), 'ES', ok.es.toFixed(1));
assert.deepStrictEqual(idx,[5,7,9]);
// fps e punto e virgola
const fpsCsv = '#;VELOCITA (FPS);NOTE\r\n1;2600,5;\r\n2;2610,0;\r\n';
const r2 = parseShotViewCsv(fpsCsv); assert(r2.ok); console.log('fps->m/s', r2.shots.map(s=>s.v.toFixed(2)));
assert(!parseShotViewCsv('abc').ok);
// unita
const close=(a,b,t=1e-6)=>assert(Math.abs(a-b)<t,`${a} vs ${b}`);
close(toBase('pressure','hPa',1013.25),101325); close(toBase('pressure','inHg',29.92),101320.76,1); close(toBase('pressure','mmHg',760),101325,1);
close(fromBase('temperature','F',15),59); close(toBase('temperature','F',59),15);
close(toBase('speed','fps',2600),792.48); close(toBase('mass','g',11.34),175.0,0.1); close(toBase('length','in',1.38),35.052);
assert.strictEqual(parseNum('12,5'),12.5); assert.strictEqual(parseNum(' '),null); assert.strictEqual(parseNum('abc'),null);
assert.strictEqual(fmt('pressure','hPa',101325),'1013,3'); 
console.log('quota 0 m ->', stationPressureFromAltitude(0).toFixed(0),'Pa; 1000 m ->', stationPressureFromAltitude(1000).toFixed(0),'Pa (ICAO 89875)');
// archivio
const mem={}; const st={getItem:k=>mem[k]??null,setItem:(k,v)=>{mem[k]=v}};
const s = emptyStore(); s.rifles.push({id:uid('r'),name:'Remington 700'}); assert(saveStore(s,st)); assert.strictEqual(loadStore(st).rifles[0].name,'Remington 700');
const b = exportBackup(s); const imp = importBackup(b); assert(imp.ok && imp.store.rifles.length===1); assert(!importBackup('{"x":1}').ok); assert(!importBackup('non json').ok);
console.log('unita, CSV e archivio: tutto ok');
