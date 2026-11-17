// Archivio locale (localStorage) con esportazione/importazione di backup.
// Nei browser la memoria locale può essere cancellata dal sistema in certi casi: il backup in file è la garanzia.

const KEY = 'ballistica.v1';
export const STORE_VERSION = 1;

export function emptyStore() {
  return { version: STORE_VERSION, rifles: [], bullets: [], cartridges: [], settings: {}, powders: [], primers: [], cases: [] };
}

export function uid(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function loadStore(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return emptyStore();
    return normalize(JSON.parse(raw));
  } catch (e) {
    return emptyStore();
  }
}

export function saveStore(store, storage = globalThis.localStorage) {
  try { storage.setItem(KEY, JSON.stringify(store)); return true; } catch (e) { return false; }
}

function normalize(obj) {
  const base = emptyStore();
  const out = { ...base, ...obj };
  for (const k of ['rifles', 'bullets', 'cartridges', 'powders', 'primers', 'cases']) if (!Array.isArray(out[k])) out[k] = [];
  if (typeof out.settings !== 'object' || !out.settings) out.settings = {};
  out.version = STORE_VERSION;
  return out;
}

export function exportBackup(store) {
  return JSON.stringify({ app: 'calcolatore-balistico', exportedAt: new Date().toISOString(), data: store }, null, 1);
}

// Importa un backup: sostituisce i dati (la conferma spetta all'interfaccia).
export function importBackup(text) {
  let parsed;
  try { parsed = JSON.parse(text); } catch (e) { return { ok: false, error: 'File non valido (JSON non leggibile).' }; }
  if (!parsed || parsed.app !== 'calcolatore-balistico' || typeof parsed.data !== 'object') {
    return { ok: false, error: 'Il file non sembra un backup di questa app.' };
  }
  return { ok: true, store: normalize(parsed.data) };
}

export function upsert(list, item) {
  const i = list.findIndex((x) => x.id === item.id);
  if (i >= 0) list[i] = item; else list.push(item);
}

export function remove(list, id) {
  const i = list.findIndex((x) => x.id === id);
  if (i >= 0) list.splice(i, 1);
}
