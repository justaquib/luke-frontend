import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AnswerPipeline } from '../shared/answer-pipeline';
import { AppCardInfo } from '../shared/app-card-info';
import { AppIcon } from '../shared/app-icon';
import { LearnerChatTurnCard } from './learner-chat-turn';
import { LearnerChatStore } from './learner-chat.store';
import { LearnerPracticeStore } from './learner-practice.store';

/** The learner chat and the small practice card. */
@Component({
  selector: 'app-learner-overview',
  standalone: true,
  imports: [FormsModule, AnswerPipeline, AppCardInfo, AppIcon, LearnerChatTurnCard],
  templateUrl: './learner-overview.html',
  styleUrls: [
    './learner.css',
    './learner-chat.css',
    './learner-forms.css',
    '../shared/controls.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearnerOverview {
  protected readonly chat = inject(LearnerChatStore);
  protected readonly practice = inject(LearnerPracticeStore);
}
