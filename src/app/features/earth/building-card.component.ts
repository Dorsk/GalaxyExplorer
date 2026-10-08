import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RESOURCES_BY_ID, TERRAINS_BY_ID, resourceEntries } from '../../core/data/resources.data';
import { BuildingDef } from '../../core/models/game.models';
import { GameEngineService } from '../../core/services/game-engine.service';
import { GameStateService } from '../../core/services/game-state.service';
import { formatDuration, formatValue } from '../../shared/format';
import { FormatNumberPipe } from '../../shared/format-number.pipe';

@Component({
  selector: 'app-building-card',
  standalone: true,
  imports: [FormatNumberPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="card" [class.ready]="canBuild()">
      <header>
        <span class="b-icon">{{ building().icon }}</span>
        <div class="title">
          <h4>{{ building().name }}</h4>
          <span class="terrain" [title]="terrain().name">
            {{ terrain().icon }} {{ building().size === 0 ? 'sans emprise' : building().size + ' empl.' }}
          </span>
        </div>
        <span class="count" title="Construits">
          {{ owned() }}
          @if (pending() > 0) {
            <small class="pending" title="En construction">+{{ pending() }}</small>
          }
          @if (demolishing() > 0) {
            <small class="demolishing" title="En démolition">−{{ demolishing() }}</small>
          }
        </span>
      </header>

      <p class="desc">{{ building().description }}</p>

      <ul class="details">
        @for (line of details(); track line) {
          <li>{{ line }}</li>
        }
      </ul>

      <div class="cost">
        <span class="chip time" title="Durée de construction">⏱ {{ buildTime() }}</span>
        @for (c of cost(); track c.id) {
          <span class="chip" [class.lacking]="!c.enough">{{ c.icon }} {{ c.amount | fmt }}</span>
        }
      </div>

      <div class="actions">
        <button class="btn btn-primary" [disabled]="!canBuild()" (click)="engine.build(building().id)" [title]="blocker() ?? ''">
          {{ pending() > 0 ? 'En construction…' : 'Construire' }}
        </button>
        @if (owned() > 0) {
          <button
            class="btn btn-ghost"
            [disabled]="demolishBlocker() !== null"
            (click)="engine.demolish(building().id)"
            [title]="demolishBlocker() ?? 'Démolir un exemplaire (' + buildTime() + ', sans remboursement)'"
          >
            🧨
          </button>
        }
      </div>
      @if (blocker() === 'Espace insuffisant') {
        <small class="warn">Plus d’espace {{ terrain().name.toLowerCase() }} disponible.</small>
      }
    </article>
  `,
  styles: `
    .card {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px;
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .card.ready { border-color: rgba(92, 200, 255, 0.45); box-shadow: 0 0 18px rgba(92, 200, 255, 0.08); }
    header { display: flex; align-items: center; gap: 10px; }
    .b-icon { font-size: 1.8rem; }
    .title { flex: 1; min-width: 0; }
    h4 { margin: 0; font-size: 0.98rem; }
    .terrain { font-size: 0.75rem; color: var(--muted); }
    .count { font-family: var(--font-display); font-size: 1.3rem; color: var(--accent); }
    .desc { margin: 0; color: var(--muted); font-size: 0.82rem; }
    .details { list-style: none; margin: 0; padding: 0; font-size: 0.8rem; display: flex; flex-wrap: wrap; gap: 4px 12px; }
    .cost { display: flex; flex-wrap: wrap; gap: 4px; }
    .chip.lacking { color: var(--danger); border-color: rgba(248, 113, 113, 0.35); }
    .actions { display: flex; gap: 6px; margin-top: auto; }
    .actions .btn-primary { flex: 1; }
    .warn { color: var(--warning); }
    .pending { font-size: 0.8rem; color: var(--warning); }
    .demolishing { font-size: 0.8rem; color: var(--danger); }
    .chip.time { color: var(--muted); }
  `,
})
export class BuildingCardComponent {
  readonly building = input.required<BuildingDef>();

  protected readonly engine = inject(GameEngineService);
  private readonly state = inject(GameStateService);

  protected readonly owned = computed(() => this.state.buildings()[this.building().id] ?? 0);
  protected readonly pending = computed(() => this.state.pendingBuildings()[this.building().id] ?? 0);
  protected readonly terrain = computed(() => TERRAINS_BY_ID[this.building().terrain]);
  protected readonly buildTime = computed(() => formatDuration(this.building().buildTime));

  protected readonly cost = computed(() => {
    const res = this.state.resources();
    return resourceEntries(this.engine.nextBuildingCost(this.building().id)).map(([id, amount]) => ({
      id,
      amount,
      icon: RESOURCES_BY_ID[id].icon,
      enough: res[id] >= amount,
    }));
  });

  protected readonly blocker = computed(() => this.engine.buildBlocker(this.building().id));
  protected readonly demolishBlocker = computed(() => this.engine.demolishBlocker(this.building().id));
  protected readonly demolishing = computed(() => this.state.demolishingBuildings()[this.building().id] ?? 0);
  protected readonly canBuild = computed(() => this.blocker() === null);

  /** Effets de base d'un exemplaire (avant bonus de talents et de satisfaction). */
  protected readonly details = computed(() => {
    const b = this.building();
    const lines: string[] = [];
    if (b.housing) lines.push(`👥 +${formatValue(b.housing * this.state.modifiers().housing, 'int')} habitants`);
    for (const [id, amount] of resourceEntries(b.produces ?? {})) lines.push(`${RESOURCES_BY_ID[id].icon} +${formatValue(amount)}/s`);
    for (const [id, amount] of resourceEntries(b.consumes ?? {})) lines.push(`${RESOURCES_BY_ID[id].icon} −${formatValue(amount)}/s`);
    if (b.comfort) lines.push(`😊 confort ${formatValue(b.comfort, 'int')} hab.`);
    if (b.workers) lines.push(`👷 ${formatValue(b.workers, 'int')} emplois`);
    return lines;
  });
}
