import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import type {
  BaseModelInfo,
  HuggingFaceRun,
  HuggingFaceState,
  TeacherInfo,
} from '../core/api/api-models';
import { ModelApiService } from '../core/api/model-api.service';
import { AppIcon } from '../shared/app-icon';
import { UiService } from '../shared/ui.service';
import { LukePackage } from './luke-package';
import { SavedTeachers } from './saved-teachers';
import { TrainerTransfer } from './trainer-transfer';

const DEFAULT_STEPS = 200;
const POLL_MS = 2000;

/**
 * The Base model tab: fine-tune a small Hugging Face model on this tenant's
 * material, watch the run the backend records, and remove saved teachers.
 * Every number on the tab is read from the run that measured it.
 */
@Component({
  selector: 'app-trainer-base',
  standalone: true,
  imports: [AppIcon, LukePackage, SavedTeachers, TrainerTransfer],
  templateUrl: './trainer-base.html',
  styleUrls: ['./styles/trainer-base.css', '../shared/controls.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainerBase implements OnInit {
  protected readonly state = signal<HuggingFaceState | null>(null);
  protected readonly loading = signal(false);
  protected readonly starting = signal(false);
  protected readonly steps = signal(DEFAULT_STEPS);
  protected readonly selected = signal('');
  protected readonly removing = signal<string | null>(null);

  private readonly api = inject(ModelApiService);
  private readonly ui = inject(UiService);
  private readonly destroyRef = inject(DestroyRef);
  private timer?: ReturnType<typeof setTimeout>;
  private wasRunning = false;

  protected readonly models = computed<BaseModelInfo[]>(() => this.state()?.base_models ?? []);
  protected readonly teachers = computed<TeacherInfo[]>(() => this.state()?.teachers ?? []);
  protected readonly running = computed(() => !!this.state()?.running || this.starting());
  protected readonly chosen = computed<BaseModelInfo | null>(
    () => this.models().find((model) => model.id === this.selected()) ?? null,
  );
  protected readonly progress = computed<HuggingFaceRun | null>(
    () => this.state()?.progress ?? this.state()?.last_run ?? null,
  );
  protected readonly percent = computed(() => {
    const run = this.progress();
    if (!run) return 0;
    if (run.finished && run.stage !== 'failed') return 100;
    const total = run.steps_total ?? 0;
    const done = run.steps_done ?? 0;
    return total ? Math.min(100, Math.round((done / total) * 100)) : 0;
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.stopPolling());
  }

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.api.huggingface().subscribe({
      next: (state) => this.accept(state),
      error: (error: Error) => {
        this.loading.set(false);
        this.ui.error(error.message || 'The base models could not be read.');
      },
    });
  }

  select(modelId: string): void {
    this.selected.set(modelId);
  }

  setSteps(value: string): void {
    const steps = Number(value);
    this.steps.set(Number.isFinite(steps) ? Math.min(2000, Math.max(1, Math.round(steps))) : 1);
  }

  train(): void {
    const model = this.chosen();
    if (!model || this.running()) return;
    this.starting.set(true);
    this.api.trainBaseModel(model.id, this.steps()).subscribe({
      next: (state) => {
        this.starting.set(false);
        this.wasRunning = true;
        this.ui.success(`Fine-tuning ${model.name} on the lab’s material.`);
        this.accept(state);
      },
      error: (error: Error) => {
        this.starting.set(false);
        this.ui.error(error.message || 'The fine-tune could not start.');
      },
    });
  }

  remove(teacher: TeacherInfo): void {
    this.ui
      .confirmDialog({
        title: 'Remove this teacher?',
        message: `Remove ${teacher.name} and its weights from this machine? The last run report stays.`,
        confirmLabel: 'Remove weights',
        cancelLabel: 'Keep',
        danger: true,
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.removing.set(teacher.folder);
        this.api.removeTeacher(teacher.folder).subscribe({
          next: (state) => {
            this.removing.set(null);
            this.accept(state);
            this.ui.success('Teacher weights removed.');
          },
          error: (error: Error) => {
            this.removing.set(null);
            this.ui.error(error.message || 'The teacher could not be removed.');
          },
        });
      });
  }

  protected stageStatus(run: HuggingFaceRun, key: string): string {
    return run.stages?.[key] ?? 'waiting';
  }

  protected runLine(run: HuggingFaceRun): string {
    const parts = [`step ${run.steps_done ?? 0} / ${run.steps_total ?? 0}`];
    if (run.loss !== null && run.loss !== undefined) parts.push(`loss ${run.loss}`);
    if (run.eta_seconds) parts.push(`${run.eta_seconds}s left`);
    if (run.seconds) parts.push(`${run.seconds}s elapsed`);
    return parts.join(' · ');
  }

  private accept(state: HuggingFaceState): void {
    this.state.set(state);
    this.loading.set(false);
    this.chooseBaseModel(state);
    this.announceFinished(state);
    if (state.running) this.schedulePoll();
    else this.stopPolling();
  }

  private chooseBaseModel(state: HuggingFaceState): void {
    if (this.selected() || !state.base_models.length) return;
    this.selected.set(state.base_models[0].id);
  }

  private announceFinished(state: HuggingFaceState): void {
    if (!this.wasRunning || state.running) return;
    this.wasRunning = false;
    const run = state.progress;
    if (run && run.stage === 'failed') {
      this.ui.error(run.error || 'The fine-tune failed.');
      return;
    }
    if (run?.finished) {
      this.ui.success('Fine-tune finished; the teacher is ready in the chat.');
    }
  }

  private schedulePoll(): void {
    this.stopPolling();
    this.timer = setTimeout(() => this.refresh(), POLL_MS);
  }

  private stopPolling(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
  }
}
