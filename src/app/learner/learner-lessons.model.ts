import type { LanguageLessonCard, LanguageModelState } from '../core/api.service';

const SUBJECT_ALIASES: Readonly<Record<string, string>> = {
  body: 'Body',
  'body part': 'Body',
  'body parts': 'Body',
  animal: 'Animals',
  animals: 'Animals',
  'animal name': 'Animals',
  'animal names': 'Animals',
  fruit: 'Fruits',
  fruits: 'Fruits',
  'fruit name': 'Fruits',
  'fruit names': 'Fruits',
  vegetable: 'Vegetables',
  vegetables: 'Vegetables',
  'vegetable name': 'Vegetables',
  'vegetable names': 'Vegetables',
  language: 'Language',
  alphabet: 'Language',
  letter: 'Language',
  letters: 'Language',
  word: 'Language',
  words: 'Language',
  'letter and word': 'Language',
  'letter and words': 'Language',
  'letters and word': 'Language',
  'letters and words': 'Language',
  'letter & word': 'Language',
  'letters & words': 'Language',
};

/** One canonical spelling for the topics the trainer writes in other words. */
export function canonicalLessonSubject(value: string): string {
  const normalized = value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
  return SUBJECT_ALIASES[normalized] ?? value.trim().replace(/\s+/g, ' ');
}

/** The topics of a lesson, one by one. A lesson can sit under several. */
export function lessonTopics(lesson: { subject?: string; subjects?: string[] }): string[] {
  const topics = (lesson.subjects ?? []).filter((topic) => topic.trim().length > 0);
  const source = topics.length ? topics : [lesson.subject ?? 'General'];
  const cleaned: string[] = [];
  for (const topic of source) {
    for (const part of topic.split(',')) {
      const name = canonicalLessonSubject(part);
      if (name && !cleaned.includes(name)) {
        cleaned.push(name);
      }
    }
  }
  return cleaned.length ? cleaned : ['General'];
}

/** The lessons of one grade, filed under every topic they belong to. */
export interface LearnerLessonGroup {
  subject: string;
  lessons: LanguageLessonCard[];
}

/** Group one grade's lessons by topic, keeping the order they arrived in. */
export function lessonsBySubjectFor(
  state: LanguageModelState | null,
  stageId: string,
): LearnerLessonGroup[] {
  if (!state) return [];
  const groups = new Map<string, LanguageLessonCard[]>();
  for (const lesson of state.lesson_cards) {
    if ((lesson.grade_id ?? 'nursery') !== stageId) continue;
    for (const topic of lessonTopics(lesson)) {
      groups.set(topic, [...(groups.get(topic) ?? []), lesson]);
    }
  }
  return [...groups.entries()].map(([subject, lessons]) => ({ subject, lessons }));
}
