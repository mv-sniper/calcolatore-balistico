// Archivio incorporato nell'app (sola lettura). Si completa con le voci che inserisci tu.
// Regola: nessun dato inventato. Ogni voce riporta la fonte (catalogo o pagina del produttore).
// verified:true = valore pubblicato dal produttore; verified:false = non confermato dal produttore.
// Dati letti il 17/11/2026. Un campo vuoto (null) significa che il produttore non lo pubblica.

const IN_MM = 25.4;
const FPS = 0.3048;
const GR_PER_G = 15.4323584;

const SRC = {
  berger: 'Catalogo Berger 2024: https://bergerbullets.com/wp-content/uploads/2024/01/Berger-Catalog-2024-Website.pdf',
  lapua: 'Catalogo Lapua 2025: https://www.lapua.com/wp-content/uploads/2025/05/Lapua_Catalog_2025_ENG_web.pdf',
  nosler: 'Catalogo Nosler 2026: https://www.nosler.com/media/binaryanvil/media_library/2026-Catalog-Layout_Web.pdf',
  sierra: 'Catalogo Sierra 2025: https://sierrabullets.com/content/2025-sierra-bullets-catalog-poster.pdf',
  hornadyBc: 'Hornady, pagina BC: https://www.hornady.com/bc',
};

// Palla del produttore. bcs: [{model, value, bands?:[{fps,value}], note?}]
function B(id, brand, name, weightGr, lengthIn, bcs, source, extra = {}) {
  return {
    id: `seed-${id}`, seed: true, brand, name, caliberName: '.308', weightGr,
    diameterMm: 7.8232, lengthMm: lengthIn ? Number((lengthIn * IN_MM).toFixed(3)) : null,
    bcs, verified: true, sources: [source], notes: extra.notes || '', ...extra,
  };
}
const g1 = (v, note) => ({ model: 'G1', value: v, note: note || '' });
const g7 = (v, note) => ({ model: 'G7', value: v, note: note || '' });
const SIERRA_NOTE = 'Il catalogo Sierra riporta un solo "B.C." senza indicare il modello: trattato come G1. Lunghezza e G7 non sono pubblicati.';
const BERGER_LEN = 'Lunghezza = OAL dalle tabelle di riferimento Berger.';
const HORN_NOTE = 'BC a bande di velocità come pubblicato da Hornady (Mach 2,25 / 2,0 / 1,75). Lunghezza non pubblicata.';
const bands = (a, b, c) => [{ fps: 2512, value: a }, { fps: 2232, value: b }, { fps: 1953, value: c }];
const hornBc = (g1a, g1b, g1c, g7a, g7b, g7c) => [
  { model: 'G7', value: g7a, bands: bands(g7a, g7b, g7c), note: 'Banda Mach 2,25 (2512 fps e oltre).' },
  { model: 'G1', value: g1a, bands: bands(g1a, g1b, g1c), note: 'Banda Mach 2,25 (2512 fps e oltre).' },
];

