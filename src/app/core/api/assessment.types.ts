import type { AssessmentMode } from '../../shared/assessment-labels';

/** The bank one run was answered against, recorded on the run itself. */
export interface AssessmentBank {
  version: number;
  salt: string;
  eval_items: number;
}

/** One measured run: what answered, from which checkpoint, and how far it got. */
export interface AssessmentRun {
  id: number;
  mode: AssessmentMode;
  status: 'queued' | 'running' | 'done' | 'failed' | 'cancelled';
  step: string;
  progress: number;
  done: number;
  total: number;
  model_id: string;
  model_artifact: string;
  tokenizer_id: string;
  generation: Record<string, unknown>;
  bank: AssessmentBank;
  error: string | null;
  created_at: string | null;
  started_at: string | null;
  finished_at: string | null;
}

/** One skill's card: a measured score, or explicitly unassessed. */
export interface AssessmentProfile {
  skill: string;
  title: string;
  status: 'assessed' | 'unassessed';
  score: number | null;
  stage: number | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  verdict: string;
  delta: number | null;
  strengths: string[];
  weaknesses: string[];
  untested: string[];
  waiting: number;
  items_scored: number;
  next_step: string;
}

/** The eight cards and the run they were measured from. */
export interface AssessmentProfiles {
  run: AssessmentRun | null;
  profiles: AssessmentProfile[];
}

/** One answered item, with what a trainer needs to judge a rubric answer. */
export interface AssessmentResult {
  id: number;
  run_id: number;
  item_id: string;
  skill: string;
  split: string;
  kind: 'option' | 'span' | 'number' | 'literal' | 'rules' | 'rubric';
  stage: number;
  topic: string;
  response: string | null;
  method: string;
  score: number | null;
  correct: boolean | null;
  latency_ms: number | null;
  prompt: string | null;
  criteria: string[];
  reference: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
}

/** The 202 answer to starting a run: the id to follow and its first state. */
export interface AssessmentStarted {
  run_id: number;
  run: AssessmentRun;
}
