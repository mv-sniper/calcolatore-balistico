import { solveShot, solveTable, _internal, airProperties } from '../src/engine.js';
const p = { dragModel:'G7', bc:0.267, v0Mps:794.6, massGr:175, diameterIn:0.308, lengthIn:1.38, twistIn:10, twistDir:1, sightHeightM:0.0624, zeroDistanceM:100 };
const env = { tempC:15, stationPressurePa:101325, rh:0 };
const dist=[100,200,300,400,500,600,700,800,900,1000,1100];
const t1 = solveTable(p, env, null, {angleDeg:0}, dist);
const t2 = solveTable({...p, dt:0.002}, env, null, {angleDeg:0}, dist);
let maxd=0, maxdr=0; t1.forEach((r,i)=>{ maxd=Math.max(maxd, Math.abs(r.elevationMrad-t2[i].elevationMrad)); maxdr=Math.max(maxdr, Math.abs(r.driftMrad-t2[i].driftMrad)); });
console.log('dt 1 ms vs 2 ms: differenza massima alzo', maxd.toExponential(2), 'mrad, deriva', maxdr.toExponential(2));
let t0=Date.now(); solveTable({...p, dt:0.002}, env, null, {angleDeg:0}, Array.from({length:44},(_,i)=>(i+1)*25)); console.log('tabella 44 righe, dt 2 ms:', Date.now()-t0, 'ms (Node)');
const nl = solveShot({...p, lengthIn:null}, env, null, {rangeM:1100});
console.log('senza lunghezza palla: spinApplied', nl.spinApplied, 'deriva', nl.driftMrad.toFixed(3), 'alzo', nl.elevationMrad.toFixed(3));
const a = airProperties(env); const r = _internal.flyTo(p, a, {x:0,z:0}, 0.0014, 0.3);
console.log('velocita a 0,3 m dalla volata:', Math.hypot(r.vx,r.vy).toFixed(2), 'm/s (da 794,60): perdita', (794.6-Math.hypot(r.vx,r.vy)).toFixed(3));
const tt = solveShot({...p, v0Mps:794.6}, env, null, {rangeM:1100}); const tt2 = solveShot({...p, v0Mps:794.8}, env, null, {rangeM:1100});
console.log('effetto di +0,2 m/s di velocita iniziale a 1100 m:', (tt.elevationMrad-tt2.elevationMrad).toFixed(4), 'mrad');

// splitCorrection: la torretta si arrotonda per eccesso, il reticolo non supera mai 10 MRAD
{
  const { splitCorrection } = await import('../src/engine.js');
  const t = (x, mode = 'reticle-first') => splitCorrection(x, { mode });
  const near2 = (a, b) => Math.abs(a - b) < 1e-9;
  let ok = true;
  const chk = (c, m) => { if (!c) { ok = false; console.log('  FAIL split:', m); } };
  let r = t(12.84); chk(near2(r.dialMrad, 2.9) && near2(r.holdMrad, 9.94) && !r.overflow, '12,84 -> torretta 2,9 + reticolo 9,94');
  r = t(10.04);     chk(near2(r.dialMrad, 0.1) && near2(r.holdMrad, 9.94) && !r.overflow, '10,04 -> 0,1 + 9,94');
  r = t(10);        chk(r.dialMrad === 0 && !r.overflow, '10 -> solo reticolo');
  r = t(15.5587);   chk(near2(r.dialMrad, 5.6) && r.holdMrad < 10 && !r.overflow, '15,56 -> 5,6 + 9,96');
  r = t(20);        chk(near2(r.dialMrad, 10) && near2(r.holdMrad, 10) && !r.overflow, '20 -> 10 + 10 senza superamento');
  r = t(20.05);     chk(r.overflow, '20,05 -> superamento');
  r = t(-0.5);      chk(near2(r.holdMrad, -0.5) && r.dialMrad === 0, 'negativo (sotto lo zero) resta nel reticolo');
  for (let x = 0; x <= 20; x += 0.013) { const q = t(x); if (q.holdMrad > 10 + 1e-9 && !q.overflow) { ok = false; console.log('  FAIL split sweep', x); break; } }
  console.log(ok ? 'split torretta/reticolo: ok' : 'split torretta/reticolo: ERRORI');
  if (!ok) process.exitCode = 1;
}
