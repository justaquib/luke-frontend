import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { AnswerReading, WordReading } from '../core/api/api-models';

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

/** The words the engine read from the question, with their meaning. */
@Component({
  selector: 'app-answer-reading',
  standalone: true,
  templateUrl: './answer-reading.html',
  styleUrl: './answer-reading.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnswerReadingStage {
  readonly reading = input.required<AnswerReading>();

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
}