export const SEED_BULLETS = [
  // --- Sierra ---
  {
    id: 'seed-sierra-tmk-175-308', seed: true, brand: 'Sierra', name: 'Tipped MatchKing (TMK) 175 gr #7775',
    caliberName: '.308', weightGr: 175, diameterMm: 7.8232, lengthMm: 35.052,
    bcs: [
      { model: 'G7', value: 0.267, note: 'Misurato da Bryan Litz (Applied Ballistics); non è un dato dichiarato da Sierra.' },
      { model: 'G1', value: 0.545, note: 'Dichiarato da Sierra (catalogo 2025, "B.C." senza modello indicato).' },
    ],
    verified: false,
    sources: [SRC.sierra, 'https://bulletin.accurateshooter.com/?p=56692', 'https://bulletin.accurateshooter.com/?p=56402'],
    notes: 'G1 0,545 confermato dal catalogo Sierra 2025. G7 0,267 e lunghezza 1,380" NON sono dati Sierra (misure di terzi): da confermare.',
  },
  B('sierra-2200', 'Sierra', 'HPBT MatchKing 168 gr #2200', 168, null, [g1(0.462)], SRC.sierra, { notes: SIERRA_NOTE }),
  B('sierra-7768', 'Sierra', 'Tipped MatchKing (TMK) 168 gr #7768', 168, null, [g1(0.535)], SRC.sierra, { notes: SIERRA_NOTE }),
  B('sierra-2269', 'Sierra', 'HPBT-CN MatchKing 169 gr #2269', 169, null, [g1(0.527)], SRC.sierra, { notes: SIERRA_NOTE }),
  B('sierra-2275', 'Sierra', 'HPBT MatchKing 175 gr #2275', 175, null, [g1(0.505)], SRC.sierra, { notes: SIERRA_NOTE }),
  B('sierra-2175', 'Sierra', 'GameKing 175 gr #2175', 175, null, [g1(0.505)], SRC.sierra, { notes: SIERRA_NOTE }),
  B('sierra-2277', 'Sierra', 'HPBT-CN MatchKing 177 gr #2277', 177, null, [g1(0.545)], SRC.sierra, { notes: SIERRA_NOTE }),
  B('sierra-4680', 'Sierra', 'Tipped GameKing (TGK) 180 gr #4680', 180, null, [g1(0.515)], SRC.sierra, { notes: SIERRA_NOTE }),
  B('sierra-4681', 'Sierra', 'Tipped GameKing (TGK) 180 gr #4681', 180, null, [g1(0.543)], SRC.sierra, { notes: SIERRA_NOTE }),
  B('sierra-2160', 'Sierra', 'SBT GameKing 180 gr #2160', 180, null, [g1(0.501)], SRC.sierra, { notes: SIERRA_NOTE }),

  // --- Berger ---
  B('berger-30410', 'Berger', 'VLD Target 168 gr #30410', 168, 1.251, [g7(0.260), g1(0.507)], SRC.berger, { notes: BERGER_LEN }),
  B('berger-30412', 'Berger', 'VLD Target 175 gr #30412', 175, 1.342, [g7(0.262), g1(0.512)], SRC.berger, { notes: BERGER_LEN }),
  B('berger-30413', 'Berger', 'VLD Target 185 gr #30413', 185, 1.383, [g7(0.278), g1(0.543)], SRC.berger, { notes: BERGER_LEN }),
  B('berger-30425', 'Berger', 'Hybrid Target 168 gr #30425', 168, 1.287, [g7(0.264), g1(0.515)], SRC.berger, { notes: BERGER_LEN }),
  B('berger-30424', 'Berger', 'Hybrid Target 185 gr #30424', 185, 1.418, [g7(0.295), g1(0.576)], SRC.berger, { notes: BERGER_LEN }),
  B('berger-30420', 'Berger', 'Tangent Target (Long Range BT) 175 gr #30420', 175, 1.314, [g7(0.262), g1(0.512)], SRC.berger, { notes: BERGER_LEN }),
  B('berger-30418', 'Berger', 'Tangent Target (Juggernaut Target) 185 gr #30418', 185, 1.344, [g7(0.284), g1(0.555)], SRC.berger, { notes: BERGER_LEN }),
  B('berger-30105', 'Berger', 'OTM Tactical 175 gr #30105', 175, 1.261, [g7(0.263), g1(0.512)], SRC.berger, { notes: BERGER_LEN }),
  B('berger-30107', 'Berger', 'Juggernaut OTM Tactical 185 gr #30107', 185, 1.355, [g7(0.283), g1(0.552)], 'Berger, scheda prodotto e catalogo 2026: https://bergerbullets.com/product/30-caliber-185-grain-juggernaut-otm-tactical/', { notes: 'Lunghezza = OAL della scheda Berger. BC G1 0,552 / G7 0,283 confermati da scheda e catalogo 2026 (il catalogo 2024 riportava anche 0,682/0,349: valori non usati).' }),
  B('berger-30554', 'Berger', 'Elite Hunter 180 gr #30554', 180, 1.375, [g7(0.295), g1(0.576)], SRC.berger, { notes: BERGER_LEN }),
  B('berger-30570', 'Berger', 'Classic Hybrid Hunter 168 gr #30570', 168, 1.228, [g7(0.251), g1(0.498)], SRC.berger, { notes: BERGER_LEN }),
  B('berger-30571', 'Berger', 'Classic Hybrid Hunter 185 gr #30571', 185, 1.314, [g7(0.273), g1(0.533)], SRC.berger, { notes: BERGER_LEN }),
  B('berger-30510', 'Berger', 'VLD Hunting 168 gr #30510', 168, 1.261, [g7(0.255), g1(0.498)], SRC.berger, { notes: BERGER_LEN }),
  B('berger-30512', 'Berger', 'VLD Hunting 175 gr #30512', 175, 1.328, [g7(0.265), g1(0.518)], SRC.berger, { notes: BERGER_LEN }),
  B('berger-30513', 'Berger', 'VLD Hunting 185 gr #30513', 185, 1.366, [g7(0.286), g1(0.558)], SRC.berger, { notes: BERGER_LEN }),

  // --- Lapua (lunghezza non pubblicata) ---
  B('lapua-gb422', 'Lapua', 'Scenar 167 gr GB422', 167, null, [g7(0.223), g1(0.446)], SRC.lapua, { notes: 'Peso 167 gr: fuori dall\'intervallo 168-185 (solo avviso). Lunghezza non pubblicata.' }),
  B('lapua-b476', 'Lapua', 'Lock Base 170 gr B476', 170, null, [g7(0.249), g1(0.498)], SRC.lapua, { notes: 'Lunghezza non pubblicata.' }),
  B('lapua-n558', 'Lapua', 'Naturalis 170 gr N558 (senza piombo)', 170, null, [g7(0.177), g1(0.354)], SRC.lapua, { notes: 'Lunghezza non pubblicata.' }),
  B('lapua-gb550', 'Lapua', 'Scenar-L 175 gr GB550', 175, null, [g7(0.247), g1(0.490)], SRC.lapua, { notes: 'Lunghezza non pubblicata.' }),
  B('lapua-gb581', 'Lapua', 'MaxRange Target 175 gr GB581', 175, null, [g7(0.286), g1(0.581)], SRC.lapua, { notes: 'Lunghezza non pubblicata.' }),
  B('lapua-gb432', 'Lapua', 'Scenar 185 gr GB432', 185, null, [g7(0.242), g1(0.482)], SRC.lapua, { notes: 'Lunghezza non pubblicata.' }),
  B('lapua-d46', 'Lapua', 'FMJBT 185 gr D46', 185, null, [g7(0.254), g1(0.506)], SRC.lapua, { notes: 'Lunghezza non pubblicata.' }),

  // --- Hornady ---
  B('hornady-eld-match-168', 'Hornady', 'ELD Match 168 gr #30506', 168, null, hornBc(0.523, 0.516, 0.498, 0.263, 0.259, 0.251), SRC.hornadyBc, { notes: HORN_NOTE }),
  B('hornady-atip-176', 'Hornady', 'A-Tip Match 176 gr', 176, null, hornBc(0.564, 0.552, 0.540, 0.284, 0.277, 0.272), SRC.hornadyBc, { notes: HORN_NOTE }),
  B('hornady-atip-177', 'Hornady', 'A-Tip Match 177 gr', 177, null, hornBc(0.565, 0.556, 0.548, 0.285, 0.279, 0.276), SRC.hornadyBc, { notes: HORN_NOTE }),
  B('hornady-eld-vt-174', 'Hornady', 'ELD-VT 174 gr', 174, null, hornBc(0.573, 0.564, 0.563, 0.289, 0.283, 0.283), SRC.hornadyBc, { notes: HORN_NOTE }),
  B('hornady-eld-x-178', 'Hornady', 'ELD-X 178 gr', 178, null, hornBc(0.552, 0.543, 0.538, 0.278, 0.273, 0.271), SRC.hornadyBc, { notes: HORN_NOTE }),
  B('hornady-eld-match-178', 'Hornady', 'ELD Match 178 gr', 178, null, hornBc(0.547, 0.527, 0.506, 0.275, 0.265, 0.254), SRC.hornadyBc, { notes: HORN_NOTE }),

  // --- Nosler (OAL del catalogo = lunghezza della palla) ---
  B('nosler-58455', 'Nosler', 'AccuBond Long Range 168 gr #58455', 168, 1.365, [g7(0.265), g1(0.525)], SRC.nosler),
  B('nosler-53164', 'Nosler', 'Custom Competition HPBT 168 gr #53164', 168, 1.200, [g1(0.462)], SRC.nosler, { notes: 'Il catalogo riporta un solo BC (trattato come G1); G7 non pubblicato.' }),
  B('nosler-53952', 'Nosler', 'Custom Competition HPBT 175 gr #53952', 175, 1.240, [g1(0.505)], SRC.nosler, { notes: 'Il catalogo riporta un solo BC (trattato come G1); G7 non pubblicato.' }),
  B('nosler-53182', 'Nosler', 'RDF HPBT 168 gr #53182', 168, 1.320, [g7(0.253), g1(0.505)], SRC.nosler),
  B('nosler-53170', 'Nosler', 'RDF HPBT 175 gr #53170', 175, 1.330, [g7(0.270), g1(0.536)], SRC.nosler),
  B('nosler-30168', 'Nosler', 'Ballistic Tip Hunting 168 gr #30168', 168, 1.307, [g1(0.490)], SRC.nosler, { notes: 'Il catalogo riporta un solo BC (trattato come G1); G7 non pubblicato.' }),
  B('nosler-30180', 'Nosler', 'Ballistic Tip Hunting 180 gr #30180', 180, 1.360, [g1(0.507)], SRC.nosler, { notes: 'Il catalogo riporta un solo BC (trattato come G1); G7 non pubblicato.' }),
  B('nosler-54825', 'Nosler', 'AccuBond 180 gr #54825', 180, 1.380, [g1(0.507)], SRC.nosler, { notes: 'Il catalogo riporta un solo BC (trattato come G1); G7 non pubblicato.' }),
  B('nosler-16331', 'Nosler', 'Partition 180 gr #16331', 180, 1.260, [g1(0.474)], SRC.nosler, { notes: 'Il catalogo riporta un solo BC (trattato come G1); G7 non pubblicato.' }),
  B('nosler-59415', 'Nosler', 'E-Tip (senza piombo) 168 gr #59415', 168, 1.415, [g1(0.503)], SRC.nosler, { notes: 'Il catalogo riporta un solo BC (trattato come G1); G7 non pubblicato.' }),
  B('nosler-59180', 'Nosler', 'E-Tip (senza piombo) 180 gr #59180', 180, 1.485, [g1(0.523)], SRC.nosler, { notes: 'Il catalogo riporta un solo BC (trattato come G1); G7 non pubblicato.' }),

  // --- Palle di munizioni commerciali non vendute come componente (dati dalla scheda della munizione) ---
  B('norma-dl-168', 'Norma', 'HPBT 168 gr (Diamond Line Match, rivestita al molibdeno)', 168, null, [g7(0.231), g1(0.462)],
    'Norma, scheda 10176152: https://www.norma-ammunition.com/en-gb/products/dedicated-precision/centerfire-rifle/norma-diamond-line/norma-diamond-line-match-308-winchester-168gr---10176152', { notes: 'Dati dalla scheda della munizione. Lunghezza non pubblicata.' }),
  B('norma-gt-168', 'Norma', 'HPBT 168 gr (Golden Target)', 168, null, [g1(0.424)],
    'Norma, scheda 10177432: https://www.norma-ammunition.com/products/shooting/norma-golden-target/norma-golden-target-308-winchester-168gr---10177432', { notes: 'Dati dalla scheda della munizione: solo G1. Lunghezza non pubblicata.' }),
  B('norma-gt-175', 'Norma', 'HPBT 175 gr (Golden Target)', 175, null, [g7(0.270), g1(0.547)],
    'Norma, scheda 10177442: https://www.norma-ammunition.com/products/shooting/norma-golden-target/norma-golden-target-308-winchester-175gr---10177442', { notes: 'Dati dalla scheda della munizione. Lunghezza non pubblicata.' }),
  B('sb-hpbt-168', 'Sellier & Bellot', 'HPBT 168 gr (V341312)', 168, null, [g7(0.231), g1(0.458)],
    'Sellier & Bellot, scheda V341312: https://www.sellier-bellot.cz/en/products/rifle-ammunition/rifle-ammunition-target-match/detail/190/', { notes: 'Dati dalla scheda della munizione. Lunghezza non pubblicata.' }),
  B('sb-hpbt-180', 'Sellier & Bellot', 'HPBT 180 gr (V341372)', 180, null, [g7(0.246), g1(0.488)],
    'Sellier & Bellot, scheda V341372: https://www.sellier-bellot.cz/en/products/rifle-ammunition/rifle-ammunition-target-match/detail/189/', { notes: 'Dati dalla scheda della munizione. Lunghezza non pubblicata.' }),
  B('sb-fmj-168', 'Sellier & Bellot', 'FMJ Match 168 gr (V344882)', 168, null, [g7(0.239), g1(0.475)],
    'Sellier & Bellot, scheda V344882: https://www.sellier-bellot.cz/en/products/rifle-ammunition/rifle-ammunition-target-match/detail/814/', { notes: 'Dati dalla scheda della munizione. Lunghezza non pubblicata.' }),
];

