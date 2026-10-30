import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { TrainingDataset, TrainingOperation } from '../core/api/training-models';

/**
 * The dataset a run would read: how many sources and examples it holds, the
 * split taken from them, and any held-out source that also reached training.
 */
@Component({
  selector: 'app-base-dataset',
  standalone: true,
  templateUrl: './trainer-base-dataset.html',
  styleUrl: './styles/trainer-base.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainerBaseDataset {
  readonly dataset = input<TrainingDataset | null>(null);
  readonly error = input<string | null>(null);
  readonly loading = input(false);
  readonly operation = input<TrainingOperation>('sft');
  readonly train = input(0);
  readonly held = input(0);

  protected task(): string {
    return this.operation() === 'pretrain'
      ? 'passages from documents'
      : 'taught questions and answers';
  }
}
