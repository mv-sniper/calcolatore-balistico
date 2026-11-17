// Componenti di interfaccia: campi con unità selezionabile e utilità HTML.
import { FAMILIES, fromBase } from './units.js';
import { U } from './state.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function unitSelect(fam, label) {
  const unit = U(fam);
  const opts = Object.entries(FAMILIES[fam].units).map(([k, u]) => `<option value="${k}"${k === unit ? ' selected' : ''}>${esc(u.label)}</option>`).join('');
  return `<select class="unit" data-unit="${fam}" aria-label="Unità: ${esc(label)}">${opts}</select>`;
}

// value in unità base; l'input mostra l'unità scelta dall'utente.
export function numField({ scope, path, label, fam, value, ph = '', hint = '', dec }) {
  let shown = '';
  if (value != null && Number.isFinite(value)) {
    const v = fam ? fromBase(fam, U(fam), value) : value;
    const d = dec ?? (fam ? FAMILIES[fam].units[U(fam)].dec + 2 : 4);
    shown = String(Number(v.toFixed(d))).replace('.', ',');
  }
  return `<label class="fld"><span>${esc(label)}</span><div class="inp"><input type="text" inputmode="decimal" autocomplete="off" data-scope="${scope}" data-path="${path}" data-kind="num"${fam ? ` data-fam="${fam}"` : ''} value="${esc(shown)}" placeholder="${esc(ph)}">${fam ? unitSelect(fam, label) : ''}</div>${hint ? `<small>${esc(hint)}</small>` : ''}</label>`;
}

export function textField({ scope, path, label, value, list = '', ph = '', hint = '' }) {
  const id = list ? `dl-${path.replace(/\W/g, '')}` : '';
  return `<label class="fld"><span>${esc(label)}</span><input type="text" data-scope="${scope}" data-path="${path}" data-kind="text" value="${esc(value ?? '')}" placeholder="${esc(ph)}"${list ? ` list="${id}"` : ''} autocomplete="off">${list ? `<datalist id="${id}">${list.map((x) => `<option value="${esc(x)}">`).join('')}</datalist>` : ''}${hint ? `<small>${esc(hint)}</small>` : ''}</label>`;
}

// options: [[valore, etichetta], ...]
export function selectField({ scope, path, label, value, options, kind = 'text' }) {
  const opts = options.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(value ?? '') ? ' selected' : ''}>${esc(l)}</option>`).join('');
  return `<label class="fld"><span>${esc(label)}</span><select data-scope="${scope}" data-path="${path}" data-kind="${kind}">${opts}</select></label>`;
}

export function checkField({ scope, path, label, value, hint = '' }) {
  return `<label class="chk"><input type="checkbox" data-scope="${scope}" data-path="${path}" data-kind="bool"${value ? ' checked' : ''}><span>${esc(label)}</span>${hint ? `<small>${esc(hint)}</small>` : ''}</label>`;
}
