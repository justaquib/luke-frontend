import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { BrainWordReport, ModelReport } from '../core/api/language-brain.types';

/**
 * The two models, side by side. The held-out number is labelled apart from
 * the training read, and a number that was never measured says so.
 */
@Component({
  selector: 'app-brain-models',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './brain-models.html',
  styleUrl: './brain-models.css',
})
export class BrainModels {
  readonly answer = input<ModelReport | null>(null);
  readonly words = input<BrainWordReport | null>(null);

  protected readonly trainingCurve = computed(() => this.sparkline(this.answer()?.curve ?? []));
  protected readonly validationCurve = computed(() =>
    this.sparkline(this.answer()?.validation_curve ?? []),
  );

  protected number(value: number | null | undefined, digits = 3): string {
    if (value === null || value === undefined) return 'not measured yet';
    return value.toFixed(digits);
  }

  protected whole(value: number | null | undefined): string {
    if (value === null || value === undefined) return 'not measured yet';
    return String(value);
  }

  protected percent(value: number | null | undefined): string {
    if (value === null || value === undefined) return 'not measured yet';
    return `${Math.round(value * 100)}%`;
  }

  private sparkline(values: number[]): string {
    if (values.length < 2) return '';
    const low = Math.min(...values);
    const high = Math.max(...values);
    const span = high - low || 1;
    return values
      .map((value, index) => {
        const x = (index / (values.length - 1)) * 100;
        const y = 22 - ((value - low) / span) * 20;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }
}
