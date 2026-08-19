# Spécimen

Prototype Three.js : une créature enfermée dans le champ d'une caméra fixe, qui y nage,
s'approche, se cache, respire, bat, regarde et se distrait toute seule. Rien n'est
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
- **Toucher** : distinct du regard. La peau répond bien avant l'arrivée du curseur, dès qu'il
  entre dans une zone qui déborde largement la silhouette, et d'autant plus fort qu'il approche ;
  la réponse est pleine dès qu'il est sur l'orbe. Une bosse gaussienne suit le point visé et des
  rides concentriques s'en éloignent. La chaleur, elle, ne se dépose qu'au contact réel : une
  carte en projection équirectangulaire, entretenue en ping-pong sur deux cibles de rendu, où le
  toucher dépose, diffuse et refroidit en quelques secondes. La marque reste sur le point où elle
  a été faite et tourne avec la peau.
- **Cœur** : deux battements par cycle (lub-dub) partant d'un pôle et se propageant en anneau.
  Le rythme suit l'humeur (30 à 140 bpm), accélère à l'inspiration et ralentit à l'expiration
  (arythmie sinusale), dérive en permanence de quelques pour cent, et lâche de loin en loin un
  battement anticipé suivi d'une pause compensatoire.
- **Respiration** : inspiration rapide sur un tiers du cycle, expiration lente, courte pause en
  bas. Rien d'une sinusoïde.
- **Gestes spontanés** : sans rien demander, elle soupire, frissonne, s'étire, bâille ou
  sursaute. Chaque geste pousse la respiration, la peau et la voix ensemble, sur une enveloppe
  qui lui est propre. Le répertoire et la cadence dépendent de l'humeur : de l'ordre d'un geste
  toutes les vingt secondes quand elle joue, toutes les minutes quand elle dort, avec une forte
  part de hasard sur l'attente. Le même geste ne revient jamais deux fois de suite.
- **Familiarité** : la présence et le contact la font monter en une trentaine de secondes, elle
  retombe en deux ou trois minutes d'absence. Une orbe qui vous connaît sursaute moins fort,
  joue plus vite, veille plus longtemps et prend une teinte plus chaude. Ignorée, elle s'ennuie,
  et l'ennui accélère ses gestes. Rien n'est conservé d'une visite à l'autre.
- **Humeurs** : `endormie`, `au repos`, `curieuse`, `joueuse`, `surprise`. Décidées par
  l'inactivité, la vitesse du curseur, sa proximité et les clics, avec des seuils qui glissent
  selon la familiarité. Chaque humeur porte sa palette, son rythme cardiaque, son agitation, son
  bloom ; tout est interpolé en continu, jamais commuté d'un coup.
- **Son** : entièrement synthétisé en Web Audio, sans aucun fichier. Une nappe grave accordée sur
  l'humeur, un souffle dont le filtre s'ouvre vite à l'inspiration et retombe lentement à
  l'expiration, un frottement audible quand le curseur glisse sur la peau, un coup sourd par
  battement, un balayage bref au sursaut. Certains gestes ont une voix : un timbre poussé à travers
  deux formants mobiles, avec sa part de souffle, ce qui suffit à l'oreille pour entendre un
  animal sans qu'aucun mot soit prononcé. Un soupir ou un bâillement s'entend presque toujours,
  un frisson ou un tic rarement, et deux voix ne peuvent pas se suivre à moins de deux secondes
  et demie. Hauteur et durée sont retirées au sort à chaque fois. Le tout dans une réverbération à réponse
  impulsionnelle générée. Le son démarre au premier mouvement de souris (règle d'autoplay des
  navigateurs) et se coupe quand l'onglet passe en arrière-plan.
- **Post-traitement** : bloom, aberration chromatique radiale, vignette et grain.

## Structure

- `src/main.ts` : boucle, câblage, contact du curseur
- `src/vivarium.ts` : le volume, ses parois et son fond, déduits du champ de la caméra
- `src/presence.ts` : le visiteur vu de l'intérieur, sa place, sa vitesse, ses coups
- `src/mind.ts` : profils d'humeur, machine à états, familiarité, curiosité et peur
- `src/locomotion.ts` : nage par à-coups, cap, fuite, dépôt au fond
- `src/vitals.ts` : respiration et cœur
- `src/gaze.ts` : saccades, fixation, rémanence, errance
- `src/impulses.ts` : gestes spontanés et leurs enveloppes
- `src/body.ts` : membrane, cœur interne, halo, déformation de la silhouette
- `src/trace.ts` : carte de chaleur laissée par le toucher
- `src/ambience.ts` : synthèse sonore
- `src/post.ts` : chaîne de post-traitement
- `src/shaders/` : GLSL (le bruit simplex vient d'Ashima Arts, sous licence MIT)
