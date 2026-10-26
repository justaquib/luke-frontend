import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  type OnDestroy,
  type OnInit,
  PLATFORM_ID,
  signal,
  type TemplateRef,
  viewChild,
} from '@angular/core';
import { LanguageModelApiService } from '../core/api/language-model-api.service';
import type {
  BrainEngineState,
  BrainRun,
  BrainWordReport,
  LanguageBrainDocument,
  LanguageLevelApproval,
  TrainingProgress,
} from '../core/api/language-brain.types';
import type { ModelLevel } from '../core/api/api.types';
import { UiService } from '../shared/ui.service';
import { AppShell } from '../shared/app-shell';
import { PageInfoActions } from '../shared/page-info-actions';
import { TopBarActions } from '../shared/top-bar-actions';
import { RightSidebarService } from '../shared/right-sidebar.service';
import { BrainEngine } from './brain-engine';
import { BrainLadder } from './brain-ladder';
import { BrainMeasurements } from './brain-measurements';
import { BrainModels } from './brain-models';
import { BrainRuns } from './brain-runs';
import { BrainStore } from './brain-store';
import { engineStatus, trainingSummary } from './brain-status';
import { BrainTrainingPanel } from './brain-training-panel';
import { AppIcon } from '../shared/app-icon';

/** How often a running training is read, and how long the page waits for it. */
const WATCH_INTERVAL = 3000;
const WATCH_LIMIT = 30 * 60 * 1000;

/** The brain's mark on the shared right sidebar. */
const SIDEBAR_OWNER = 'brain';

/** One row of the corpus section. */
interface CorpusRow {
  label: string;
  value: string;
}

