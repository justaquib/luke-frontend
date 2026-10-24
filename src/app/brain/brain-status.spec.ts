import { describe, expect, it } from 'vitest';
import { engineStatus, trainingSummary } from './brain-status';
import type { BrainEngineState } from '../core/api/language-brain.types';

function engine(
  answer: Record<string, unknown>,
  words: Record<string, unknown> = {},
): BrainEngineState {
  return {
    schema: 2,
    device: 'cpu',
    torch: '2.0',
    answer: { trained: true, ...answer },
    words: { trained: false, ...words },
    runs: [],
  };
}

describe('engineStatus', () => {
  it('says nothing is trained when there is no checkpoint', () => {
    expect(engineStatus(null, false)).toEqual({ label: 'No model yet', tone: 'idle' });
  });

  it('shows training while a child is running', () => {
    expect(engineStatus(engine({}), true)).toEqual({ label: 'Training', tone: 'warn' });
  });

  it('does not call an unmeasured checkpoint healthy', () => {
    expect(engineStatus(engine({ loss: 7.37 }), false)).toEqual({
      label: 'Trained, not measured',
      tone: 'warn',
    });
  });

  it('marks a held-out loss worse than chance as bad', () => {
    expect(engineStatus(engine({ validation_loss: 7.8, chance_loss: 7.69 }), false)).toEqual({
      label: 'Worse than chance',
      tone: 'bad',
    });
  });

  it('calls a measured checkpoint trained', () => {
    expect(engineStatus(engine({ validation_loss: 5.17, chance_loss: 7.52 }), false)).toEqual({
      label: 'Trained',
      tone: 'ok',
    });
  });
});

describe('trainingSummary', () => {
  it('reports nothing when the run trained no answer model', () => {
    expect(trainingSummary(null)).toBeNull();
    expect(trainingSummary({ trained: false })).toBeNull();
  });

  it('reports the held-out read and the stop reason it measured', () => {
    expect(
      trainingSummary({
        trained: true,
        validation_loss: 4.9207,
        steps: 400,
        stop_reason: 'early stop',
      }),
    ).toBe('The brain trained: held-out loss 4.921, 400 steps, stop early stop.');
  });

  it('says the held-out loss is missing instead of inventing one', () => {
    expect(trainingSummary({ trained: true, validation_loss: null })).toBe(
      'The brain trained: held-out loss not measured, 0 steps, stop unknown.',
    );
  });
});
