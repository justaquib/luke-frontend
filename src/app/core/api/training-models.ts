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

/** The three training operations the trainer may ask for. */
export type TrainingOperation = 'sft' | 'lora' | 'pretrain';

/** The material a run would read, as the dataset itself reports it. */
export interface TrainingDataset {
  sources: number;
  examples: number;
  split_taken: boolean;
  salt: string;
  share: number;
  splits: Record<string, number>;
  counts: Record<string, number>;
  passage_sources: number;
  answer_sources: number;
  leakage: string[];
}

/** What one run has done so far, as the run itself recorded it. */
export interface HuggingFaceRun {
  model_id?: string;
  operation?: TrainingOperation;
  kind?: 'weights' | 'adapter';
  folder?: string;
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
  rows?: number;
  sources?: number;
  trainable?: number;
  parameters?: number;
  trainable_percent?: number | null;
  written?: boolean;
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
