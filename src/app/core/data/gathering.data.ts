import { GatherTaskDef, GatherTaskId } from '../models/game.models';

/** Ordre de priorité : si la population baisse, les dernières tâches perdent leurs habitants en premier. */
export const GATHER_TASK_IDS: readonly GatherTaskId[] = ['food', 'water', 'wood', 'research'];

export const GATHER_TASKS: readonly GatherTaskDef[] = [
  {
    id: 'food', name: 'Cueilleurs', icon: '🫐', terrain: 'forest', perWorker: 0.1,
    description: 'Cueillent baies, racines et champignons en forêt.',
    clickLabel: 'Cueillir des baies', clickAmount: 1,
  },
  {
    id: 'water', name: 'Porteurs d’eau', icon: '🪣', terrain: 'land', perWorker: 0.1,
    description: 'Puisent l’eau des sources et des rivières.',
    clickLabel: 'Puiser de l’eau', clickAmount: 1,
  },
  {
    id: 'wood', name: 'Bûcherons', icon: '🪓', terrain: 'forest', perWorker: 0.06,
    description: 'Ramassent et coupent du bois.',
    clickLabel: 'Ramasser du bois', clickAmount: 1,
  },
  {
    id: 'research', name: 'Études des sciences', icon: '🔬', terrain: 'land', perWorker: 0.02,
    description: 'Études scientifiques et technologiques qui font progresser le savoir.',
    clickLabel: 'Étudier', clickAmount: 0.5,
  },
];

export const GATHER_TASKS_BY_ID = Object.fromEntries(GATHER_TASKS.map((t) => [t.id, t])) as Record<GatherTaskId, GatherTaskDef>;
