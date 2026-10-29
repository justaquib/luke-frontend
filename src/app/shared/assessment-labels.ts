/**
 * The words every assessment surface shares, so a score is never shown
 * without the mode it came from and a missing measurement never reads as zero.
 */

export type AssessmentMode = 'unaided' | 'assisted';

/** The two modes, unaided first, each measured and reported on its own. */
export const ASSESSMENT_MODES: readonly AssessmentMode[] = ['unaided', 'assisted'];

/** The mode's short name, used on cards, tabs and badges. */
export function assessmentModeLabel(mode: string): string {
  return mode === 'assisted' ? 'Retrieval-assisted' : 'Unaided';
}

/** What the mode allowed, so a score is never read as the other mode's score. */
export function assessmentModeNote(mode: string): string {
  return mode === 'assisted'
    ? 'Saved passages and lessons were available as evidence.'
    : 'No saved material was read; every answer came from the model alone.';
}

/** A measured score as a percentage, or "Not measured yet" when absent. */
export function assessmentScoreLabel(score: number | null | undefined): string {
  if (score === null || score === undefined || Number.isNaN(score)) {
    return 'Not measured yet';
  }
  return `${Math.round(score * 100)}%`;
}

/** How much of the score to trust, from the number of items that were scored. */
export function assessmentConfidenceLabel(confidence: string): string {
  switch (confidence) {
    case 'high':
      return 'High confidence';
    case 'medium':
      return 'Medium confidence';
    case 'low':
      return 'Low confidence';
    default:
      return 'No evidence yet';
  }
}

/** Why the confidence is what it is, without repeating backend thresholds. */
export function assessmentConfidenceNote(confidence: string): string {
  switch (confidence) {
    case 'high':
      return 'Enough items were scored for this score to stand on its own.';
    case 'medium':
      return 'A moderate number of items were scored; watch this score move.';
    case 'low':
      return 'Few items were scored, so treat this as a first look.';
    default:
      return 'Nothing has been scored for this skill yet.';
  }
}

/** The change since the previous completed run of the same mode, if there was one. */
export function assessmentDeltaLabel(delta: number | null | undefined): string | null {
  if (delta === null || delta === undefined || Number.isNaN(delta)) {
    return 'First measurement in this mode';
  }
  const points = Math.round(delta * 100);
  if (points === 0) {
    return 'No change since the last run';
  }
  return `${points > 0 ? '+' : '\u2212'}${Math.abs(points)} pts since the last run`;
}
