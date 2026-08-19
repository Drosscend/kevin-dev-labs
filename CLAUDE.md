# labs

Expériences web servies sur `labs.kevin-dev.com`. Dépôt public
`Drosscend/kevin-dev-labs`. Ce ne sont pas des projets : elles se partagent par
lien, ne sont jamais indexées et n'ont aucune page de connexion.

## Prérequis

- **Bun** : `build.sh` appelle `bun install` et `bun run build`.
- Rien d'autre : aucune base, aucune variable d'environnement, aucun secret.
- Docker seulement pour reproduire le déploiement en local.

## Structure

- `site/` : la page d'accueil, projet Vite + Tailwind v4.
  - `site/index.html` : une carte par expérience, écrites à la main.
  - `site/src/app.css` : tokens, polices et accent copiés du site principal.
  - `site/public/thumbs/<slug>.jpg` : vignettes, 1200 x 750.
  - `site/public/robots.txt` : `Disallow: /` sur tout le domaine.
  - `site/analytics.html` : la balise Umami, injectée au build. Pas publiée.
- `experiments/<slug>/` : une expérience. Le nom du dossier est son URL.
- `dist/` : sortie du build, ignorée par git.

## Ajouter une expérience

1. Créer `experiments/<slug>/`, slug en minuscules et tirets.
2. Selon le type :
   - **page autonome** : poser son `index.html` à la racine du dossier ;
   - **projet à builder** : `package.json` avec un script `build` qui produit
     `dist/`, et des chemins relatifs (`base: "./"` dans `vite.config.ts`),
     car la page est servie sous `/<slug>/` et non à la racine.
3. Capturer une vignette en `site/public/thumbs/<slug>.jpg`, 1200 x 750.
4. Copier un `<li>` dans `site/index.html` et corriger : `href="/<slug>/"`,
   `src="/thumbs/<slug>.jpg"`, le titre, la ligne de description, les technos.
5. `sh build.sh`, puis vérifier que `dist/<slug>/index.html` existe et que la
   page s'ouvre depuis un serveur HTTP.
6. Commit, push sur `main`.

## Construire

- `sh build.sh` produit `dist/`. Un dossier avec `package.json` est construit
  avec Bun et contribue son `dist/` ; tout autre dossier est copié tel quel.
- La balise Umami de `site/analytics.html` est insérée avant `</head>` de
  chaque page du résultat.
- Servir `dist/` avec un serveur HTTP, jamais en `file://` : le micro de
  `jarvis` exige un contexte sécurisé, et les modules ES sont bloqués.

## Déployer

- Push sur `main` : Dokploy construit le `Dockerfile` et redémarre le service.
- Déclencher à la main, jeton dans `~/.dokploy-token` :

```bash
curl -s -X POST https://dokploy.kevin-dev.com/api/compose.deploy -H "x-api-key: $DOKPLOY_TOKEN" -H "Content-Type: application/json" -d '{"composeId":"NoLSoEjZWkHVu_-VDi5KO"}'
```

- Service Dokploy : projet `labs`, compose `labs`, `appName` `labs-cq9xu9`.
- Domaine : `labs.kevin-dev.com`, service `app`, port interne **80**,
  `letsencrypt`, middleware `noindex@file`.
- Vérifier après déploiement :

```bash
curl -sI https://labs.kevin-dev.com/ | grep -i "x-robots"
```

## Ce qu'il ne faut pas faire

- Ne pas versionner `dist/` ni `node_modules/`.
- Ne pas coller la balise Umami dans une expérience : `build.sh` l'injecte.
- Ne pas mettre de secret ni de donnée personnelle : le dépôt est public et le
  site est ouvert à qui a le lien.
- Ne pas ajouter de page de connexion ni d'authentification.
- Ne pas retirer `robots.txt`, l'en-tête de `Caddyfile` ni le middleware
  `noindex@file` : les trois protègent la même chose, à trois étages.
- Ne pas ajouter de backend : Caddy ne sert que des fichiers. Une expérience
  qui a besoin d'un serveur ne va pas ici.
- Ne pas référencer d'asset par un chemin absolu dans une expérience buildée.
