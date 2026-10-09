import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { BUILDINGS, BUILDING_CATEGORIES } from '../../core/data/buildings.data';
import { TERRAINS } from '../../core/data/resources.data';
import { TerrainId } from '../../core/models/game.models';
import { GameStateService } from '../../core/services/game-state.service';
import { EventLogComponent } from '../../shared/event-log.component';
import { BuildingCardComponent } from './building-card.component';
import { WorkforcePanelComponent } from './workforce-panel.component';

@Component({
  selector: 'app-earth',
  standalone: true,
  imports: [BuildingCardComponent, EventLogComponent, WorkforcePanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="layout">
      <div class="main">
        <app-workforce-panel />

        @for (cat of categories(); track cat.id) {
          <section class="category">
            <h3>{{ cat.icon }} {{ cat.name }}</h3>
            <div class="cards">
              @for (b of cat.buildings; track b.id) {
                <app-building-card [building]="b" />
              }
            </div>
          </section>
        }

        @if (lockedCount() > 0) {
          <p class="muted hint">🔒 {{ lockedCount() }} bâtiments restent à découvrir dans les arbres de talents.</p>
        }
      </div>

      <aside class="side">
        <section class="panel">
          <h3>🗺️ Espaces naturels</h3>
          <p class="muted planet-desc" [title]="planet().description">
            Emplacements occupés par vos bâtiments sur {{ planet().icon }} {{ planet().name }}.
          </p>
          <div class="spaces">
            @for (t of terrains; track t.id) {
              <div class="space" [title]="t.description">
                <div class="space-head">
                  <span>{{ t.icon }} {{ t.name }}</span>
                  <span class="mono">{{ economy().space[t.id].used }} / {{ economy().space[t.id].total }}</span>
                </div>
                <div class="progress" [class.full]="spaceRatio(t.id) >= 100">
                  <div [style.width.%]="spaceRatio(t.id)"></div>
                </div>
              </div>
            }
          </div>
        </section>

        <section class="panel">
          <h3>🛰️ Situation</h3>
          <ul class="alerts">
            @for (alert of alerts(); track alert.text) {
              <li [attr.data-kind]="alert.kind">{{ alert.text }}</li>
            } @empty {
              <li data-kind="success">Tout va bien. La civilisation prospère.</li>
            }
          </ul>
        </section>
        <app-event-log />
      </aside>
    </div>
  `,
  styles: `
    .layout { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 16px; align-items: start; }
    .main, .side { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
    .planet-desc { margin: -4px 0 10px; font-size: 0.8rem; }
    .spaces { display: flex; flex-direction: column; gap: 10px; }
    .space-head { display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px; }
    .progress.full > div { background: var(--warning); }
    .category h3 { margin: 0 0 8px; }
    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 230px), 1fr)); gap: 10px; }
    .hint { text-align: center; }
    .alerts { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; font-size: 0.85rem; }
    .alerts li { padding: 6px 8px; border-radius: 8px; background: rgba(255, 255, 255, 0.03); border-left: 3px solid var(--accent); }
    .alerts li[data-kind='danger'] { border-left-color: var(--danger); }
    .alerts li[data-kind='warning'] { border-left-color: var(--warning); }
    .alerts li[data-kind='success'] { border-left-color: var(--success); }
    @media (max-width: 960px) {
      .layout { grid-template-columns: 1fr; }    }
  `,
})
export class EarthComponent {
  private readonly state = inject(GameStateService);

  protected readonly planet = this.state.planetDef;
  protected readonly economy = this.state.economy;
  protected readonly terrains = TERRAINS;

  protected readonly categories = computed(() => {
    const unlocked = this.state.modifiers().unlockedBuildings;
    return BUILDING_CATEGORIES.map((c) => ({
      ...c,
      buildings: BUILDINGS.filter((b) => b.category === c.id && unlocked.has(b.id)),
    })).filter((c) => c.buildings.length > 0);
  });

  protected readonly lockedCount = computed(() => BUILDINGS.length - this.state.modifiers().unlockedBuildings.size);

  protected readonly alerts = computed(() => {
    const e = this.economy();
    const res = this.state.resources();
    const pop = this.state.population();
    const list: { kind: 'danger' | 'warning' | 'info'; text: string }[] = [];
    if (e.starving) list.push({ kind: 'danger', text: '☠️ Famine : la population diminue. Produisez de la nourriture et de l’eau !' });
    else {
      if (e.net.food < 0) list.push({ kind: 'warning', text: `🌾 Réserves de nourriture en baisse (${Math.floor(res.food / -e.net.food)} s restantes).` });
      if (e.net.water < 0) list.push({ kind: 'warning', text: `💧 Réserves d’eau en baisse (${Math.floor(res.water / -e.net.water)} s restantes).` });
    }
    if (e.energyRatio < 1) list.push({ kind: 'warning', text: `⚡ Pénurie d’énergie : bâtiments alimentés à ${Math.round(e.energyRatio * 100)} %.` });
    if (e.workforce < 1) list.push({ kind: 'warning', text: `👷 Main-d’œuvre insuffisante : ${Math.round(e.workforce * 100)} % des emplois des bâtiments pourvus. Il faut plus d’habitants.` });
    if (e.idle >= 1) list.push({ kind: 'info', text: `💤 ${Math.floor(e.idle)} habitants inactifs : affectez-les à une tâche.` });
    if (pop >= e.maxPopulation - 0.5) list.push({ kind: 'info', text: '🏠 Capacité maximale atteinte : construisez des habitations.' });
    if (e.comfortCoverage < 0.5 && pop > 30) list.push({ kind: 'info', text: '🎭 Peu de loisirs : la satisfaction reste basse.' });
    return list;
  });

  protected spaceRatio(t: TerrainId): number {
    const s = this.economy().space[t];
    return s.total > 0 ? Math.min(100, (s.used / s.total) * 100) : 100;
  }
}