@Component({
  selector: 'app-brain',
  imports: [
    CommonModule,
    AppShell,
    PageInfoActions,
    TopBarActions,
    BrainEngine,
    BrainModels,
    BrainMeasurements,
    BrainRuns,
    BrainLadder,
    BrainStore,
    BrainTrainingPanel,
    AppIcon,
  ],
  templateUrl: './brain.html',
  styleUrl: './brain.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Brain implements OnInit, OnDestroy {
  private readonly languageApi = inject(LanguageModelApiService);
  private readonly ui = inject(UiService);
  private readonly sidebar = inject(RightSidebarService);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly brainState = signal<LanguageBrainDocument | null>(null);
  protected readonly brainTraining = signal(false);
  protected readonly brainTesting = signal(false);
  protected readonly brainApproving = signal(false);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly engine = computed<BrainEngineState | null>(
    () => this.brainState()?.engine ?? null,
  );
  protected readonly words = computed<BrainWordReport | null>(() => this.engine()?.words ?? null);
  protected readonly runs = computed<BrainRun[]>(() => this.engine()?.runs ?? []);
  protected readonly level = computed<ModelLevel | null>(
    () => this.brainState()?.model_level ?? null,
  );
  protected readonly progress = computed<TrainingProgress | null>(
    () => this.brainState()?.progress ?? null,
  );

  /** The engine status, read from what the checkpoints hold. */
  protected readonly status = computed(
    () => engineStatus(this.engine(), this.brainTraining()).label,
  );

  protected readonly statusClass = computed(
    () => engineStatus(this.engine(), this.brainTraining()).tone,
  );

  /** What the word model was built from, beside what the school holds. */
  protected readonly corpusRows = computed<CorpusRow[]>(() => [
    ...this.storeRows(),
    ...this.corpusCountRows(),
  ]);

  private readonly trainingDetails = viewChild.required<TemplateRef<unknown>>('trainingDetails');
  private timer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    // The server has no session, so the numbers are read in the browser.
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadBrainState();
  }

  ngOnDestroy(): void {
    this.stopWaiting();
    this.sidebar.clearDetails(SIDEBAR_OWNER);
  }

  protected loadBrainState(): void {
    this.loading.set(true);
    this.error.set(null);
    this.languageApi.languageModelBrain().subscribe({
      next: (state) => {
        this.brainState.set(state);
        this.loading.set(false);
        if (state.training) this.openSources();
      },
      error: (err: Error) => {
        this.brainState.set(null);
        this.error.set(err.message);
        this.loading.set(false);
      },
    });
  }

  protected trainBrain(): void {
    if (this.brainTraining()) return;
    this.brainTraining.set(true);
    this.openSources();
    this.languageApi.trainLanguageModelBrain().subscribe({
      next: (result) => {
        this.brainState.set(result.state);
        if (result.training) {
          this.waitForTraining(0);
          return;
        }
        this.brainTraining.set(false);
        this.reportTraining(result.state);
      },
      error: (err: Error) => {
        this.brainTraining.set(false);
        this.ui.error(err.message);
      },
    });
  }

  /** Run the level tests again, without training anything. */
  protected testLevel(): void {
    if (this.brainTesting()) return;
    this.brainTesting.set(true);
    this.languageApi.languageModelBrain(true).subscribe({
      next: (state) => {
        this.brainState.set(state);
        this.brainTesting.set(false);
        const rungs = state.model_level?.rungs ?? [];
        const passed = rungs.filter((rung) => rung.rate >= 0.6).length;
        this.ui.success(
          `Level test done: ${passed} of ${rungs.length} rungs passed. The result is kept.`,
        );
      },
      error: (err: Error) => {
        this.brainTesting.set(false);
        this.ui.error(err.message);
      },
    });
  }

  /**
   * The measurements can run ahead of the displayed level. The promotion
   * waits for the trainer's word, and this call closes the gap.
   */
  protected approveLevel(): void {
    if (this.brainApproving()) return;
    this.brainApproving.set(true);
    this.languageApi.approveLanguageModelLevel().subscribe({
      next: (result: LanguageLevelApproval) => {
        this.brainApproving.set(false);
        this.brainState.set(result.state);
        const level = result.state.model_level;
        const name = level?.model_name ?? 'The model';
        this.ui.success(`${name} is now at ${level?.level ?? result.approved_level}. Approved.`);
      },
      error: (err: Error) => {
        this.brainApproving.set(false);
        this.ui.info(err.message);
      },
    });
  }

  /** Show what the brain trained from in the shared sidebar. */
  protected showSources(): void {
    this.openSources();
  }

  private openSources(): void {
    this.sidebar.show({
      owner: SIDEBAR_OWNER,
      title: 'Training sources',
      subtitle: 'What the brain learns from, and how the training works.',
      template: this.trainingDetails(),
      showTasks: false,
    });
  }

  private storeRows(): CorpusRow[] {
    const coverage = this.level()?.coverage;
    const corrections = this.brainState()?.corrections;
    if (coverage === undefined) {
      return [
        { label: 'Lessons', value: this.count(null) },
        { label: 'Passed grades', value: this.count(null) },
        { label: 'Trained answers', value: this.count(null) },
        { label: 'Corrections', value: this.count(corrections) },
        { label: 'Documents', value: this.count(null) },
      ];
    }
    return [
      { label: 'Lessons', value: this.count(coverage.lessons) },
      { label: 'Passed grades', value: `${coverage.passed_grades} · ${coverage.current_stage}` },
      { label: 'Trained answers', value: this.count(coverage.trained_answers) },
      { label: 'Corrections', value: this.count(corrections) },
      { label: 'Documents', value: `${coverage.documents} · ${coverage.chunks} chunks` },
    ];
  }

  private corpusCountRows(): CorpusRow[] {
    const corpus = this.words()?.corpus;
    return [
      { label: 'Sentences', value: this.count(corpus?.sentences) },
      { label: 'Requests', value: this.count(corpus?.instructions) },
    ];
  }

  private count(value: number | null | undefined): string {
    return value === undefined || value === null ? 'not measured yet' : String(value);
  }

  /** Say what the training changed, so the button is not a mystery. */
  private reportTraining(state: LanguageBrainDocument): void {
    const summary = trainingSummary(state.engine?.words);
    if (summary === null) {
      this.ui.info('The training finished, but no word model was trained.');
      return;
    }
    this.ui.success(summary);
  }

  /** Wait for the training in the background and show the result. */
  private waitForTraining(elapsed = 0): void {
    if (elapsed >= WATCH_LIMIT) {
      this.brainTraining.set(false);
      this.loadBrainState();
      return;
    }
    this.timer = setTimeout(() => {
      this.timer = null;
      this.languageApi.languageModelBrain().subscribe({
        next: (state) => {
          this.brainState.set(state);
          if (state.training) {
            this.waitForTraining(elapsed + WATCH_INTERVAL);
            return;
          }
          this.brainTraining.set(false);
          this.reportTraining(state);
        },
        error: () => this.brainTraining.set(false),
      });
    }, WATCH_INTERVAL);
  }

  private stopWaiting(): void {
    if (this.timer === null) return;
    clearTimeout(this.timer);
    this.timer = null;
  }
}
