import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AppIcon } from '../shared/app-icon';

export interface LearnerDetailsModel {
  model_name: string;
  description: string;
  current_stage_id: string;
  stage: string;
  vocabulary_size: number;
  token_count: number;
}

/** The learner's measured summary, shown in the shared details panel. */
@Component({
  selector: 'app-learner-details',
  standalone: true,
  imports: [DecimalPipe, AppIcon],
  templateUrl: './learner-details.html',
  styleUrls: ['./learner-details.css', '../shared/controls.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearnerDetails {
  readonly model = input<LearnerDetailsModel | null>(null);
  readonly lessonTotal = input(0);
  readonly questions = input(0);
  readonly sentenceExamples = input(0);
  readonly trainerAnswers = input(0);
  readonly refreshing = input(false);
  readonly refresh = output<void>();
}
