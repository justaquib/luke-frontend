import type { LukePackageCheck, LukePackagePreview } from '../core/api/luke-package';

const KIND_LABELS: Record<string, string> = {
  lesson: 'Lessons',
  starter_lesson: 'Starter lessons',
  conversation: 'Conversations',
  approved_answer: 'Trained answers',
  correction: 'Corrections',
  word: 'Words',
  sentence: 'Sentences',
  document: 'Documents',
  topic: 'Topics',
};

export function packageKinds(counts: Record<string, number>): {
  kind: string;
  label: string;
  count: number;
}[] {
  return Object.entries(counts).map(([kind, count]) => ({
    kind,
    label: KIND_LABELS[kind] ?? kind,
    count,
  }));
}

export function packageNotes(pack: LukePackagePreview | null): string[] {
  if (!pack) return [];
  const notes = [];
  if (!pack.checkpoints.length) {
    notes.push('Luke has no checkpoint yet. The package still holds the material and state.');
  }
  if (pack.pending) {
    notes.push(`${pack.pending} unanswered question(s) are included, not as trained answers.`);
  }
  if (pack.teachers.length) {
    notes.push(`${pack.teachers.length} fine-tuned teacher(s) are left out of both modes.`);
  }
  return notes;
}

export function packageConfirmation(filename: string, report: LukePackageCheck): string {
  const base = report.base_model;
  const counts = Object.entries(report.counts)
    .map(([name, value]) => `${name}: ${value}`)
    .join(' · ');
  const action = report.replace_required
    ? 'This replaces the model, material and state already in this workspace. Download a backup first.'
    : 'This restores the model, material and state into this workspace.';
  const weights = base.included
    ? 'Foundation weights are included.'
    : 'Foundation weights are not included; the matching base revision and hash are required.';
  return [
    `${filename} — ${report.model.name}`,
    `${report.format} v${report.format_version} · ${report.mode} · workspace ${report.workspace}`,
    `${report.files.checked} files checked · ${report.files.bytes} bytes of uncompressed contents`,
    counts,
    `Base: ${base.base_model ?? 'not recorded'} · revision ${base.revision ?? 'not recorded'}`,
    `Weight SHA-256: ${base.weight_sha256 || 'not recorded'}`,
    weights,
    'The dry run made no changes.',
    action,
  ].join('\n\n');
}