// Munizioni commerciali complete. mvMps = velocità iniziale dichiarata dal produttore su canna di prova.
// bc (facoltativo) = BC dichiarato dal produttore della munizione, usato come BC personalizzato.
function A(id, brand, line, code, bulletRef, weightGr, mv, barrelMm, source, extra = {}) {
  const mvMps = mv.fps ? Number((mv.fps * FPS).toFixed(1)) : mv.mps;
  return {
    id: `seed-ammo-${id}`, brand, line, code, bulletId: `seed-${bulletRef}`, weightGr,
    mvMps, mvText: mv.fps ? `${mv.fps} fps` : `${mv.mps} m/s`, barrelMm: barrelMm || null,
    sources: [source], notes: extra.notes || '', bc: extra.bc || null,
  };
}
const HORN = 'Hornady: https://www.hornady.com/ammunition/rifle/';
const IN24 = 609.6;

export const SEED_AMMO = [
  A('federal-gmm-168', 'Federal', 'Gold Medal Sierra MatchKing', 'GM308M', 'sierra-2200', 168, { fps: 2650 }, null,
    'Federal, scheda GM308M: https://www.federalpremium.com/rifle/gold-medal/gold-medal-sierra-matchking/11-GM308M.html',
    { bc: { model: 'G7', value: 0.224, note: 'Federal: G1 0,462 / G7 0,224' }, notes: 'Lunghezza della canna di prova non indicata da Federal.' }),
  A('federal-gmm-175', 'Federal', 'Gold Medal Sierra MatchKing', 'GM308M2', 'sierra-2275', 175, { fps: 2600 }, null,
    'Federal, scheda GM308M2: https://www.federalpremium.com/rifle/gold-medal/gold-medal-sierra-matchking/11-GM308M2.html',
    { bc: { model: 'G7', value: 0.25, note: 'Federal: G1 0,505 / G7 0,25' }, notes: 'Lunghezza della canna di prova non indicata da Federal.' }),
  A('hornady-match-168-eld', 'Hornady', 'Match ELD Match', '80966', 'hornady-eld-match-168', 168, { fps: 2700 }, IN24, HORN + '308-win-168-gr-eld-match'),
  A('hornady-superformance-168-eld', 'Hornady', 'Superformance Match ELD Match', '80963', 'hornady-eld-match-168', 168, { fps: 2840 }, IN24, HORN + '308-win-168-gr-eld-match-superformance-match'),
  A('hornady-ph-178-eldx', 'Hornady', 'Precision Hunter ELD-X', '80994', 'hornady-eld-x-178', 178, { fps: 2600 }, IN24, HORN + '308-win-178-gr-eld-x-precision-hunter'),
  A('lapua-scenar-167', 'Lapua', 'Scenar', '4317515', 'lapua-gb422', 167, { mps: 820 }, 660, 'Lapua, catalogo 2025: https://www.lapua.com/wp-content/uploads/2025/05/Lapua_Catalog_2025_ENG_web.pdf'),
  A('lapua-lockbase-170', 'Lapua', 'Lock Base HPS', '4317596', 'lapua-b476', 170, { mps: 840 }, 660, 'Lapua, catalogo 2025: https://www.lapua.com/wp-content/uploads/2025/05/Lapua_Catalog_2025_ENG_web.pdf'),
  A('lapua-naturalis-170', 'Lapua', 'Naturalis', 'N317105', 'lapua-n558', 170, { mps: 800 }, 660, 'Lapua, catalogo 2025: https://www.lapua.com/wp-content/uploads/2025/05/Lapua_Catalog_2025_ENG_web.pdf'),
  A('lapua-scenar-l-175', 'Lapua', 'Scenar-L', '4317520', 'lapua-gb550', 175, { mps: 793 }, 660, 'Lapua, scheda 4317520: https://lapua.com/product/308-win-target-cartridge-scenar-l-113g-175gr-4317520'),
  A('lapua-scenar-185', 'Lapua', 'Scenar', '4317523', 'lapua-gb432', 185, { mps: 755 }, 660, 'Lapua, catalogo 2025: https://www.lapua.com/wp-content/uploads/2025/05/Lapua_Catalog_2025_ENG_web.pdf'),
  A('lapua-fmjbt-185', 'Lapua', 'FMJBT', '4317590', 'lapua-d46', 185, { mps: 760 }, 660, 'Lapua, catalogo 2025: https://www.lapua.com/wp-content/uploads/2025/05/Lapua_Catalog_2025_ENG_web.pdf'),
  A('norma-dl-168', 'Norma', 'Diamond Line Match', '10176152', 'norma-dl-168', 168, { mps: 777 }, 610, 'Norma, scheda 10176152: https://www.norma-ammunition.com/en-gb/products/dedicated-precision/centerfire-rifle/norma-diamond-line/norma-diamond-line-match-308-winchester-168gr---10176152'),
  A('norma-gt-168', 'Norma', 'Golden Target', '10177432', 'norma-gt-168', 168, { mps: 800 }, 610, 'Norma, scheda 10177432: https://www.norma-ammunition.com/products/shooting/norma-golden-target/norma-golden-target-308-winchester-168gr---10177432'),
  A('norma-gt-175', 'Norma', 'Golden Target', '10177442', 'norma-gt-175', 175, { mps: 790 }, 610, 'Norma, scheda 10177442: https://www.norma-ammunition.com/products/shooting/norma-golden-target/norma-golden-target-308-winchester-175gr---10177442'),
  A('sb-hpbt-168', 'Sellier & Bellot', 'HPBT', 'V341312', 'sb-hpbt-168', 168, { mps: 801 }, 600, 'Sellier & Bellot, scheda V341312: https://www.sellier-bellot.cz/en/products/rifle-ammunition/rifle-ammunition-target-match/detail/190/'),
  A('sb-hpbt-180', 'Sellier & Bellot', 'HPBT', 'V341372', 'sb-hpbt-180', 180, { mps: 800 }, 600, 'Sellier & Bellot, scheda V341372: https://www.sellier-bellot.cz/en/products/rifle-ammunition/rifle-ammunition-target-match/detail/189/'),
  A('sb-fmj-168', 'Sellier & Bellot', 'FMJ Match', 'V344882', 'sb-fmj-168', 168, { mps: 800 }, 600, 'Sellier & Bellot, scheda V344882: https://www.sellier-bellot.cz/en/products/rifle-ammunition/rifle-ammunition-target-match/detail/814/'),
  A('fiocchi-168', 'Fiocchi', 'HPBT Sierra MatchKing', '709890', 'sierra-2200', 168, { mps: 800 }, null, 'Fiocchi, catalogo: https://fiocchi.com/en/catalog/ammo/rifle/308.html',
    { bc: { model: 'G7', value: 0.218, note: 'Fiocchi: G7 0,218 (indicato "Litz")' }, notes: 'Canna di prova non indicata da Fiocchi.' }),
  A('fiocchi-175', 'Fiocchi', 'HPBT Sierra MatchKing', '709889', 'sierra-2275', 175, { mps: 800 }, null, 'Fiocchi, catalogo: https://fiocchi.com/en/catalog/ammo/rifle/308.html',
    { bc: { model: 'G7', value: 0.243, note: 'Fiocchi: G7 0,243 (indicato "Litz")' }, notes: 'Canna di prova non indicata da Fiocchi.' }),
  A('fiocchi-us-168', 'Fiocchi', 'Sierra MatchKing HP Boat-Tail (USA, discontinuata)', '308MKB', 'sierra-2200', 168, { fps: 2650 }, null, 'Fiocchi USA: https://www.fiocchiusa.com/centerfire-rifle/hyperformance-match/',
    { notes: 'Pagina Fiocchi USA: prodotto discontinuato. Canna di prova non indicata.' }),
  A('fiocchi-us-175', 'Fiocchi', 'Sierra MatchKing HP Boat-Tail (USA, discontinuata)', '308MKD', 'sierra-2275', 175, { fps: 2595 }, null, 'Fiocchi USA: https://www.fiocchiusa.com/centerfire-rifle/hyperformance-match/33-308MKD.html',
    { notes: 'Pagina Fiocchi USA: prodotto discontinuato. Indica BC 0,496 senza specificare il modello: non usato. Canna di prova non indicata.' }),
];

