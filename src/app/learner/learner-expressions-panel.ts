import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AppCardInfo } from '../shared/app-card-info';
import { AppIcon } from '../shared/app-icon';
import { LearnerLessonsStore } from './learner-lessons.store';
import { LearnerModelStore } from './learner-model.store';
import { LearnerViewStore } from './learner-view.store';

/** The taught feelings, greetings and phrases. */
@Component({
  selector: 'app-learner-expressions-panel',
  standalone: true,
  imports: [AppCardInfo, AppIcon],
  templateUrl: './learner-expressions-panel.html',
  styleUrls: ['./learner.css', './learner-knowledge.css', '../shared/controls.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearnerExpressionsPanel {
  protected readonly model = inject(LearnerModelStore);
  private readonly lessons = inject(LearnerLessonsStore);
  private readonly view = inject(LearnerViewStore);

  protected readonly expressions = computed(() =>
    this.model.lessons().filter((lesson) => lesson.subject === 'Feelings & expressions'),
  );

  protected teachAnother(): void {
    this.lessons.useSubject('Feelings & expressions');
    this.view.learnerTab.set('lessons');
  }
}
