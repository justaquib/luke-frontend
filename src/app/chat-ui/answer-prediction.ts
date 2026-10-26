import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import type { Subscription } from 'rxjs';
import type { WordPrediction } from '../core/api/api-models';
import { ModelApiService } from '../core/api/model-api.service';
import { AppIcon } from '../shared/app-icon';
import { AnswerModelService } from './answer-model.service';
import { ChatWordHeatmap } from './chat-word-heatmap';
import { PredictionLab } from './prediction-lab';
import type { ChatMessage } from './chat.types';

/**
 * The selected model's measured read of this answer's question: its attention
 * over the words and the words it predicts next. Every number is the backend's.
 */
@Component({
  selector: 'app-answer-prediction',
  standalone: true,
  imports: [AppIcon, ChatWordHeatmap, PredictionLab],
  templateUrl: './answer-prediction.html',
  styleUrl: './styles/answer-prediction.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnswerPrediction {
  readonly message = input.required<ChatMessage>();
  readonly question = input<string | null>(null);

  protected readonly prediction = signal<WordPrediction | null>(null);
  protected readonly predictionLoading = signal(false);
  protected readonly predictionError = signal<string | null>(null);
  protected readonly labOpen = signal(false);

  private readonly modelApi = inject(ModelApiService);
  private readonly models = inject(AnswerModelService);
  private subscription?: Subscription;

  /** The model that wrote this answer, so the heatmap cannot show another one. */
  protected readonly predictionModel = computed(
    () => this.message().model ?? this.models.selectedId(),
  );

  protected readonly predictionModelName = computed(
    () =>
      this.message().modelName ??
      this.models.nameOf(this.predictionModel()) ??
      'The selected model',
  );

  /** The question is the prefix the model reads; the answer is the fallback. */
  protected readonly seed = computed(() => {
    const asked = (this.question() ?? '').trim();
    return asked || this.message().text.slice(0, 240).trim();
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.subscription?.unsubscribe());
    effect(() => {
      const seed = this.seed();
      const model = this.predictionModel();
      untracked(() => {
        this.models.load();
        if (!seed) return;
        this.predict(seed, model);
      });
    });
  }

  protected percent(value: number): string {
    const percent = value * 100;
    if (percent >= 10) return `${Math.round(percent)}%`;
    if (percent >= 1) return `${percent.toFixed(1)}%`;
    return percent > 0 ? '<1%' : '0%';
  }

  private predict(seed: string, model: string): void {
    this.subscription?.unsubscribe();
    this.predictionLoading.set(true);
    this.predictionError.set(null);
    this.subscription = this.modelApi.predict(seed, model, 3).subscribe({
      next: (prediction) => {
        this.prediction.set(prediction);
        this.predictionLoading.set(false);
      },
      error: (error: Error) => {
        this.predictionError.set(error.message || 'The model could not read this question.');
        this.predictionLoading.set(false);
      },
    });
  }
}
