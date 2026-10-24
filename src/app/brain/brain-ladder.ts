import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { ModelLevel, ModelLevelRung } from '../core/api/api.types';
import { LevelApproval } from './level-approval';
import { BrainRoadmap } from './brain-roadmap';
import { AppIcon } from '../shared/app-icon';
import { rungHint, rungName, rungState, SEED_LEVEL, type RungState } from './brain.ladder';

/**
 * The level ladder: where the brain stands on the scale, the whole road to
 * 1.0.0, and the promotion that waits for the trainer's word. The bar reads
 * the backend's share of the top level, not a hand-picked frontier.
 */
@Component({
  selector: 'app-brain-ladder',
  imports: [LevelApproval, BrainRoadmap, AppIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './brain-ladder.html',
  styleUrl: './brain-ladder.css',
})
export class BrainLadder {
  readonly level = input<ModelLevel | null>(null);
  readonly testing = input(false);
  readonly approving = input(false);

  readonly test = output<void>();
  readonly approve = output<void>();

  /** Whether the ladder is open. The trainer can fold it away once read. */
  protected readonly open = signal(true);

  /** How much of the ladder the approved level covers, measured by the backend. */
  protected readonly share = computed(() => {
    const share = this.level()?.ladder_share;
    if (share === undefined || share === null) return null;
    return Math.round(Math.max(0, Math.min(1, share)) * 100);
  });

  protected name(rung: string): string {
    return rungName(rung, this.level()?.levels);
  }

  protected state(rung: ModelLevelRung): RungState {
    return rungState(rung, this.level()?.level ?? SEED_LEVEL);
  }

  protected hint(rung: ModelLevelRung): string {
    return rungHint(
      rung,
      this.level()?.level ?? SEED_LEVEL,
      this.level()?.model_name ?? 'The model',
    );
  }
}
