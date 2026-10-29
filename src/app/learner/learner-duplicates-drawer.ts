import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AppIcon } from '../shared/app-icon';
import { LearnerDuplicatesStore } from './learner-duplicates.store';
import { LearnerModelStore } from './learner-model.store';

/** The side panel that reviews lessons repeating each other. */
@Component({
  selector: 'app-learner-duplicates-drawer',
  standalone: true,
  imports: [FormsModule, AppIcon],
  templateUrl: './learner-duplicates-drawer.html',
  styleUrls: [
    './learner.css',
    './learner-drawer.css',
    './learner-forms.css',
    './learner-knowledge.css',
    '../shared/controls.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearnerDuplicatesDrawer {
  protected readonly duplicates = inject(LearnerDuplicatesStore);
  protected readonly model = inject(LearnerModelStore);
}
