# 🪐 GalaxyExplorer

Jeu incrémental (idle game) de conquête spatiale, jouable dans le navigateur. Votre civilisation commence avec **2 habitants sur Terre** et doit grandir jusqu'à **1 000 000 d'habitants** pour construire une **Arche Spatiale** et coloniser de nouvelles planètes.

Logiciel libre sous licence MIT · Angular 20 (composants standalone, Signals, RxJS).

## Démarrer

```bash
npm install
npm start          # http://localhost:4200
npm run build      # build de production dans dist/galaxy-explorer
```

Prérequis : Node.js 20.19+, 22.12+ ou 24.

## Boucle de jeu

1. **Répartissez vos habitants** entre les tâches de récolte (cueilleurs, porteurs d'eau, bûcherons, études des sciences), en **nombre d'habitants** (les nouveaux venus restent inactifs jusqu'à ce que vous les affectiez). Plus il y a d'habitants sur une tâche, plus elle produit, jusqu'à la limite du terrain (10 habitants par emplacement). Les bâtiments embauchent en priorité (une Ferme emploie 2 habitants) ; la répartition s'applique aux habitants restants, ceux sans tâche sont inactifs.
2. **Survie** : chaque habitant consomme de la nourriture et de l'eau chaque seconde. Si un stock tombe à 0, la population décline.
3. **Habitations** : elles fixent la population maximale. L'espace est limité par les terrains (terres habitables, forêt, océan). Démolissez les vieux bâtiments pour faire de la place.
4. **Confort & loisirs** : parcs, théâtres et réseau électrique augmentent la satisfaction, donc la natalité et la productivité.
5. **Construction** : chaque bâtiment a une durée de construction. Il est payé au lancement et réserve son emplacement ; un seul bâtiment peut être construit à la fois. Annuler la construction la rembourse.
6. **Arbres de talents** : une seule recherche à la fois, dont la durée dépend du coût (≈ 20 s à 7 min). 3 branches (Nourriture & Nature, Habitation & Infrastructure, Technologie & Conquête spatiale) débloquées avec les points de recherche.
7. **Exploration Galactique** : avec 1 M d'habitants et le *Moteur à distorsion*, construisez l'Arche, choisissez une exoplanète et recommencez avec des bonus permanents (prestige).

Le jeu sauvegarde automatiquement toutes les 10 s (localStorage) et simule jusqu'à 8 h de progression hors-ligne. Sauvegarde manuelle, export, import et « Recommencer la partie » dans l'onglet *Paramètres*.

## Architecture

```
src/app/
├── core/
│   ├── game.config.ts          Constantes d'équilibrage (consommation, natalité, seuils…)
│   ├── models/                 Types du jeu
│   ├── data/                   Données statiques : tâches de récolte, bâtiments, talents, planètes, ressources
│   ├── engine/
│   │   ├── modifiers.ts        Agrège les effets des talents et des colonies (fonction pure)
│   │   └── economy.ts          Production, consommation, espace, satisfaction, croissance (fonction pure)
│   └── services/
│       ├── game-state.service.ts   État en Signals + computed (modifiers, economy) + sauvegarde
│       ├── game-engine.service.ts  Boucle interval(1000), rattrapage hors-ligne, commandes du joueur
│       └── tech-tree.service.ts    Statut des talents et recherche
├── features/
│   ├── earth/                  Onglet Planète : répartition des habitants, terrains, bâtiments, journal
│   ├── tech-tree/              Onglet Arbres de talents
│   ├── stats/                  Onglet Population & Statistiques
│   ├── settings/               Onglet Paramètres (sauvegarde)
│   └── galaxy/                 Onglet Exploration Galactique (Arche, planètes, prestige)
└── shared/                     Barre de ressources, journal, pipe de formatage
```

Les calculs (`engine/`) sont des fonctions pures sans dépendance Angular. L'UI et la boucle de jeu lisent le même `computed()` `economy`, donc ce qui est affiché correspond exactement à ce qui est simulé.

Pour **rééquilibrer** le jeu, modifiez `game.config.ts` et les fichiers de `core/data/`. Pour **ajouter un bâtiment ou un talent**, ajoutez son identifiant dans `game.models.ts` puis son entrée dans le fichier de données.
