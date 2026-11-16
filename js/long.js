'use strict';
Screens.long = function (root) {
  root.style.setProperty('--acc', 'var(--c-long)');
  let timer = null;
  const cleanup = () => { if (timer) timer.stop(); };

  function counts(s) { const c = new Int8Array(26); for (let i = 0; i < s.length; i++) c[s.charCodeAt(i) - 97]++; return c; }
  function fits(word, have) { const c = counts(word); for (let i = 0; i < 26; i++) if (c[i] > have[i]) return false; return true; }
  function maskOf(s) { let m = 0; for (let i = 0; i < s.length; i++) m |= 1 << (s.charCodeAt(i) - 97); return m; }

  function draw(n) {
    const seeds = G.common.filter(w => w.length >= n - 3 && w.length <= n - 1 && G.zipf(w) >= 35 && !/(.)\1\1/.test(w));
    for (let t = 0; t < 50; t++) {
      const seed = pick(seeds);
      let letters = seed.split('');
      while (letters.length < n) letters.push(drawLetter(Math.random, true));
      const v = letters.filter(l => 'aeiou'.includes(l)).length;
      if (v >= 3 && n - v >= 3) return shuffle(letters);
    }
    return shuffle(pick(seeds).split(''));
  }
  function solutions(letters) {
    const have = counts(letters.join('')), mask = maskOf(letters.join('')), n = letters.length, out = [];
    for (let i = 0; i < G.words.length; i++) {
      const w = G.words[i];
      if (w.length < 3 || w.length > n) continue;
      if ((G.masks[i] & ~mask) !== 0) continue;
      if (fits(w, have)) out.push(w);
    }
    return out;
  }

  function menu() {
    const n = store.get('nl', 10), best = store.get('best_long', 0);
    root.innerHTML = header('Mot le plus long') + `
      <div class="card stack">
        <p style="margin:0">Des lettres sont tirées au sort. Trouve le mot le plus long possible, en utilisant chaque lettre au plus une fois. Tu peux valider plusieurs mots : le plus long compte.</p>
        <h2 style="margin:6px 0 0">Nombre de lettres</h2>
        <div class="chips" id="nl">${[8, 9, 10, 11].map(k => `<button class="chip ${k === n ? 'on' : ''}" data-n="${k}">${k}</button>`).join('')}</div>
        <h2 style="margin:6px 0 0">Durée</h2>
        ${timePicker('long', [30, 60, 90, 120], 60)}
        <div class="small muted">${best ? 'Record : mot de ' + best + ' lettres' : ''}</div>
        <button class="btn main block" id="go">Tirer les lettres</button>
      </div>`;
    bindBack(root); bindTimePicker(root, 'long');
    $('#nl', root).onclick = e => { const b = e.target.closest('.chip'); if (!b) return; $$('.chip', $('#nl', root)).forEach(x => x.classList.toggle('on', x === b)); store.set('nl', +b.dataset.n); };
    $('#go', root).onclick = () => play(store.get('nl', 10), getTime('long', 60));
  }

  function play(n, secs) {
    const letters = draw(n); const valid = new Map(); let sel = [];
    root.innerHTML = header('Mot le plus long') + `
      <div class="hud"><div class="time" id="tm"></div><div class="sc">Meilleur : <b id="bs">0</b></div><button class="icon" id="fin" aria-label="Terminer">OK</button></div>
      <div class="word-in" id="wi"></div>
      <div class="cur" id="msg"></div>
      <div class="rack" id="rk">${letters.map((l, i) => `<button class="tile ${'aeiouy'.includes(l) ? 'v1' : 'v2'}" data-i="${i}">${l}</button>`).join('')}</div>
      <div class="row"><button class="btn" id="clr">Effacer</button><button class="btn" id="shf">Mélanger</button><button class="btn main" id="ok">Valider</button></div>
      <div class="found" id="fd" style="margin-top:14px"></div>`;
    bindBack(root);
    const rk = $('#rk', root), wi = $('#wi', root), msg = $('#msg', root);
    let order = letters.map((_, i) => i);
    const word = () => sel.map(i => letters[i]).join('');
    function paint() {
      $$('.tile', rk).forEach(t => t.classList.toggle('used', sel.includes(+t.dataset.i)));
      wi.innerHTML = sel.map(i => `<div class="tile">${letters[i]}</div>`).join('');
    }
    function say(kind, text) { msg.className = 'cur ' + kind; msg.textContent = text; clearTimeout(say.t); say.t = setTimeout(() => { msg.className = 'cur'; msg.textContent = ''; }, 1400); }
    rk.onclick = e => { const t = e.target.closest('.tile'); if (!t) return; const i = +t.dataset.i; if (sel.includes(i)) return; sel.push(i); buzz(8); paint(); };
    wi.onclick = () => { sel.pop(); paint(); };
    $('#clr', root).onclick = () => { sel = []; paint(); };
    $('#shf', root).onclick = () => {
      order = shuffle(order); const tiles = $$('.tile', rk).sort((a, b) => order.indexOf(+a.dataset.i) - order.indexOf(+b.dataset.i)); tiles.forEach(t => rk.appendChild(t));
    };
    $('#ok', root).onclick = () => {
      const w = word(); if (!w) return;
      if (w.length < 3) say('bad', 'Trop court');
      else if (valid.has(w)) say('dup', 'Déjà trouvé');
      else if (G.isWord(w)) {
        valid.set(w, w.length); say('ok', w.length === n ? 'Toutes les lettres ! +' + w.length : '+' + w.length); buzz(15);
        $('#fd', root).insertAdjacentHTML('afterbegin', `<span class="w">${esc(w)}<i>${w.length}</i></span>`);
        $('#bs', root).textContent = Math.max(...valid.values());
      } else say('bad', 'Mot inconnu');
      sel = []; paint();
    };
    const tm = $('#tm', root);
    timer = makeTimer(secs, (v, up) => { tm.textContent = fmt(v); tm.classList.toggle('low', !up && v <= 10); }, finish);
    timer.start();
    $('#fin', root).onclick = finish;
    let done = false;
    function finish() {
      if (done) return; done = true; timer.stop();
      const sols = solutions(letters);
      const maxAny = sols.reduce((a, w) => Math.max(a, w.length), 0);
      const common = sols.filter(w => G.zipf(w) >= 30), maxCom = common.reduce((a, w) => Math.max(a, w.length), 0);
      const mine = valid.size ? Math.max(...valid.values()) : 0;
      const prev = store.get('best_long', 0); if (mine > prev) store.set('best_long', mine);
      const top = w => sols.filter(x => x.length === w).sort((a, b) => G.zipf(b) - G.zipf(a)).slice(0, 8);
      const verdict = mine >= maxAny ? 'Parfait, mot maximal trouvé.' : mine >= maxCom ? 'Vous avez trouvé le meilleur mot courant.' : mine ? 'Il y avait plus long.' : 'Aucun mot validé.';
      root.innerHTML = header('Résultat') + `
        <div class="card center"><div class="muted">Votre meilleur mot</div><div class="big">${mine} lettres</div><div>${verdict}</div>
          <div class="rack" style="margin-top:12px">${letters.map(l => `<div class="tile ${'aeiouy'.includes(l) ? 'v1' : 'v2'}">${l}</div>`).join('')}</div></div>
        <div class="card stack" style="margin-top:12px">
          <div><b>${maxCom}</b> lettres, meilleur mot courant : ${top(maxCom).filter(w => G.zipf(w) >= 30).map(w => `<span class="w">${esc(w)}</span>`).join(' ')}</div>
          ${maxAny > maxCom ? `<div><b>${maxAny}</b> lettres, mot rare du dictionnaire : ${top(maxAny).map(w => `<span class="w miss">${esc(w)}</span>`).join(' ')}</div>` : ''}
        </div>
        <div class="row" style="margin-top:12px"><button class="btn main" id="again">Nouveau tirage</button><button class="btn" id="mn">Menu</button></div>
        <h2>Vos mots</h2><div class="list">${[...valid].sort((a, b) => b[1] - a[1]).map(([w, p]) => `<span class="w">${esc(w)}<i>${p}</i></span>`).join('') || '<span class="muted small">Aucun mot</span>'}</div>`;
      bindBack(root);
      $('#again', root).onclick = () => play(n, secs); $('#mn', root).onclick = () => App.back();
    }
  }

  whenReady(root, menu);
  return cleanup;
};
