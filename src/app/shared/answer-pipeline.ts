import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { SourceConnection, WordReading } from '../core/api/api-models';
import { AppIcon } from './app-icon';
import type { AnswerTrace, PipelinePhase } from './answer-trace';

const SOURCE_LABELS: Readonly<Record<string, string>> = {
  faq: 'Trainer-approved answers',
  intent: 'Intent match',
  taught: 'Taught lessons',
  lesson_cards: 'Taught lessons',
  dictionary: 'Offline dictionary',
  fallback: 'Word meanings',
  weather: 'Weather',
  wiki: 'Wikipedia',
  docs: 'Documents',
  pending: 'Pending questions',
};

const PARTS_OF_SPEECH: Readonly<Record<string, string>> = {
  ADJ: 'adjective',
  ADP: 'preposition',
  ADV: 'adverb',
  AUX: 'helper verb',
  CCONJ: 'conjunction',
  DET: 'determiner',
  NOUN: 'noun',
  NUM: 'number',
  PART: 'particle',
  PRON: 'pronoun',
  PROPN: 'name',
  SCONJ: 'conjunction',
  VERB: 'verb',
};

/** The stages the backend reached for one answer, read top to bottom. */
@Component({
  selector: 'app-answer-pipeline',
  standalone: true,
  imports: [AppIcon],
  templateUrl: './answer-pipeline.html',
  styleUrl: './answer-pipeline.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnswerPipeline {
  readonly trace = input.required<AnswerTrace>();
  readonly phase = input<PipelinePhase | null>(null);
  readonly live = input(false);

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

  protected wordMeta(word: WordReading): string {
    const parts: string[] = [];
    const speech = word.part_of_speech
      ? (PARTS_OF_SPEECH[word.part_of_speech] ?? word.part_of_speech.toLowerCase())
      : '';
    if (speech) parts.push(speech);
    if (word.lemma && word.lemma.toLowerCase() !== word.word.toLowerCase()) {
      parts.push(`→ ${word.lemma}`);
    }
    return parts.join(' · ');
  }

  protected synonymLine(word: WordReading): string {
    return word.synonyms.length ? `same as ${word.synonyms.join(', ')}` : '';
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
