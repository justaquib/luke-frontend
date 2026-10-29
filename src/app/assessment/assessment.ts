import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  type OnDestroy,
  type OnInit,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { type Subscription } from 'rxjs';
import { AssessmentApiService } from '../core/api/assessment-api.service';
import type {
  AssessmentProfile,
  AssessmentProfiles,
  AssessmentResult,
  AssessmentRun,
} from '../core/api/assessment.types';
import {
  ASSESSMENT_MODES,
  assessmentModeLabel,
  assessmentModeNote,
  type AssessmentMode,
} from '../shared/assessment-labels';
import { AppEngineFacts, type EngineFact } from '../shared/app-engine-facts';
import { AppIcon } from '../shared/app-icon';
import { AppShell } from '../shared/app-shell';
import { PageInfoActions } from '../shared/page-info-actions';
import { PageInfoFacts } from '../shared/page-info-facts';
import { TopBarActions } from '../shared/top-bar-actions';
import { UiService } from '../shared/ui.service';
import { AssessmentCard } from './assessment-card';
import { AssessmentReview } from './assessment-review';

const ACTIVE = new Set(['queued', 'running']);
const STATUS_LABELS: Readonly<Record<string, string>> = {
  queued: 'Queued',
  running: 'Running',
  done: 'Done',
  failed: 'Failed',
  cancelled: 'Stopped',
};

/**
 * The eight skill cards, measured by a held-out run in one mode at a time.
 * A score is shown only from its own mode, and a rubric stays waiting until a
 * trainer scores it, so no card ever turns missing evidence into a zero.
 */
