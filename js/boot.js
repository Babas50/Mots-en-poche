'use strict';
/* thème */
function applyTheme() {
  const pref = store.get('theme', 'auto');
  const dark = pref === 'dark' || (pref === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = dark ? '#14121b' : '#6a4bd6';
}
applyTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

/* installation */
let installEvt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; const b = $('#install'); if (b) b.classList.remove('hide'); });
window.addEventListener('appinstalled', () => { installEvt = null; const b = $('#install'); if (b) b.classList.add('hide'); toast('Appli installée'); });
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;

Screens.menu = function (root) {
  const lb = k => store.get(k, 0);
  const mm = store.get('best_mm', {}); const mmBest = Object.values(mm).length ? 'Record : ' + fmt(Math.min(...Object.values(mm))) : 'Pas encore joué';
  const cards = [
    ['lettres', 'c-lettres', ['M', 'A', 'I', 'S'], 'Lettres', 'Relie les lettres voisines avant la fin du temps', lb('best_lettres_120') ? 'Record 2 min : ' + lb('best_lettres_120') + ' pts' : 'Durée réglable'],
    ['melees', 'c-melees', ['M', 'O', 'T', 'S'], 'Mots mêlés', 'Retrouve les mots cachés dans la grille', mmBest],
    ['long', 'c-long', ['L', 'O', 'N', 'G'], 'Mot le plus long', 'Tirage de lettres, trouve le plus long mot', lb('best_long') ? 'Record : ' + lb('best_long') + ' lettres' : 'Pas encore joué'],
    ['abeille', 'c-abeille', ['B', 'E', 'E', 'S'], 'Abeille', '7 lettres, une centrale obligatoire', (store.get('abeille_day', null) || {}).k === (function () { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); })() ? 'Aujourd\'hui : ' + store.get('abeille_day').rank : 'Grille du jour']
  ];
  root.innerHTML = `
    <div class="brand"><h1>Mots en poche</h1><p>Jeux de mots, sans connexion</p></div>
    <div class="grid2">${cards.map(([id, cls, ls, t, d, rec]) => `
      <button class="gcard ${id === 'abeille' ? 'amber' : ''}" data-go="${id}" style="--acc:var(--${cls})">
        <div class="mt ${id === 'abeille' ? 'hexs' : ''}">${ls.map(l => `<i>${l}</i>`).join('')}</div>
        <h3>${t}</h3><p>${d}</p><small>${rec}</small></button>`).join('')}</div>
    <button class="btn block install ${installEvt && !standalone() ? '' : 'hide'}" id="install">Installer l'appli sur le téléphone</button>
    <div class="row" style="margin-top:14px"><button class="btn" id="set">Réglages</button></div>
    <div class="status" id="st">${G.loaded ? 'Dictionnaire prêt : ' + G.words.length.toLocaleString('fr-FR') + ' mots' : 'Chargement du dictionnaire…'}</div>`;
  $$('[data-go]', root).forEach(b => b.onclick = () => App.go(b.dataset.go));
  $('#set', root).onclick = () => App.go('settings');
  $('#install', root).onclick = async () => { if (!installEvt) return; installEvt.prompt(); await installEvt.userChoice; installEvt = null; $('#install', root).classList.add('hide'); };
  if (!G.loaded) G.ready.then(() => { const s = $('#st'); if (s) s.textContent = 'Dictionnaire prêt : ' + G.words.length.toLocaleString('fr-FR') + ' mots'; });
};

Screens.settings = function (root) {
  const th = store.get('theme', 'auto');
  root.style.setProperty('--acc', 'var(--c-lettres)');
  root.innerHTML = header('Réglages') + `
    <div class="card stack">
      <h2 style="margin:0">Thème</h2>
      <div class="chips" id="thm">${[['auto', 'Automatique'], ['light', 'Clair'], ['dark', 'Sombre']].map(([k, l]) => `<button class="chip ${th === k ? 'on' : ''}" data-v="${k}">${l}</button>`).join('')}</div>
      <h2 style="margin:12px 0 0">Records</h2>
      <button class="btn block" id="rst">Effacer tous les records</button>
    </div>
    <div class="card credits" style="margin-top:12px">
      <b>Installation sur Android</b><br>Ouvrez l'adresse de l'appli dans Chrome, puis menu à trois points, « Installer l'application » ou « Ajouter à l'écran d'accueil ». Une fois installée, elle fonctionne sans réseau.<br><br>
      <b>Crédits</b><br>Liste de mots : an-array-of-french-words (licence MIT, dérivée de la liste Letterpress). Fréquences d'usage : wordfreq (code Apache 2.0, données CC BY-SA 4.0). Les mots sont comparés sans accents.
    </div>`;
  bindBack(root);
  $('#thm', root).onclick = e => { const b = e.target.closest('.chip'); if (!b) return; store.set('theme', b.dataset.v); $$('.chip', $('#thm', root)).forEach(x => x.classList.toggle('on', x === b)); applyTheme(); };
  $('#rst', root).onclick = () => {
    if (!confirm('Effacer tous les records ?')) return;
    try { Object.keys(localStorage).filter(k => k.startsWith('mep_best') || k.startsWith('mep_abeille')).forEach(k => localStorage.removeItem(k)); } catch (e) {}
    toast('Records effacés');
  };
};

/* démarrage */
G.ready = G.load();
G.ready.catch(() => {});
history.replaceState({ s: 'menu' }, '');
window.addEventListener('popstate', () => App.go('menu', false));
App.go('menu', false);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
