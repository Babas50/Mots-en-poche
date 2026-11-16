'use strict';
Screens.melees = function (root) {
  root.style.setProperty('--acc', 'var(--c-melees)');
  const THEMES = {
    'Animaux': 'chien chat cheval vache cochon mouton chevre lapin poule canard oie renard loup ours cerf sanglier singe girafe elephant zebre lion tigre panda koala dauphin baleine requin tortue grenouille escargot abeille fourmi papillon aigle hibou moineau corbeau pigeon',
    'Cuisine': 'poele casserole fourchette couteau cuillere assiette bol verre tasse louche fouet four plat saladier marmite spatule balance cocotte passoire rape moule recette farine sucre beurre sel poivre huile vinaigre',
    'Corps humain': 'tete bras jambe main pied doigt genou coude epaule cou dos ventre nez bouche oeil oreille dent langue cheveu peau coeur poumon foie rein muscle cheville poignet hanche menton joue front',
    'Nature': 'foret montagne riviere fleuve lac mer ocean plage desert prairie colline vallee falaise cascade source ruisseau etang volcan ile roche sable herbe arbre fleur feuille racine nuage orage pluie neige vent soleil',
    'Métiers': 'boulanger boucher medecin infirmier pilote facteur plombier macon peintre avocat juge maire pompier policier cuisinier serveur coiffeur menuisier fermier berger pecheur artiste chanteur acteur ecrivain professeur ingenieur dentiste architecte',
    'Maison': 'salon cuisine chambre salle bain garage cave grenier jardin terrasse balcon escalier porte fenetre toit mur sol plafond canape fauteuil table chaise lit armoire tapis rideau lampe miroir etagere bureau couloir',
    'Voyage': 'valise avion train bateau voiture bus taxi gare port aeroport billet passeport hotel plage tente camping carte guide sac route pont tunnel frontiere douane voyageur visite musee monument escale depart arrivee',
    'Sport': 'football tennis rugby basket natation cyclisme course judo boxe golf ski voile escrime danse gymnastique handball volley athletisme karate surf ballon raquette filet arbitre match equipe champion medaille stade piste'
  };
  const DIRS = [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]];
  const LEVELS = { facile: [0, 1], moyen: [0, 1, 2, 3], difficile: [0, 1, 2, 3, 4, 5, 6, 7] };
  const cfg = () => store.get('mm_cfg', { size: 10, level: 'moyen', theme: 'Mixte', count: 10 });

  function wordPool(theme, n) {
    if (theme === 'Mixte') return G.common.filter(w => w.length >= 5 && w.length <= n && G.zipf(w) >= 40 && !w.endsWith('s'));
    return THEMES[theme].split(' ').filter(w => w.length >= 3 && w.length <= n);
  }
  function generate(c) {
    const n = c.size, dirs = LEVELS[c.level];
    for (let attempt = 0; attempt < 30; attempt++) {
      const grid = new Array(n * n).fill(''), placed = [];
      const cands = shuffle(wordPool(c.theme, n)).slice(0, c.count * 3).sort((a, b) => b.length - a.length);
      for (const w of cands) {
        if (placed.length >= c.count) break;
        if (placed.some(p => p.word === w || p.word.includes(w) || w.includes(p.word))) continue;
        for (let t = 0; t < 250; t++) {
          const d = DIRS[pick(dirs)], r = Math.floor(Math.random() * n), cc = Math.floor(Math.random() * n);
          const er = r + d[0] * (w.length - 1), ec = cc + d[1] * (w.length - 1);
          if (er < 0 || er >= n || ec < 0 || ec >= n) continue;
          let ok = true, same = 0;
          for (let k = 0; k < w.length; k++) { const g = grid[(r + d[0] * k) * n + cc + d[1] * k]; if (g && g !== w[k]) { ok = false; break; } if (g === w[k]) same++; }
          if (!ok || same === w.length) continue;
          const cells = []; for (let k = 0; k < w.length; k++) { const i = (r + d[0] * k) * n + cc + d[1] * k; grid[i] = w[k]; cells.push(i); }
          placed.push({ word: w, cells }); break;
        }
      }
      if (placed.length >= Math.max(5, c.count - 2)) {
        for (let i = 0; i < grid.length; i++) if (!grid[i]) grid[i] = drawLetter(Math.random, true);
        return { grid, placed };
      }
    }
    return null;
  }

  function menu() {
    const c = cfg(), best = store.get('best_mm', {});
    const bk = c.size + c.level;
    root.innerHTML = header('Mots mêlés') + `
      <div class="card stack">
        <p style="margin:0">Retrouve les mots cachés. Fais glisser le doigt de la première à la dernière lettre, en ligne droite.</p>
        <h2 style="margin:6px 0 0">Taille</h2>
        <div class="chips" data-k="size">${[8, 10, 12].map(k => `<button class="chip ${c.size === k ? 'on' : ''}" data-v="${k}">${k} x ${k}</button>`).join('')}</div>
        <h2 style="margin:6px 0 0">Difficulté</h2>
        <div class="chips" data-k="level">${Object.keys(LEVELS).map(k => `<button class="chip ${c.level === k ? 'on' : ''}" data-v="${k}">${k[0].toUpperCase() + k.slice(1)}</button>`).join('')}</div>
        <div class="small muted" id="lh"></div>
        <h2 style="margin:6px 0 0">Nombre de mots</h2>
        <div class="chips" data-k="count">${[6, 8, 10, 12].map(k => `<button class="chip ${c.count === k ? 'on' : ''}" data-v="${k}">${k}</button>`).join('')}</div>
        <h2 style="margin:6px 0 0">Thème</h2>
        <select id="th">${['Mixte', ...Object.keys(THEMES)].map(t => `<option ${t === c.theme ? 'selected' : ''}>${t}</option>`).join('')}</select>
        <div class="small muted">${best[bk] ? 'Record ' + c.size + 'x' + c.size + ' ' + c.level + ' : ' + fmt(best[bk]) : ''}</div>
        <button class="btn main block" id="go">Jouer</button>
      </div>`;
    bindBack(root);
    const hint = () => { $('#lh', root).textContent = { facile: 'Mots de gauche à droite et de haut en bas.', moyen: 'Ajoute les diagonales descendantes et montantes.', difficile: 'Les 8 directions, mots à l\'envers compris.' }[cfg().level]; };
    hint();
    $$('.chips[data-k]', root).forEach(box => box.onclick = e => {
      const b = e.target.closest('.chip'); if (!b) return;
      $$('.chip', box).forEach(x => x.classList.toggle('on', x === b));
      const k = box.dataset.k, v = k === 'level' ? b.dataset.v : +b.dataset.v; const cc = cfg(); cc[k] = v; store.set('mm_cfg', cc); hint();
    });
    $('#th', root).onchange = e => { const cc = cfg(); cc.theme = e.target.value; store.set('mm_cfg', cc); };
    $('#go', root).onclick = () => { root.innerHTML = header('Mots mêlés') + '<div class="loading">Création de la grille…</div>'; bindBack(root); setTimeout(() => play(cfg()), 30); };
  }

  function play(c) {
    const puz = generate(c);
    if (!puz) { toast('Création impossible, réessayez'); return menu(); }
    const n = c.size, { grid, placed } = puz; const done = new Set();
    root.innerHTML = header('Mots mêlés', `<button class="icon" id="hint" aria-label="Indice">?</button>`) + `
      <div class="hud"><div class="time" id="tm">0:00</div><div class="sc"><b id="nf">0</b> / ${placed.length} mots</div></div>
      <div class="mgrid" id="mg" style="grid-template-columns:repeat(${n},1fr)">${grid.map((l, i) => `<div class="mc" data-i="${i}">${l}</div>`).join('')}</div>
      <div class="mwords" id="mw">${placed.map((p, i) => `<span class="mw" data-w="${i}">${esc(p.word)}</span>`).join('')}</div>
      <div class="row" style="margin-top:14px"><button class="btn" id="giveup">Abandonner</button><button class="btn main" id="newg">Nouvelle grille</button></div>`;
    bindBack(root);
    const mg = $('#mg', root), cells = $$('.mc', mg); let start = -1, sel = [], rects = [];
    const timer = makeTimer(0, v => { $('#tm', root).textContent = fmt(v); }, () => {}); timer.start();

    function idxAt(e) {
      const r = mg.getBoundingClientRect(), pad = 8, cs = (r.width - pad * 2) / n;
      let col = Math.floor((e.clientX - r.left - pad) / cs), row = Math.floor((e.clientY - r.top - pad) / cs);
      col = Math.max(0, Math.min(n - 1, col)); row = Math.max(0, Math.min(n - 1, row)); return row * n + col;
    }
    function line(a, b) {
      const r0 = Math.floor(a / n), c0 = a % n, dr = Math.floor(b / n) - r0, dc = b % n - c0;
      if (!dr && !dc) return [a];
      const ang = Math.atan2(dr, dc), k = Math.round(ang / (Math.PI / 4)), step = [[0, 1], [1, 1], [1, 0], [1, -1], [0, -1], [-1, -1], [-1, 0], [-1, 1]][((k % 8) + 8) % 8];
      const len = step[0] && step[1] ? Math.max(Math.abs(dr), Math.abs(dc)) : Math.max(Math.abs(dr), Math.abs(dc));
      const out = [];
      for (let t = 0; t <= len; t++) { const rr = r0 + step[0] * t, cc = c0 + step[1] * t; if (rr < 0 || rr >= n || cc < 0 || cc >= n) break; out.push(rr * n + cc); }
      return out;
    }
    const paint = () => cells.forEach((el, i) => el.classList.toggle('pre', sel.includes(i)));
    mg.addEventListener('pointerdown', e => { e.preventDefault(); mg.setPointerCapture(e.pointerId); start = idxAt(e); sel = [start]; paint(); });
    mg.addEventListener('pointermove', e => { if (start < 0) return; sel = line(start, idxAt(e)); paint(); });
    mg.addEventListener('pointerup', () => {
      if (start < 0) return; const s = sel.map(i => grid[i]).join(''), rs = [...s].reverse().join('');
      const k = placed.findIndex((p, i) => !done.has(i) && (p.word === s || p.word === rs));
      if (k >= 0) {
        done.add(k); const col = 'f' + (done.size % 8); placed[k].cells.forEach(i => { cells[i].classList.add(col); });
        const chip = $('[data-w="' + k + '"]', root); chip.classList.add('done', col); buzz(20);
        $('#nf', root).textContent = done.size;
        if (done.size === placed.length) win();
      }
      start = -1; sel = []; paint();
    });
    mg.addEventListener('pointercancel', () => { start = -1; sel = []; paint(); });

    $('#hint', root).onclick = () => {
      const rest = placed.map((p, i) => i).filter(i => !done.has(i)); if (!rest.length) return;
      const p = placed[pick(rest)], el = cells[p.cells[0]]; el.classList.remove('hint'); void el.offsetWidth; el.classList.add('hint'); toast('Commence par cette lettre : ' + p.word.length + ' lettres');
    };
    $('#newg', root).onclick = () => { timer.stop(); root.innerHTML = header('Mots mêlés') + '<div class="loading">Création de la grille…</div>'; bindBack(root); setTimeout(() => play(cfg()), 30); };
    $('#giveup', root).onclick = () => {
      timer.stop(); placed.forEach((p, i) => { if (!done.has(i)) { p.cells.forEach(ci => cells[ci].classList.add('f' + ((i + 3) % 8))); } });
      $('#giveup', root).classList.add('hide');
    };
    function win() {
      timer.stop(); const t = Math.round(timer.elapsed()), bk = c.size + c.level, b = store.get('best_mm', {}), rec = !b[bk] || t < b[bk]; if (rec) { b[bk] = t; store.set('best_mm', b); }
      const card = document.createElement('div'); card.className = 'card center'; card.style.marginTop = '12px';
      card.innerHTML = `<div class="big">Bravo !</div><div>Grille terminée en <b>${fmt(t)}</b>${rec ? ' · <b>nouveau record</b>' : ''}</div>`;
      mg.after(card); $('#giveup', root).classList.add('hide');
    }
    cleanup2 = () => timer.stop();
  }
  let cleanup2 = null;
  whenReady(root, menu);
  return () => { if (cleanup2) cleanup2(); };
};
