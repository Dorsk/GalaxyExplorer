import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { BUILDINGS } from '../../core/data/buildings.data';
import { RESOURCES } from '../../core/data/resources.data';
import { FOOD_PER_CAPITA, WATER_PER_CAPITA } from '../../core/game.config';
import { GameStateService } from '../../core/services/game-state.service';
import { formatDuration } from '../../shared/format';
import { FormatNumberPipe } from '../../shared/format-number.pipe';

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [FormatNumberPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid">
      <section class="panel">
        <h3>👥 Population</h3>
        <dl>
          <dt>Habitants</dt><dd>{{ population() | fmt: 'int' }} / {{ e().maxPopulation | fmt: 'int' }}</dd>
          <dt>Croissance</dt><dd [class.pos]="e().populationGrowth > 0" [class.neg]="e().populationGrowth < 0">{{ e().populationGrowth | fmt: 'rate' }}</dd>
          <dt>Satisfaction</dt><dd>{{ e().happiness | fmt: 'pct' }}</dd>
          <dt>Couverture confort</dt><dd>{{ e().comfortCoverage | fmt: 'pct' }} ({{ e().comfort | fmt: 'int' }} places)</dd>
          <dt>Dans les bâtiments</dt><dd>{{ e().buildingWorkers | fmt: 'int' }} / {{ e().jobs | fmt: 'int' }} emplois ({{ e().workforce | fmt: 'pct' }})</dd>
          <dt>À la récolte</dt><dd>{{ e().gatherersTotal | fmt: 'int' }} / {{ e().freePopulation | fmt: 'int' }} libres</dd>
          <dt>Inactifs</dt><dd>{{ e().idle | fmt: 'int' }}</dd>
          <dt>Productivité</dt><dd>×{{ e().productivity.toFixed(2) }}</dd>
          <dt>Réseau énergétique</dt><dd [class.neg]="e().energyRatio < 1">{{ e().energyRatio | fmt: 'pct' }}</dd>
          <dt>Besoins / habitant</dt>
          <dd>🌾 {{ foodPerCapita() | fmt }}/s · 💧 {{ waterPerCapita() | fmt }}/s</dd>
        </dl>
      </section>

      <section class="panel">
        <h3>📊 Bilan des ressources</h3>
        <div class="balance">
          <table>
            <thead>
              <tr><th>Ressource</th><th>Stock</th><th>Production</th><th>Consommation</th><th>Net</th></tr>
            </thead>
            <tbody>
              @for (r of resources; track r.id) {
                <tr>
                  <th>{{ r.icon }} {{ r.name }}</th>
                  <td data-label="Stock">{{ amounts()[r.id] | fmt }}</td>
                  <td data-label="Production" class="pos">{{ e().production[r.id] | fmt: 'rate' }}</td>
                  <td data-label="Consommation" class="neg">{{ -e().consumption[r.id] | fmt: 'rate' }}</td>
                  <td data-label="Net" [class.pos]="e().net[r.id] > 0" [class.neg]="e().net[r.id] < 0">{{ e().net[r.id] | fmt: 'rate' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel">
        <h3>🏗️ Bâtiments</h3>
        @if (owned().length > 0) {
          <ul class="owned">
            @for (b of owned(); track b.id) {
              <li><span>{{ b.icon }} {{ b.name }}</span><span class="mono">{{ b.count }}</span></li>
            }
          </ul>
        } @else {
          <p class="muted">Aucun bâtiment construit.</p>
        }
      </section>

      <section class="panel">
        <h3>🏆 Statistiques</h3>
        <dl>
          <dt>Temps de jeu total</dt><dd>{{ duration(stats().playTime) }}</dd>
          <dt>Partie en cours</dt><dd>{{ duration(stats().runTime) }}</dd>
          <dt>Record de population</dt><dd>{{ stats().peakPopulation | fmt: 'int' }}</dd>
          <dt>Récoltes manuelles</dt><dd>{{ stats().clicks | fmt: 'int' }}</dd>
          <dt>Bâtiments construits</dt><dd>{{ stats().buildingsBuilt | fmt: 'int' }}</dd>
          <dt>Talents recherchés</dt><dd>{{ stats().talentsResearched | fmt: 'int' }}</dd>
          <dt>Arches lancées</dt><dd>{{ stats().arksLaunched | fmt: 'int' }}</dd>
          <dt>Planète actuelle</dt><dd>{{ planet().icon }} {{ planet().name }}</dd>
        </dl>
      </section>
    </div>
  `,
  styles: `
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr)); gap: 16px; align-items: start; }
    .grid > .panel { min-width: 0; }
    h3 { margin-top: 0; }
    dl { display: grid; grid-template-columns: auto 1fr; gap: 6px 16px; margin: 0; font-size: 0.9rem; }
    dt { color: var(--muted); }
    dd { margin: 0; text-align: right; font-variant-numeric: tabular-nums; }
    .balance { container-type: inline-size; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; font-variant-numeric: tabular-nums; }
    th, td { padding: 6px 4px; text-align: right; border-bottom: 1px solid var(--border); white-space: nowrap; }
    tbody th { text-align: left; font-weight: normal; }
    thead th { color: var(--muted); font-weight: normal; font-size: 0.75rem; }
    thead th:first-child { text-align: left; }
    /* Panneau étroit : chaque ressource devient une carte compacte (nom + 4 valeurs en grille). */
    @container (max-width: 520px) {
      thead { display: none; }
      table, tbody, tr, th, td { display: block; }
      tr { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2px 12px; padding: 8px 0; border-bottom: 1px solid var(--border); }
      tbody th { grid-column: 1 / -1; font-weight: 600; border: none; padding: 0 0 2px; }
      td { border: none; padding: 0; display: flex; justify-content: space-between; gap: 6px; min-width: 0; }
      td::before { content: attr(data-label); color: var(--muted); font-size: 0.75rem; overflow: hidden; text-overflow: ellipsis; }
    }
    .owned { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 180px), 1fr)); gap: 4px 16px; font-size: 0.88rem; }
    .owned li { display: flex; justify-content: space-between; }
    .pos { color: var(--success); }
    .neg { color: var(--danger); }
  `,
})
export class StatsComponent {
  private readonly state = inject(GameStateService);

  protected readonly resources = RESOURCES;
  protected readonly e = this.state.economy;
  protected readonly population = this.state.population;
  protected readonly amounts = this.state.resources;
  protected readonly stats = this.state.stats;
  protected readonly planet = this.state.planetDef;

  protected readonly foodPerCapita = computed(() => FOOD_PER_CAPITA * this.state.modifiers().consumption.food);
  protected readonly waterPerCapita = computed(() => WATER_PER_CAPITA * this.state.modifiers().consumption.water);

  protected readonly owned = computed(() => {
    const counts = this.state.buildings();
    return BUILDINGS.filter((b) => (counts[b.id] ?? 0) > 0).map((b) => ({ id: b.id, icon: b.icon, name: b.name, count: counts[b.id] ?? 0 }));
  });

  protected duration(seconds: number): string {
    return formatDuration(seconds);
  }
}
