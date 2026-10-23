import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * The promotion banner: the measurements say Luke has reached a level, but
 * the level only counts when the trainer approves it, so the banner shows
 * the level that waits and asks the trainer for the word.
 */
@Component({
  selector: 'app-level-approval',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './level-approval.html',
  styleUrl: './level-approval.css',
})
export class LevelApproval {
  /** The level the brain has measured and is waiting to be approved. */
  readonly measured = input.required<string>();

  /** True while the approval call is on its way. */
  readonly approving = input(false);

  /** Whether the measurements qualify a level that is not approved yet. */
  readonly ready = input(false);

  /** The trainer said yes. */
  readonly approve = output<void>();
}
