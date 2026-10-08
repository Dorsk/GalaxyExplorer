import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { GameStateService } from '../../core/services/game-state.service';
import { TechTreeService } from '../../core/services/tech-tree.service';
import { formatDuration } from '../../shared/format';
import { FormatNumberPipe } from '../../shared/format-number.pipe';

@Component({
  selector: 'app-tech-tree',
  standalone: true,
  imports: [FormatNumberPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel intro">
      <div>
        <h2>🧠 Arbres de talents</h2>
        <p class="muted">Dépensez vos points de recherche pour faire progresser votre civilisation. Certains talents exigent des prérequis dans d’autres branches.</p>
      </div>
      <div class="rp">
        <span class="mono big">🔬 {{ research() | fmt }}</span>
        <span class="muted">{{ economy().net.research | fmt: 'rate' }}</span>
      </div>
    </section>

    @if (tree.current(); as job) {
      <section class="panel current">
        <span class="c-icon">{{ job.def.icon }}</span>
        <div class="c-body">
          <div class="c-head">
            <strong>Recherche en cours : {{ job.def.name }}</strong>
            <span class="mono">⏱ {{ duration(job.remaining) }}</span>
          </div>
          <div class="progress"><div [style.width.%]="job.progress * 100"></div></div>
        </div>
        <button class="btn btn-ghost" (click)="tree.cancel()" title="Annuler la recherche (points remboursés)">✕ Annuler</button>
      </section>
    }

    <div class="branches">
      @for (branch of tree.branches(); track branch.def.id) {
        <section class="panel branch" [style.--branch]="branch.def.color">
          <header>
            <span class="b-icon">{{ branch.def.icon }}</span>
            <div class="b-title">
              <h3>{{ branch.def.name }}</h3>
              <p class="muted">{{ branch.def.description }}</p>
            </div>
            <span class="chip">{{ branch.researched }}/{{ branch.total }}</span>
          </header>
          <div class="progress"><div [style.width.%]="(branch.researched / branch.total) * 100"></div></div>

          @for (tier of branch.tiers; track tier.tier) {
            <div class="tier">
              <span class="tier-label">Palier {{ tier.tier }}</span>
              @for (node of tier.nodes; track node.def.id) {
                <button
                  class="node"
                  [attr.data-status]="node.status"
                  [class.affordable]="node.affordable"
                  [class.busy]="busy()"
                  [disabled]="node.status !== 'available' || !node.affordable || busy()"
                  [title]="node.status === 'available' && busy() ? 'Une recherche est déjà en cours' : ''"
                  (click)="tree.research(node.def.id)"
                >
                  <div class="n-head">
                    <span class="n-icon">{{ node.def.icon }}</span>
                    <strong>{{ node.def.name }}@if (node.def.repeatable) {<span class="lvl"> · niv. {{ node.level }}/{{ node.def.repeatable.maxLevel }}</span>}</strong>
                    @if (node.status === 'researched') {
                      <span class="done">✓</span>
                    } @else if (node.status === 'researching') {
                      <span class="cost mono">⏳ {{ duration(tree.current()?.remaining ?? 0) }}</span>
                    } @else {
                      <span class="cost mono">🔬 {{ node.cost | fmt }} · ⏱ {{ duration(node.duration) }}</span>
                    }
                  </div>
                  @if (node.status === 'researching') {
                    <div class="progress n-progress"><div [style.width.%]="(tree.current()?.progress ?? 0) * 100"></div></div>
                  }
                  <p class="n-desc">{{ node.def.description }}</p>
                  <ul>
                    @for (effect of node.effects; track effect) {
                      <li>{{ effect }}</li>
                    }
                  </ul>
                  @if (node.missing.length > 0) {
                    <p class="requires">
                      🔒 Requiert :
                      @for (m of node.missing; track m.id; let last = $last) {
                        {{ m.icon }} {{ m.name }}{{ last ? '' : ', ' }}
                      }
                    </p>
                  }
                  @if (node.needsColony) {
                    <p class="requires">🔒 Requiert une colonie fondée avec l’Arche Spatiale</p>
                  }
                  @if (node.def.requiresColonies && node.status !== 'researched') {
                    <p class="optional">Facultatif : le commerce n’est nécessaire à aucune autre découverte.</p>
                  }
                </button>
              }
            </div>
          }
        </section>
      }
    </div>
  `,
  styles: `
    .intro { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
    .intro h2 { margin: 0 0 4px; }
    .current { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; border-color: rgba(92, 200, 255, 0.45); }
    .c-icon { font-size: 2rem; }
    .c-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
    .c-head { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
    .node[data-status='researching'] { border-color: var(--branch); background: color-mix(in srgb, var(--branch) 8%, transparent); }
    .node[data-status='available'].affordable.busy { box-shadow: none; }
    .n-progress { margin-top: 6px; }
    .lvl { font-weight: normal; color: var(--muted); font-size: 0.8rem; }
    .optional { margin: 4px 0 0; font-size: 0.72rem; color: var(--muted); font-style: italic; }
    .n-progress > div { background: var(--branch); }
    .intro p { margin: 0; max-width: 640px; }
    .rp { display: flex; flex-direction: column; align-items: flex-end; }
    .big { font-size: 1.5rem; }
    .branches { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; align-items: start; }
    .branch { border-top: 3px solid var(--branch); display: flex; flex-direction: column; gap: 10px; }
    .branch header { display: flex; gap: 10px; align-items: flex-start; }
    .b-icon { font-size: 1.8rem; }
    .b-title { flex: 1; }
    .b-title h3 { margin: 0; color: var(--branch); }
    .b-title p { margin: 2px 0 0; font-size: 0.8rem; }
    .progress > div { background: var(--branch); }
    .tier { display: flex; flex-direction: column; gap: 8px; position: relative; padding-left: 14px; border-left: 1px dashed var(--border); }
    .tier-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
    .node {
      text-align: left;
      color: inherit;
      font: inherit;
      padding: 10px;
      border-radius: var(--radius);
      border: 1px solid var(--border);
      background: rgba(255, 255, 255, 0.02);
      cursor: pointer;
      transition: border-color 0.2s, background 0.2s, transform 0.1s;
    }
    .node:disabled { cursor: default; }
    .node[data-status='locked'] { opacity: 0.45; }
    .node[data-status='available'] { border-color: color-mix(in srgb, var(--branch) 40%, transparent); }
    .node[data-status='available'].affordable { border-color: var(--branch); box-shadow: 0 0 16px color-mix(in srgb, var(--branch) 25%, transparent); }
    .node[data-status='available'].affordable:hover { transform: translateY(-1px); background: color-mix(in srgb, var(--branch) 10%, transparent); }
    .node[data-status='researched'] { background: color-mix(in srgb, var(--branch) 12%, transparent); border-color: color-mix(in srgb, var(--branch) 50%, transparent); }
    .n-head { display: flex; align-items: center; gap: 8px; }
    .n-head strong { flex: 1; }
    .n-icon { font-size: 1.2rem; }
    .done { color: var(--branch); font-weight: bold; }
    .cost { font-size: 0.8rem; white-space: nowrap; }
    .node:not(.affordable)[data-status='available'] .cost { color: var(--danger); }
    .n-desc { margin: 4px 0; font-size: 0.8rem; color: var(--muted); }
    ul { margin: 0; padding-left: 16px; font-size: 0.8rem; }
    .requires { margin: 6px 0 0; font-size: 0.75rem; color: var(--warning); }
    @media (max-width: 1100px) {
      .branches { grid-template-columns: 1fr; }
    }
  `,
})
export class TechTreeComponent {
  protected readonly tree = inject(TechTreeService);
  private readonly state = inject(GameStateService);
  protected readonly economy = this.state.economy;
  protected readonly research = () => this.state.resources().research;
  protected readonly busy = computed(() => this.tree.current() !== null);

  protected duration(seconds: number): string {
    return formatDuration(Math.ceil(seconds));
  }
}
