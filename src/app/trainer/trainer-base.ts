import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ModelApiService } from '../core/api/model-api.service';
import type {
  BaseModelInfo,
  HuggingFaceRun,
  HuggingFaceState,
  TeacherInfo,
  TrainingDataset,
  TrainingOperation,
} from '../core/api/training-models';
import { AppIcon } from '../shared/app-icon';
import { UiService } from '../shared/ui.service';
import { HuggingFaceSearchResults } from './huggingface-search-results';
import { HuggingFaceSearchService } from './huggingface-search.service';
import { LukePackage } from './luke-package';
import { SavedTeachers } from './saved-teachers';
import { TrainerBaseDataset } from './trainer-base-dataset';
import { TrainerBaseRun } from './trainer-base-run';
import { TrainerTransfer } from './trainer-transfer';

const DEFAULT_STEPS = 200;
const POLL_MS = 2000;
const OPERATIONS: readonly TrainingOperation[] = ['sft', 'lora', 'pretrain'];

const LABELS: Record<TrainingOperation, string> = {
  sft: 'Supervised fine-tune (all weights)',
  lora: 'Adapter (LoRA)',
  pretrain: 'Continue pretraining',
};

const NOTES: Record<TrainingOperation, string> = {
  sft: 'Every weight moves, and the result replaces the saved teacher for this base model.',
  lora: 'Only a small set of added matrices move. The adapter is saved beside the teacher and is promoted only if it beats the baseline.',
  pretrain:
    'Reads the uploaded documents as passages rather than questions. It changes nothing until documents are stored.',
};

const BUTTONS: Record<TrainingOperation, string> = {
  sft: 'Fine-tune on my material',
  lora: 'Train an adapter',
  pretrain: 'Continue pretraining',
};

/**
 * The Base model tab: start one of the three training operations on this
 * workspace's material, watch the run the backend records, and remove saved
 * teachers. Every number on the tab is read from the run that measured it.
 */
