import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { BrainWordReport } from '../core/api/language-brain.types';

/**
 * The word model's numbers. The held-out figure is labelled apart from the
 * training read, and a number that was never measured says so.
 */
@Component({
  selector: 'app-brain-models',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './brain-models.html',
  styleUrl: './brain-models.css',
})
export class BrainModels {
  readonly words = input<BrainWordReport | null>(null);

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
}
