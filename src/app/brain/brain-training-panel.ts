import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  type OnInit,
  signal,
} from '@angular/core';
import {
  LanguageModelApiService,
  type TrainingSources,
} from '../core/api/language-model-api.service';
import type { LanguageBrainState, TrainingProgress } from '../core/api/language-brain.types';
import { AppIcon } from '../shared/app-icon';

/** How a whole training is told in words once it is over. */
const clock = (seconds: number): string => {
  if (seconds >= 0 && seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

/**
 * What the brain trains from and how the training works, shown in the shared
 * right sidebar. The live progress is the brain state the page already reads;
 * the panel only fetches the sources report.
 */
@Component({
  selector: 'app-brain-training-panel',
  standalone: true,
  imports: [AppIcon],
  templateUrl: './brain-training-panel.html',
  styleUrl: './brain-training-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrainTrainingPanel implements OnInit {
  private readonly api = inject(LanguageModelApiService);

  /** The live brain state the page reads, so the panel does not poll again. */
  readonly state = input<LanguageBrainState | null>(null);

  protected readonly report = signal<TrainingSources | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly progress = computed<TrainingProgress | null>(
    () => this.state()?.progress ?? null,
  );
  protected readonly training = computed(() => !!this.state()?.training);

  /** The one line the panel shows while it reads, or when the read failed. */
  protected readonly notice = computed<string | null>(() => {
    if (this.loading()) return 'Reading the material…';
    return this.error();
  });

  ngOnInit(): void {
    this.load();
  }

  /** The numbers of the training steps, as the live line reads them. */
  protected stepsFor(progress: TrainingProgress): string {
    const done = progress.steps_done ?? 0;
    const total = progress.steps_total ?? 0;
    if (!total) return 'Counting the material…';
    return `${done} of ${total} steps · about ${clock(progress.eta_seconds ?? 0)} left`;
  }

  /** How long the last training took, once the checklist is closed. */
  protected resultFor(progress: TrainingProgress): string {
    const parts = (progress.stages ?? []).filter((stage) => stage.status === 'done').length;
    if (parts < (progress.stages ?? []).length) return 'Training stopped before it finished.';
    return `Trained in ${clock(progress.seconds ?? 0)}.`;
  }

  /** Read the material the training uses. */
  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.trainingSources().subscribe({
      next: (report) => {
        this.report.set(report);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.loading.set(false);
      },
    });
  }
}
