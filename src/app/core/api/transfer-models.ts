import type { TeacherInfo } from './api-models';

/** One question a knowledge transfer would ask an installed teacher. */
export interface TransferSample {
  kind: string;
  question: string;
}

/** The live record, or the last report, of a knowledge transfer. */
export interface TransferRun {
  folder: string;
  model_id: string;
  model_name: string;
  started: number;
  finished: number | null;
  stage: 'loading' | 'asking' | 'done' | 'failed' | 'undone';
  total: number;
  done: number;
  kept: number;
  skipped: number;
  by_kind: Record<string, number>;
  last_question: string;
  last_answer: string;
  faq_ids: number[];
  undone: number;
  error: string | null;
  seconds: number;
}

/** What a transfer would ask, and the runs this tenant has had. */
export interface TransferState {
  teachers: TeacherInfo[];
  available: number;
  limit: number;
  by_kind: Record<string, number>;
  samples: TransferSample[];
  running: boolean;
  progress: TransferRun | null;
  last: TransferRun | null;
}
