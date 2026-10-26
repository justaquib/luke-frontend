import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { BrowserService } from '../core/browser.service';

const MAX_REVEAL_MS = 1600;
const MIN_REVEAL_MS = 400;
const PER_WORD_MS = 28;
const TICK_MS = 40;

/**
 * Shows an answer that is already complete, word by word. The full text is
 * always in the DOM for screen readers; the growth is a presentation of it,
 * never a source of new content.
 */
@Component({
  selector: 'app-answer-reveal',
  standalone: true,
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
  protected readonly shown = signal('');

  private timer?: ReturnType<typeof setInterval>;
  private done = false;

  constructor() {
    effect(() => {
      const text = this.text();
      const animate = this.animate() && !this.browser.prefersReducedMotion();
      this.stop();
      this.done = false;
      if (!animate) {
        this.complete(text);
        return;
      }
      this.start(text);
    });
    this.destroyRef.onDestroy(() => this.stop());
  }

  private start(text: string): void {
    const tokens = text.split(/(\s+)/);
    const wordIndexes = tokens.reduce<number[]>((indexes, token, index) => {
      if (token.trim()) indexes.push(index);
      return indexes;
    }, []);
    if (wordIndexes.length === 0) {
      this.complete(text);
      return;
    }
    const duration = Math.min(
      MAX_REVEAL_MS,
      Math.max(MIN_REVEAL_MS, wordIndexes.length * PER_WORD_MS),
    );
    const startedAt = Date.now();
    this.shown.set('');
    this.timer = setInterval(() => {
      const progress = Math.min(1, (Date.now() - startedAt) / duration);
      const words = Math.max(1, Math.ceil(progress * wordIndexes.length));
      const last = wordIndexes[words - 1];
      this.shown.set(tokens.slice(0, last + 1).join(''));
      if (progress >= 1) {
        this.complete(text);
      } else {
        this.advanced.emit();
      }
    }, TICK_MS);
  }

  private complete(text: string): void {
    this.stop();
    this.shown.set(text);
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
