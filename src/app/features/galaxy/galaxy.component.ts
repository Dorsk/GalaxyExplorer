import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { PLANETS } from '../../core/data/planets.data';
import { RESOURCES_BY_ID, TERRAINS, resourceEntries } from '../../core/data/resources.data';
import { describeEffect } from '../../core/engine/modifiers';
import { COLONY_GLOBAL_BONUS, GALAXY_POPULATION_THRESHOLD } from '../../core/game.config';
import { PlanetDef, PlanetId } from '../../core/models/game.models';
import { GameEngineService } from '../../core/services/game-engine.service';
import { GameStateService } from '../../core/services/game-state.service';
import { TechTreeService } from '../../core/services/tech-tree.service';
import { FormatNumberPipe } from '../../shared/format-number.pipe';

@Component({
  selector: 'app-galaxy',
  standalone: true,
  imports: [FormatNumberPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!unlocked()) {
      <section class="panel locked">
        <div class="lock">🔒</div>
        <h2>Exploration Galactique</h2>
        <p class="muted">Les étoiles attendent. Deux conditions doivent être réunies pour construire l’Arche Spatiale :</p>
        <ul class="reqs">
          <li [class.ok]="warpResearched()">
            {{ warpResearched() ? '✅' : '⬜' }} Rechercher le talent 🌀 <strong>Moteur à distorsion</strong>
          </li>
          <li [class.ok]="popReached()">
            {{ popReached() ? '✅' : '⬜' }} Atteindre {{ threshold | fmt: 'int' }} habitants
            <span class="muted">(record : {{ runPeak() | fmt: 'int' }})</span>
            <div class="progress"><div [style.width.%]="popProgress()"></div></div>
          </li>
        </ul>
      </section>
    } @else {
      <section class="panel ark">
        <div class="ark-icon">🛸</div>
        <div class="ark-body">
          <h2>Arche Spatiale</h2>
          @if (!arkBuilt()) {
            <p class="muted">Un vaisseau-monde capable d’emmener une partie de votre peuple vers une nouvelle planète.</p>
            <div class="cost">
              @for (c of arkCost(); track c.id) {
                <span class="chip" [class.lacking]="!c.enough">{{ c.icon }} {{ c.amount | fmt }}</span>
              }
            </div>
            <button class="btn btn-primary" [disabled]="!canBuildArk()" (click)="engine.buildArk()">Construire l’Arche</button>
          } @else {
            <p class="ready">✅ L’Arche est prête. Choisissez une destination ci-dessous.</p>
          }
          <p class="warning">
            ⚠️ Lancer l’Arche démarre une nouvelle civilisation sur la planète choisie : bâtiments, ressources et talents sont
            réinitialisés. Les bonus des colonies sont <strong>permanents</strong> (+{{ colonyBonus }} % de production globale par colonie).
          </p>
        </div>
      </section>
    }

    <h3 class="section-title">🌌 Planètes</h3>
    <div class="planets">
      @for (p of planets(); track p.def.id) {
        <article class="panel planet" [attr.data-status]="p.status">
          <div class="orb" [style.background]="orb(p.def)"></div>
          <div class="p-body">
            <h4>{{ p.def.name }}</h4>
            <p class="muted">{{ p.def.description }}</p>
            <div class="terrain">
              @for (t of terrains; track t.id) {
                <span class="chip" [title]="t.name">{{ t.icon }} {{ p.def.terrain[t.id] }}</span>
              }
            </div>
            @if (p.bonus.length > 0) {
              <ul class="bonus">
                @for (b of p.bonus; track b) {
                  <li>{{ b }}</li>
                }
              </ul>
            }
            @switch (p.status) {
              @case ('current') { <span class="tag current">📍 Vous êtes ici</span> }
              @case ('colonized') { <span class="tag done">✅ Colonisée</span> }
              @case ('origin') { <span class="tag">🏠 Berceau de l’humanité</span> }
              @default {
                @if (unlocked()) {
                  <button class="btn btn-primary" [disabled]="!engine.canColonize(p.def.id)" (click)="launch(p.def.id)">
                    {{ pending() === p.def.id ? 'Confirmer le lancement ?' : '🚀 Lancer l’Arche' }}
                  </button>
                }
              }
            }
          </div>
        </article>
      }
    </div>
  `,
  styles: `
    .locked { text-align: center; max-width: 640px; margin: 0 auto 16px; }
    .lock { font-size: 3rem; }
    .reqs { list-style: none; padding: 0; text-align: left; display: flex; flex-direction: column; gap: 12px; }
    .reqs li { padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--radius); }
    .reqs li.ok { border-color: rgba(74, 222, 128, 0.5); }
    .reqs .progress { margin-top: 8px; }
    .ark { display: flex; gap: 20px; align-items: flex-start; margin-bottom: 16px; }
    .ark-icon { font-size: 4rem; filter: drop-shadow(0 0 20px rgba(167, 123, 255, 0.6)); }
    .ark-body { flex: 1; }
    .ark h2 { margin-top: 0; }
    .cost { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
    .chip.lacking { color: var(--danger); }
    .ready { color: var(--success); }
    .warning { font-size: 0.82rem; color: var(--warning); margin-bottom: 0; }
    .section-title { margin: 8px 0; }
    .planets { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr)); gap: 12px; }
    .planet { display: flex; gap: 14px; }
    .planet[data-status='colonized'], .planet[data-status='current'] { border-color: rgba(74, 222, 128, 0.4); }
    .orb { width: 64px; height: 64px; border-radius: 50%; flex-shrink: 0; box-shadow: inset -8px -8px 16px rgba(0, 0, 0, 0.55), 0 0 24px rgba(92, 200, 255, 0.15); }
    .p-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
    h4 { margin: 0; }
    .p-body p { margin: 0; font-size: 0.82rem; }
    .terrain { display: flex; gap: 4px; flex-wrap: wrap; }
    .bonus { margin: 0; padding-left: 18px; font-size: 0.82rem; color: var(--accent); }
    .tag { font-size: 0.82rem; color: var(--muted); }
    .tag.current { color: var(--accent); }
    .tag.done { color: var(--success); }
    @media (max-width: 600px) {
      .ark { flex-direction: column; align-items: center; }
    }
  `,
})
export class GalaxyComponent {
  protected readonly engine = inject(GameEngineService);
  private readonly state = inject(GameStateService);
  private readonly tree = inject(TechTreeService);

  protected readonly threshold = GALAXY_POPULATION_THRESHOLD;
  protected readonly colonyBonus = COLONY_GLOBAL_BONUS * 100;
  protected readonly terrains = TERRAINS;

  protected readonly unlocked = this.state.galaxyUnlocked;
  protected readonly arkBuilt = this.state.arkBuilt;
  protected readonly runPeak = computed(() => this.state.stats().runPeakPopulation);
  protected readonly warpResearched = computed(() => this.tree.isResearched('warpDrive'));
  protected readonly popReached = computed(() => this.runPeak() >= GALAXY_POPULATION_THRESHOLD);
  protected readonly popProgress = computed(() => Math.min(100, (this.runPeak() / GALAXY_POPULATION_THRESHOLD) * 100));

  protected readonly arkCost = computed(() => {
    const res = this.state.resources();
    return resourceEntries(this.engine.arkCost()).map(([id, amount]) => ({
      id,
      amount,
      icon: RESOURCES_BY_ID[id].icon,
      enough: res[id] >= amount,
    }));
  });
  protected readonly canBuildArk = computed(() => this.arkCost().every((c) => c.enough));

  protected readonly planets = computed(() => {
    const current = this.state.planet();
    const colonies = this.state.colonies();
    return PLANETS.map((def) => ({
      def,
      bonus: def.bonus.map(describeEffect),
      status:
        def.id === current ? 'current' : colonies.includes(def.id) ? 'colonized' : def.id === 'earth' ? 'origin' : 'available',
    }));
  });

  protected readonly pending = signal<PlanetId | null>(null);

  protected launch(id: PlanetId): void {
    if (this.pending() !== id) {
      this.pending.set(id);
      return;
    }
    this.pending.set(null);
    this.engine.launchArk(id);
  }

  protected orb(p: PlanetDef): string {
    return `radial-gradient(circle at 30% 30%, ${p.colors[0]}, ${p.colors[1]} 70%, #020617)`;
  }
}