@Component({
  selector: 'app-trainer-base',
  standalone: true,
  imports: [
    AppIcon,
    HuggingFaceSearchResults,
    LukePackage,
    SavedTeachers,
    TrainerBaseDataset,
    TrainerBaseRun,
    TrainerTransfer,
  ],
  templateUrl: './trainer-base.html',
  styleUrls: ['./styles/trainer-base.css', '../shared/controls.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainerBase implements OnInit {
  protected readonly state = signal<HuggingFaceState | null>(null);
  protected readonly dataset = signal<TrainingDataset | null>(null);
  protected readonly datasetError = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly datasetLoading = signal(false);
  protected readonly starting = signal(false);
  protected readonly steps = signal(DEFAULT_STEPS);
  protected readonly selected = signal('');
  protected readonly operation = signal<TrainingOperation>('sft');
  protected readonly removing = signal<string | null>(null);
  protected readonly uploading = signal(false);

  private readonly api = inject(ModelApiService);
  private readonly ui = inject(UiService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly huggingfaceSearch = inject(HuggingFaceSearchService);
  private timer?: ReturnType<typeof setTimeout>;
  private wasRunning = false;

  protected readonly operations = OPERATIONS;
  protected readonly labels = LABELS;
  protected readonly notes = NOTES;
  protected readonly buttons = BUTTONS;
  protected readonly models = computed<BaseModelInfo[]>(() => this.state()?.base_models ?? []);
  protected readonly teachers = computed<TeacherInfo[]>(() => this.state()?.teachers ?? []);
  protected readonly running = computed(() => !!this.state()?.running || this.starting());
  protected readonly chosen = computed<BaseModelInfo | null>(
    () => this.models().find((model) => model.id === this.selected()) ?? null,
  );
  protected readonly progress = computed<HuggingFaceRun | null>(
    () => this.state()?.progress ?? this.state()?.last_run ?? null,
  );
  protected readonly leaks = computed(() => this.dataset()?.leakage ?? []);
  protected readonly counts = computed(() => {
    const counts = this.dataset()?.counts ?? {};
    const task = this.operation() === 'pretrain' ? 'pretrain' : 'sft';
    return { train: counts[`${task}_train`] ?? 0, held: counts[`${task}_held_out`] ?? 0 };
  });
  protected readonly runnable = computed(
    () => !!this.dataset()?.split_taken && this.counts().train > 0 && !this.leaks().length,
  );
  protected readonly blocked = computed(() => {
    const data = this.dataset();
    if (!data) return this.datasetError() ?? 'The dataset has not been read yet.';
    if (!data.split_taken) {
      return 'Nothing is held out yet: teach material from at least two different sources first.';
    }
    if (this.leaks().length) {
      return `${this.leaks().length} held-out source(s) also sit on the training side; the split has to be clean before any weight moves.`;
    }
    if (this.counts().train === 0) {
      return this.operation() === 'pretrain'
        ? 'No passage is stored yet: upload a document in Documents to continue-pretrain.'
        : 'No taught answer is stored yet: approve an answer in the inbox first.';
    }
    return '';
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.stopPolling());
  }

  ngOnInit(): void {
    this.refresh();
    this.loadDataset();
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

  setOperation(value: string): void {
    if (value === 'sft' || value === 'lora' || value === 'pretrain') this.operation.set(value);
  }

  setSteps(value: string): void {
    const steps = Number(value);
    this.steps.set(Number.isFinite(steps) ? Math.min(2000, Math.max(1, Math.round(steps))) : 1);
  }

  train(): void {
    const model = this.chosen();
    const operation = this.operation();
    if (!model || this.running() || !this.runnable()) return;
    this.starting.set(true);
    this.api.trainBaseModel(model.id, operation, this.steps()).subscribe({
      next: (state) => {
        this.starting.set(false);
        this.wasRunning = true;
        this.ui.success(`Started ${LABELS[operation].toLowerCase()} on ${model.name}.`);
        this.accept(state);
      },
      error: (error: Error) => {
        this.starting.set(false);
        this.ui.error(error.message || 'The run could not start.');
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

  uploadDataset(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploading.set(true);
    this.api.uploadTrainingDataset(file).subscribe({
      next: (result) => {
        this.uploading.set(false);
        input.value = '';
        const msg =
          result.errors.length > 0
            ? `Imported ${result.imported} pair(s) with ${result.errors.length} error(s).`
            : `Imported ${result.imported} question-answer pair(s).`;
        this.ui.success(msg);
        this.loadDataset();
      },
      error: (error: Error) => {
        this.uploading.set(false);
        input.value = '';
        this.ui.error(error.message || 'The upload failed.');
      },
    });
  }

  private loadDataset(): void {
    this.datasetLoading.set(true);
    this.datasetError.set(null);
    this.api.trainingDataset().subscribe({
      next: (data) => {
        this.dataset.set(data);
        this.datasetLoading.set(false);
      },
      error: (error: Error) => {
        this.dataset.set(null);
        this.datasetLoading.set(false);
        this.datasetError.set(error.message || 'The training dataset could not be read.');
        this.ui.error(error.message || 'The training dataset could not be read.');
      },
    });
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
    if (run?.finished) this.announceRun(run);
  }

  private announceRun(run: HuggingFaceRun): void {
    if (run.stage === 'failed') {
      this.ui.error(run.error || 'The run failed.');
      return;
    }
    if (run.stage !== 'done') {
      this.ui.error(`The run stopped after step ${run.steps_done ?? 0}; nothing was written.`);
      return;
    }
    if (run.kind === 'adapter') {
      this.ui.success(
        'Adapter finished and saved for measurement. It is promoted only if it beats the baseline; the chat still answers with the teacher.',
      );
      return;
    }
    this.ui.success('Fine-tune finished; the teacher is ready in the chat.');
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
