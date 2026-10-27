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
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import type { WordPrediction } from '../core/api/api-models';
import { ModelApiService } from '../core/api/model-api.service';
import { AnswerModelService } from './answer-model.service';
import { HeatRead } from './heat-read';
import { PredictionLab } from './prediction-lab';
import type { ChatMessage } from './chat.types';

interface Read {
  prediction: WordPrediction | null;
  loading: boolean;
  error: string | null;
}

const UNREAD: Read = { prediction: null, loading: false, error: null };

/**
 * The selected model's measured read of this answer and its question: its
 * attention over the words of each and the words it predicts next. Every
 * number is the backend's, and either read can be opened in the lab.
 */
@Component({
  selector: 'app-answer-prediction',
  standalone: true,
  imports: [HeatRead, PredictionLab, RouterLink],
  templateUrl: './answer-prediction.html',
  styleUrl: './styles/answer-prediction.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnswerPrediction {
  readonly message = input.required<ChatMessage>();
  readonly question = input<string | null>(null);

  protected readonly questionRead = signal<Read>(UNREAD);
  protected readonly answerRead = signal<Read>(UNREAD);
  protected readonly labOpen = signal(false);
  protected readonly labSeed = signal('');

  private readonly modelApi = inject(ModelApiService);
  private readonly models = inject(AnswerModelService);
  private reads = new Subscription();
  /** Bumped on every re-read so a superseded reply can never paint an error. */
  private generation = 0;

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

  protected readonly questionText = computed(() => (this.question() ?? '').trim());
  protected readonly answerText = computed(() => this.message().text.trim());

  /** Every read failed for the same reason: this workspace has no word model. */
  protected readonly needsTraining = computed(() => {
    const failed = [this.questionRead(), this.answerRead()].filter((read) => read.error !== null);
    return (
      failed.length > 0 &&
      failed.every((read) => read.error?.toLowerCase().includes('no trained weights'))
    );
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.reads.unsubscribe());
    effect(() => {
      const question = this.questionText();
      const answer = this.answerText();
      const model = this.predictionModel();
      untracked(() => {
        this.models.load();
        this.read(question, answer, model);
      });
    });
  }

  /** Ask the same two questions again, on the trainer's word. */
  protected retry(): void {
    this.read(this.questionText(), this.answerText(), this.predictionModel());
  }

  protected openLab(seed: string): void {
    if (!seed) return;
    this.labSeed.set(seed);
    this.labOpen.set(true);
  }

  private read(question: string, answer: string, model: string): void {
    this.reads.unsubscribe();
    this.reads = new Subscription();
    const generation = ++this.generation;
    this.predict('question', question, model, generation);
    this.predict('answer', answer, model, generation);
  }

  private predict(
    target: 'question' | 'answer',
    text: string,
    model: string,
    generation: number,
  ): void {
    const read = target === 'question' ? this.questionRead : this.answerRead;
    if (!text) {
      read.set(UNREAD);
      return;
    }
    read.set({ prediction: null, loading: true, error: null });
    const settle = (next: Read): void => {
      if (generation === this.generation) read.set(next);
    };
    this.reads.add(
      this.modelApi.predict(text, model, 3).subscribe({
        next: (prediction) => settle({ prediction, loading: false, error: null }),
        error: (error: Error) =>
          settle({
            prediction: null,
            loading: false,
            error: error.message || `The model could not read the ${target}.`,
          }),
      }),
    );
  }
}
