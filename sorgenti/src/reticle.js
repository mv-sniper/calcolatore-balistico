// Reticolo Vortex EBR-7C MRAD (Viper PST Gen II 5-25x50, primo piano focale).
// Ricostruzione schematica in scala (1 unità = 1 MRAD) da due immagini Vortex: dimensioni principali
// dalla scheda delle sottotensioni (barra orizzontale 10,1 MRAD per lato, verticale 10 MRAD sopra,
// righe 1-10 sotto, base a 11), tacche e passo dei punti misurati sul disegno. NON è un disegno ufficiale:
// va confrontato con l'ottica reale. Il punto rosso usa invece coordinate esatte in MRAD.

export const EBR7C = {
  name: 'Vortex EBR-7C MRAD',
  halfWidth: 10.1,      // barra orizzontale, per lato
  up: 10,               // linea verticale sopra il centro
  rows: 10,             // righe di punti sotto il centro, a 1 MRAD l'una
  postTop: 11,          // inizio della base nera in basso
  dotStep: 0.2,         // passo dei punti sulle righe
  dotFirst: 0.4,        // primo punto misurato dal centro
  // semi-estensione dei punti per riga (righe 1-2, 3-4, 5-6, 7-8, 9-10)
  rowHalfExtent: (k) => [2.2, 3.2, 4.2, 5.2, 6.2][Math.floor((k - 1) / 2)],
};

const RED = '#d11a1a';
const f = (n) => Number(n.toFixed(3));

export function holdDescription(holdDownMrad, holdRightMrad) {
  const out = {};
  if (holdDownMrad >= 0) {
    const row = Math.min(EBR7C.rows, Math.max(0, Math.floor(holdDownMrad + 1e-9)));
    const frac = holdDownMrad - row;
    out.vertical = { row, offsetMrad: frac };
  } else {
    out.vertical = { row: 0, offsetMrad: holdDownMrad };
  }
  out.horizontal = { side: holdRightMrad >= 0 ? 'R' : 'L', mrad: Math.abs(holdRightMrad) };
  return out;
}

// holdDownMrad: MRAD sotto il centro (positivo = in basso); holdRightMrad: MRAD a destra del centro.
export function reticleSvg({ holdDownMrad = null, holdRightMrad = 0, showLabels = true } = {}) {
  const R = EBR7C;
  const vb = { x0: -11.2, y0: -10.9, w: 22.4, h: 22.6 };
  const parts = [];
  const line = (x1, y1, x2, y2, w = 0.05, c = RED) => parts.push(`<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${c}" stroke-width="${w}"/>`);
  const dot = (x, y, r) => parts.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${RED}"/>`);
  const text = (x, y, s, anchor = 'middle') => parts.push(`<text x="${f(x)}" y="${f(y)}" font-size="0.5" text-anchor="${anchor}" dominant-baseline="central" fill="${RED}" font-family="system-ui,sans-serif">${s}</text>`);

  // campo e basi nere
  parts.push(`<rect x="${vb.x0}" y="${vb.y0}" width="${vb.w}" height="${vb.h}" fill="#f6f4ef"/>`);
  parts.push(`<rect x="-11.2" y="-0.2" width="1.1" height="0.4" fill="#111"/><rect x="10.1" y="-0.2" width="1.1" height="0.4" fill="#111"/>`);
  parts.push(`<rect x="-0.2" y="${R.postTop}" width="0.4" height="0.7" fill="#111"/>`);
  line(0, -10.9, 0, -R.up, 0.03, '#111');

  // linea verticale e tacche sopra il centro: 0,5 MRAD (corta), 1 MRAD (lunga), 0,1 MRAD fitte da 4 a 10
  line(0, -R.up, 0, 10.4, 0.06);
  for (let m = 0.5; m <= R.up + 1e-9; m += 0.5) {
    const isInt = Math.abs(m - Math.round(m)) < 1e-9;
    line(-(isInt ? 0.22 : 0.13), -m, 0, -m, 0.04);
  }
  for (let m = 4.1; m < R.up - 1e-9; m += 0.1) {
    if (Math.abs(m * 2 - Math.round(m * 2)) < 1e-6) continue;
    line(-0.08, -m, 0, -m, 0.03);
  }
  // barra orizzontale
  line(-R.halfWidth, 0, R.halfWidth, 0, 0.06);
  for (let m = 0.5; m <= R.halfWidth + 1e-9; m += 0.5) {
    const isInt = Math.abs(m - Math.round(m)) < 1e-9;
    const len = isInt ? 0.35 : 0.2;
    line(m, 0, m, len, 0.04); line(-m, 0, -m, len, 0.04);
  }
  for (let m = 4.1; m < R.halfWidth - 1e-9; m += 0.1) {
    if (Math.abs(m * 2 - Math.round(m * 2)) < 1e-6) continue;
    line(m, 0, m, 0.1, 0.03); line(-m, 0, -m, 0.1, 0.03);
  }

  // righe di punti sotto il centro
  for (let k = 1; k <= R.rows; k++) {
    const ext = R.rowHalfExtent(k);
    for (let x = R.dotFirst; x <= ext + 1e-9; x += R.dotStep) {
      const r = Math.abs(x - Math.round(x)) < 1e-6 ? 0.05 : 0.035;
      dot(x, k, r); dot(-x, k, r);
    }
  }

  if (showLabels) {
    for (const m of [2, 4, 6, 8, 10]) text(0.55, -m, m, 'start');
    for (const m of [1, 2, 3, 4, 6, 8, 10]) { text(m, -0.55, m); text(-m, -0.55, m); }
    for (let k = 1; k <= R.rows; k++) { const e = R.rowHalfExtent(k) + 0.55; text(e, k, k); text(-e, k, k); }
  }

  // punto rosso: coordinate esatte
  let inside = true;
  if (holdDownMrad != null && Number.isFinite(holdDownMrad)) {
    let y = holdDownMrad, x = holdRightMrad;
    const yMin = -R.up, yMax = R.postTop - 0.3, xMax = R.halfWidth;
    if (y < yMin || y > yMax || Math.abs(x) > xMax) inside = false;
    y = Math.min(yMax, Math.max(yMin, y)); x = Math.min(xMax, Math.max(-xMax, x));
    parts.push(`<circle cx="${f(x)}" cy="${f(y)}" r="0.55" fill="none" stroke="#ff2a2a" stroke-width="0.07"/>`);
    parts.push(`<circle cx="${f(x)}" cy="${f(y)}" r="0.24" fill="#ff2a2a" stroke="#fff" stroke-width="0.06"/>`);
    if (!inside) parts.push(`<circle cx="${f(x)}" cy="${f(y)}" r="0.8" fill="none" stroke="#b00" stroke-width="0.09" stroke-dasharray="0.25 0.2"/>`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.x0} ${vb.y0} ${vb.w} ${vb.h}" role="img" aria-label="Reticolo EBR-7C con punto di mira">${parts.join('')}</svg>`;
  return { svg, inside };
}
