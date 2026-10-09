import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { GATHER_TASKS } from '../../core/data/gathering.data';
import { RESOURCES_BY_ID, TERRAINS_BY_ID } from '../../core/data/resources.data';
import { GatherTaskId } from '../../core/models/game.models';
import { GameEngineService } from '../../core/services/game-engine.service';
import { GameStateService } from '../../core/services/game-state.service';
import { FormatNumberPipe } from '../../shared/format-number.pipe';
import { ActivityComponent } from './activity.component';

const EXPANDED_KEY = 'galaxyexplorer.ui.tasksExpanded';

function readExpanded(): boolean {
  try {
    return localStorage.getItem(EXPANDED_KEY) !== 'false';
  } catch {
    return true;
  }
}

/** Le joueur affecte un nombre d'habitants à chaque tâche de récolte. */
@Component({
  selector: 'app-workforce-panel',
  standalone: true,
  imports: [ActivityComponent, FormatNumberPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel">
      <h3>👥 Répartition des habitants</h3>
      <app-activity />
      <div class="summary">
        <span class="chip">👥 {{ population() | fmt: 'int' }} habitants</span>
        @if (e().jobs > 0) {
          <span class="chip" [class.short]="e().workforce < 1">👷 {{ e().buildingWorkers | fmt: 'int' }} / {{ e().jobs | fmt: 'int' }} dans les bâtiments</span>
        }
        <span class="chip">🧺 {{ e().gatherersTotal | fmt: 'int' }} / {{ e().freePopulation | fmt: 'int' }} libres à la récolte</span>
        <span class="chip" [class.idle-warn]="e().idle >= 1 && e().idle <= 10" [class.idle-danger]="e().idle > 10">💤 {{ e().idle | fmt: 'int' }} inactifs</span>
      </div>

      <div class="gather">
        @for (t of tasks(); track t.def.id) {
          <button class="btn gather-btn" (click)="engine.gather(t.def.id)">
            <span class="g-icon">{{ t.resIcon }}</span>
            <span class="g-label">{{ t.def.clickLabel }}</span>
            <small>+{{ t.clickYield | fmt }}</small>
          </button>
        }
      </div>

      <button class="toggle" (click)="toggleTasks()" [attr.aria-expanded]="expanded()">
        <span class="chevron" [class.open]="expanded()">▸</span>
        <span>Affectation des tâches</span>
        @if (!expanded()) {
          <span class="compact">
            @for (t of tasks(); track t.def.id) {
              <span class="chip" [title]="t.def.name">{{ t.def.icon }} {{ t.info.assigned | fmt: 'int' }} · {{ t.info.rate | fmt: 'rate' }}</span>
            }
          </span>
        }
      </button>

      @if (expanded()) {
      <div class="tasks-wrap">
      <div class="tasks">
        @for (t of tasks(); track t.def.id) {
          <div class="task">
            <div class="t-head">
              <span class="t-icon" [title]="t.def.description">{{ t.def.icon }}</span>
              <div class="t-title">
                <strong [title]="t.def.name">{{ t.def.name }}</strong>
                <span class="t-out">
                  <span class="mono">{{ t.info.assigned | fmt: 'int' }} hab.</span>
                  <span class="rate">{{ t.resIcon }} {{ t.info.rate | fmt: 'rate' }}</span>
                </span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              [max]="sliderMax()"
              [value]="t.value"
              (input)="onSlide(t.def.id, $event)"
              [attr.aria-label]="t.def.name"
            />
            <div class="controls">
              <button class="btn step" (click)="change(t.def.id, -bigStep)">−{{ bigStep }}</button>
              <button class="btn step" (click)="change(t.def.id, -1)">−1</button>
              <button class="btn step" (click)="change(t.def.id, 1)">+1</button>
              <button class="btn step" (click)="change(t.def.id, bigStep)">+{{ bigStep }}</button>
            </div>
            @if (t.info.assigned > t.info.cap) {
              <small class="warn">
                ⚠️ {{ t.terrain.icon }} {{ t.terrain.name }} saturé(e) : seuls {{ t.info.cap | fmt: 'int' }} habitants peuvent y travailler.
              </small>
            }
          </div>
        }
      </div>
      </div>
      }
    </section>
  `,
  styles: `
    h3 { margin: 0 0 10px; }
    .gather { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 130px), 1fr)); gap: 8px; margin-bottom: 12px; }
    .gather-btn { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 10px 6px; user-select: none; touch-action: manipulation; }
    .gather-btn:active { transform: scale(0.95); background: rgba(92, 200, 255, 0.2); }
    .g-icon { font-size: 1.6rem; }
    .g-label { font-size: 0.82rem; text-align: center; }
    .gather-btn small { color: var(--success); font-variant-numeric: tabular-nums; }
    .summary { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
    .chip.short { color: var(--warning); }
    /* Inactifs : orange de 1 à 10, rouge au-delà. */
    .chip.idle-warn { color: var(--warning); border-color: rgba(251, 191, 36, 0.4); }
    .chip.idle-danger { color: var(--danger); border-color: rgba(248, 113, 113, 0.45); }
    .toggle {
      display: flex; align-items: center; flex-wrap: wrap; gap: 8px; width: 100%;
      padding: 6px 0; margin-bottom: 8px; background: none; border: none; color: var(--text);
      font: inherit; font-weight: 600; font-size: 0.9rem; cursor: pointer; text-align: left;
    }
    .toggle:hover { color: var(--accent); }
    .chevron { display: inline-block; transition: transform 0.2s; color: var(--muted); }
    .chevron.open { transform: rotate(90deg); }
    .compact { display: flex; flex-wrap: wrap; gap: 4px; font-weight: normal; }
    /* Les 4 tâches tiennent sur une ligne ; 2 par ligne si le panneau est étroit, 1 sur très petit écran. */
    .tasks-wrap { container-type: inline-size; }
    .tasks { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
    @container (max-width: 640px) { .tasks { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @container (max-width: 320px) { .tasks { grid-template-columns: 1fr; } }
    .task { padding: 8px; border: 1px solid var(--border); border-radius: var(--radius); background: rgba(255, 255, 255, 0.02); display: flex; flex-direction: column; gap: 6px; min-width: 0; }
    .t-head { display: flex; align-items: center; gap: 8px; min-width: 0; }
    .t-icon { font-size: 1.5rem; cursor: help; }
    .t-title { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .t-title strong { font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .t-out { display: flex; justify-content: space-between; gap: 6px; font-size: 0.78rem; white-space: nowrap; }
    .rate { color: var(--success); }
    .controls { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; }
    .step { padding: 2px 0; font-size: 0.75rem; min-width: 0; }
    input[type='range'] { width: 100%; margin: 0; accent-color: var(--accent); }
    .warn { color: var(--warning); font-size: 0.78rem; }
  `,
})
export class WorkforcePanelComponent {
  protected readonly engine = inject(GameEngineService);
  private readonly state = inject(GameStateService);

  protected readonly population = this.state.population;
  protected readonly e = this.state.economy;

  protected readonly sliderMax = computed(() => Math.max(1, this.state.freePopulation()));
  protected readonly bigStep = 10;

  protected readonly tasks = computed(() => {
    const values = this.state.assignments();
    const gathering = this.e().gathering;
    return GATHER_TASKS.map((def) => ({
      def,
      value: values[def.id],
      info: gathering[def.id],
      resIcon: RESOURCES_BY_ID[def.id].icon,
      clickYield: this.engine.clickYield(def.id),
      terrain: TERRAINS_BY_ID[def.terrain],
    }));
  });

  /** Section des tâches dépliée ou repliée ; mémorisé dans le navigateur. */
  protected readonly expanded = signal(readExpanded());

  protected toggleTasks(): void {
    this.expanded.update((v) => !v);
    try {
      localStorage.setItem(EXPANDED_KEY, String(this.expanded()));
    } catch {
      // Stockage indisponible : le choix ne sera simplement pas mémorisé.
    }
  }

  protected change(task: GatherTaskId, delta: number): void {
    this.engine.setAssignment(task, this.state.assignments()[task] + delta);
  }

  protected onSlide(task: GatherTaskId, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.engine.setAssignment(task, input.valueAsNumber);
    // Le curseur ne peut pas dépasser la part restante : on le recale sur la valeur retenue.
    input.value = String(this.state.assignments()[task]);
  }
}
