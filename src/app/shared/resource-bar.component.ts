import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RESOURCES } from '../core/data/resources.data';
import { GameStateService } from '../core/services/game-state.service';
import { FormatNumberPipe } from './format-number.pipe';

@Component({
  selector: 'app-resource-bar',
  standalone: true,
  imports: [FormatNumberPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bar">
      <div class="res" title="Population actuelle / capacité maximale des habitations">
        <span class="icon">👥</span>
        <div class="col">
          <span class="label">Population</span>
          <span class="value">
            {{ population() | fmt: 'int' }}
            <small>/ {{ economy().maxPopulation | fmt: 'int' }}</small>
          </span>
          <span class="rate" [class.pos]="economy().populationGrowth > 0" [class.neg]="economy().populationGrowth < 0">
            {{ economy().populationGrowth | fmt: 'rate' }}
          </span>
        </div>
      </div>

      @for (r of resources; track r.id) {
        <div class="res" [title]="r.description">
          <span class="icon">{{ r.icon }}</span>
          <div class="col">
            <span class="label">{{ r.name }}</span>
            <span class="value" [class.empty]="amounts()[r.id] <= 0">{{ amounts()[r.id] | fmt }}</span>
            <span class="rate" [class.pos]="economy().net[r.id] > 0" [class.neg]="economy().net[r.id] < 0">
              {{ economy().net[r.id] | fmt: 'rate' }}
            </span>
          </div>
        </div>
      }

      <div class="res" title="La satisfaction augmente la natalité et la productivité">
        <span class="icon">{{ economy().happiness >= 0.7 ? '😄' : economy().happiness >= 0.4 ? '🙂' : '😟' }}</span>
        <div class="col">
          <span class="label">Satisfaction</span>
          <span class="value">{{ economy().happiness | fmt: 'pct' }}</span>
          <span class="rate">×{{ economy().productivity.toFixed(2) }} prod.</span>
        </div>
      </div>
    </div>
  `,
  styles: `
    .bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 140px), 1fr));
      gap: 8px;
    }
    .res {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      /* Tuiles quasi transparentes, comme les icônes d'en-tête : le fond étoilé reste visible. */
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(120, 160, 255, 0.08);
      border-radius: var(--radius);
      min-width: 0;
    }
    .icon { font-size: 1.5rem; }
    .col { display: flex; flex-direction: column; min-width: 0; }
    .label { font-size: 0.72rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }
    .value { font-family: var(--font-display); font-size: 1.05rem; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .value small { color: var(--muted); font-size: 0.75rem; }
    .value.empty { color: var(--danger); }
    .rate { font-size: 0.75rem; color: var(--muted); font-variant-numeric: tabular-nums; }
    .rate.pos { color: var(--success); }
    .rate.neg { color: var(--danger); }
  `,
})
export class ResourceBarComponent {
  private readonly state = inject(GameStateService);
  protected readonly resources = RESOURCES;
  protected readonly population = this.state.population;
  protected readonly amounts = this.state.resources;
  protected readonly economy = this.state.economy;
}
