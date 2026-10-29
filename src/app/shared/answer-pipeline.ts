import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { SourceConnection } from '../core/api/api-models';
import { AppIcon } from './app-icon';
import { AnswerText } from './answer-text';
import type { AnswerTrace, PipelinePhase } from './answer-trace';
import { AnswerReadingStage } from './answer-reading';

const SOURCE_LABELS: Readonly<Record<string, string>> = {
  faq: 'Trainer-approved answers',
  intent: 'Intent match',
  taught: 'Taught lessons',
  lesson_cards: 'Taught lessons',
  dictionary: 'Offline dictionary',
  fallback: 'Word meanings',
  weather: 'Weather',
  wiki: 'Wikipedia',
  web: 'Web pages (unverified)',
  docs: 'Documents',
  pending: 'Pending questions',
};

/** The stages the backend reached for one answer, read top to bottom. */
@Component({
  selector: 'app-answer-pipeline',
  standalone: true,
  imports: [AppIcon, AnswerReadingStage, AnswerText],
  templateUrl: './answer-pipeline.html',
  styleUrl: './answer-pipeline.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnswerPipeline {
  readonly trace = input.required<AnswerTrace>();
  readonly phase = input<PipelinePhase | null>(null);
  readonly live = input(false);
  /** The answer as the model writes it, when the backend streams tokens. */
  readonly text = input('');

  protected readonly activeLabel = computed(() => {
    if (!this.live()) return '';
    switch (this.phase()) {
      case 'reading':
        return 'Reading the question';
      case 'thinking':
        return 'Planning where to look';
      case 'connecting':
        return 'Checking the sources';
      case 'writing':
        return 'Writing the answer';
      case 'answer':
      case null:
        return '';
    }
  });

  protected questionType(kind: string): string {
    return kind ? `${kind.toLowerCase()} question` : 'question type not read';
  }

  protected matchLine(connection: SourceConnection): string {
    return connection.matched_question ? `“${connection.matched_question}”` : '';
  }

  protected sourceLabel(source: string): string {
    return SOURCE_LABELS[source] ?? source.replace(/_/g, ' ');
  }

  protected outcomeIcon(outcome: string): 'check' | 'x' | 'info' {
    if (outcome === 'match' || outcome === 'pass') return 'check';
    if (outcome === 'miss' || outcome === 'fail') return 'x';
    return 'info';
  }

  protected isHit(connection: SourceConnection): boolean {
    return connection.outcome === 'match' || connection.outcome === 'pass';
  }
}