@Component({
  selector: 'app-assessment',
  standalone: true,
  imports: [
    AppShell,
    AppIcon,
    AppEngineFacts,
    PageInfoActions,
    PageInfoFacts,
    TopBarActions,
    AssessmentCard,
    AssessmentReview,
  ],
  templateUrl: './assessment.html',
  styleUrls: ['./assessment.css', './assessment-run.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Assessment implements OnInit, OnDestroy {
  private readonly api = inject(AssessmentApiService);
  private readonly ui = inject(UiService);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly modes = ASSESSMENT_MODES;
  protected readonly mode = signal<AssessmentMode>('unaided');
  protected readonly sheet = signal<AssessmentProfiles | null>(null);
  protected readonly liveRun = signal<AssessmentRun | null>(null);
  protected readonly runs = signal<readonly AssessmentRun[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly starting = signal(false);
  protected readonly reviewOpen = signal(false);
  protected readonly reviewSkill = signal<AssessmentProfile | null>(null);
  protected readonly reviewResults = signal<readonly AssessmentResult[]>([]);

  protected readonly modeLabel = computed(() => assessmentModeLabel(this.mode()));
  protected readonly modeNote = computed(() => assessmentModeNote(this.mode()));
  protected readonly cards = computed(() => this.sheet()?.profiles ?? []);
  protected readonly run = computed(() => this.liveRun() ?? this.sheet()?.run ?? null);
  protected readonly running = computed(() => ACTIVE.has(this.run()?.status ?? ''));
  protected readonly statusLabel = computed(
    () => STATUS_LABELS[this.run()?.status ?? ''] ?? 'No run yet',
  );
  protected readonly progress = computed(() => Math.round((this.run()?.progress ?? 0) * 100));
  protected readonly waitingTotal = computed(() =>
    this.cards().reduce((total, card) => total + card.waiting, 0),
  );

  /** The panel stamp: which checkpoint measured this, or why that is not known. */
  protected readonly runStamp = computed(() => {
    const run = this.run();
    if (run) return run.model_id;
    if (this.error()) return 'not read';
    return this.sheet() ? 'no run yet' : 'reading…';
  });

  protected readonly facts = computed<readonly EngineFact[]>(() => {
    const run = this.run();
    const loaded = this.sheet() !== null;
    // A read that failed is not a workspace with nothing recorded in it.
    const unknown = this.error() ? 'not read' : 'reading…';
    return [
      {
        label: 'Held-out items',
        value: run ? String(run.bank.eval_items) : loaded ? 'no run yet' : unknown,
        note: run ? `bank v${run.bank.version}` : 'kept out of training',
      },
      {
        label: 'Scored',
        value: run ? `${run.done} / ${run.total}` : loaded ? 'no run yet' : unknown,
        note: this.modeLabel(),
      },
      {
        label: 'Awaiting review',
        value: loaded ? String(this.waitingTotal()) : unknown,
        note: 'rubric answers',
        tone: this.waitingTotal() ? 'warn' : undefined,
      },
      {
        label: 'Runs',
        value: String(this.runs().length),
        note: 'both modes, newest first',
      },
    ];
  });

  private watch?: Subscription;

  ngOnInit(): void {
    // The server has no session, so the cards are read in the browser.
    if (!isPlatformBrowser(this.platformId)) return;
    this.load();
    this.loadRuns();
  }

  ngOnDestroy(): void {
    this.watch?.unsubscribe();
  }

  protected labelFor(mode: string): string {
    return assessmentModeLabel(mode);
  }

  protected selectMode(mode: AssessmentMode): void {
    if (mode === this.mode()) return;
    this.mode.set(mode);
    this.liveRun.set(null);
    this.watch?.unsubscribe();
    this.load();
  }

  protected load(): void {
    this.error.set(null);
    const mode = this.mode();
    this.api.profiles(mode).subscribe({
      next: (sheet) => {
        if (mode !== this.mode()) return;
        this.sheet.set(sheet);
        if (sheet.run && ACTIVE.has(sheet.run.status)) this.follow(sheet.run.id);
      },
      error: (error: Error) => {
        this.sheet.set(null);
        this.error.set(error.message);
      },
    });
  }

  protected loadRuns(): void {
    this.api.runs().subscribe({
      next: (runs) => this.runs.set(runs),
      error: (error: Error) => this.ui.error(error.message),
    });
  }

  protected refresh(): void {
    this.load();
    this.loadRuns();
  }

  protected startRun(): void {
    if (this.starting() || this.running()) return;
    this.starting.set(true);
    this.error.set(null);
    this.api.start(this.mode()).subscribe({
      next: (started) => {
        this.starting.set(false);
        this.liveRun.set(started.run);
        this.ui.info(`The ${this.modeLabel().toLowerCase()} run started.`);
        this.follow(started.run_id);
        this.loadRuns();
      },
      error: (error: Error) => {
        this.starting.set(false);
        this.ui.error(error.message);
      },
    });
  }

  protected cancelRun(): void {
    const run = this.run();
    if (!run || !this.running()) return;
    this.api.cancel(run.id).subscribe({
      next: (stopped) => {
        this.liveRun.set(stopped);
        this.ui.info('The run was stopped.');
      },
      error: (error: Error) => this.ui.error(error.message),
    });
  }

  protected openReview(profile: AssessmentProfile): void {
    const run = this.run();
    if (!run) return;
    this.api.results(run.id).subscribe({
      next: (rows) => {
        const waiting = rows.filter(
          (row) => row.skill === profile.skill && row.kind === 'rubric' && row.score === null,
        );
        if (!waiting.length) {
          this.ui.info('Nothing is waiting for review in this skill.');
          return;
        }
        this.reviewSkill.set(profile);
        this.reviewResults.set(waiting);
        this.reviewOpen.set(true);
      },
      error: (error: Error) => this.ui.error(error.message),
    });
  }

  protected closeReview(): void {
    this.reviewOpen.set(false);
    this.reviewSkill.set(null);
    this.reviewResults.set([]);
  }

  protected reviewed(): void {
    this.load();
  }

  private follow(runId: number): void {
    this.watch?.unsubscribe();
    this.watch = this.api.watch(runId).subscribe({
      next: (run) => this.liveRun.set(run),
      error: (error: Error) => {
        this.liveRun.set(null);
        this.error.set(error.message);
        this.load();
      },
      complete: () => {
        this.liveRun.set(null);
        this.load();
        this.loadRuns();
      },
    });
  }
}
