import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import type { TeacherInfo } from '../core/api/training-models';
import type { TransferRun, TransferState } from '../core/api/transfer-models';
import { ModelApiService } from '../core/api/model-api.service';
import { AppIcon } from '../shared/app-icon';
import { UiService } from '../shared/ui.service';

const DEFAULT_LIMIT = 40;
const POLL_MS = 2000;

const KIND_LABELS: Record<string, string> = {
  lesson: 'Lessons',
  starter_lesson: 'Starter lessons',
  correction: 'Corrections',
  word: 'Words',
  document: 'Documents',
  topic: 'Topics',
};

/**
 * The knowledge transfer: ask an installed teacher every question the tenant's
 * material can ask, and keep its grounded answers as trained answers in Luke.
 * The report is read from the run that measured it, and undone as one batch.
 */
@Component({
  selector: 'app-trainer-transfer',
  standalone: true,
  imports: [AppIcon],
  templateUrl: './trainer-transfer.html',
  styleUrls: ['./styles/trainer-transfer.css', '../shared/controls.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainerTransfer implements OnInit {
  protected readonly state = signal<TransferState | null>(null);
  protected readonly loading = signal(false);
  protected readonly starting = signal(false);
  protected readonly undoing = signal(false);
  protected readonly folder = signal('');
  protected readonly limit = signal(DEFAULT_LIMIT);

  private readonly api = inject(ModelApiService);
  private readonly ui = inject(UiService);
  private readonly destroyRef = inject(DestroyRef);
  private timer?: ReturnType<typeof setTimeout>;
  private wasRunning = false;

  protected readonly teachers = computed<TeacherInfo[]>(() => this.state()?.teachers ?? []);
  protected readonly chosen = computed<TeacherInfo | null>(
    () => this.teachers().find((teacher) => teacher.folder === this.folder()) ?? null,
  );
  protected readonly running = computed(() => !!this.state()?.running || this.starting());
  protected readonly busy = computed(() => this.running() || this.undoing());
  protected readonly available = computed(() => this.state()?.available ?? 0);
  protected readonly samples = computed(() => this.state()?.samples ?? []);
  protected readonly kinds = computed<Array<{ kind: string; label: string; count: number }>>(() =>
    Object.entries(this.state()?.by_kind ?? {}).map(([kind, count]) => ({
      kind,
      label: this.kindLabel(kind),
      count,
    })),
  );
  protected readonly run = computed<TransferRun | null>(
    () => this.state()?.progress ?? this.state()?.last ?? null,
  );
  protected readonly percent = computed(() => {
    const run = this.run();
    if (!run) return 0;
    if (run.stage === 'done' || run.stage === 'undone') return 100;
    return run.total ? Math.min(100, Math.round((run.done / run.total) * 100)) : 0;
  });
  protected readonly canUndo = computed(
    () => !this.running() && (this.state()?.last?.faq_ids.length ?? 0) > 0,
  );

  constructor() {
    this.destroyRef.onDestroy(() => this.stopPolling());
  }

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.api.transfer().subscribe({
      next: (state) => this.accept(state),
      error: (error: Error) => {
        this.loading.set(false);
        this.ui.error(error.message || 'The knowledge transfer could not be read.');
      },
    });
  }

  select(folder: string): void {
    this.folder.set(folder);
  }

  setLimit(value: string): void {
    const limit = Number(value);
    this.limit.set(Number.isFinite(limit) ? Math.min(200, Math.max(1, Math.round(limit))) : 1);
  }

  transferKnowledge(): void {
    const teacher = this.chosen();
    if (!teacher || this.running()) return;
    this.starting.set(true);
    this.api.startTransfer(teacher.folder, this.limit()).subscribe({
      next: (state) => {
        this.starting.set(false);
        this.wasRunning = true;
        this.ui.success(`${teacher.name} is answering your material; the report follows here.`);
        this.accept(state);
      },
      error: (error: Error) => {
        this.starting.set(false);
        this.ui.error(error.message || 'The knowledge transfer could not start.');
      },
    });
  }

  undo(): void {
    const kept = this.state()?.last?.kept ?? 0;
    this.ui
      .confirmDialog({
        title: 'Undo this transfer?',
        message: `Remove the ${kept} answer(s) this transfer added to Luke? Your other trained answers are not touched.`,
        confirmLabel: 'Undo transfer',
        cancelLabel: 'Keep',
        danger: true,
      })
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.undoing.set(true);
        this.api.undoTransfer().subscribe({
          next: (state) => {
            this.undoing.set(false);
            this.ui.success(`Removed ${state.last?.undone ?? 0} transferred answer(s) from Luke.`);
            this.accept(state);
          },
          error: (error: Error) => {
            this.undoing.set(false);
            this.ui.error(error.message || 'The transfer could not be undone.');
          },
        });
      });
  }

  protected kindLabel(kind: string): string {
    return KIND_LABELS[kind] ?? kind;
  }

  protected stageLabel(run: TransferRun): string {
    switch (run.stage) {
      case 'loading':
        return 'Loading the teacher';
      case 'asking':
        return 'Asking the teacher';
      case 'failed':
        return 'The transfer failed';
      case 'undone':
        return 'Undone';
      case 'done':
        return 'The last transfer';
      default:
        return 'The last transfer';
    }
  }

  protected runLine(run: TransferRun): string {
    const parts = [
      `${run.done} / ${run.total} asked`,
      `${run.kept} kept`,
      `${run.skipped} skipped`,
    ];
    if (run.seconds) parts.push(`${run.seconds}s`);
    return parts.join(' · ');
  }

  private accept(state: TransferState): void {
    this.state.set(state);
    this.loading.set(false);
    this.chooseTeacher(state);
    this.announceFinished(state);
    if (state.running) this.schedulePoll();
    else this.stopPolling();
  }

  private chooseTeacher(state: TransferState): void {
    if (this.folder() || !state.teachers.length) return;
    this.folder.set(state.teachers[0].folder);
  }

  private announceFinished(state: TransferState): void {
    if (!this.wasRunning || state.running) return;
    this.wasRunning = false;
    const run = state.progress ?? state.last;
    if (!run) return;
    if (run.stage === 'failed') {
      this.ui.error(run.error || 'The knowledge transfer failed.');
      return;
    }
    if (run.stage === 'done') {
      this.ui.success(`${run.kept} answer(s) from ${run.model_name} now answer in Luke.`);
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
