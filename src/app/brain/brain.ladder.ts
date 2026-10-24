/** The rungs of the model ladder the brain climbs, and what they mean. */

/** One rung of the ladder. */
export interface LadderRung {
  rung: string;
  rate: number;
  test?: string;
}

/** One level of the ladder, with the id it is given: 0.0.1, 0.1.0 and so on. */
export interface LadderLevel {
  level: string;
  name: string;
  description?: string;
  open?: boolean;
}

/** The state of a rung: passed, ahead of the level, or still open. */
export type RungState = 'passed' | 'ahead' | 'open';

/** The state of a level on the whole road to 1.0.0. */
export type RoadmapState = 'passed' | 'ahead' | 'next' | 'locked';

/** The floor of the ladder, where the brain starts before any test is passed. */
export const SEED_LEVEL = '0.0.0';

/** The ladder id as three numbers, so ids sort as 0.0.1, 0.0.9, 0.1.0. */
export function levelOrder(level: string): number {
  const parts = String(level)
    .split('.')
    .map((part: string) => (Number.isInteger(Number(part)) ? Number(part) : 0));
  while (parts.length < 3) parts.push(0);
  return parts[0] * 10000 + parts[1] * 100 + parts[2];
}

/** The name of the level with this id. */
export function rungName(rung: string, levels: LadderLevel[] | undefined): string {
  const entry = levels?.find((item) => item.level === rung);
  return entry?.name ?? 'Seed';
}

/**
 * A rung above the current level passes on its own, but the level waits for
 * the trainer's approval, so it is climbed to in order.
 */
export function rungState(rung: LadderRung, level: string): RungState {
  if (levelOrder(rung.rung) <= levelOrder(level)) return 'passed';
  if (rung.rate >= 0.6) return 'ahead';
  return 'open';
}

/** What the trainer is told about the rung. */
export function rungHint(rung: LadderRung, level: string, modelName = 'The model'): string {
  if (rungState(rung, level) === 'ahead') {
    return `It clears this test on its own, but ${modelName} is still at ${level}. The rung below has to be passed first.`;
  }
  return rung.test ?? '';
}

/** The level right after this one on the road, or null at the top. */
export function nextLevel(level: string, levels: LadderLevel[] | undefined): LadderLevel | null {
  if (!levels?.length) return null;
  const index = levels.findIndex((entry) => entry.level === level);
  if (index < 0 || index + 1 >= levels.length) return null;
  return levels[index + 1];
}

/**
 * The road is climbed in order: a level passes at or below the approved
 * level, the next one opens only when it has a test and nothing is waiting
 * for approval, and every level after that stays locked.
 */
export function roadmapState(
  entry: LadderLevel,
  levels: LadderLevel[] | undefined,
  approved: string,
  measured: string,
  approvalPending: boolean,
): RoadmapState {
  const order = levelOrder(entry.level);
  if (order <= levelOrder(approved)) return 'passed';
  if (approvalPending && order <= levelOrder(measured)) return 'ahead';
  const next = nextLevel(approved, levels);
  if (!approvalPending && next?.level === entry.level && entry.open !== false) {
    return 'next';
  }
  return 'locked';
}

/** What the trainer is told about a level on the road. */
export function roadmapHint(entry: LadderLevel, state: RoadmapState): string {
  if (state === 'passed') return 'Passed.';
  if (state === 'ahead') return 'Measured. Waiting for your approval.';
  if (state === 'next') return 'Next. This level is open.';
  if (entry.open === false) return 'Locked. No test has been written for this level yet.';
  return 'Locked until the level before it is passed.';
}
