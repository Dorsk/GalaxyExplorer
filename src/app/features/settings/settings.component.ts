import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AUTOSAVE_EVERY_TICKS, TICK_MS } from '../../core/game.config';
import { GameStateService } from '../../core/services/game-state.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel save">
      <h3>💾 Sauvegarde</h3>
      <p class="muted">Sauvegarde automatique toutes les {{ autosaveSeconds }} secondes dans le navigateur (localStorage).</p>
      <div class="row">
        <button class="btn" (click)="save()">Sauvegarder</button>
        <button class="btn" (click)="exportSave()">Exporter</button>
        <button class="btn" (click)="importSave()">Importer</button>
        <button class="btn btn-danger" (click)="reset()">
          {{ confirmReset() ? 'Vraiment recommencer ? Cliquez pour confirmer' : 'Recommencer la partie' }}
        </button>
      </div>
      <textarea
        rows="4"
        placeholder="Collez ici une sauvegarde exportée, puis cliquez sur Importer."
        [value]="saveText()"
        (input)="saveText.set($any($event.target).value)"
      ></textarea>
      @if (message()) {
        <p class="message">{{ message() }}</p>
      }
    </section>
  `,
  styles: `
    .save { max-width: 820px; }
    h3 { margin-top: 0; }
    .row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
    textarea { width: 100%; box-sizing: border-box; background: rgba(0, 0, 0, 0.3); color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 8px; font-family: monospace; font-size: 0.75rem; resize: vertical; }
    .message { color: var(--accent); margin-bottom: 0; }
  `,
})
export class SettingsComponent {
  private readonly state = inject(GameStateService);

  protected readonly autosaveSeconds = (AUTOSAVE_EVERY_TICKS * TICK_MS) / 1000;
  protected readonly saveText = signal('');
  protected readonly message = signal('');
  protected readonly confirmReset = signal(false);

  protected save(): void {
    this.state.save();
    this.message.set('✅ Partie sauvegardée.');
  }

  protected exportSave(): void {
    const data = this.state.exportSave();
    this.saveText.set(data);
    navigator.clipboard?.writeText(data).then(
      () => this.message.set('📋 Sauvegarde copiée dans le presse-papiers.'),
      () => this.message.set('Sauvegarde exportée ci-dessous.'),
    );
  }

  protected importSave(): void {
    const ok = this.state.importSave(this.saveText());
    this.message.set(ok ? '✅ Sauvegarde importée.' : '❌ Sauvegarde invalide.');
    if (ok) this.state.addLog('💾 Sauvegarde importée.', 'info');
  }

  protected reset(): void {
    if (!this.confirmReset()) {
      this.confirmReset.set(true);
      setTimeout(() => this.confirmReset.set(false), 4000);
      return;
    }
    this.confirmReset.set(false);
    this.state.hardReset();
    this.state.addLog('🌍 Nouvelle partie : deux humains s’éveillent sur Terre.', 'success');
    this.message.set('Nouvelle partie commencée.');
  }
}
