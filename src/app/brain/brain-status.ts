import type { BrainEngineState, ModelReport } from '../core/api/language-brain.types';

export interface EngineStatus {
  label: string;
  tone: 'ok' | 'warn' | 'bad' | 'idle';
}

/** The engine status, honest about a checkpoint that has not been measured. */
export function engineStatus(engine: BrainEngineState | null, training: boolean): EngineStatus {
  if (training) return { label: 'Training', tone: 'warn' };
  const report = reportOf(engine);
  if (report === null) return { label: 'No model yet', tone: 'idle' };
  return measuredStatus(report);
}

function reportOf(engine: BrainEngineState | null): ModelReport | null {
  if (engine?.answer.trained) return engine.answer;
  return engine?.words.trained ? engine.words : null;
}

function measuredStatus(report: ModelReport): EngineStatus {
  const loss = report.validation_loss;
  if (loss === null || loss === undefined) {
    return { label: 'Trained, not measured', tone: 'warn' };
  }
  const chance = report.chance_loss;
  if (chance !== null && chance !== undefined && loss > chance) {
    return { label: 'Worse than chance', tone: 'bad' };
  }
  return { label: 'Trained', tone: 'ok' };
}

/** What a finished training changed, or null when it trained nothing. */
export function trainingSummary(answer: ModelReport | null | undefined): string | null {
  if (!answer?.trained) return null;
  const held =
    answer.validation_loss === null || answer.validation_loss === undefined
      ? 'held-out loss not measured'
      : `held-out loss ${answer.validation_loss.toFixed(3)}`;
  return `The brain trained: ${held}, ${answer.steps ?? 0} steps, stop ${answer.stop_reason ?? 'unknown'}.`;
}
