import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  type OnDestroy,
  type OnInit,
  output,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import {
  type BrainTrainingState,
  LanguageModelApiService,
  type TrainingProgress,
  type TrainingStageStatus,
  type TrainingSources,
} from '../core/api/language-model-api.service';

/** How often the training is read while it runs, in milliseconds. */
const WATCH_INTERVAL = 3000;

/** How a whole training is told in words once it is over. */
const clock = (seconds: number): string => {
  if (seconds >= 0 && seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

/**
 * The panel that says what the brain has trained from and how the training
 * works. It is opened from the small info button beside the training button,
 * and it opens by itself while the brain is training. While the training
 * runs it reads the checklist the training itself writes: the parts that are
 * done, the part it is on, the steps and the time the rest will take. When
 * the training is over it says how long it took.
 */
@Component({
  selector: 'app-brain-training-panel',
  standalone: true,
  templateUrl: './brain-training-panel.html',
  styleUrl: './brain-training-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrainTrainingPanel implements OnInit, OnDestroy {
  private readonly api = inject(LanguageModelApiService);
  private readonly platformId = inject(PLATFORM_ID);

  /** Raised when the trainer closes the panel. */
  readonly closed = output<void>();

  protected readonly report = signal<TrainingSources | null>(null);
  protected readonly live = signal<BrainTrainingState | null>(null);
  protected readonly training = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly progress = computed<TrainingProgress | null>(
    () => this.live()?.progress ?? null,
  );

  private timer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    // The server has no session, so the report is read in the browser.
    if (!isPlatformBrowser(this.platformId)) return;
    this.load();
    this.watch();
  }

  ngOnDestroy(): void {
    this.stopWatching();
  }

  /** The mark beside one part of the checklist: check, current, or to come. */
  protected markFor(status: TrainingStageStatus): string {
    if (status === 'done') return '✓';
    if (status === 'working') return '…';
    return '·';
  }

  /** The numbers of the writer's steps, as the live line reads them. */
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

  /** Follow the training while it runs, so the panel shows what is happening. */
  private watch(): void {
    this.api.languageModelBrain().subscribe({
      next: (response) => {
        const state = (response?.state ?? {}) as BrainTrainingState;
        this.live.set(state);
        const running = !!state.training;
        this.training.set(running);
        if (running) this.scheduleWatch();
      },
      error: () => this.stopWatching(),
    });
  }

  private scheduleWatch(): void {
    this.stopWatching();
    this.timer = setTimeout(() => this.watch(), WATCH_INTERVAL);
  }

  private stopWatching(): void {
    if (this.timer === null) return;
    clearTimeout(this.timer);
    this.timer = null;
  }
}
