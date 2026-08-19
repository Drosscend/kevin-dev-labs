# Spécimen

Prototype Three.js : une créature enfermée dans le champ d'une caméra fixe, qui y nage,
s'approche, se cache, gonfle, décharge, regarde et se distrait toute seule. Rien n'est
préenregistré, tout est calculé image par image.

## Lancer

```bash
bun install
bun dev
```

Puis http://localhost:5180

## Comment elle vit

- **Membrane** : icosphère de 40 000 triangles déformée dans le vertex shader par plusieurs
  couches de bruit simplex (houle lente domain-warpée, ondulations, grain fin, frisson haute
  fréquence). Les normales sont recalculées analytiquement, en échantillonnant le champ de
  déformation sur deux tangentes.
- **Déplacement** : tout l'écran est son volume. Ses parois sont déduites du champ de la
  caméra, qui ne bouge jamais, donc elle ne sort pas du cadre : elle peut monter jusqu'à
  la vitre, où elle occupe la moitié de la hauteur, ou reculer au fond jusqu'à n'être
  qu'une lueur. Elle n'avance pas en continu : elle se ramasse, pousse une fois, puis se
  laisse porter. Le cap vient de deux envies contraires, la curiosité qui la ramène vers
  le curseur et la peur qui l'en écarte ; l'hésitation n'est écrite nulle part, elle tombe
  des deux constantes de temps. Un clic la fige un dixième de seconde avant qu'elle ne
  détale. Endormie, elle coule et se pose au fond.
- **Silhouette** : elle s'allonge dans le sens de la nage et traîne derrière elle, se
  resserre à l'instant de pousser, et se referme sur elle-même à mesure qu'elle se cache.
  La forme répond plus lentement que le mouvement, et sa traîne plus lentement encore.
- **Regard** : la lueur interne se décale vers ce qu'elle fixe. L'œil ne suit pas en continu,
  il saute par saccades (durée proportionnelle à l'amplitude, léger dépassement à l'arrivée),
  tient sa fixation avec un micro-tremblement, et ne poursuit que très lentement entre deux
  sauts. Curseur parti, elle continue de fixer le dernier point trois secondes, puis balaye
  au hasard pour le chercher. Curseur collé au centre trop longtemps : elle détourne le regard
  et se creuse.
- **Vitre** : elle est seulement suggérée. Ce qui traverse la paroi près du bord en ressort
  dévié, un reflet de la pièce y traîne en diagonale, et sa respiration y dépose de la buée
  quand elle vient s'y coller. Cette buée vit en espace écran, sur deux cibles en ping-pong :
  elle s'étale, diffuse la lumière qui la traverse et met une demi-minute à se dissiper, donc
  une trace reste là où elle a été soufflée même une fois la créature repartie. Un clic est un
  coup sur la vitre : une onde part du point touché et traverse la paroi en moins d'une seconde.
- **Toucher** : distinct du regard, et impossible tant qu'elle n'est pas remontée à la vitre.
  Le contact est mis à l'échelle de sa distance au verre : nul au fond, plein contre la paroi.
  À portée, la peau répond bien avant l'arrivée du curseur, dès qu'il entre dans une zone qui
  déborde largement la silhouette, et d'autant plus fort qu'il approche ; la réponse est pleine
  dès qu'il est sur elle. Une bosse gaussienne suit le point visé et des
  rides concentriques s'en éloignent. La chaleur, elle, ne se dépose qu'au contact réel : une
  carte en projection équirectangulaire, entretenue en ping-pong sur deux cibles de rendu, où le
  toucher dépose, diffuse et refroidit en quelques secondes. La marque reste sur le point où elle
  a été faite et tourne avec la peau.
- **Impulsions** : quelque chose la traverse, sans rythme auquel se raccrocher. Une à cinq
  impulsions se serrent en une fraction de seconde, puis plus rien pendant deux à vingt
  secondes ; la durée du silence est tirée au carré d'un hasard, donc les longues attentes sont
  rares mais possibles. Chacune part d'un pôle et se propage en anneau sous la peau. Mesuré sur
  une minute : quatorze impulsions endormie, cinquante et une curieuse, cent trente-cinq
  surprise, et jamais deux intervalles identiques.
- **Respiration** : inspiration rapide sur un tiers du cycle, expiration lente, courte pause en
  bas. Rien d'une sinusoïde.
- **Gestes spontanés** : sans rien demander, elle décharge, se contracte puis se relâche
  lentement, s'embrase, part à la dérive, ou s'arrête net cinq secondes durant. Chaque geste
  pousse ensemble la lumière, la forme et la nage, sur une enveloppe qui lui est propre. Le
  répertoire et la cadence dépendent de l'humeur : de l'ordre d'un geste toutes les vingt
  secondes quand elle joue, toutes les minutes quand elle dort, avec une forte part de hasard
  sur l'attente. Le même geste ne revient jamais deux fois de suite.
