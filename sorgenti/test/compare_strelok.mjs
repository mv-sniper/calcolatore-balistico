import { solveTable } from '../src/engine.js';
const strelok = { 100:[0,0],200:[0.6,0],300:[1.5,0],400:[2.6,0.1],500:[3.8,0.1],600:[5.2,0.1],700:[6.7,0.1],800:[8.5,0.2],900:[10.6,0.2],1000:[13.0,0.3],1100:[15.8,0.3] };
const dist = Object.keys(strelok).map(Number);
const base = { dragModel:'G7', bc:0.267, v0Mps:794.6, massGr:175, diameterIn:0.308, lengthIn:1.380, twistIn:10, twistDir:1, sightHeightM:0.0624, zeroDistanceM:100 };
const env = { tempC:15, stationPressurePa:101325, rh:0 };
function run(p, e=env){ return solveTable(p, e, null, { angleDeg:0, windMps:0, windClock:12 }, dist); }
function report(label, p, e){
  const t = run(p,e);
  console.log('\n'+label);
  console.log('m     mio_U  strelok_U  diff | mio_L(sx) strelok_L | Mach  TOF');
  t.forEach((r,i)=>{ const s=strelok[dist[i]];
    console.log(String(dist[i]).padEnd(5), r.elevationMrad.toFixed(2).padStart(6), String(s[0]).padStart(8), (r.elevationMrad-s[0]).toFixed(2).padStart(7), ' |', (r.driftMrad).toFixed(2).padStart(7), String(s[1]).padStart(9),' |', r.mach.toFixed(2), r.tofS.toFixed(3)); });
}
report('G7 0.267 (Litz), atmosfera standard ICAO 15C 1013.25 hPa', base);
// BC G7 che minimizza lo scarto quadratico sulla colonna U
let best=null;
for(let bc=0.20; bc<=0.30; bc+=0.0005){ const t=run({...base,bc}); let e=0; t.forEach((r,i)=>{ e+=(r.elevationMrad-strelok[dist[i]][0])**2; }); if(!best||e<best.e) best={bc,e}; }
console.log('\nBC G7 che meglio riproduce la colonna U di Strelok (atm. std):', best.bc.toFixed(4), 'RMS', Math.sqrt(best.e/dist.length).toFixed(3),'mrad');
report('G7 con BC fittato', {...base, bc:best.bc});
let bestG1=null;
for(let bc=0.40; bc<=0.60; bc+=0.001){ const t=run({...base,dragModel:'G1',bc}); let e=0; t.forEach((r,i)=>{ e+=(r.elevationMrad-strelok[dist[i]][0])**2; }); if(!bestG1||e<bestG1.e) bestG1={bc,e}; }
console.log('\nBC G1 che meglio riproduce la colonna U (atm. std):', bestG1.bc.toFixed(3), 'RMS', Math.sqrt(bestG1.e/dist.length).toFixed(3),'mrad');
