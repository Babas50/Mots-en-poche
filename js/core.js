'use strict';
const G = { words: [], wset: null, masks: null, common: [], cz: new Map(), ready: null, loaded: false };
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const store = {
  get(k, d) { try { const v = localStorage.getItem('mep_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('mep_' + k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem('mep_' + k); } catch (e) {} }
};
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function shuffle(a, r = Math.random) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function pick(a, r = Math.random) { return a[Math.floor(r() * a.length)]; }
const fmt = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const tl = s => s === 0 ? 'Illimité' : s < 60 ? s + ' s' : (s % 60 === 0 ? (s / 60) + ' min' : fmt(s));
const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };
function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 1800); }

/* tirage de lettres pondéré (fréquences du français) */
const LW = { e: 15, a: 9, i: 8, n: 6, o: 6, r: 6, s: 6, t: 6, u: 6, l: 5, d: 3, m: 3, g: 2, b: 2, c: 2, p: 2, f: 2, h: 2, v: 2, j: 1, q: 1, k: 1, w: 1, x: 1, y: 1, z: 1 };
const LKEYS = Object.keys(LW), LTOT = LKEYS.reduce((a, k) => a + LW[k], 0);
const VOW = 'aeiouy';
function drawLetter(r = Math.random, noRare = false) {
  for (;;) {
    let x = r() * LTOT;
    for (const k of LKEYS) { x -= LW[k]; if (x < 0) { if (noRare && 'qkwxyzj'.includes(k)) break; return k; } }
  }
}
const LV = { a: 1, e: 1, i: 1, l: 1, n: 1, o: 1, r: 1, s: 1, t: 1, u: 1, d: 2, g: 2, m: 2, b: 3, c: 3, p: 3, f: 4, h: 4, v: 4, j: 8, q: 8, k: 10, w: 10, x: 10, y: 10, z: 10 };

/* dictionnaire */
G.hasPrefix = function (p) {
  const W = G.words; let lo = 0, hi = W.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (W[m] < p) lo = m + 1; else hi = m; }
  return lo < W.length && W[lo].startsWith(p);
};
G.isWord = w => G.wset.has(w);
G.zipf = w => G.cz.get(w) || 0;
G.load = async function () {
  const [a, b] = await Promise.all([fetch('data/words.txt').then(r => r.text()), fetch('data/common.txt').then(r => r.text())]);
  G.words = a.split('\n');
  G.wset = new Set(G.words);
  const m = new Uint32Array(G.words.length);
  for (let i = 0; i < G.words.length; i++) { const w = G.words[i]; let x = 0; for (let j = 0; j < w.length; j++) x |= 1 << (w.charCodeAt(j) - 97); m[i] = x; }
  G.masks = m;
  for (const line of b.split('\n')) { const [w, z] = line.split(' '); G.common.push(w); G.cz.set(w, +z); }
  G.loaded = true;
};

/* sélecteur de durée */
function timePicker(key, presets, def) {
  const cur = store.get('t_' + key, def); const isPre = presets.includes(cur) || cur === 0;
  return `<div class="chips" data-tp="${key}">` +
    presets.map(s => `<button class="chip ${cur === s ? 'on' : ''}" data-s="${s}">${tl(s)}</button>`).join('') +
    `<button class="chip ${cur === 0 ? 'on' : ''}" data-s="0">Illimité</button>` +
    `<button class="chip ${!isPre ? 'on' : ''}" data-s="custom">Perso</button></div>` +
    `<div class="custom ${isPre ? 'hide' : ''}"><label>Durée en secondes<input type="number" inputmode="numeric" min="10" max="3600" step="5" value="${isPre ? '' : cur}"></label></div>`;
}
function bindTimePicker(root, key) {
  const box = $('[data-tp="' + key + '"]', root), custom = box.nextElementSibling, inp = $('input', custom);
  box.onclick = e => {
    const b = e.target.closest('.chip'); if (!b) return;
    $$('.chip', box).forEach(x => x.classList.toggle('on', x === b));
    if (b.dataset.s === 'custom') { custom.classList.remove('hide'); const v = parseInt(inp.value); if (v >= 10) store.set('t_' + key, Math.min(3600, v)); }
    else { custom.classList.add('hide'); store.set('t_' + key, +b.dataset.s); }
  };
  inp.oninput = () => { const v = parseInt(inp.value); if (v >= 10) store.set('t_' + key, Math.min(3600, v)); };
}
const getTime = (key, def) => store.get('t_' + key, def);

/* minuteur partagé : compte à rebours ou chronomètre si secs = 0 */
function makeTimer(secs, onTick, onEnd) {
  let id = null, started = 0, elapsedBefore = 0, paused = false;
  const now = () => Date.now();
  const elapsed = () => elapsedBefore + (paused || !started ? 0 : (now() - started) / 1000);
  const remaining = () => secs ? secs - elapsed() : null;
  const tick = () => { const r = remaining(); onTick(secs ? r : elapsed(), secs === 0); if (secs && r <= 0) { stop(); onEnd(); } };
  function start() { started = now(); paused = false; id = setInterval(tick, 200); tick(); }
  function pause() { if (paused) return; elapsedBefore = elapsed(); paused = true; }
  function resume() { if (!paused) return; started = now(); paused = false; }
  function stop() { clearInterval(id); id = null; elapsedBefore = elapsed(); paused = true; }
  return { start, pause, resume, stop, elapsed, get paused() { return paused; } };
}

/* routeur */
const Screens = {};
const App = {
  cleanup: null, cur: 'menu',
  go(name, push = true) {
    if (App.cleanup) { try { App.cleanup(); } catch (e) {} App.cleanup = null; }
    App.cur = name;
    const root = $('#app'); root.innerHTML = ''; root.className = 'screen s-' + name;
    window.scrollTo(0, 0);
    App.cleanup = Screens[name](root) || null;
    if (push && name !== 'menu') history.pushState({ s: name }, '');
  },
  back() { if (history.state && history.state.s) history.back(); else App.go('menu', false); }
};
function header(title, right = '') { return `<div class="hdr"><button class="icon" data-back aria-label="Retour">&#8592;</button><h1>${esc(title)}</h1>${right}</div>`; }
function bindBack(root) { const b = $('[data-back]', root); if (b) b.onclick = () => App.back(); }
function whenReady(root, fn) {
  if (G.loaded) return fn();
  root.insertAdjacentHTML('beforeend', '<div class="loading" id="ld">Chargement du dictionnaire…</div>');
  G.ready.then(() => { const l = $('#ld', root); if (l) l.remove(); fn(); }).catch(() => { const l = $('#ld', root); if (l) l.textContent = 'Impossible de charger le dictionnaire. Rouvrez l\'appli avec du réseau une première fois.'; });
}
