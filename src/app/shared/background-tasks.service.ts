import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { LanguageModelApiService } from '../core/api/language-model-api.service';
import type { LanguageBrainDocument, TrainingProgress } from '../core/api/language-brain.types';

/** How often a running task is read. */
const WATCH_INTERVAL = 3000;

/** How often an idle app asks whether a task has started. */
const IDLE_INTERVAL = 15000;

export interface BackgroundTask {
  key: string;
  title: string;
  detail: string;
  /** How much of the measured work is done, or null when it cannot be counted. */
  percent: number | null;
}

export type BackgroundTaskStatus = 'idle' | 'loading' | 'ready' | 'error';

const clock = (seconds: number): string => {
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

/**
 * The long-running work of the app, as both sidebars tell it. Only work that
 * is running is listed, and every line is read from the process itself. It is
 * read closely while a task runs and slowly while the app is idle, so a task
 * that starts later still reaches the primary sidebar.
 */
@Injectable({ providedIn: 'root' })
export class BackgroundTasksService {
  private readonly api = inject(LanguageModelApiService);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly _tasks = signal<BackgroundTask[]>([]);
  private readonly _brain = signal<LanguageBrainDocument | null>(null);
  private readonly _status = signal<BackgroundTaskStatus>('idle');
  private readonly _error = signal<string | null>(null);

  readonly tasks = this._tasks.asReadonly();
  /** The last brain reading, shared with the neural engine details. */
  readonly brain = this._brain.asReadonly();
  readonly status = this._status.asReadonly();
  readonly error = this._error.asReadonly();

  private timer: ReturnType<typeof setTimeout> | null = null;
  private active = false;
  private inFlight = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  /** Read the tasks now, then keep checking while the app is signed in. */
  start(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.active = true;
    this.load();
  }

  stop(): void {
    this.active = false;
    this.clearTimer();
  }

  private load(): void {
    if (!this.active || this.inFlight) return;
    this.clearTimer();
    this.inFlight = true;
    if (this._status() !== 'ready') this._status.set('loading');
    this._error.set(null);
    this.api.languageModelBrain().subscribe({
      next: (state) => {
        this.inFlight = false;
        this._brain.set(state);
        this._tasks.set(this.tasksFrom(state));
        this._status.set('ready');
        this.schedule();
      },
      error: (err: Error) => {
        this.inFlight = false;
        this._brain.set(null);
        this._status.set('error');
        this._error.set(err.message);
      },
    });
  }

  private tasksFrom(state: LanguageBrainDocument): BackgroundTask[] {
    if (!state.training) return [];
    const progress = state.progress ?? null;
    return [
      {
        key: 'brain-training',
        title: 'Training the neural brain',
        detail: this.detailFor(progress),
        percent: this.percentFor(progress),
      },
    ];
  }

  private detailFor(progress: TrainingProgress | null): string {
    if (!progress) return 'Waiting for the first step.';
    const stage = (progress.stages ?? []).find((step) => step.status === 'working')?.label;
    const steps = this.stepsFor(progress);
    const eta = this.etaFor(progress);
    return stage ? `${stage} · ${steps}${eta}` : `${steps}${eta}`;
  }

  private stepsFor(progress: TrainingProgress): string {
    const total = progress.steps_total ?? 0;
    return total > 0 ? `${progress.steps_done ?? 0} of ${total} steps` : 'Counting the material…';
  }

  private etaFor(progress: TrainingProgress): string {
    const total = progress.steps_total ?? 0;
    const seconds = progress.eta_seconds;
    if (total <= 0 || seconds === null || seconds === undefined) return '';
    return ` · about ${clock(seconds)} left`;
  }

  private percentFor(progress: TrainingProgress | null): number | null {
    const total = progress?.steps_total ?? 0;
    if (total <= 0) return null;
    const done = progress?.steps_done ?? 0;
    return Math.min(100, Math.max(0, Math.round((done / total) * 100)));
  }

  private schedule(): void {
    this.clearTimer();
    if (!this.active) return;
    const delay = this._tasks().length ? WATCH_INTERVAL : IDLE_INTERVAL;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.load();
    }, delay);
  }

  private clearTimer(): void {
    if (this.timer === null) return;
    clearTimeout(this.timer);
    this.timer = null;
  }
}
