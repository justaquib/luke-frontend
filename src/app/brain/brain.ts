import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ApiService,
  FaqItem,
  KnowledgeGraph,
  LanguageBrainState,
  LanguageModelState,
  ModelLevel,
  ModelLevelRung,
  StatsResponse,
} from '../core/api.service';
import { LanguageModelApiService } from '../core/api/language-model-api.service';
import { AppPageHeader } from '../shared/app-page-header';
import { UiService } from '../shared/ui.service';
import { AppShell } from '../shared/app-shell';
import { BrainTrainingPanel } from './brain-training-panel';
import { BrainVocabularyPanel } from './brain-vocabulary-panel';
import { LevelApproval } from './level-approval';
import { rungHint, rungName, rungState, SEED_LEVEL, type RungState } from './brain.ladder';
import {
  brainNodeCount,
  graphNodeDetail,
  mergedIntentGroups,
  stageIndexOf,
  trainingReportMessage,
  type MergedIntentGroup,
} from './brain-numbers';
import { BRAIN_STAGES, graphPoint, KNOWLEDGE_NODES } from './brain.nodes';

@Component({
  selector: 'app-brain',
  imports: [
    CommonModule,
    RouterLink,
    AppShell,
    AppPageHeader,
    BrainTrainingPanel,
    BrainVocabularyPanel,
    LevelApproval,
  ],
  templateUrl: './brain.html',
  styleUrl: './brain.css',
})
export class Brain implements OnInit {
  private readonly api = inject(ApiService);
  private readonly languageApi = inject(LanguageModelApiService);
  private readonly ui = inject(UiService);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly sidebarOpen = signal(true);
  protected readonly stats = signal<StatsResponse | null>(null);
  protected readonly trainedQuestions = signal<FaqItem[]>([]);
  protected readonly mergedIntents = signal<MergedIntentGroup[]>([]);
  protected readonly learnerState = signal<LanguageModelState | null>(null);
  protected readonly knowledgeGraph = signal<KnowledgeGraph | null>(null);
  protected readonly graphSubject = signal('');
  protected readonly graphLoading = signal(false);
  protected readonly brainState = signal<LanguageBrainState | null>(null);
  protected readonly guideOpen = signal(false);
  protected readonly selectedRung = signal<string | null>(null);
  protected readonly modelLevel = computed<ModelLevel | null>(
    () => this.brainState()?.model_level ?? null,
  );
  protected readonly maturityStages = computed(
    () => this.modelLevel()?.training_volume?.stages ?? [],
  );

  protected readonly maturityItems = computed(() => this.modelLevel()?.training_volume?.items ?? 0);

  protected rungName(rung: string): string {
    return rungName(rung, this.modelLevel()?.levels);
  }

  protected rungState(rung: ModelLevelRung): RungState {
    return rungState(rung, this.modelLevel()?.level ?? SEED_LEVEL);
  }

  protected rungHint(rung: ModelLevelRung): string {
    return rungHint(rung, this.modelLevel()?.level ?? SEED_LEVEL);
  }

  protected readonly levelShare = computed(() => {
    const level = this.modelLevel();
    if (!level) return 0;
    const frontier = level.frontier_level ?? 6.0;
    return Math.max(0, Math.min(100, ((level.level_value ?? 0) / frontier) * 100));
  });

  protected readonly generalityProbes = computed(() => this.modelLevel()?.generality_probes ?? []);
  protected readonly instructionProbes = computed(
    () => this.modelLevel()?.instruction_probes ?? [],
  );
  protected readonly instructionScore = computed(
    () => this.modelLevel()?.instruction_following ?? 0,
  );
  protected readonly instructionTotal = computed(() => this.modelLevel()?.instruction_total ?? 0);

  /** What the trainer reads beside the instruction test: a number or a miss. */
  protected readonly instructionSummary = computed(() => {
    const level = this.modelLevel();
    if (!level?.instruction_measured) return 'not measured yet — take the level test';
    return `${Math.round((level.instruction_following ?? 0) * 100)}% answered`;
  });

