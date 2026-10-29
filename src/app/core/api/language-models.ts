/**
 * The shapes the learner page reads from the language-model routes. They
 * follow the payloads the backend builds in `app/services/language/`.
 */
import type { LanguagePreview } from './api-models';

export type LanguagePreviewResponse = LanguagePreview;

/** One word the learner has been taught, with the meaning it keeps. */
export interface LanguageWordCard {
  word: string;
  meaning: string;
  grade_id?: string;
  created_at?: string | null;
  dictionary_meaning?: string | null;
}

/** One lesson the learner can answer, taught by a trainer or built in. */
export interface LanguageLessonCard {
  id?: string;
  question: string;
  answer: string;
  kind: 'starter' | 'trainer';
  grade_id?: string;
  subject?: string;
  subjects?: string[];
  confidence?: number;
  created_at?: string | null;
}

/** One trainer-approved answer synced into the learner's material. */
export interface LanguageTrainerAnswer {
  id: number;
  question: string;
  answer: string;
  confidence?: number;
}

/** One grade of the curriculum and how far the learner has come in it. */
export interface LanguageStage {
  id: string;
  title: string;
  description: string;
  subjects: string[];
  lesson_count: number;
  completed: boolean;
  attempt_count: number;
  pass_count: number;
}

/** The three kinds of grade test the backend starts. */
export type LanguageTestKind = 'trainer' | 'mock' | 'exam';

/** A grade test that is open right now. */
export interface LanguageTest {
  stage: string;
  kind: LanguageTestKind;
  questions_asked: number;
  answers_passed: number;
  needs_learning: number;
  awaiting_score: boolean;
  last_question: string;
  last_answer: string;
  last_source?: string | null;
  last_source_detail?: string | null;
}

/** One finished test, with its measured pass rate. */
export interface LanguageTestResult {
  stage: string;
  kind: LanguageTestKind;
  questions_asked: number;
  answers_passed: number;
  needs_learning: number;
  pass_rate: number;
  required_pass_rate?: number | null;
  passed: boolean;
  created_at: string;
}

/** The learner state and the result a finished test gives back. */
export interface LanguageTestFinishResult {
  state: LanguageModelState;
  result: LanguageTestResult;
}

/** One sentence example the learner was trained on. */
export interface LanguageExample {
  text: string;
  kind: string;
  created_at?: string | null;
}

/** The learner's saved state, as `GET /language-model/state` returns it. */
export interface LanguageModelState {
  model_name: string;
  description: string;
  backend?: string;
  backend_reason?: string;
  stage: string;
  current_stage_id: string;
  passed_stages: string[];
  stages: LanguageStage[];
  letters: string;
  word_cards: LanguageWordCard[];
  lesson_cards: LanguageLessonCard[];
  trainer_answers?: LanguageTrainerAnswer[];
  active_test: LanguageTest | null;
  test_history: LanguageTestResult[];
  foundation_lessons: number;
  trainer_lessons: number;
  sentence_count: number;
  token_count: number;
  vocabulary_size: number;
  word_vocabulary_size?: number;
  transition_count: number;
  next_words: string[];
  examples: LanguageExample[];
  example_total: number;
  generated_example?: string | null;
  added_lessons?: number;
  added_lesson_cards?: LanguageLessonCard[];
  last_learned?: string[];
  skipped_duplicates?: { question?: string; answer?: string }[];
}

/** One meaning of a word, read from the offline dictionary. */
export interface LanguageDictionaryEntry {
  word: string;
  part_of_speech: string;
  definitions: string[];
}

/** One node of the knowledge graph the reasoning graph draws. */
export interface ReasoningNode {
  id: string;
  label: string;
  type: 'question' | 'result' | 'subject' | 'lesson' | 'trained_answer' | 'document';
  score: number;
  count?: number;
  grade?: string;
}

/** One labelled edge between two nodes of the knowledge graph. */
export interface ReasoningEdge {
  source: string;
  target: string;
  label: string;
}

/** What a tenant has learned, as `GET /language-model/graph` returns it. */
export interface KnowledgeGraph {
  nodes: ReasoningNode[];
  edges: ReasoningEdge[];
  subjects: string[];
  total: number;
}
