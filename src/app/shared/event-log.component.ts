import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { GameStateService } from '../core/services/game-state.service';

@Component({
  selector: 'app-event-log',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel">
      <h3>📜 Journal</h3>
      <ul>
        @for (entry of log(); track entry.id) {
          <li [attr.data-kind]="entry.kind">
            <time>{{ time(entry.time) }}</time>
            <span>{{ entry.message }}</span>
          </li>
        } @empty {
          <li class="muted">Aucun événement pour l’instant.</li>
        }
      </ul>
    </section>
  `,
  styles: `
    ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; max-height: 360px; overflow-y: auto; }
    li { display: flex; gap: 8px; font-size: 0.85rem; line-height: 1.35; padding-left: 8px; border-left: 2px solid var(--border); }
    li[data-kind='success'] { border-left-color: var(--success); }
    li[data-kind='warning'] { border-left-color: var(--warning); }
    li[data-kind='danger'] { border-left-color: var(--danger); color: #fecaca; }
    time { color: var(--muted); font-variant-numeric: tabular-nums; flex-shrink: 0; }
  `,
})
export class EventLogComponent {
  protected readonly log = inject(GameStateService).log;

  protected time(ts: number): string {
    return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}
