import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { LanguageReasoning, QuerySource, QuestionUnderstanding } from '../core/api/api-models';
import { AnswerPipeline } from '../shared/answer-pipeline';
import { AnswerReveal } from '../shared/answer-reveal';
import { hasTrace, traceFromUnderstanding } from '../shared/answer-trace';

const SOURCE_LABELS: Readonly<Record<string, string>> = {
  assistant_profile: 'Assistant profile',
  dictionary: 'Offline dictionary',
  faq: 'Trainer-approved answer',
  learner: 'Learner curriculum',
  lesson_cards: 'Lesson knowledge',
  letters: 'Letter learning',
  not_learned: 'Not learned yet',
  number_cards: 'Number cards',
  sentence_examples: 'Learned sentence examples',
  sentence_patterns: 'Learned sentence patterns',
  taught: 'Taught lesson',
  trainer: 'Trainer-approved answer',
  word_cards: 'Learned word',
};

/** One question asked of the learner, and the answer it gave. */
export interface LearnerChatTurn {
  question: string;
  answer: string;
  source: QuerySource;
  reasoning?: LanguageReasoning | null;
  understanding?: QuestionUnderstanding | null;
  reveal?: boolean;
}

@Component({
  selector: 'app-learner-chat-turn',
  standalone: true,
  imports: [AnswerPipeline, AnswerReveal, DecimalPipe],
  templateUrl: './learner-chat-turn.html',
  styleUrl: './learner-chat-turn.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearnerChatTurnCard {
  readonly turn = input.required<LearnerChatTurn>();

  protected readonly trace = computed(() => traceFromUnderstanding(this.turn().understanding));
  protected readonly showTrace = computed(() => hasTrace(this.trace()));
  protected readonly sourceLabel = computed(
    () => SOURCE_LABELS[this.turn().source] ?? 'Learner knowledge',
  );
}
