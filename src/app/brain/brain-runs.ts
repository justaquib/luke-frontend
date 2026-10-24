import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import type { BrainRun } from '../core/api/language-brain.types';

/** The last trainings, as the engine recorded them. A missing number says so. */
@Component({
  selector: 'app-brain-runs',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './brain-runs.html',
  styleUrl: './brain-runs.css',
})
export class BrainRuns {
  readonly runs = input<BrainRun[] | null>(null);

  protected readonly rows = computed(() => (this.runs() ?? []).slice(0, 5));

  protected loss(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—';
    return value.toFixed(3);
  }

  protected clock(seconds: number | undefined): string {
    if (seconds === undefined || seconds === null) return '—';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    return `${Math.round(seconds / 60)}m`;
  }
}
