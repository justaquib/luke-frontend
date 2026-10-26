import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ModelLevel } from '../core/api/api.types';

/**
 * The measurement that does not come from training: how often the model
 * answers a question it was never worded for. It caps the level it can reach.
 */
@Component({
  selector: 'app-brain-measurements',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './brain-measurements.html',
  styleUrl: './brain-measurements.css',
})
export class BrainMeasurements {
  readonly level = input<ModelLevel | null>(null);

  protected readonly probes = computed(() => this.level()?.generality_probes ?? []);

  protected readonly answered = computed(
    () => this.probes().filter((probe) => probe.correct).length,
  );

  protected percent(value: number | null | undefined): string {
    if (value === null || value === undefined) return 'not measured yet';
    return `${Math.round(value * 100)}%`;
  }

  protected ratio(passed: number, total: number): string {
    if (!total) return 'not measured yet';
    return `${passed} of ${total}`;
  }
}