  protected readonly brainTraining = signal(false);
  protected readonly brainTesting = signal(false);
  protected readonly brainApproving = signal(false);
  protected readonly brainSentence = signal<string | null>(null);
  protected readonly selectedNode = signal<{ label: string; detail: string } | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly stages = BRAIN_STAGES;

  protected readonly graphPoint = graphPoint;
  protected readonly knowledgeNodes = KNOWLEDGE_NODES;

  protected readonly knowledgeItems = computed(() => {
    const current = this.stats();
    return current ? current.chunks + current.faqs : 0;
  });

  protected readonly stageIndex = computed(() => stageIndexOf(this.knowledgeItems(), this.stages));

  protected readonly currentStage = computed(() => this.stages[this.stageIndex()]);
  protected readonly stageProgress = computed(
    () => (this.stageIndex() / (this.stages.length - 1)) * 100,
  );

  protected readonly approvedQuestions = computed(() =>
    this.trainedQuestions()
      .filter((faq: any) => faq.status === 'approved')
      .slice(0, 5),
  );
  protected readonly approvedQuestionCount = computed(
    () => this.trainedQuestions().filter((faq: any) => faq.status === 'approved').length,
  );
  protected readonly mergedPreview = computed(() => this.mergedIntents().slice(0, 5));

  protected readonly activeNodeCount = computed(() =>
    brainNodeCount(
      this.knowledgeItems(),
      this.learnerState()?.trainer_lessons ?? 0,
      this.knowledgeNodes.length,
    ),
  );

  protected readonly brainActivity = computed(
    () => this.activeNodeCount() / this.knowledgeNodes.length,
  );

  protected readonly learnerStage = computed(() => this.learnerState()?.stage ?? 'Not started');
  protected readonly learnerLessonCount = computed(() => {
    const state = this.learnerState();
    if (!state) return 0;
    return state.foundation_lessons + state.trainer_lessons;
  });
  protected readonly learnerVocabulary = computed(() => this.learnerState()?.vocabulary_size ?? 0);

  /** The side panel that is open: the vocabulary, or the training sources. */
  protected readonly vocabOpen = signal(false);
  protected readonly sourcesOpen = signal(false);

  ngOnInit(): void {
    // The server has no session, so the numbers are read in the browser.
    if (!isPlatformBrowser(this.platformId)) return;
    this.refresh();
    this.loadLearnerState();
    this.loadKnowledgeGraph();
    this.loadBrainState();
  }

  /** Show the words the answering model can write with, in the side panel. */
  protected toggleVocabulary(): void {
    this.vocabOpen.update((open) => !open);
    if (this.vocabOpen()) this.sourcesOpen.set(false);
  }

  /** Show what the brain has trained from, and how the training works. */
  protected toggleSources(): void {
    this.sourcesOpen.update((open) => !open);
    if (this.sourcesOpen()) this.vocabOpen.set(false);
  }

  /** Close the training sources. */
  protected closeSources(): void {
    this.sourcesOpen.set(false);
  }

  /** Close the vocabulary. */
  protected closeVocabulary(): void {
    this.vocabOpen.set(false);
  }

  protected toggleGuide(): void {
    this.guideOpen.update((open) => !open);
    this.selectedRung.set(null);
  }

  protected openRung(rung: string): void {
    this.selectedRung.set(rung);
    this.guideOpen.set(true);
  }

  protected closeRung(): void {
    this.selectedRung.set(null);
  }

  protected closeGuide(): void {
    this.guideOpen.set(false);
  }

  protected trainBrainFromGuide(): void {
    this.closeGuide();
    this.trainBrain();
  }

  protected loadBrainState(): void {
    this.languageApi.languageModelBrain().subscribe({
      next: (state: any) => {
        this.brainState.set(state);
        // A training that is already running is shown with the panel open, so
        // the trainer can see what it is learning while it learns.
        if (state?.training) this.sourcesOpen.set(true);
      },
      error: () => this.brainState.set(null),
    });
  }

