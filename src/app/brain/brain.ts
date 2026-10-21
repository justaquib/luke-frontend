import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, computed, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService, FaqItem, KnowledgeGraph, LanguageBrainState, LanguageModelState, ModelLevel, ModelLevelRung, StatsResponse } from '../core/api.service';
import { LanguageModelApiService } from '../core/api/language-model-api.service';
import { AppPageHeader } from '../shared/app-page-header';
import { UiService } from '../shared/ui.service';
import { AppShell } from '../shared/app-shell';
import { BrainTrainingPanel } from './brain-training-panel';
import { BrainVocabularyPanel } from './brain-vocabulary-panel';
import { KNOWLEDGE_NODES } from './brain.nodes';

interface BrainStage {
  name: string;
  minimum: number;
  description: string;
}

interface MergedIntentGroup {
  canonical: FaqItem;
  variants: FaqItem[];
}

function float(value: number | string): number {
  const parsed = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

@Component({
  selector: 'app-brain',
  imports: [CommonModule, RouterLink, AppShell, AppPageHeader, BrainTrainingPanel, BrainVocabularyPanel],
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
  protected readonly modelLevel = computed<ModelLevel | null>(() => this.brainState()?.model_level ?? null);
  protected readonly ladderRungs = computed(() =>
    (this.modelLevel()?.levels ?? []).filter((entry: any) => entry.level <= 1),
  );
  protected readonly ladderLabels = computed(() =>
    this.ladderRungs().filter((entry: any) => Math.round(entry.level * 10) % 2 === 0),
  );
  protected rungName(rung: string): string {
    const entry = this.modelLevel()?.levels?.find((item: any) => item.level.toFixed(1) === rung);
    return entry?.name ?? 'Seed';
  }

  /** A rung above the current level passes on its own, but Luke has to climb to it in order. */
  protected rungState(rung: ModelLevelRung): 'passed' | 'ahead' | 'open' {
    const level = this.modelLevel()?.level ?? 0;
    if (float(rung.rung) <= level) return 'passed';
    if (rung.rate >= 0.6) return 'ahead';
    return 'open';
  }

  protected rungHint(rung: ModelLevelRung): string {
    const state = this.rungState(rung);
    if (state === 'ahead') {
      const level = this.modelLevel()?.level ?? 0;
      return `It clears this test on its own, but Luke is still at ${level.toFixed(1)}. The rung below has to be passed first.`;
    }
    return rung.test ?? '';
  }

  protected readonly generalityProbes = computed(() => this.modelLevel()?.generality_probes ?? []);
  protected readonly instructionProbes = computed(() => this.modelLevel()?.instruction_probes ?? []);
  protected readonly instructionScore = computed(() => this.modelLevel()?.instruction_following ?? 0);
  protected readonly instructionTotal = computed(() => this.modelLevel()?.instruction_total ?? 0);

  protected readonly volumeProgress = computed(() => {
    const volume = this.modelLevel()?.training_volume?.level ?? 0;
    return Math.min(100, (volume / 1) * 100);
  });
  protected readonly brainTraining = signal(false);
  protected readonly brainTesting = signal(false);
  protected readonly brainSentence = signal<string | null>(null);
  protected readonly selectedNode = signal<{ label: string; detail: string } | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly stages: BrainStage[] = [
    { name: 'Newborn', minimum: 0, description: 'No indexed knowledge yet' },
    { name: 'Learning', minimum: 1, description: 'The first knowledge is taking shape' },
    { name: 'Capable', minimum: 25, description: 'A growing base of learned material' },
    { name: 'Skilled', minimum: 100, description: 'A substantial indexed knowledge base' },
    { name: 'Experienced', minimum: 500, description: 'A broad library of learned material' },
  ];
  protected readonly knowledgeNodes = KNOWLEDGE_NODES;

  protected readonly knowledgeItems = computed(() => {
    const current = this.stats();
    return current ? current.chunks + current.faqs : 0;
  });

  protected readonly stageIndex = computed(() => {
    const count = this.knowledgeItems();
    let index = 0;
    for (let i = 1; i < this.stages.length; i++) {
      if (count < this.stages[i].minimum) break;
      index = i;
    }
    return index;
  });

  protected readonly currentStage = computed(() => this.stages[this.stageIndex()]);
  protected readonly stageProgress = computed(() => (this.stageIndex() / (this.stages.length - 1)) * 100);

  protected readonly approvedQuestions = computed(() =>
    this.trainedQuestions().filter((faq: any) => faq.status === 'approved').slice(0, 5),
  );
  protected readonly approvedQuestionCount = computed(
    () => this.trainedQuestions().filter((faq: any) => faq.status === 'approved').length,
  );
  protected readonly mergedPreview = computed(() => this.mergedIntents().slice(0, 5));

  protected readonly activeNodeCount = computed(() => {
    const knowledge = this.knowledgeItems();
    const lessons = this.learnerState()?.trainer_lessons ?? 0;
    const signal = knowledge + lessons * 4;
    if (signal <= 0) return 0;
    return Math.min(this.knowledgeNodes.length, Math.round(Math.log2(signal + 1) * 3.1));
  });

  protected readonly brainActivity = computed(() =>
    this.activeNodeCount() / this.knowledgeNodes.length,
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
      next: (state: any) => this.brainState.set(state),
      error: () => this.brainState.set(null),
    });
  }

  protected trainBrain(): void {
    if (this.brainTraining()) return;
    this.brainTraining.set(true);
    this.brainSentence.set(null);
    const before = this.brainState()?.vocabulary ?? 0;
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
        this.ui.success(`Level test done: ${result.passed} of ${result.total} rungs passed.`);
      },
      error: (err: Error) => {
        this.brainTesting.set(false);
        this.ui.error(err.message);
      },
    });
  }

  /** Say what the training changed, so the button is not a mystery. */
  private reportTraining(state: any, before = 0): void {
    const writer = state?.transformer;
    if (!writer?.trained) {
      this.ui.info('The brain trained, but it has no writer yet.');
      return;
    }
    const vocabulary = writer.vocabulary ?? 0;
    const change = vocabulary - before;
    const moved = change === 0 ? 'the same words' : `${change > 0 ? '+' : ''}${change} words`;
    this.ui.success(
      `The brain is trained: ${vocabulary} words (${moved}), ${writer.steps ?? 0} steps, loss ${Number(writer.loss ?? 0).toFixed(3)}.`,
    );
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

  protected selectGraphNode(node: { label: string; type: string; count?: number; grade?: string }): void {
    this.selectedNode.set({
      label: node.label,
      detail: node.type === 'subject'
        ? `${node.count ?? 0} lesson${node.count === 1 ? '' : 's'} in this subject`
        : `Taught in ${node.grade ?? 'nursery'}`,
    });
  }

  /** Subjects on the left, the lessons they hold on the right in four columns. */
  protected graphPoint(id: string, graph: KnowledgeGraph): { x: number; y: number } {
    const subjects = graph.nodes.filter((node: any) => node.type === 'subject');
    const lessons = graph.nodes.filter((node: any) => node.type !== 'subject');
    const subject = subjects.find((node: any) => node.id === id);
    if (subject) {
      const index = subjects.indexOf(subject);
      const step = 470 / Math.max(subjects.length - 1, 1);
      return { x: 130, y: 30 + index * step };
    }
    const index = lessons.findIndex((node: any) => node.id === id);
    if (index < 0) return { x: 0, y: 0 };
    const perColumn = Math.ceil(lessons.length / 4);
    const column = Math.floor(index / perColumn);
    const row = index % perColumn;
    const step = 470 / Math.max(perColumn - 1, 1);
    return { x: 400 + column * 145, y: 30 + row * step };
  }

  protected refresh(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.listFaqs().subscribe({
      next: (faqs) => {
        this.trainedQuestions.set(faqs);
        this.mergedIntents.set(this.groupMergedIntents(faqs));
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

  private groupMergedIntents(faqs: FaqItem[]): MergedIntentGroup[] {
    const byAnswer = new Map<string, FaqItem[]>();
    for (const faq of faqs) {
      if (faq.status === 'declined' || faq.status === 'duplicate') continue;
      const key = faq.answer.trim().toLocaleLowerCase();
      if (!key) continue;
      const items = byAnswer.get(key) ?? [];
      items.push(faq);
      byAnswer.set(key, items);
    }

    return [...byAnswer.values()]
      .filter((items) => items.length > 1)
      .map((items) => {
        items.sort((a, b) => a.id - b.id);
        const canonical = items.find((item: any) => item.status === 'approved') ?? items[0];
        return { canonical, variants: items.filter((item: any) => item.id !== canonical.id) };
      })
      .sort((a, b) => b.variants.length - a.variants.length);
  }
}
