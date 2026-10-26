import type { ChatSource } from './chat.types';

const SOURCE_LABELS: Readonly<Record<string, string>> = {
  faq: 'Trained',
  docs: 'Documents',
  pending: 'Awaiting',
  intent: 'Intent match',
  weather: 'Weather',
  wiki: 'Wikipedia',
  assistant_profile: 'Assistant profile',
  dictionary: 'Offline dictionary',
  learner: 'Curriculum',
  lesson_cards: 'Lesson',
  letters: 'Letters',
  not_learned: 'Not learned',
  number_cards: 'Number cards',
  sentence_examples: 'Sentence examples',
  sentence_patterns: 'Sentence patterns',
  taught: 'Taught lesson',
  trainer: 'Trained',
  word_cards: 'Word meanings',
};

/** The human name of the path an answer took. */
export function chatSourceLabel(source: ChatSource | undefined): string | null {
  return source ? (SOURCE_LABELS[source] ?? source) : null;
}
