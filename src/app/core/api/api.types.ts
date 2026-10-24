/** The shapes the app exchanges with the backend, kept apart from the calls. */

/** One entry of the level ladder, from the seed 0.0.0 up to 1.0.0. */
export interface ModelLevelEntry {
  level: string;
  name: string;
  description: string;
  reference: string;
  /** Whether a test exists for this level; a locked level has none yet. */
  open?: boolean;
  band?: string;
  band_name?: string;
  band_detail?: string;
}

/** One rung of the ladder, measured by its probes. */
export interface ModelLevelRung {
  rung: string;
  probes: number;
  passed: number;
  rate: number;
  test?: string;
  detail?: string;
  passes?: { question: string; expected: string; form: string; answered?: string }[];
  failures?: { question: string; expected: string; form: string; answered?: string }[];
}

/** How much material the brain has taken in, on its own human scale. */
export interface ModelTrainingVolume {
  title: string;
  detail: string;
  items: number;
  stages: { title: string; items: number; detail: string; reached: boolean; current: boolean }[];
  next_stage: { title: string; items: number } | null;
}

/** What the brain reads under the tested requests. */
export interface ModelProbe {
  question: string;
  answered?: boolean;
  correct?: boolean;
  source?: string;
  answered_text?: string;
}

/** One set of measured probes: how many passed, and how they were answered. */
export interface ModelMeasure {
  score?: number;
  passed?: number;
  total?: number;
  written?: number;
  looked_up?: number;
  model?: number;
  probes?: ModelProbe[];
}

/** The level the brain has reached, measured and approved separately. */
export interface ModelLevel {
  level: string;
  measured_level: string;
  approval_ready: boolean;
  level_value: number;
  name: string;
  title: string;
  description: string;
  reference: string;
  next_level: string | null;
  next_requirement: string;
  capabilities: { key: string; name: string; ready: boolean; detail: string }[];
  max_level: string;
  ladder_size: number;
  levels: ModelLevelEntry[];
  training_volume: ModelTrainingVolume;
  rungs: ModelLevelRung[];
  next_steps: {
    action: string;
    title: string;
    detail: string;
    link?: string;
    link_label?: string;
  }[];
  coverage: {
    documents: number;
    chunks: number;
    trained_answers: number;
    lessons: number;
    passed_grades: number;
    current_stage: string;
  };
  generality: number;
  generality_cap: number | null;
  generality_probes: ModelProbe[];
  instruction_following: number;
  instruction_probes: ModelProbe[];
  instruction_total: number;
  instruction_measured: boolean;
  instruction_written?: number;
  instruction_looked_up?: number;
  instruction_measured_at?: string | null;
  adversarial?: ModelMeasure;
  cross_topic?: ModelMeasure & { subject?: string };
  contamination?: {
    checked?: number;
    overlaps?: number;
    clean?: boolean;
    examples?: string[];
  };
  ladder_share?: number;
  frontier_level: number;
  frontier_title: string;
  frontier_note: string;
  model_name: string;
}

/** The words the answering model can write with, one page at a time. */
export interface LanguageWordPage {
  words: string[];
  total: number;
  offset: number;
  limit: number;
  has_more: boolean;
}

/** One lesson in a group of lessons that repeat each other. */
export interface DuplicateLessonCard {
  id: string;
  question: string;
  answer: string;
  subject: string;
  subjects: string[];
  grade_id: string;
  confidence: number;
  created_at?: string | null;
}

/** A group of lessons that repeat each other. */
export interface DuplicateGroup {
  kind: 'same_question' | 'same_answer' | 'similar';
  label: string;
  detail: string;
  key: string;
  cards: DuplicateLessonCard[];
}

/** The lessons that repeat each other, and how many there are. */
export interface DuplicateLessons {
  groups: DuplicateGroup[];
  total_questions: number;
  duplicate_count: number;
}

/** The sentence the learner built from the given words. */
export interface LanguageSentence {
  sentence: string | null;
}

/** What the assistant has stored: the files, the numbers and the size on disk. */
export interface StoreSummary {
  documents: { source: string; chunks: number; created_at?: string | null }[];
  totals: {
    files: number;
    chunks: number;
    answers: number;
    pending: number;
    lessons: number;
    vocabulary: number;
  };
  model: {
    name: string;
    level: number;
    title: string;
    vocabulary: number;
    parameters: number;
    trained: boolean;
    steps: number;
    loss: number | null;
    corpus_sentences: number;
    corpus_tokens: number;
  };
  disk: {
    learner_bytes: number;
    vector_store_bytes: number;
    uploads_bytes: number;
  };
}

export interface QueryHit {
  text: string;
  metadata: { source: string };
  distance: number | null;
}

export type AnswerSource =
  | 'faq'
  | 'docs'
  | 'pending'
  | 'intent'
  | 'weather'
  | 'wiki'
  | 'assistant_profile'
  | 'dictionary'
  | 'learner'
  | 'lesson_cards'
  | 'letters'
  | 'not_learned'
  | 'number_cards'
  | 'sentence_examples'
  | 'sentence_patterns'
  | 'taught'
  | 'trainer'
  | 'word_cards'
  | 'written';

export interface QueryResponse {
  question: string;
  source: AnswerSource;
  answer: string;
  hits: QueryHit[];
  entities: { text: string; label: string }[];
  pending_id: number | null;
  intent?: {
    matched_question?: string;
    matched_faq_id?: number;
    distance?: number;
    answer?: string;
  } | null;
  app?: Record<string, unknown> | null;
  disabled_external_sources?: string[] | null;
}

export interface MergeMatch {
  pending_id: number;
  question: string;
  occurrences: number;
  distance: number;
}

export interface MergePreview {
  canonical_id: number;
  canonical_question: string;
  answer: string;
  matches: MergeMatch[];
}

export interface MergeResult {
  canonical_faq_id: number;
  created: number;
  resolved: number;
}

export interface IntentItem {
  id: number;
  name: string;
  response_template: string;
  faq_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface FaqSuggestion {
  faq_id: number;
  question: string;
  answer: string;
  status: string;
  distance: number;
}

export interface PendingSuggestionItem {
  pending_id: number;
  question: string;
  occurrences: number;
  distance: number;
}

export interface IntentSuggestions {
  query: string;
  faqs: FaqSuggestion[];
  pending: PendingSuggestionItem[];
}

export interface FaqMergePreview {
  canonical_id: number;
  canonical_question: string;
  canonical_answer: string;
  matches: FaqSuggestion[];
}

export interface FaqMergeResult {
  canonical_faq_id: number;
  absorbed: number;
  recreated: number;
}

export interface IngestRequest {
  source: string;
  text: string;
}

export interface IngestResponse {
  source: string;
  chunks: number;
  start_id: number | null;
}

export interface StatsResponse {
  chunks: number;
  faqs: number;
  pending: number;
}

export interface FaqItem {
  id: number;
  question: string;
  answer: string;
  status: 'pending' | 'approved' | 'declined' | 'duplicate';
  created_at: string;
  updated_at: string;
}

export interface PendingItem {
  id: number;
  question: string;
  occurrences: number;
  resolved: boolean;
  created_at: string;
  last_seen_at: string;
}

export interface Tenant {
  id: number;
  name: string;
  slug: string;
  created_at: string;
}

export interface Invite {
  id: number;
  tenant_id: number;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}
