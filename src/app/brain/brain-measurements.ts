import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import type { ModelLevel, ModelMeasure } from '../core/api/api.types';

/**
 * The measurements the builder shows: what the model wrote on requests it
 * was never worded for, what it refused, what it carried to a subject it
 * never saw, and whether the probes were kept out of its training.
 */
@Component({
  selector: 'app-brain-measurements',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './brain-measurements.html',
  styleUrl: './brain-measurements.css',
})
export class BrainMeasurements {
  readonly level = input<ModelLevel | null>(null);

  protected readonly heldOut = computed(() => {
    const level = this.level();
    return level?.instruction_measured ? level.instruction_following : null;
  });
  protected readonly written = computed(() => {
    const level = this.level();
    return level?.instruction_measured ? (level.instruction_written ?? null) : null;
  });
  protected readonly lookedUp = computed(() => {
    const level = this.level();
    return level?.instruction_measured ? (level.instruction_looked_up ?? null) : null;
  });
  protected readonly measuredAt = computed(() => {
    const level = this.level();
    return level?.instruction_measured ? (level.instruction_measured_at ?? null) : null;
  });
  protected readonly adversarial = computed<ModelMeasure>(() => {
    const level = this.level();
    return level?.instruction_measured ? (level.adversarial ?? {}) : {};
  });
  protected readonly crossTopic = computed(() => {
    const level = this.level();
    return level?.instruction_measured ? (level.cross_topic ?? {}) : {};
  });
  protected readonly contamination = computed(() => {
    const level = this.level();
    if (!level?.instruction_measured) return null;
    const check = level.contamination;
    if (
      !check ||
      typeof check.clean !== 'boolean' ||
      check.checked === undefined ||
      check.overlaps === undefined
    ) {
      return null;
    }
    return { clean: check.clean, checked: check.checked, overlaps: check.overlaps };
  });

  protected percent(value: number | null | undefined): string {
    if (value === null || value === undefined) return 'not measured yet';
    return `${Math.round(value * 100)}%`;
  }

  protected ratio(passed: number | null | undefined, total: number | null | undefined): string {
    if (passed === undefined || passed === null) return 'not measured yet';
    if (total === undefined || total === null) return 'not measured yet';
    return `${passed} of ${total}`;
  }
}
