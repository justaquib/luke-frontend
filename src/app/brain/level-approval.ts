import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AppIcon } from '../shared/app-icon';

/**
 * The promotion banner: the measurements say the model has reached a level,
 * but the level only counts when the trainer approves it, so the banner shows
 * the level that waits and asks the trainer for the word.
 */
@Component({
  selector: 'app-level-approval',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppIcon],
  templateUrl: './level-approval.html',
  styleUrls: ['./level-approval.css', '../shared/controls.css'],
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
