import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { LanguageTrainerAnswer } from '../core/api.service';
import { AppIcon } from '../shared/app-icon';
import { LearnerTrainerAnswerEditorStore } from './learner-editor.store';

/** One trainer-approved answer, editable and removable in place. */
@Component({
  selector: 'app-learner-trainer-answer-row',
  standalone: true,
  imports: [DecimalPipe, FormsModule, AppIcon],
  templateUrl: './learner-trainer-answer-row.html',
  styleUrls: [
    './learner-knowledge.css',
    './learner-forms.css',
    './learner-lesson-row.css',
    '../shared/controls.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearnerTrainerAnswerRow {
  readonly item = input.required<LanguageTrainerAnswer>();

  protected readonly editors = inject(LearnerTrainerAnswerEditorStore);
}
