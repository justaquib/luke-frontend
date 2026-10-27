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

/** What a download of Luke would hold, counted before it is built. */
export interface LukePackagePreview {
  model: { name: string; start_level: string; approved_level: string };
  available: number;
  by_kind: Record<string, number>;
  checkpoints: LukeCheckpoint[];
  teachers: LukePackageTeacher[];
  pending: number;
  bytes: number;
  filename: string;
}
