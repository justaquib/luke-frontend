/** One model file the download carries, and its size on disk. */
export interface LukeCheckpoint {
  name: string;
  bytes: number;
}

/** A fine-tuned teacher whose weights stay on this machine. */
export interface LukePackageTeacher {
  name: string;
  model_id: string;
  steps: number | null;
  bytes: number;
}

export type LukePackageMode = 'full' | 'slim';

export interface LukePackageContents {
  bytes: number;
  files: number;
  includes_base: boolean;
  filename: string;
}

export interface LukePackageBase {
  included: boolean;
  installed: boolean;
  base_model: string | null;
  revision: string | null;
  weight_sha256: string | null;
}

/** What a download of Luke would hold, counted before it is built. */
export interface LukePackagePreview {
  modes: Record<LukePackageMode, LukePackageContents>;
  base: LukePackageBase;
  model: { name: string; start_level: string; approved_level: string };
  available: number;
  by_kind: Record<string, number>;
  checkpoints: LukeCheckpoint[];
  teachers: LukePackageTeacher[];
  pending: number;
  bytes: number;
  filename: string;
}

/** Checked without changing the workspace; only this report can authorize a restore. */
export interface LukePackageCheck {
  applied: false;
  replace_required: boolean;
  format: string;
  format_version: number;
  mode: LukePackageMode;
  workspace: number;
  model: { name: string };
  counts: Record<string, number>;
  files: { checked: number; bytes: number };
  base_model: LukePackageBase;
  tokenizers: unknown[];
}

/** Applying changes replaces the dry-run files report with restored-file results. */
export interface LukePackageApplied {
  applied: true;
  files: unknown;
  verified: unknown;
  indexed: Record<string, number>;
  rows: Record<string, number>;
}
