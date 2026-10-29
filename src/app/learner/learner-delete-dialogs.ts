import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AppIcon } from '../shared/app-icon';
import { AppModal } from '../shared/app-modal';
import { LearnerLessonEditorStore, LearnerTrainerAnswerEditorStore } from './learner-editor.store';

/** Confirm removing a taught lesson or a trainer-approved answer. */
@Component({
  selector: 'app-learner-delete-dialogs',
  standalone: true,
  imports: [AppIcon, AppModal],
  templateUrl: './learner-delete-dialogs.html',
  styleUrls: ['./learner-dialogs.css', './learner.css', '../shared/controls.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearnerDeleteDialogs {
  protected readonly lessons = inject(LearnerLessonEditorStore);
  protected readonly answers = inject(LearnerTrainerAnswerEditorStore);
}
