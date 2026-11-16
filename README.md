# Mots en poche

Jeux de mots hors ligne, installables sur Android (PWA) : Lettres (durée réglable), Mots mêlés, Mot le plus long, Abeille.

## Publier sur GitHub Pages

1. Créez un dépôt GitHub (public), par exemple `mots-en-poche`.
2. Envoyez tout le contenu de ce dossier à la racine du dépôt (y compris `.nojekyll`).
3. Dépôt > Settings > Pages > Source : « Deploy from a branch », branche `main`, dossier `/ (root)`.
4. Au bout d'une ou deux minutes, l'appli est sur `https://VOTRE-NOM.github.io/mots-en-poche/`.

## Installer sur Android

Ouvrez l'adresse dans Chrome, puis menu à trois points > « Installer l'application ». Elle fonctionne ensuite sans réseau.

## Mettre à jour

Après toute modification, changez le numéro de `CACHE` dans `sw.js` (`mots-en-poche-v2`, etc.), sinon les téléphones gardent l'ancienne version.

## Données et licences

- `data/words.txt` : mots issus du paquet npm `an-array-of-french-words` (licence MIT, dérivé de la liste Letterpress), sans accents.
- `data/common.txt` : sous-ensemble de mots courants, filtré avec les fréquences de `wordfreq` (code Apache 2.0, données sous CC BY-SA 4.0, attribution : Robyn Speer et al.).
- Le script `tools/build_dict.py` régénère ces fichiers.
