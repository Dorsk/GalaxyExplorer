import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { BUILDINGS_BY_ID } from '../../core/data/buildings.data';
import { GameEngineService } from '../../core/services/game-engine.service';
import { GameStateService } from '../../core/services/game-state.service';
import { ShipyardService } from '../../core/services/shipyard.service';
import { TechTreeService } from '../../core/services/tech-tree.service';
import { formatDuration } from '../../shared/format';

interface Activity {
  kind: 'build' | 'research' | 'ship';
  label: string;
  icon: string;
  name: string;
  remaining: string;
  progress: number;
}

/** Avancement de la construction et de la recherche en cours ; masqué quand rien n'est en cours. */
@Component({
  selector: 'app-activity',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (activities().length > 0) {
      <section class="panel">
        <h3>⏳ En cours</h3>
        <ul>
          @for (a of activities(); track a.kind) {
            <li [attr.data-kind]="a.kind" [class.demolish]="a.label === 'Démolition'">
              <div class="row">
                <span class="label">{{ a.label }}</span>
                <span class="mono time">{{ a.remaining }}</span>
                <button class="btn btn-ghost cancel" (click)="cancel(a.kind)" title="Annuler">✕</button>
              </div>
              <div class="name">{{ a.icon }} {{ a.name }}</div>
              <div class="progress"><div [style.width.%]="a.progress"></div></div>
            </li>
          }
        </ul>
      </section>
    }
  `,
  styles: `
    ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; font-size: 0.85rem; }
    li { padding: 8px; border-radius: 8px; background: rgba(255, 255, 255, 0.03); border-left: 3px solid var(--accent); }
    li[data-kind='research'] { border-left-color: var(--accent-2); }
    li.demolish { border-left-color: var(--danger); }
    li.demolish .progress > div { background: var(--danger); }
    li[data-kind='research'] .progress > div { background: var(--accent-2); }
    li[data-kind='ship'] { border-left-color: var(--warning); }
    li[data-kind='ship'] .progress > div { background: var(--warning); }
    .row { display: flex; align-items: center; gap: 8px; }
    .label { flex: 1; color: var(--muted); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; }
    .time { color: var(--accent); white-space: nowrap; }
    .cancel { padding: 0 6px; font-size: 0.75rem; }
    .name { margin: 2px 0 6px; }
  `,
})
export class ActivityComponent {
  private readonly engine = inject(GameEngineService);
  private readonly state = inject(GameStateService);
  private readonly tree = inject(TechTreeService);
  private readonly shipyard = inject(ShipyardService);

  protected readonly activities = computed(() => {
    const list: Activity[] = [];
    const job = this.state.constructionQueue()[0];
    if (job) {
      const def = BUILDINGS_BY_ID[job.building];
      list.push({
        kind: 'build',
        label: job.kind === 'demolish' ? 'Démolition' : 'Construction',
        icon: def.icon,
        name: def.name,
        remaining: formatDuration(Math.ceil(job.remaining)),
        progress: (1 - job.remaining / job.total) * 100,
      });
    }
    const research = this.tree.current();
    if (research) {
      list.push({
        kind: 'research',
        label: 'Recherche',
        icon: research.def.icon,
        name: research.def.name,
        remaining: formatDuration(Math.ceil(research.remaining)),
        progress: research.progress * 100,
      });
    }
    const ship = this.shipyard.current();
    if (ship) {
      list.push({
        kind: 'ship',
        label: 'Chantier spatial',
        icon: ship.def.icon,
        name: ship.def.name,
        remaining: formatDuration(Math.ceil(ship.remaining)),
        progress: ship.progress * 100,
      });
    }
    return list;
  });

  protected cancel(kind: Activity['kind']): void {
    if (kind === 'research') {
      this.tree.cancel();
      return;
    }
    if (kind === 'ship') {
      this.shipyard.cancel();
      return;
    }
    const job = this.state.constructionQueue()[0];
    if (job) this.engine.cancelConstruction(job.uid);
  }
}