// Suggerimenti per i campi di testo (solo nomi, nessun dato di carica o di combustione).
// Nomi letti dai siti dei produttori (Vihtavuori, Hodgdon, Alliant, Reload Swiss) il 17/11/2026.
export const SUGGEST = {
  cases: ['Lapua', 'Norma', 'Starline', 'Peterson', 'Federal', 'Hornady', 'Winchester'],
  primers: ['CCI BR-2 Large Rifle', 'Fiocchi Large Rifle', 'Federal Gold Medal GM210M'],
  powders: [
    'Vihtavuori N133', 'Vihtavuori N135', 'Vihtavuori N140', 'Vihtavuori N150', 'Vihtavuori N160', 'Vihtavuori N165',
    'Vihtavuori N540', 'Vihtavuori N550', 'Vihtavuori N555', 'Vihtavuori N560', 'Vihtavuori N565',
    'Hodgdon H4895', 'Hodgdon Varget', 'Hodgdon H4350', 'Hodgdon H4831SC', 'Hodgdon H1000', 'Hodgdon H335',
    'Hodgdon CFE 223', 'Hodgdon Benchmark', 'Hodgdon Superformance', 'IMR 4895', 'IMR 4064', 'IMR 4350', 'IMR 8208 XBR', 'Ramshot TAC',
    'Alliant Reloder 7', 'Alliant Reloder 10x', 'Alliant Reloder 15', 'Alliant Reloder 16', 'Alliant Reloder 17', 'Alliant Reloder 19', 'Alliant Reloder 22',
    'Alliant Power Pro 2000-MR', 'Reload Swiss RS50', 'Reload Swiss RS52',
  ],
};
