import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { BrowserService } from '../core/browser.service';
import { answerWordCount, parseAnswer } from './answer-segments';
import { AnswerText } from './answer-text';

const MAX_REVEAL_MS = 1600;
const MIN_REVEAL_MS = 400;
const PER_WORD_MS = 28;
const TICK_MS = 40;

/**
 * Shows an answer that is already complete, word by word. The full text is
 * always in the DOM for screen readers; the growth is a presentation of it,
 * never a source of new content. A fenced block is a card, so it arrives whole
 * when the reveal reaches it instead of one line at a time.
 */
@Component({
  selector: 'app-answer-reveal',
  standalone: true,
  imports: [AnswerText],
  templateUrl: './answer-reveal.html',
  styleUrl: './answer-reveal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnswerReveal {
  readonly text = input.required<string>();
  readonly animate = input(false);
  readonly advanced = output<void>();
  readonly finished = output<void>();

  private readonly browser = inject(BrowserService);
  private readonly destroyRef = inject(DestroyRef);

  /** Words revealed so far; unset once the answer is on screen whole. */
  protected readonly revealedWords = signal<number | undefined>(undefined);
  protected readonly revealing = computed(() => this.revealedWords() !== undefined);

  private timer?: ReturnType<typeof setInterval>;
  private done = false;

  constructor() {
    effect(() => {
      const text = this.text();
      const animate = this.animate() && !this.browser.prefersReducedMotion();
      this.stop();
      this.done = false;
      if (!animate) {
        this.complete();
        return;
      }
      this.revealedWords.set(0);
      this.start(text);
    });
    this.destroyRef.onDestroy(() => this.stop());
  }

  private start(text: string): void {
    const total = answerWordCount(parseAnswer(text));
    if (total === 0) {
      this.complete();
      return;
    }
    const duration = Math.min(MAX_REVEAL_MS, Math.max(MIN_REVEAL_MS, total * PER_WORD_MS));
    const startedAt = Date.now();
    this.timer = setInterval(() => {
      const progress = Math.min(1, (Date.now() - startedAt) / duration);
      this.revealedWords.set(Math.max(1, Math.ceil(progress * total)));
      if (progress >= 1) {
        this.complete();
      } else {
        this.advanced.emit();
      }
    }, TICK_MS);
  }

  private complete(): void {
    this.stop();
    this.revealedWords.set(undefined);
    if (!this.done) {
      this.done = true;
      this.finished.emit();
    }
  }

  private stop(): void {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }
}
