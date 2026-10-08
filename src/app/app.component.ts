import { ChangeDetectionStrategy, Component, OnInit, VERSION, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { GameEngineService } from './core/services/game-engine.service';
import { GameStateService } from './core/services/game-state.service';
import { TechTreeService } from './core/services/tech-tree.service';
import { ShipyardService } from './core/services/shipyard.service';
import { TradeService } from './core/services/trade.service';
import { formatValue } from './shared/format';
import { ResourceBarComponent } from './shared/resource-bar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ResourceBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="app-header">
      <div class="brand">
        <span class="logo">🪐</span>
        <div>
          <h1>GalaxyExplorer</h1>
          <span class="muted">De deux humains à la conquête des étoiles</span>
        </div>
      </div>
      <div class="header-info">
        <span class="chip">{{ planet().icon }} {{ planet().name }}</span>
        @if (colonies() > 0) {
          <span class="chip">🌌 {{ colonies() }} colonie{{ colonies() > 1 ? 's' : '' }}</span>
        }
        @if (credits() > 0 || tradeUnlocked()) {
          <span class="chip" title="Crédits galactiques">💰 {{ creditsLabel() }}</span>
        }
        <button class="btn btn-ghost icon-link" (click)="save()" title="Sauvegarder maintenant" aria-label="Sauvegarder">💾</button>
        <a class="btn btn-ghost icon-link" routerLink="parametres" routerLinkActive="active" title="Paramètres" aria-label="Paramètres">⚙️</a>
      </div>
    </header>

    <app-resource-bar />

    <nav class="tabs">
      @for (tab of tabs(); track tab.path) {
        <a class="tab" [routerLink]="tab.path" routerLinkActive="active">
          {{ tab.icon }} {{ tab.label }}
          @if (tab.badge) {
            <span class="badge">{{ tab.badge }}</span>
          }
        </a>
      }
    </nav>

    <main>
      <router-outlet />
    </main>

    <footer class="muted">GalaxyExplorer · Logiciel libre sous licence MIT · Angular {{ version }}</footer>
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: 16px; max-width: 1440px; margin: 0 auto; padding: 16px; }
    .app-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .logo { font-size: 2.4rem; filter: drop-shadow(0 0 12px rgba(92, 200, 255, 0.6)); }
    h1 { margin: 0; font-family: var(--font-display); font-size: 1.6rem; letter-spacing: 0.12em; background: linear-gradient(90deg, var(--accent), var(--accent-2)); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .header-info { display: flex; gap: 8px; align-items: center; margin-left: auto; }
    /* Boutons d'en-tête quasi transparents : on voit le fond étoilé à travers. */
    .icon-link {
      text-decoration: none; font-size: 1.1rem; line-height: 1; padding: 6px 9px;
      background: rgba(255, 255, 255, 0.02); border-color: rgba(120, 160, 255, 0.08);
    }
    .icon-link:hover:not(:disabled) { background: rgba(255, 255, 255, 0.06); border-color: rgba(120, 160, 255, 0.2); }
    .icon-link.active { background: rgba(92, 200, 255, 0.08); border-color: rgba(92, 200, 255, 0.3); }
    .tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border); overflow-x: auto; }
    .tab { padding: 10px 16px; color: var(--muted); text-decoration: none; border-bottom: 2px solid transparent; white-space: nowrap; transition: color 0.2s, border-color 0.2s; }
    .tab:hover { color: var(--text); }
    .tab.active { color: var(--accent); border-bottom-color: var(--accent); }
    .badge { display: inline-block; min-width: 18px; padding: 0 5px; margin-left: 4px; border-radius: 9px; background: var(--accent-2); color: #fff; font-size: 0.7rem; text-align: center; }
    footer { text-align: center; font-size: 0.75rem; padding: 16px 0 8px; }
  `,
})
export class AppComponent implements OnInit {
  private readonly engine = inject(GameEngineService);
  private readonly state = inject(GameStateService);
  private readonly tree = inject(TechTreeService);
  private readonly trade = inject(TradeService);
  private readonly shipyard = inject(ShipyardService);

  protected readonly version = VERSION.full;
  protected readonly planet = this.state.planetDef;
  protected readonly colonies = computed(() => this.state.colonies().length);
  protected readonly credits = this.state.credits;
  protected readonly tradeUnlocked = computed(() => this.trade.unlocked());
  protected readonly creditsLabel = computed(() => formatValue(this.state.credits()));

  protected readonly tabs = computed(() => {
    const available = this.tree.availableCount();
    return [
      { path: 'terre', icon: this.planet().icon, label: this.planet().name, badge: '' },
      { path: 'talents', icon: '🧠', label: 'Arbres de Talents', badge: this.tree.current() ? '⏳' : available > 0 ? String(available) : '' },
      { path: 'population', icon: '📊', label: 'Population & Statistiques', badge: '' },
      { path: 'galaxie', icon: '🌌', label: 'Exploration Galactique', badge: this.state.galaxyUnlocked() ? '' : '🔒' },
      // Le commerce (facultatif) n'apparaît qu'après la première colonie.
      ...(this.colonies() > 0
        ? [{ path: 'commerce', icon: '🛒', label: 'Commerce', badge: this.trade.unlocked() ? '' : '🔒' }]
        : []),
      // Le chantier spatial n'apparaît qu'une fois le bâtiment construit.
      ...(this.shipyard.unlocked()
        ? [{ path: 'chantier-spatial', icon: '🏗️', label: 'Chantier spatial', badge: this.shipyard.current() ? '⏳' : '' }]
        : []),
    ];
  });

  ngOnInit(): void {
    this.engine.start();
  }

  protected save(): void {
    this.state.save();
    this.state.addLog('💾 Partie sauvegardée.', 'info');
  }
}
