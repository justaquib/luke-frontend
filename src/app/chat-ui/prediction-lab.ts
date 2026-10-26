import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import type { Subscription } from 'rxjs';
import type { WordPrediction } from '../core/api/api-models';
import { ModelApiService } from '../core/api/model-api.service';
import { AppIcon } from '../shared/app-icon';
import { AppModal } from '../shared/app-modal';
import { ChatWordHeatmap } from './chat-word-heatmap';

/**
 * The prediction lab: one word at a time from the selected model. Every word
 * shown is a word the backend measured; the animation only reveals the order
 * in which those measured words arrive.
 */
@Component({
  selector: 'app-prediction-lab',
  standalone: true,
  imports: [AppIcon, AppModal, ChatWordHeatmap],
  templateUrl: './prediction-lab.html',
  styleUrls: ['./styles/prediction-lab.css', '../shared/controls.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PredictionLab {
  readonly open = input(false);
  readonly seed = input('');
  readonly model = input<string | null>(null);
  readonly modelName = input('Luke');
  readonly closed = output<void>();

  protected readonly prefix = signal('');
  protected readonly words = signal<string[]>([]);
  protected readonly prediction = signal<WordPrediction | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly custom = signal('');
  protected readonly justPicked = signal(false);

  private readonly api = inject(ModelApiService);
  private subscription?: Subscription;

  constructor() {
    effect(() => {
      if (!this.open()) {
        untracked(() => this.reset());
        return;
      }
      const seed = this.seed();
      untracked(() => this.start(seed));
    });
  }

  protected onPrefix(value: string): void {
    this.prefix.set(value);
    this.words.set([]);
    this.justPicked.set(false);
  }

  protected pick(word: string): void {
    this.words.update((words) => [...words, word]);
    this.justPicked.set(true);
    this.predict();
  }

  protected removeFrom(index: number): void {
    this.words.update((words) => words.slice(0, index));
    this.justPicked.set(false);
    this.predict();
  }

  protected useCustom(): void {
    const word = this.custom().trim();
    if (!word) return;
    this.custom.set('');
    this.pick(word);
  }

  protected predictNow(): void {
    this.predict();
  }

  protected close(): void {
    this.closed.emit();
  }

  protected percent(value: number): string {
    const percent = value * 100;
    if (percent >= 10) return `${Math.round(percent)}%`;
    if (percent >= 1) return `${percent.toFixed(1)}%`;
    return percent > 0 ? '<1%' : '0%';
  }

  private start(seed: string): void {
    this.subscription?.unsubscribe();
    this.prefix.set(seed);
    this.words.set([]);
    this.custom.set('');
    this.prediction.set(null);
    this.error.set(null);
    this.justPicked.set(false);
    this.predict();
  }

  private reset(): void {
    this.subscription?.unsubscribe();
    this.subscription = undefined;
    this.prediction.set(null);
    this.loading.set(false);
    this.error.set(null);
  }

  private predict(): void {
    this.subscription?.unsubscribe();
    const text = this.text();
    if (!text) {
      this.prediction.set(null);
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.subscription = this.api.predict(text, this.model(), 5).subscribe({
      next: (prediction) => {
        this.prediction.set(prediction);
        this.loading.set(false);
      },
      error: (error: Error) => {
        this.error.set(error.message || 'The model could not predict the next word.');
        this.loading.set(false);
      },
    });
  }

  private text(): string {
    return [this.prefix().trim(), ...this.words()].filter(Boolean).join(' ');
  }
}
