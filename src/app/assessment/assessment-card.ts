import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { AssessmentProfile } from '../core/api/assessment.types';
import {
  assessmentConfidenceLabel,
  assessmentConfidenceNote,
  assessmentDeltaLabel,
  assessmentScoreLabel,
} from '../shared/assessment-labels';
import { AppCardInfo } from '../shared/app-card-info';

const UNTESTED_SHOWN = 4;

/** One skill's measured card: a score, or explicitly unassessed. */
@Component({
  selector: 'app-assessment-card',
  standalone: true,
  imports: [AppCardInfo],
  templateUrl: './assessment-card.html',
  styleUrl: './assessment-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssessmentCard {
  readonly profile = input.required<AssessmentProfile>();
  readonly review = output<AssessmentProfile>();

  protected readonly assessed = computed(() => this.profile().status === 'assessed');
  protected readonly passed = computed(() => this.profile().verdict === 'benchmark passed');
  protected readonly score = computed(() => assessmentScoreLabel(this.profile().score));
  protected readonly confidence = computed(() =>
    assessmentConfidenceLabel(this.profile().confidence),
  );
  protected readonly confidenceNote = computed(() =>
    assessmentConfidenceNote(this.profile().confidence),
  );
  protected readonly change = computed(() => assessmentDeltaLabel(this.profile().delta));
  protected readonly stage = computed(() => {
    const stage = this.profile().stage;
    return stage === null ? 'No stage cleared yet' : `Stage ${stage} cleared`;
  });
  protected readonly untested = computed(() => this.profile().untested.slice(0, UNTESTED_SHOWN));
  protected readonly moreUntested = computed(() =>
    Math.max(0, this.profile().untested.length - UNTESTED_SHOWN),
  );
}
