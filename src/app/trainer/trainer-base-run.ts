import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { HuggingFaceRun } from '../core/api/training-models';

const STAGES = ['load', 'tune', 'save'] as const;

/** One run as it recorded itself: its stages, steps, loss and what it wrote. */
@Component({
  selector: 'app-base-run',
  standalone: true,
  templateUrl: './trainer-base-run.html',
  styleUrl: './styles/trainer-base.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainerBaseRun {
  readonly run = input.required<HuggingFaceRun>();
  readonly running = input(false);

  protected readonly stages = STAGES;
  protected readonly percent = computed(() => {
    const run = this.run();
    if (run.finished && run.stage === 'done') return 100;
    const total = run.steps_total ?? 0;
    const done = run.steps_done ?? 0;
    return total ? Math.min(100, Math.round((done / total) * 100)) : 0;
  });
  protected readonly facts = computed(() => {
    const run = this.run();
    if (run.rows) {
      const percent = run.trainable_percent;
      const moved =
        percent === null || percent === undefined ? '' : ` ${percent}% of the parameters moved.`;
      return `${run.rows} example(s) from ${run.sources ?? 0} source(s).${moved}`;
    }
    return run.examples ? `${run.examples} examples from your material.` : '';
  });

  protected stageLabel(key: string): string {
    return key === 'load' ? 'load model' : key === 'tune' ? 'train' : 'save';
  }

  protected stageStatus(key: string): string {
    return this.run().stages?.[key] ?? 'waiting';
  }

  protected runLine(): string {
    const run = this.run();
    const parts = [`step ${run.steps_done ?? 0} / ${run.steps_total ?? 0}`];
    if (run.loss !== null && run.loss !== undefined) parts.push(`loss ${run.loss}`);
    if (run.eta_seconds) parts.push(`${run.eta_seconds}s left`);
    if (run.seconds) parts.push(`${run.seconds}s elapsed`);
    return parts.join(' · ');
  }

  protected kind(): string {
    return this.run().kind === 'adapter' ? 'adapter' : 'all weights';
  }
}
