/** Saved learner state returned by the API, shaped for the page tests. */
export function learnerState(
  lessonCards: unknown[] = [],
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    model_name: 'Neural Word Model',
    description: 'A small learner.',
    stage: 'Nursery',
    foundation_lessons: 0,
    trainer_lessons: 0,
    sentence_count: 0,
    token_count: 0,
    vocabulary_size: 24,
    transition_count: 0,
    next_words: [],
    examples: [],
    example_total: 0,
    generated_example: null,
    current_stage_id: 'nursery',
    passed_stages: [],
    stages: [
      {
        id: 'nursery',
        title: 'Nursery',
        description: 'First ideas.',
        subjects: ['Language'],
        lesson_count: 0,
        completed: false,
        attempt_count: 0,
        pass_count: 0,
      },
    ],
    letters: 'abcdefghijklmnopqrstuvwxyz',
    word_cards: [],
    lesson_cards: lessonCards,
    active_test: null,
    test_history: [],
    ...overrides,
  };
}

export const duplicateCard = {
  id: 'card-2',
  question: 'What is a magnet?',
  answer: 'A magnet pulls iron.',
  kind: 'trainer',
  grade_id: 'nursery',
  subject: 'Science',
  subjects: ['Science'],
  confidence: 0.5,
};

export const duplicates = {
  groups: [
    {
      kind: 'same_question',
      label: 'Same question',
      detail: 'These ask the same thing.',
      key: 'question:what is a magnet?',
      cards: [
        {
          id: 'card-1',
          question: 'What is a magnet?',
          answer: 'It pulls iron.',
          subject: 'Science',
          subjects: ['Science'],
          grade_id: 'nursery',
          confidence: 0.5,
        },
        {
          id: 'card-2',
          question: 'What is a magnet?',
          answer: 'A magnet pulls iron.',
          subject: 'Science',
          subjects: ['Science'],
          grade_id: 'nursery',
          confidence: 0.5,
        },
      ],
    },
  ],
  total_questions: 12,
  duplicate_count: 1,
};
