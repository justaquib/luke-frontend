export interface QueryHit {
  text: string;
  metadata: { source: string };
  distance: number | null;
}

/** The path an answer took through the assistant's taught material. */
export type QuerySource =
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
  | 'word_cards';

export interface QueryResponse {
  question: string;
  source: QuerySource;
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
  understanding?: QuestionUnderstanding | null;
  model?: string | null;
  model_name?: string | null;
  distance?: number | null;
  confidence?: number | null;
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

export type FaqStatus = 'pending' | 'approved' | 'declined' | 'duplicate';

export interface FaqItem {
  id: number;
  question: string;
  answer: string;
  status: FaqStatus;
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

export interface DocumentItem {
  source: string;
  chunks: number;
  created_at?: string;
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
}

export interface CoachingAnswer {
  text: string;
  confidence: number;
  grounded: boolean;
  source: string;
}

export interface CoachingTurn {
  status: string;
  answer: CoachingAnswer | null;
  understanding?: QuestionUnderstanding | null;
}

export interface CoachingSession {
  id: string;
  topic: string;
  child_age_band: string;
  status: string;
  turns: number;
  created_at: string;
  updated_at: string;
}

/** One word of the question, and what the offline dictionary says of it. */
export interface WordReading {
  word: string;
  lemma: string;
  part_of_speech: string;
  meaning: string;
  synonyms: string[];
}

/** One source consulted, with the measured reason for its outcome. */
export interface SourceConnection {
  source: string;
  outcome: 'match' | 'miss' | 'pass' | 'fail' | 'skipped';
  detail: string;
  matched_question?: string;
}

/** What the backend understood and connected before it answered. */
export interface QuestionUnderstanding {
  words: WordReading[];
  question_type: string;
  key_words: string[];
  plan: string[];
  connections: SourceConnection[];
  grammar_notes: string[];
  verified: boolean;
  verification: string;
}

/** The words read from the question, before anything is looked up. */
export interface AnswerReading {
  words: WordReading[];
  question_type: string;
  key_words: string[];
}

/** The question type and the sources the backend plans to consult. */
export interface AnswerThinking {
  question_type: string;
  key_words: string[];
  plan: string[];
}

/** One stage the backend actually reached while answering. */
export type AnswerStreamEvent<Answer = unknown> =
  | { type: 'reading'; reading: AnswerReading }
  | { type: 'thinking'; thinking: AnswerThinking }
  | { type: 'connecting'; connection: SourceConnection }
  | { type: 'writing'; model: string }
  | { type: 'answer'; answer: Answer }
  | { type: 'done' }
  | { type: 'error'; message: string };

/** Which weights answer the chat: Luke's own word model or a trained teacher. */
export type AnswerModelKind = 'luke' | 'huggingface';

/** One model the chat can answer with. */
export interface AnswerModel {
  id: string;
  name: string;
  kind: AnswerModelKind;
  detail: string;
  ready: boolean;
}

export interface AnswerModelCatalog {
  models: AnswerModel[];
  default: string;
}

/** One word a model expects next, with the chance it gives it. */
export interface NextWord {
  word: string;
  probability: number;
  count: number | null;
}

/** The next words and attention a selected model measured for one prefix. */
export interface WordPrediction {
  tokens: string[];
  attention: number[][] | null;
  next: NextWord[];
  model: string;
  model_name: string;
  kind: AnswerModelKind;
  heads: number | null;
  layers: number | null;
}

/** One base model the trainer can fine-tune into a teacher. */
export interface BaseModelInfo {
  id: string;
  name: string;
  parameters: string;
  note: string;
  trained: boolean;
}

/** One fine-tuned teacher saved on this machine. */
export interface TeacherInfo {
  folder: string;
  model_id: string;
  name: string;
  steps: number | null;
  loss: number | null;
  trained_at: string | null;
  bytes: number;
  ready: boolean;
}

/** What one fine-tune has done so far, as the run itself recorded it. */
export interface HuggingFaceRun {
  model_id?: string;
  started?: number;
  finished?: number | null;
  stage?: string;
  stages?: Record<string, string>;
  steps_done?: number;
  steps_total?: number;
  eta_seconds?: number | null;
  error?: string | null;
  loss?: number | null;
  seconds?: number | null;
  steps?: number;
  examples?: number;
}

/** The measured machine, the model catalogue and the teachers on disk. */
export interface HuggingFaceState {
  machine: { device: string; torch: string; transformers: string };
  base_models: BaseModelInfo[];
  teachers: TeacherInfo[];
  last_run: HuggingFaceRun | null;
  progress: HuggingFaceRun | null;
  running: boolean;
}

/** One trainer-approved answer that looks like the question asked. */
export interface LanguageCandidate {
  faq_id: number;
  question: string;
  answer: string;
  distance: number;
}

/** One step of the learner's own explanation of its answer. */
export interface LanguageReasoningStep {
  label: string;
  detail: string;
}

/** The learner's explanation, in its own words. */
export interface LanguageReasoning {
  steps: LanguageReasoningStep[];
  confidence: number;
}

/** The answer the learner preview gives back, with what it read on the way. */
export interface LanguagePreview {
  answer: string;
  source: QuerySource;
  matched_question?: string;
  candidates: LanguageCandidate[];
  needs_clarification: boolean;
  reasoning: LanguageReasoning;
  understanding?: QuestionUnderstanding | null;
}
