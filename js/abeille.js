'use strict';
Screens.abeille = function (root) {
  root.style.setProperty('--acc', 'var(--c-abeille)');
  const RANKS = [[0, 'Débutant'], [.05, 'Bien démarré'], [.12, 'Bon début'], [.22, 'Solide'], [.35, 'Excellent'], [.55, 'Impressionnant'], [.75, 'Génie'], [1, 'Reine des abeilles']];

  function pangrams() {
    if (!G.pan) G.pan = G.common.filter(w => w.length >= 7 && G.zipf(w) >= 30 && new Set(w).size === 7);
    return G.pan;
  }
  function maskOf(s) { let m = 0; for (let i = 0; i < s.length; i++) m |= 1 << (s.charCodeAt(i) - 97); return m; }
  const score = (w, full) => (w.length === 4 ? 1 : w.length) + (full ? 7 : 0);

  function build(rnd) {
    const P = pangrams(); let best = null;
    for (let t = 0; t < 40; t++) {
      const pw = pick(P, rnd), letters = [...new Set(pw)], mask = maskOf(pw);
      const cand = [];
      for (let i = 0; i < G.words.length; i++) {
        const w = G.words[i];
        if (w.length >= 4 && (G.masks[i] & ~mask) === 0) cand.push(w);
      }
      for (const center of shuffle(letters, rnd)) {
        const words = cand.filter(w => w.includes(center));
        const com = words.filter(w => G.zipf(w) >= 30);
        const sc = com.reduce((a, w) => a + score(w, maskOf(w) === mask), 0);
        const ok = com.length >= 18 && com.length <= 90;
        if (!best || (ok && !best.ok) || (ok === best.ok && Math.abs(com.length - 40) < Math.abs(best.com.length - 40))) best = { pw, center, letters, mask, words, com, max: sc, ok };
        if (ok && com.length >= 25) return best;
      }
    }
    return best;
  }
  const todayKey = () => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); };

  function menu() {
    const k = todayKey(), saved = store.get('abeille_day', null);
    const doneToday = saved && saved.k === k ? saved.rank : null;
    root.innerHTML = header('Abeille') + `
      <div class="card stack">
        <p style="margin:0">Forme des mots d'au moins 4 lettres avec les 7 lettres proposées. La lettre centrale est obligatoire, les lettres peuvent être réutilisées. Un mot qui utilise les 7 lettres est un pangramme : +7 points.</p>
        <button class="btn main block" id="day" style="color:#2a1c00">Grille du jour${doneToday ? ' (' + esc(doneToday) + ')' : ''}</button>
        <button class="btn block" id="rnd">Grille aléatoire</button>
      </div>`;
    bindBack(root);
    $('#day', root).onclick = () => play(mulberry32(todayKey() * 7919), true);
    $('#rnd', root).onclick = () => play(Math.random, false);
  }

  function play(rnd, daily) {
    root.innerHTML = header('Abeille') + '<div class="loading">Préparation de la grille…</div>'; bindBack(root);
    setTimeout(() => run(build(rnd), daily), 30);
  }

  function run(P, daily) {
    let outer = shuffle(P.letters.filter(l => l !== P.center));
    const found = new Map(); let pts = 0, cur = '';
    const valid = new Set(P.words);
    root.innerHTML = header('Abeille') + `
      <div class="card" style="padding:12px">
        <div class="row" style="align-items:center"><div><b id="rk">Débutant</b></div><div style="text-align:right"><b id="pt">0</b> pts</div></div>
        <div class="bar" style="margin-top:6px"><div id="br"></div></div>
        <div class="rank"><span id="nw">0 mot</span><span>${P.com.length} mots courants à trouver</span></div>
      </div>
      <div class="cur" id="msg" style="margin-top:6px"><span id="inp"></span></div>
      <div class="hexwrap" id="hx"></div>
      <div class="row"><button class="btn" id="del">Effacer</button><button class="btn" id="shf">Mélanger</button><button class="btn main" id="ok" style="color:#2a1c00">Entrer</button></div>
      <div class="found" id="fd" style="margin-top:12px;max-height:22vh"></div>
      <button class="btn block" id="giveup" style="margin-top:12px">Voir les solutions</button>`;
    bindBack(root);
    const W = 98, H = 85, cx = 144 - W / 2, cy = 135 - H / 2;
    const offs = [[0, -H], [.75 * W, -.5 * H], [.75 * W, .5 * H], [0, H], [-.75 * W, .5 * H], [-.75 * W, -.5 * H]];
    const hx = $('#hx', root), inp = $('#inp', root), msg = $('#msg', root);
    function drawHex() {
      hx.innerHTML = `<button class="hex mid" data-l="${P.center}" style="left:${cx}px;top:${cy}px">${P.center}</button>` +
        outer.map((l, i) => `<button class="hex" data-l="${l}" style="left:${cx + offs[i][0] * 1.03}px;top:${cy + offs[i][1] * 1.03}px">${l}</button>`).join('');
    }
    drawHex();
    const showInp = () => { inp.innerHTML = [...cur].map(c => `<span style="${c === P.center ? 'color:var(--c-abeille)' : ''}">${c}</span>`).join(''); };
    function say(kind, t) { msg.className = 'cur ' + kind; msg.innerHTML = '<span id="inp"></span>'; $('#inp', root).textContent = t; clearTimeout(say.t); say.t = setTimeout(() => { msg.className = 'cur'; msg.innerHTML = '<span id="inp"></span>'; showInp(); }, 1100); }
    hx.onclick = e => { const b = e.target.closest('.hex'); if (!b) return; if (cur.length < 20) cur += b.dataset.l; buzz(8); msg.className = 'cur'; msg.innerHTML = '<span id="inp"></span>'; showInp(); };
    $('#del', root).onclick = () => { cur = cur.slice(0, -1); showInp(); };
    $('#shf', root).onclick = () => { outer = shuffle(outer); drawHex(); };
    function rank() {
      const r = P.max ? Math.min(1, pts / P.max) : 0; let name = RANKS[0][1];
      for (const [t, n] of RANKS) if (r >= t) name = n;
      $('#rk', root).textContent = name; $('#br', root).style.width = Math.round(r * 100) + '%';
      if (daily) store.set('abeille_day', { k: todayKey(), rank: name });
    }
    $('#ok', root).onclick = () => {
      const w = cur; if (!w) return; cur = '';
      if (w.length < 4) return say('bad', 'Trop court');
      if (!w.includes(P.center)) return say('bad', 'Lettre centrale manquante');
      if (found.has(w)) return say('dup', 'Déjà trouvé');
      if (!valid.has(w)) return say('bad', 'Mot inconnu');
      const full = maskOf(w) === P.mask, p = score(w, full); found.set(w, p); pts += p;
      say(full ? 'ok' : 'ok', full ? 'Pangramme ! +' + p : '+' + p); buzz(full ? 40 : 15);
      $('#fd', root).insertAdjacentHTML('afterbegin', `<span class="w ${full ? 'pan' : ''}">${esc(w)}<i>${p}</i></span>`);
      $('#pt', root).textContent = pts; $('#nw', root).textContent = found.size + (found.size > 1 ? ' mots' : ' mot'); rank();
    };
    $('#giveup', root).onclick = () => {
      const rest = P.words.filter(w => !found.has(w)).sort((a, b) => (G.zipf(b) - G.zipf(a)) || (b.length - a.length));
      const com = rest.filter(w => G.zipf(w) >= 30), rare = rest.length - com.length;
      root.innerHTML = header('Solutions') + `
        <div class="card center"><div class="muted">Lettres</div><div class="rack" style="margin-top:8px">${[P.center, ...P.letters.filter(l => l !== P.center)].map((l, i) => `<div class="tile ${i ? 'v1' : ''}" ${i ? '' : 'style="background:var(--c-abeille);color:#2a1c00"'}>${l}</div>`).join('')}</div>
          <div>Vous : <b>${pts}</b> pts, ${found.size} mots. Pangramme : <b>${esc(P.pw.toUpperCase())}</b></div></div>
        <h2>Mots courants manqués (${com.length})</h2><div class="list">${com.map(w => `<span class="w ${maskOf(w) === P.mask ? 'pan' : 'miss'}">${esc(w)}</span>`).join('') || '<span class="muted small">Aucun</span>'}</div>
        <p class="muted small">${rare} autres mots rares acceptés par le dictionnaire.</p>
        <button class="btn main block" id="mn" style="color:#2a1c00">Menu</button>`;
      bindBack(root); $('#mn', root).onclick = () => App.back();
    };
  }

  whenReady(root, menu);
};