  protected trainBrain(): void {
    if (this.brainTraining()) return;
    this.brainTraining.set(true);
    this.brainSentence.set(null);
    const before = this.brainState()?.vocabulary ?? 0;
    // The panel opens with the training, so the trainer can watch what it is
    // learning from and how it is learning it.
    this.sourcesOpen.set(true);
    this.languageApi.trainLanguageModelBrain().subscribe({
      next: (result: any) => {
        this.brainState.set(result.state);
        this.brainSentence.set(result.sentence ?? null);
        // The training goes on in the background, so the page waits for it and
        // shows what it has learned when it is done.
        if (result.training) {
          this.waitForTraining(0, before);
          return;
        }
        this.brainTraining.set(false);
        this.reportTraining(result.state, before);
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
    this.languageApi.testLanguageModelLevel().subscribe({
      next: (result: any) => {
        this.brainState.set(result.state);
        this.brainTesting.set(false);
        const instruction = result.instruction?.score ?? 0;
        this.ui.success(
          `Level test done: ${result.passed} of ${result.total} rungs passed, ${Math.round(
            instruction * 100,
          )}% of the never-worded requests answered. The result is kept.`,
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
      next: (result: any) => {
        this.brainApproving.set(false);
        const level = result.state?.model_level;
        this.brainState.set(result.state);
        this.ui.success(`Luke is now at ${level?.level ?? 'the approved level'}. Approved.`);
      },
      error: (err: Error) => {
        this.brainApproving.set(false);
        this.ui.info(err.message);
      },
    });
  }

  /** Say what the training changed, so the button is not a mystery. */
  private reportTraining(state: any, before = 0): void {
    const writer = state?.transformer;
    const message = trainingReportMessage(writer, before);
    if (writer?.trained) {
      this.ui.success(message);
    } else {
      this.ui.info(message);
    }
  }

  /** Wait for the training in the background and show the result. */
  private waitForTraining(attempt = 0, before = 0): void {
    if (attempt > 120) {
      this.brainTraining.set(false);
      this.loadBrainState();
      return;
    }
    setTimeout(() => {
      this.languageApi.languageModelBrain().subscribe({
        next: (state: any) => {
          this.brainState.set(state);
          if (state.training) {
            this.waitForTraining(attempt + 1, before);
            return;
          }
          this.brainTraining.set(false);
          this.reportTraining(state, before);
        },
        error: () => this.brainTraining.set(false),
      });
    }, 3000);
  }

  protected loadLearnerState(): void {
    this.languageApi.languageModelState().subscribe({
      next: (state: any) => this.learnerState.set(state),
      error: () => this.learnerState.set(null),
    });
  }

  protected loadKnowledgeGraph(): void {
    this.graphLoading.set(true);
    this.languageApi.languageModelGraph(this.graphSubject(), 90).subscribe({
      next: (graph: any) => {
        this.knowledgeGraph.set(graph);
        this.graphLoading.set(false);
      },
      error: () => {
        this.knowledgeGraph.set(null);
        this.graphLoading.set(false);
      },
    });
  }

  protected setGraphSubject(subject: string): void {
    this.graphSubject.set(subject);
    this.loadKnowledgeGraph();
  }

  protected selectGraphNode(node: {
    label: string;
    type: string;
    count?: number;
    grade?: string;
  }): void {
    this.selectedNode.set({
      label: node.label,
      detail: graphNodeDetail(node.type, node.count, node.grade),
    });
  }

  /** Subjects on the left, the lessons they hold on the right in four columns. */

  protected refresh(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.listFaqs().subscribe({
      next: (faqs) => {
        this.trainedQuestions.set(faqs);
        this.mergedIntents.set(mergedIntentGroups(faqs));
      },
      error: (err: Error) => this.error.set(err.message),
    });
    this.api.stats().subscribe({
      next: (stats) => this.stats.set(stats),
      error: (err: Error) => {
        this.error.set(err.message);
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }

  protected toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }
}
