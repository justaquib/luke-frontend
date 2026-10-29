import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AppIcon } from '../shared/app-icon';
import { AppModal } from '../shared/app-modal';
import { LearnerChatStore } from './learner-chat.store';

/** Ask which of several similar trainer questions the learner meant. */
@Component({
  selector: 'app-learner-match-dialog',
  standalone: true,
  imports: [AppIcon, AppModal],
  templateUrl: './learner-match-dialog.html',
  styleUrls: ['./learner-dialogs.css', '../shared/controls.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearnerMatchDialog {
  protected readonly chat = inject(LearnerChatStore);
}
