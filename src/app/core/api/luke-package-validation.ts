import type { LukePackageApplied, LukePackageCheck } from './luke-package';

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function count(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function counts(value: unknown): boolean {
  return record(value) && Object.values(value).every(count);
}

function nullableText(value: unknown): boolean {
  return value === null || typeof value === 'string';
}

function base(value: unknown): boolean {
  if (!record(value)) return false;
  return (
    typeof value['included'] === 'boolean' &&
    typeof value['installed'] === 'boolean' &&
    nullableText(value['base_model']) &&
    nullableText(value['revision']) &&
    nullableText(value['weight_sha256'])
  );
}

function identity(value: Record<string, unknown>): boolean {
  const model = value['model'];
  return (
    typeof value['format'] === 'string' &&
    count(value['format_version']) &&
    count(value['workspace']) &&
    record(model) &&
    typeof model['name'] === 'string'
  );
}

function files(value: unknown): boolean {
  return record(value) && count(value['checked']) && count(value['bytes']);
}

function mode(value: unknown): boolean {
  return value === 'full' || value === 'slim';
}

/** Fail closed: an absent replacement decision must never become replace=false. */
export function isPackageCheck(value: unknown): value is LukePackageCheck {
  if (!record(value) || !identity(value)) return false;
  return (
    value['applied'] === false &&
    typeof value['replace_required'] === 'boolean' &&
    mode(value['mode']) &&
    counts(value['counts']) &&
    files(value['files']) &&
    base(value['base_model']) &&
    Array.isArray(value['tokenizers'])
  );
}

/** Do not read dry-run file totals from an applied report. */
export function isPackageApplied(value: unknown): value is LukePackageApplied {
  if (!record(value)) return false;
  return (
    value['applied'] === true &&
    counts(value['rows']) &&
    counts(value['indexed']) &&
    (value['verified'] === true || record(value['verified']))
  );
}
