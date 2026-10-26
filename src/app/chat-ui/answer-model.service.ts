import { Injectable, computed, inject, signal } from '@angular/core';
import type { AnswerModel } from '../core/api/api-models';
import { ModelApiService } from '../core/api/model-api.service';
import { BrowserService } from '../core/browser.service';

const STORAGE_KEY = 'luke.answer-model';
const LUKE = 'luke';

/**
 * Which model the composer asks, and the models this tenant can choose from.
 * The choice is kept on this browser; the catalog is read from the backend so
 * a model that was removed from the machine cannot be chosen by accident.
 */
@Injectable({ providedIn: 'root' })
export class AnswerModelService {
  private readonly api = inject(ModelApiService);
  private readonly browser = inject(BrowserService);

  readonly models = signal<AnswerModel[]>([
    {
      id: LUKE,
      name: 'Luke',
      kind: 'luke',
      detail: 'Answers from the taught material.',
      ready: true,
    },
  ]);
  readonly selectedId = signal<string>(LUKE);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  private loaded = false;

  readonly selected = computed<AnswerModel | null>(() => {
    const id = this.selectedId();
    return this.models().find((model) => model.id === id) ?? null;
  });

  readonly selectionName = computed(() => {
    const model = this.selected();
    if (model) return model.name;
    return this.nameOf(this.selectedId()) ?? 'Luke';
  });

  constructor() {
    const saved = this.browser.readLocal(STORAGE_KEY);
    if (saved) this.selectedId.set(saved);
  }

  /** Read the catalog once; the composer and the trainer share it. */
  load(force = false): void {
    if (this.loading() || (this.loaded && !force)) return;
    this.loading.set(true);
    this.api.catalog().subscribe({
      next: (catalog) => {
        this.models.set(catalog.models);
        this.loaded = true;
        this.loading.set(false);
        this.error.set(null);
        this.keepChoice(catalog.models, catalog.default);
      },
      error: (error: Error) => {
        this.loading.set(false);
        this.error.set(error.message || 'The model list could not be read.');
      },
    });
  }

  select(modelId: string): void {
    this.selectedId.set(modelId);
    this.browser.writeLocal(STORAGE_KEY, modelId);
  }

  /** The label of a stored answer's model, even when it is no longer installed. */
  nameOf(modelId: string | null | undefined): string | null {
    if (!modelId) return null;
    if (modelId === LUKE) return 'Luke';
    return this.models().find((model) => model.id === modelId)?.name ?? null;
  }

  /** A saved model that is gone falls back to the backend's default. */
  private keepChoice(models: AnswerModel[], fallback: string): void {
    const wanted = this.selectedId();
    if (models.some((model) => model.id === wanted)) return;
    const next = models.some((model) => model.id === fallback) ? fallback : LUKE;
    this.selectedId.set(next);
    this.browser.writeLocal(STORAGE_KEY, next);
  }
}
