# labs

Expériences web servies sur `labs.kevin-dev.com`. Dépôt public
`Drosscend/kevin-dev-labs`. Ce ne sont pas des projets : elles se partagent par
lien, ne sont jamais indexées et n'ont aucune page de connexion.

## Prérequis

- **Bun** : `build.sh` appelle `bun install` et `bun run build`.
- Rien d'autre : aucune base, aucune variable d'environnement, aucun secret.
- Docker seulement pour reproduire le déploiement en local.

## Structure

- `experiments.json` : le manifeste. Une entrée par expérience, dans l'ordre
  d'affichage : `slug`, `title`, `line`, `stack`, et un `shot` facultatif qui
  règle sa capture (`hash`, `wait`, `click`, `move`). Source unique des cartes.
- `experiments/<slug>/` : une expérience. Le nom du dossier est son URL.
- `site/` : la page d'accueil, projet Vite + Tailwind v4.
  - `site/index.html` : le cadre. Les cartes remplacent `<!-- cards -->`, un
    plugin de `site/vite.config.ts` les rend depuis le manifeste.
  - `site/404.html` : page d'erreur, deuxième entrée du build.
  - `site/src/app.css` : tokens, polices et accent copiés du site principal.
  - `site/public/thumbs/<slug>.webp` : vignettes, 800 x 500.
  - `site/public/robots.txt` : `Allow: /`, volontairement. Le crawl doit
    rester ouvert pour que l'en-tête `X-Robots-Tag: noindex` soit lu.
  - `site/analytics.html` : la balise Umami, injectée au build. Pas publiée.
- `tools/shots.ts` : capture les vignettes depuis `dist/`.
- `dist/` : sortie du build, ignorée par git.

## Ajouter une expérience

1. Créer `experiments/<slug>/`, slug en minuscules et tirets.
2. Selon le type :
   - **page autonome** : poser son `index.html` à la racine du dossier ;
   - **projet à builder** : `package.json` avec un script `build` qui produit
     `dist/`, et des chemins relatifs (`base: "./"` dans `vite.config.ts`),
     car la page est servie sous `/<slug>/` et non à la racine.
3. Ajouter son entrée dans `experiments.json`.
4. `sh build.sh`, puis `bun tools/shots.ts <slug>` : la vignette se capture sur
   la page construite. Si elle tombe sur un écran d'accueil ou une animation
   trop précoce, régler `shot` dans le manifeste plutôt que la reprendre à la
   main.
5. `sh build.sh` à nouveau, vérifier `dist/<slug>/index.html` et la carte sur
   la page d'accueil, servie en HTTP.
6. Commit, push sur `main`.

## Construire

- `sh build.sh` produit `dist/`. Un dossier avec `package.json` est construit
  avec Bun et contribue son `dist/` ; tout autre dossier est copié tel quel.
- La balise Umami de `site/analytics.html` est insérée avant `</head>` de
  chaque page du résultat.
- Servir `dist/` avec un serveur HTTP, jamais en `file://` : le micro de
  `jarvis` exige un contexte sécurisé, et les modules ES sont bloqués.

```bash
bunx serve dist
```

- Une action GitHub rejoue `build.sh` à chaque push : un build cassé se voit
  sur le dépôt, sans attendre le déploiement.

## Déployer

- Push sur `main` : le `Dockerfile` est construit et le site mis en ligne
  automatiquement. Rien d'autre à faire.
- Vérifier une fois le déploiement passé :

```bash
curl -sI https://labs.kevin-dev.com/ | grep -i "x-robots"
```

## Ce qu'il ne faut pas faire

- Ne pas versionner `dist/` ni `node_modules/`.
- Ne pas écrire une carte à la main dans `site/index.html` : elle vient du
  manifeste, et une carte codée en dur y serait effacée au build.
- Ne pas coller la balise Umami dans une expérience : `build.sh` l'injecte.
- Ne pas mettre de secret ni de donnée personnelle : le dépôt est public et le
  site est ouvert à qui a le lien.
- Ne pas ajouter de page de connexion ni d'authentification.
- Ne pas retirer l'en-tête `X-Robots-Tag` du `Caddyfile` : c'est lui, doublé
  par celui du proxy, qui tient les pages hors des moteurs.
- Ne pas remettre `Disallow: /` dans `robots.txt` : le portfolio pointe vers
  labs, donc un crawler qui ne peut pas lire les pages indexerait les URL
  nues, sans jamais voir le `noindex`.
- Ne pas ajouter de backend : Caddy ne sert que des fichiers. Une expérience
  qui a besoin d'un serveur ne va pas ici.
- Ne pas référencer d'asset par un chemin absolu dans une expérience buildée.
