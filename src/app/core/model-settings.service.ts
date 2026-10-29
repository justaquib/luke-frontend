import { Injectable, computed, inject, signal } from '@angular/core';
import { tap, type Observable } from 'rxjs';
import { AppPrefsService } from './app-prefs.service';
import { LanguageModelApiService } from './api/language-model-api.service';
import type { ModelSettingsDocument } from './api/language-brain.types';

/**
 * The name and starting version of the model, as the backend keeps them.
 * The name follows into the shell brand and the chat, so renaming the model
 * in Settings renames it everywhere it speaks.
 */
@Injectable({ providedIn: 'root' })
export class ModelSettingsService {
  private readonly api = inject(LanguageModelApiService);
  private readonly prefs = inject(AppPrefsService);

  private readonly _settings = signal<ModelSettingsDocument | null>(null);
  private readonly _saving = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _saveError = signal<string | null>(null);
  private loading = false;

  readonly settings = this._settings.asReadonly();
  readonly saving = this._saving.asReadonly();
  /** Why the last reading of the identity failed, or null. */
  readonly error = this._error.asReadonly();
  /** Why the last saving of the identity failed, or null. Kept apart from the
   *  reading failure so the card can name the one that actually happened. */
  readonly saveError = this._saveError.asReadonly();
  readonly name = computed(() => this._settings()?.name ?? this.prefs.botName());
  readonly level = computed(() => this._settings()?.level ?? null);
  readonly versions = computed(() => this._settings()?.levels ?? []);

  /** Read the identity once, unless a caller asks for a fresh reading. */
  load(force = false): void {
    if (this.loading) return;
    if (!force && this._settings()) return;
    this.loading = true;
    this._error.set(null);
    this.api.modelSettings().subscribe({
      next: (settings) => {
        this.loading = false;
        this.apply(settings);
      },
      error: (err: Error) => {
        this.loading = false;
        this._error.set(err.message);
      },
    });
  }

  save(name: string, startLevel: string): Observable<ModelSettingsDocument> {
    this._saving.set(true);
    this._saveError.set(null);
    return this.api.saveModelSettings(name, startLevel).pipe(
      tap({
        next: (settings) => {
          this._saving.set(false);
          this.apply(settings);
        },
        error: (err: Error) => {
          this._saving.set(false);
          this._saveError.set(err.message);
        },
      }),
    );
  }

  private apply(settings: ModelSettingsDocument): void {
    this._settings.set(settings);
    this._error.set(null);
    this._saveError.set(null);
    // A reply without the name keeps the current one instead of refusing the
    // whole document, so a renamed model can never leave the chat unusable.
    if (typeof settings.name === 'string') {
      this.prefs.setBotName(settings.name);
    }
  }
}
