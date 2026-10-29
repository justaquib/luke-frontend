import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { LanguageLessonCard } from '../core/api.service';
import { AppIcon } from '../shared/app-icon';
import { LearnerDuplicatesStore } from './learner-duplicates.store';
import { LearnerLessonEditorStore } from './learner-editor.store';

/** One question in the grade browser, editable when the trainer taught it. */
@Component({
  selector: 'app-learner-lesson-row',
  standalone: true,
  imports: [FormsModule, AppIcon],
  templateUrl: './learner-lesson-row.html',
  styleUrls: [
    './learner-lessons.css',
    './learner-forms.css',
    './learner-knowledge.css',
    './learner-lesson-row.css',
    '../shared/controls.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearnerLessonRow {
  readonly lesson = input.required<LanguageLessonCard>();

  protected readonly duplicates = inject(LearnerDuplicatesStore);
  protected readonly editors = inject(LearnerLessonEditorStore);
  protected readonly id = computed(() => this.lesson().id ?? '');

  protected save(): void {
    if (this.id()) this.editors.save(this.id());
  }

  protected requestRemoval(): void {
    this.editors.promptRemoval(this.id(), this.lesson().question);
  }
}
