'use strict';
Screens.lettres = function (root) {
  root.style.setProperty('--acc', 'var(--c-lettres)');
  let timer = null, dead = false;
  const cleanup = () => { dead = true; if (timer) timer.stop(); };

  const NB = [];
  for (let i = 0; i < 16; i++) {
    const r = i >> 2, c = i & 3, a = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue; const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < 4 && cc >= 0 && cc < 4) a.push(rr * 4 + cc);
    }
    NB.push(a);
  }
  const tileVal = t => t === 'qu' ? 8 : LV[t];
  const vClass = v => v >= 10 ? 'v10' : v >= 8 ? 'v8' : v >= 4 ? 'v4' : v >= 3 ? 'v3' : v >= 2 ? 'v2' : 'v1';
  const pts = w => { let s = 0; for (const t of w.tiles) s += tileVal(t); const n = w.str.length; return s * (n <= 4 ? 1 : n - 3); };

  function solveAll(tiles) {
    const out = new Set(), used = new Array(16).fill(false);
    function dfs(i, str) {
      str += tiles[i];
      if (!G.hasPrefix(str)) return;
      if (str.length >= 3 && G.isWord(str)) out.add(str);
      used[i] = true;
      for (const n of NB[i]) if (!used[n]) dfs(n, str);
      used[i] = false;
    }
    for (let i = 0; i < 16; i++) dfs(i, '');
    return out;
  }
  function genBoard() {
    let best = null;
    for (let k = 0; k < 25; k++) {
      const tiles = [];
      for (let i = 0; i < 16; i++) { const l = drawLetter(Math.random); tiles.push(l === 'q' ? 'qu' : l); }
      const v = tiles.filter(t => 'aeiouy'.includes(t)).length;
      if (v < 4 || v > 8) continue;
      const rare = tiles.filter(t => 'qu' === t || 'kwxyzj'.includes(t));
      if (rare.length > 2 || new Set(rare).size < rare.length) continue;
      const words = solveAll(tiles);
      if (!best || words.size > best.words.size) best = { tiles, words };
      if (words.size >= 90) break;
    }
    return best;
  }

  function start() {
    const secs = getTime('lettres', 120);
    root.innerHTML = header('Lettres') + `<div class="loading" id="prep">Préparation de la grille…</div>`;
    bindBack(root);
    setTimeout(() => { if (!dead) play(secs, genBoard()); }, 30);
  }

  function menu() {
    const best = store.get('best_lettres_' + getTime('lettres', 120), 0);
    root.innerHTML = header('Lettres') + `
      <div class="card stack">
        <p style="margin:0">Fais glisser le doigt sur des lettres voisines (diagonales comprises) pour former des mots d'au moins 3 lettres. Les lettres rares valent plus de points, les mots longs encore plus.</p>
        <h2 style="margin:6px 0 0">Durée de la partie</h2>
        ${timePicker('lettres', [60, 120, 180, 300], 120)}
        <div class="small muted" id="bst">${best ? 'Record pour cette durée : ' + best + ' pts' : 'Aucun record pour cette durée'}</div>
        <button class="btn main block" id="go">Jouer</button>
      </div>`;
    bindBack(root); bindTimePicker(root, 'lettres');
    $('[data-tp="lettres"]', root).addEventListener('click', () => setTimeout(() => {
      const b = store.get('best_lettres_' + getTime('lettres', 120), 0);
      $('#bst', root).textContent = b ? 'Record pour cette durée : ' + b + ' pts' : 'Aucun record pour cette durée';
    }, 0));
    $('#go', root).onclick = start;
  }

  function play(secs, board) {
    const tiles = board.tiles, all = board.words;
    const found = new Map(); let score = 0, path = [], dragging = false, rects = [];
    root.innerHTML = header('Lettres') + `
      <div class="hud"><div class="time" id="tm"></div><div class="sc"><span class="muted">${all.size} mots possibles</span> &nbsp; <b id="sc">0</b> pts</div>
        <button class="icon" id="pz" aria-label="${secs ? 'Pause' : 'Terminer'}">${secs ? 'II' : 'OK'}</button></div>
      <div class="cur" id="cur"></div>
      <div style="position:relative"><div class="board" id="bd">${tiles.map((t, i) => `<div class="tile ${vClass(tileVal(t))}" data-i="${i}">${t === 'qu' ? 'Qu' : t}<sub>${tileVal(t)}</sub></div>`).join('')}<svg class="trail" id="tr"><polyline points=""/></svg></div></div>
      <div class="found" id="fd"></div>`;
    bindBack(root);
    const bd = $('#bd', root), tr = $('#tr', root), poly = $('polyline', tr), cur = $('#cur', root), tEls = $$('.tile', bd);

    function sizeTrail() { tr.setAttribute('width', bd.clientWidth); tr.setAttribute('height', bd.clientHeight); }
    sizeTrail();
    const centers = () => tEls.map(t => [t.offsetLeft + t.offsetWidth / 2, t.offsetTop + t.offsetHeight / 2]);
    function paint() {
      tEls.forEach((t, i) => t.classList.toggle('sel', path.includes(i)));
      const c = centers(); poly.setAttribute('points', path.map(i => c[i].join(',')).join(' '));
      cur.className = 'cur'; cur.textContent = path.map(i => tiles[i]).join('');
    }
    function cellAt(e) {
      for (let i = 0; i < 16; i++) {
        const r = rects[i], cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        if (Math.hypot(e.clientX - cx, e.clientY - cy) < r.width * 0.38) return i;
      }
      return -1;
    }
    function hit(e) {
      const i = cellAt(e); if (i < 0) return;
      const last = path[path.length - 1];
      if (last === undefined) path.push(i);
      else if (i === last) return;
      else if (path.length > 1 && i === path[path.length - 2]) path.pop();
      else if (!path.includes(i) && NB[last].includes(i)) path.push(i);
      else return;
      paint();
    }
    function flash(kind, label) {
      tEls.forEach((t, i) => { if (path.includes(i)) t.classList.add(kind); });
      cur.className = 'cur ' + kind; cur.innerHTML = esc(cur.textContent) + (label ? ` <small>${label}</small>` : '');
      setTimeout(() => { tEls.forEach(t => t.classList.remove('sel', 'ok', 'dup', 'bad')); poly.setAttribute('points', ''); cur.className = 'cur'; cur.textContent = ''; }, 420);
    }
    function submit() {
      if (!path.length) return;
      const str = path.map(i => tiles[i]).join('');
      const tl2 = path.map(i => tiles[i]);
      if (str.length < 3) { flash('bad', ''); path = []; return; }
      if (found.has(str)) { flash('dup', 'déjà trouvé'); path = []; return; }
      if (G.isWord(str)) {
        const p = pts({ str, tiles: tl2 }); found.set(str, p); score += p;
        $('#sc', root).textContent = score; flash('ok', '+' + p); buzz(12);
        const f = $('#fd', root); f.insertAdjacentHTML('afterbegin', `<span class="w">${esc(str)}<i>${p}</i></span>`);
      } else flash('bad', '');
      path = [];
    }
    bd.addEventListener('pointerdown', e => { if (timer.paused) return; e.preventDefault(); bd.setPointerCapture(e.pointerId); dragging = true; path = []; rects = tEls.map(t => t.getBoundingClientRect()); hit(e); });
    bd.addEventListener('pointermove', e => { if (dragging) { e.preventDefault(); hit(e); } });
    const up = () => { if (!dragging) return; dragging = false; submit(); };
    bd.addEventListener('pointerup', up);
    bd.addEventListener('pointercancel', () => { dragging = false; path = []; paint(); });

    const tm = $('#tm', root);
    timer = makeTimer(secs, (v, up2) => { tm.textContent = fmt(v); tm.classList.toggle('low', !up2 && v <= 10); }, () => finish());
    timer.start();
    let overlay = null;
    $('#pz', root).onclick = () => {
      if (!secs) return finish();
      if (!timer.paused) {
        timer.pause(); overlay = document.createElement('div'); overlay.className = 'overlay'; overlay.innerHTML = '<div><div class="big">Pause</div><button class="btn main" id="rs">Reprendre</button></div>';
        bd.parentElement.appendChild(overlay); $('#rs', overlay).onclick = () => { timer.resume(); overlay.remove(); };
      }
    };

    function finish() {
      timer.stop();
      const key = 'best_lettres_' + secs, prev = store.get(key, 0), rec = score > prev; if (rec) store.set(key, score);
      const missed = [...all].filter(w => !found.has(w)).sort((a, b) => (G.zipf(b) - G.zipf(a)) || (b.length - a.length));
      const shown = missed.filter(w => G.zipf(w) >= 30).slice(0, 40);
      const longest = [...all].sort((a, b) => b.length - a.length)[0];
      root.innerHTML = header('Résultat') + `
        <div class="card center"><div class="muted">Score</div><div class="big">${score} pts</div>
          <div>${found.size} mots sur ${all.size} possibles${rec && score > 0 ? ' · <b>nouveau record !</b>' : ''}</div>
          <div class="small muted" style="margin-top:6px">Plus long mot de la grille : <b>${esc((longest || '').toUpperCase())}</b></div></div>
        <div class="row" style="margin-top:12px"><button class="btn main" id="again">Rejouer</button><button class="btn" id="mn">Menu</button></div>
        <h2>Vos mots</h2><div class="list">${[...found].sort((a, b) => b[1] - a[1]).map(([w, p]) => `<span class="w">${esc(w)}<i>${p}</i></span>`).join('') || '<span class="muted small">Aucun mot</span>'}</div>
        <h2>Mots courants manqués</h2><div class="list">${shown.map(w => `<span class="w miss">${esc(w)}</span>`).join('') || '<span class="muted small">Rien de courant, bravo</span>'}</div>`;
      bindBack(root);
      $('#again', root).onclick = start; $('#mn', root).onclick = () => App.back();
    }
  }

  whenReady(root, menu);
  return cleanup;
};
