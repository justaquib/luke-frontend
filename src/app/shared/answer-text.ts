import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { parseAnswer, revealAnswer } from './answer-segments';
import { CodeBlock } from './code-block';

/**
 * An answer rendered the way the engine wrote it: prose where it wrote prose
 * and one code card per fenced block. `revealedWords` holds back the words of
 * a reveal that have not arrived yet; a code card is never cut in half.
 */
@Component({
  selector: 'app-answer-text',
  standalone: true,
  imports: [CodeBlock],
  templateUrl: './answer-text.html',
  styleUrl: './answer-text.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnswerText {
  readonly text = input.required<string>();
  /** Words revealed so far; leave it unset when the text is complete. */
  readonly revealedWords = input<number | undefined>(undefined);

  protected readonly parts = computed(() => {
    const parsed = parseAnswer(this.text());
    const words = this.revealedWords();
    return words === undefined ? parsed : revealAnswer(parsed, words);
  });

  /** While words are still arriving, prose is decoration and the card is not. */
  protected readonly revealing = computed(() => this.revealedWords() !== undefined);
}
