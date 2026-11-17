// Archivio iniziale incorporato nell'app (sola lettura). Si completa con le voci che inserisci tu.
// Regola: nessun dato inventato. Ogni palla ha la fonte; verified:false = non confermato dal produttore.
// Questa è solo la prima voce: l'archivio completo (Sierra, Berger, Lapua, Hornady, Nosler, 168-185 gr)
// si aggiunge man mano, ricerca per ricerca, con la fonte indicata su ogni voce.

export const SEED_BULLETS = [
  {
    id: 'seed-sierra-tmk-175-308',
    seed: true,
    brand: 'Sierra',
    name: 'Tipped MatchKing (TMK) 175 gr',
    caliberName: '.308',
    weightGr: 175,
    diameterMm: 7.8232,   // 0,308 pollici
    lengthMm: 35.052,     // 1,380 pollici
    bcs: [
      { model: 'G7', value: 0.267, note: 'Misurato da Bryan Litz (Applied Ballistics); non è un dato dichiarato da Sierra.' },
      { model: 'G1', value: 0.545, note: 'Dichiarato da Sierra per velocità sopra 2400 fps (fonte secondaria).' },
    ],
    verified: false,
    sources: [
      'https://bulletin.accurateshooter.com/?p=56692',
      'https://bulletin.accurateshooter.com/?p=56402',
    ],
    notes: 'Lunghezza 1,380" misurata da un recensore, non una specifica Sierra. Da confermare con la scatola o il sito Sierra.',
  },
];

// Suggerimenti per i campi di testo (solo nomi, nessun dato di carica o di combustione).
export const SUGGEST = {
  cases: ['Lapua', 'Norma', 'Starline', 'Peterson', 'Federal', 'Hornady', 'Winchester'],
  primers: ['CCI BR-2 Large Rifle', 'Fiocchi Large Rifle', 'Federal Gold Medal GM210M'],
  powders: [
    'Vihtavuori N133', 'Vihtavuori N135', 'Vihtavuori N140', 'Vihtavuori N150', 'Vihtavuori N160',
    'Hodgdon Varget', 'Hodgdon H4895', 'Hodgdon H4350', 'Hodgdon Benchmark',
    'Alliant Reloder 15', 'Alliant Reloder 16', 'Alliant Reloder 17',
  ],
};
