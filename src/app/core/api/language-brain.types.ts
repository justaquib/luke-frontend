import type { ModelLevel } from './api.types';

/** How far one part of a training has come. */
export type TrainingStageStatus = 'waiting' | 'working' | 'done';

/** One part of a training, as the checklist the training itself writes. */
export interface TrainingStage {
  key: string;
  label: string;
  status: TrainingStageStatus;
}

/** What a training has done so far, and how long the rest will take. */
export interface TrainingProgress {
  started?: number;
  finished?: number | null;
  seconds?: number | null;
  eta_seconds?: number | null;
  steps_done?: number;
  steps_total?: number;
  loss?: number | null;
  stop_reason?: string | null;
  stages?: TrainingStage[];
}

/** One model's numbers, as its checkpoint recorded them. */
export interface ModelReport {
  trained?: boolean;
  schema?: number;
  loss?: number | null;
  best_loss?: number | null;
  validation_loss?: number | null;
  best_validation_loss?: number | null;
  chance_loss?: number | null;
  steps?: number;
  best_step?: number;
  passes?: number;
  stop_reason?: string;
  train_examples?: number;
  validation_examples?: number;
  train_accuracy?: number | null;
  validation_accuracy?: number | null;
  next_word_accuracy?: number | null;
  perplexity?: number | null;
  curve?: number[];
  validation_curve?: number[];
  seconds?: number;
  vocabulary?: number;
  parameters?: number;
  device?: string;
  trained_at?: number;
  sentence_count?: number;
  token_count?: number;
  transition_count?: number;
  dropped_sentences?: number;
  corpus?: { sentences?: number; instructions?: number };
}

/** The tokenizer a checkpoint was trained with, as its artifact records it. */
export interface TokenizerReport {
  kind: string;
  default_kind: string;
  id: string;
  short_id: string;
  vocab_size: number;
  special_ids: Record<string, number>;
  artifact_bytes: number;
  present: boolean;
  error: string | null;
  corpus?: {
    sentences?: number;
    tokenizer_sentences?: number;
    held_out_sentences?: number;
    characters?: number;
    tokens?: number;
  };
  tokens_per_character?: number | null;
  created?: number;
  licence?: string;
  implementation?: string;
}

/** The word model adds the backend that serves and why. */
export interface BrainWordReport extends ModelReport {
  backend?: 'neural' | 'untrained';
  backend_reason?: string;
  quality_ok?: boolean;
  tokenizer?: TokenizerReport;
}

/** One training, as the short history keeps it. */
export interface BrainRun {
  task: string;
  at: number;
  loss?: number | null;
  validation_loss?: number | null;
  passes?: number;
  stop_reason?: string;
  steps?: number;
  seconds?: number;
}

/** The checkpoint sizes, and whether a model has been built from them yet. */
export interface BrainMemoryReport {
  words_bytes: number;
  words_loaded?: boolean;
  loaded: boolean;
}

/** The engine's view of the word model, the device and the last runs. */
export interface BrainEngineState {
  schema: number;
  device: string;
  torch: string;
  words: BrainWordReport;
  memory?: BrainMemoryReport;
  runs: BrainRun[];
}

/** What the brain knows about itself. The GET route returns this flat. */
export interface LanguageBrainState {
  trained: boolean;
  vocabulary: number;
  words: BrainWordReport;
  words_ready: boolean;
  backend: string;
  backend_reason: string;
  training: boolean;
  progress: TrainingProgress | null;
  emotions: string[];
  emotion_ready: boolean;
  clarify_ready: boolean;
  confidence_ready: boolean;
  intent_ready: boolean;
  intents: string[];
  feedback_entries: number;
  correct_answers: number;
  wrong_answers: number;
  corrections: number;
  learned_corrections: number;
  engine: BrainEngineState;
}

/** The GET route: the brain's own numbers with the measured level alongside. */
export interface LanguageBrainDocument extends LanguageBrainState {
  model_level: ModelLevel;
}

/** The POST /brain/train answer: the state, and whether a child is training. */
export interface LanguageBrainTraining {
  state: LanguageBrainDocument;
  training: boolean;
}

/** The state after the trainer approves the measured level. */
export interface LanguageLevelApproval {
  state: LanguageBrainDocument;
  approved_level: string;
  previous_level: string;
}

/** One version the model ladder offers. */
export interface ModelVersion {
  level: string;
  name: string;
  title: string;
  description: string;
}

/** The name the model answers to and the version it starts from. */
export interface ModelSettingsDocument {
  name: string;
  start_level: string;
  level: string;
  defaults: { name: string; start_level: string };
  levels: ModelVersion[];
}
