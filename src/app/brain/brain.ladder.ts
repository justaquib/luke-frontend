/** The rungs of the ladder the brain climbs, and what they mean. */

/** One rung of the ladder. */
export interface LadderRung {
  rung: string;
  rate: number;
  test?: string;
}

/** One level of the ladder, with the name it is given. */
export interface LadderLevel {
  level: number;
  name: string;
}

/** The state of a rung: passed, ahead of the level, or still open. */
export type RungState = 'passed' | 'ahead' | 'open';

function float(value: number | string): number {
  const parsed = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** The name of the rung with this number. */
export function rungName(rung: string, levels: LadderLevel[] | undefined): string {
  const entry = levels?.find((item) => item.level.toFixed(1) === rung);
  return entry?.name ?? 'Seed';
}

/**
 * A rung above the current level passes on its own, but the level has to be
 * climbed to it in order.
 */
export function rungState(rung: LadderRung, level: number): RungState {
  if (float(rung.rung) <= level) return 'passed';
  if (rung.rate >= 0.6) return 'ahead';
  return 'open';
}

/** What the trainer is told about the rung. */
export function rungHint(rung: LadderRung, level: number): string {
  if (rungState(rung, level) === 'ahead') {
    return `It clears this test on its own, but Luke is still at ${level.toFixed(1)}. The rung below has to be passed first.`;
  }
  return rung.test ?? '';
}
