import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

/** The ways a lesson can be written down. */
export type LessonEntryMode = 'own_words' | 'formatted' | 'story';

/**
 * The form that teaches the learner a lesson. A lesson is a question and an
 * answer, a list of question and answer pairs, or a story, a lesson or a
 * topic that is taught as one passage.
 */
@Component({
  selector: 'app-lesson-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lesson-form.html',
  styleUrls: ['./lesson-form.css', '../shared/controls.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LessonForm {
  /** How the lesson is written down. */
  readonly mode = model<LessonEntryMode>('own_words');

  /** The topics the lesson is filed under. */
  readonly subject = model('');

  /** The question the learner should answer. */
  readonly question = model('');

  /** The answer in the trainer's own words. */
  readonly answer = model('');

  /** The lesson as question and answer pairs. */
  readonly pairs = model('');

  /** The name of the story, the lesson or the topic. */
  readonly title = model('');

  /** The text of the story, the lesson or the topic. */
  readonly passage = model('');

  /** The topics the trainer can pick from. */
  readonly subjects = input<string[]>([]);

  /** Whether the lesson is being taught right now. */
  readonly saving = input(false);

  /** The name of the grade the lesson is taught in. */
  readonly stageTitle = input('');

  /** What the grade is for. */
  readonly description = input('');

  /** Raised when the lesson is ready to be taught. */
  readonly submitted = output<void>();

  /** Whether there is enough written down to teach a lesson. */
  protected canSubmit(): boolean {
    if (this.mode() === 'story') return !!this.title().trim() && !!this.passage().trim();
    if (this.mode() === 'formatted') return !!this.pairs().trim();
    return !!this.question().trim() && !!this.answer().trim();
  }
}
