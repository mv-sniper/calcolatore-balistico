// Lettura dei CSV esportati dall'app Garmin ShotView (Xero C1 Pro).
// Formato verificato su un file reale in italiano: BOM iniziale, caratteri invisibili (U+200B) nelle
// intestazioni, riga titolo, riga di intestazione che inizia con "#", colpi, poi un riepilogo.
// Non è verificato per altre lingue o impostazioni: se l'unità non è riconosciuta, l'importazione si ferma.

const FPS_TO_MPS = 0.3048;

function splitLine(line, delim) {
  const out = [];
  let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (c === delim && !q) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function toNumber(s, decimalComma) {
  if (s == null) return null;
  const t = decimalComma ? s.replace(',', '.') : s;
  const n = Number(t.trim());
  return t.trim() !== '' && Number.isFinite(n) ? n : null;
}

export function parseShotViewCsv(text) {
  const clean = text.replace(/[﻿​‌‍⁠]/g, '');
  const lines = clean.split(/\r?\n/);
  const hIdx = lines.findIndex((l) => /^\s*#\s*[,;]/.test(l));
  if (hIdx < 0) return { ok: false, error: 'Intestazione non trovata (riga che inizia con "#").' };
  const headerLine = lines[hIdx];
  const delim = (headerLine.match(/;/g) || []).length > (headerLine.match(/,/g) || []).length ? ';' : ',';
  const decimalComma = delim === ';';
  const header = splitLine(headerLine, delim);
  const vIdx = header.findIndex((h) => /\((MPS|FPS)\)/i.test(h));
  if (vIdx < 0) return { ok: false, error: 'Colonna velocità non riconosciuta: attesa un\'intestazione con (MPS) o (FPS).' };
  const unit = /\(FPS\)/i.test(header[vIdx]) ? 'fps' : 'mps';
  const tIdx = header.findIndex((h) => /^(TEMPO|TIME)$/i.test(h.replace(/\s+/g, '')));
  const nIdx = header.findIndex((h) => /NOTE/i.test(h));
  const conv = unit === 'fps' ? FPS_TO_MPS : 1;

  const shots = [];
  let i = hIdx + 1;
  for (; i < lines.length; i++) {
    const cells = splitLine(lines[i], delim);
    if (!/^\d+$/.test(cells[0] || '')) break;
    const v = toNumber(cells[vIdx], decimalComma);
    if (v == null) continue;
    shots.push({ n: Number(cells[0]), v: v * conv, time: tIdx >= 0 ? cells[tIdx] : '', note: nIdx >= 0 ? cells[nIdx] || '' : '' });
  }
  if (!shots.length) return { ok: false, error: 'Nessun colpo trovato nel file.' };

  const summary = {};
  let date = '';
  for (; i < lines.length; i++) {
    const cells = splitLine(lines[i], delim);
    const key = (cells[0] || '').toUpperCase();
    if (/PESO DEL PROIETTILE|BULLET WEIGHT/.test(key)) summary.bulletWeightGr = toNumber(cells[1], decimalComma);
    else if (/^VELOCIT.*MEDIA|AVERAGE VELOCITY/.test(key)) summary.meanMps = toNumber(cells[1], decimalComma) * conv;
    else if (/DEVIAZIONE STANDARD|STANDARD DEVIATION/.test(key)) summary.sdMps = toNumber(cells[1], decimalComma) * conv;
    else if (/^DATA\b|^DATE\b/.test(key)) date = (cells[1] || '').replace(/^"|"$/g, '');
  }
  const title = (lines[0] || '').replace(/^"|"$/g, '').trim();
  return { ok: true, title, unit, shots, summary, date };
}

export function shotStats(values) {
  const n = values.length;
  if (!n) return null;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const ss = values.reduce((a, b) => a + (b - mean) ** 2, 0);
  return {
    n, mean,
    sd: n > 1 ? Math.sqrt(ss / (n - 1)) : 0,      // deviazione standard del campione (n-1)
    sdPop: Math.sqrt(ss / n),                     // quella usata dal Garmin nel riepilogo (verificato sul file)
    es: Math.max(...values) - Math.min(...values),
    min: Math.min(...values), max: Math.max(...values),
  };
}

// Segnala (senza escludere) i colpi lontani dalla mediana: soglia = max(5 sigma robusti, 5 m/s).
export function flagOutliers(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const med = sorted[Math.floor(sorted.length / 2)] / 2 + sorted[Math.ceil((sorted.length - 1) / 2)] / 2;
  const dev = values.map((v) => Math.abs(v - med)).sort((a, b) => a - b);
  const mad = dev[Math.floor(dev.length / 2)];
  const limit = Math.max(5 * 1.4826 * mad, 5);
  return { median: med, limit, flags: values.map((v) => Math.abs(v - med) > limit) };
}