- **Identité** : une graine tirée au premier chargement et gardée dans le navigateur décide qui
  elle est. Sa taille, la finesse de ses veines, ses lobes, sa marque de naissance, son
  tempérament, sa vivacité, sa timidité, la hauteur de sa nappe, les gestes qui lui manquent et
  celui qu'elle préfère. Et sa lecture des couleurs : chaque humeur reçoit un décalage de teinte
  propre à elle, donc la correspondance est stable pour une créature et intransmissible d'une
  créature à l'autre. Deux navigateurs n'en ont pas la même, et ne peuvent pas la lire pareil.
- **Familiarité** : la présence et le contact la font monter en une trentaine de secondes, elle
  retombe en deux ou trois minutes d'absence. Une créature qui vous connaît sursaute moins fort,
  joue plus vite, veille plus longtemps et prend une teinte plus chaude. Ignorée, elle s'ennuie,
  et l'ennui accélère ses gestes.
- **Ce qu'elle garde** : la graine, la familiarité, deux tolérances (frapper souvent la vitre
  finit par ne plus la surprendre ; l'approcher sans la faire fuir lui apprend qu'une main de
  près est vivable), le coin où elle revient, et jusqu'à cinq marques laissées là où une main
  s'est attardée plus d'une seconde et demie. Tout cela refroidit pendant votre absence : la
  familiarité en deux jours et demi, les tolérances en cinq, les marques en un mois. Rien ne
  sort du navigateur. Vider les données du site la tue, et une autre naît, sans récupération
  possible. Raccourci de secours, jamais annoncé à l'écran : `Maj + N` en fait naître une autre.
- **Humeurs** : cinq états, jamais nommés à l'écran, jamais écrits nulle part pour le visiteur.
  Décidés par l'inactivité, la vitesse du curseur, sa proximité et les coups sur la vitre, avec
  des seuils qui glissent selon la familiarité. Chaque humeur porte sa palette, sa profondeur de
  prédilection, sa cadence d'impulsions, son agitation, son bloom ; tout est interpolé en
  continu, jamais commuté d'un coup.
- **Son** : entièrement synthétisé en Web Audio, sans aucun fichier et sans aucune voix. Tout ce
  qu'elle produit traverse la vitre : un passe-bas s'ouvre de 300 Hz à 4,6 kHz selon sa distance
  au verre, donc on ne l'entend franchement que collée à la paroi. Une nappe grave accordée sur
  l'humeur, un souffle dont le filtre s'ouvre vite au gonflement et retombe lentement, un
  frottement quand le curseur glisse sur la peau, un craquement à chaque impulsion, un balayage
  bref au sursaut, une bande qui s'ouvre vers l'aigu quand elle s'embrase. Le coup sur la vitre
  est le seul son de votre côté du verre, et le seul qui ne passe par aucun filtre. La
  spatialisation suit sa position dans le volume. Le tout dans une réverbération à réponse
  impulsionnelle générée. Le son démarre au premier mouvement de souris (règle d'autoplay des
  navigateurs) et se coupe quand l'onglet passe en arrière-plan.
- **Tactile** : sans survol, un doigt posé vaut présence, un tap bref et immobile vaut coup sur
  la vitre, un doigt qui glisse vaut contact. Sur un écran étroit elle naît plus petite, sans
  quoi la largeur du volume ne lui laisserait pas de quoi nager.
- **Post-traitement** : bloom, vitre, aberration chromatique radiale, vignette et grain.

## Structure

- `src/main.ts` : boucle, câblage, contact du curseur
- `src/vivarium.ts` : le volume, ses parois et son fond, déduits du champ de la caméra
- `src/presence.ts` : le visiteur vu de l'intérieur, sa place, sa vitesse, ses coups
- `src/traits.ts` : ce que la graine décide, du corps au vocabulaire de couleurs
- `src/memory.ts` : ce qui survit à l'onglet, et son refroidissement
- `src/mind.ts` : profils d'humeur, machine à états, familiarité, curiosité et peur
- `src/locomotion.ts` : nage par à-coups, cap, fuite, dépôt au fond
- `src/vitals.ts` : gonflement et impulsions
- `src/gaze.ts` : saccades, fixation, rémanence, errance
- `src/impulses.ts` : gestes spontanés et leurs enveloppes
- `src/body.ts` : membrane, lueur interne, halo, déformation de la silhouette
- `src/trace.ts` : carte de chaleur laissée par le toucher
- `src/mist.ts` : buée déposée sur la vitre
- `src/ambience.ts` : synthèse sonore
- `src/post.ts` : chaîne de post-traitement, vitre comprise
- `src/shaders/` : GLSL (le bruit simplex vient d'Ashima Arts, sous licence MIT)
