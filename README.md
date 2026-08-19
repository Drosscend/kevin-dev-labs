# Labs

Expériences web servies sur `labs.kevin-dev.com`. Ce ne sont pas des projets :
ce sont des bacs à sable, partagés par lien et jamais indexés.

## Structure

```
site/          la page d'accueil, robots.txt, vignettes, polices
experiments/   un dossier par expérience, un dossier = une URL
```

Une expérience qui contient un `package.json` est construite avec Bun et
publie son `dist/`. Toute autre est copiée telle quelle. Ajouter une
expérience se résume donc à déposer un dossier et à ajouter sa carte dans
`site/index.html`.

## Construire

```sh
sh build.sh
```

Le résultat est dans `dist/`, servi tel quel par Caddy.

## Servir en local

```sh
bunx serve dist
```

## Déploiement

Service Compose Dokploy, domaine `labs.kevin-dev.com`, port interne 80.
La procédure complète est dans `Homelab/deploy/new-project.md`.

Caddy pose `X-Robots-Tag: noindex` sur toute réponse, et `robots.txt`
interdit l'ensemble du domaine : les expériences restent hors des moteurs
de recherche sans aucune page de connexion.
