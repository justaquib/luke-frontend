import { describe, expect, it } from 'vitest';
import {
  assessmentConfidenceLabel,
  assessmentConfidenceNote,
  assessmentDeltaLabel,
  assessmentModeLabel,
  assessmentModeNote,
  assessmentScoreLabel,
} from './assessment-labels';

describe('assessment labels', () => {
  it('names each mode and says what it allowed', () => {
    expect(assessmentModeLabel('unaided')).toBe('Unaided');
    expect(assessmentModeLabel('assisted')).toBe('Retrieval-assisted');
    expect(assessmentModeNote('unaided')).toContain('No saved material');
    expect(assessmentModeNote('assisted')).toContain('Saved passages and lessons');
  });

  it('shows an unmeasured score as unmeasured, never as zero', () => {
    expect(assessmentScoreLabel(null)).toBe('Not measured yet');
    expect(assessmentScoreLabel(undefined)).toBe('Not measured yet');
    expect(assessmentScoreLabel(0)).toBe('0%');
    expect(assessmentScoreLabel(0.795)).toBe('80%');
  });

  it('names each confidence step and explains it', () => {
    expect(assessmentConfidenceLabel('high')).toBe('High confidence');
    expect(assessmentConfidenceLabel('medium')).toBe('Medium confidence');
    expect(assessmentConfidenceLabel('low')).toBe('Low confidence');
    expect(assessmentConfidenceLabel('none')).toBe('No evidence yet');
    expect(assessmentConfidenceLabel('something else')).toBe('No evidence yet');
    expect(assessmentConfidenceNote('none')).toContain('Nothing has been scored');
  });

  it('shows a delta in points, signed, or says this is the first measurement', () => {
    expect(assessmentDeltaLabel(null)).toBe('First measurement in this mode');
    expect(assessmentDeltaLabel(0)).toBe('No change since the last run');
    expect(assessmentDeltaLabel(0.125)).toBe('+13 pts since the last run');
    expect(assessmentDeltaLabel(-0.05)).toBe('\u22125 pts since the last run');
  });
});
