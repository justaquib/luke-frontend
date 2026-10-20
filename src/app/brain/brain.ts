import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ApiService, FaqItem, KnowledgeGraph, LanguageBrainState, LanguageModelState, ModelLevel, ModelLevelRung, PendingItem, StatsResponse } from '../core/api.service';
import { AppPrefsService } from '../core/app-prefs.service';
import { AuthService } from '../core/auth.service';

interface BrainStage {
  name: string;
  minimum: number;
  description: string;
}

interface MergedIntentGroup {
  canonical: FaqItem;
  variants: FaqItem[];
}

interface BrainNode {
  id: number;
  x: number;
  y: number;
  delay: number;
}

function float(value: number | string): number {
  const parsed = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

@Component({
  selector: 'app-brain',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './brain.html',
  styleUrl: './brain.css',
})
export class Brain implements OnInit {
  private readonly api = inject(ApiService);
  private readonly prefs = inject(AppPrefsService);
  private readonly auth = inject(AuthService);

  protected readonly botName = this.prefs.botName;
  protected readonly isSystemAdmin = computed(() => this.auth.user()?.is_systemadmin ?? false);
  protected readonly sidebarOpen = signal(true);
  protected readonly stats = signal<StatsResponse | null>(null);
  protected readonly trainedQuestions = signal<FaqItem[]>([]);
  protected readonly pendingQuestions = signal<PendingItem[]>([]);
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
    (this.modelLevel()?.levels ?? []).filter((entry) => entry.level <= 1),
  );
  protected readonly ladderLabels = computed(() =>
    this.ladderRungs().filter((entry) => Math.round(entry.level * 10) % 2 === 0),
  );
  protected rungName(rung: string): string {
    const entry = this.modelLevel()?.levels?.find((item) => item.level.toFixed(1) === rung);
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

  protected readonly volumeProgress = computed(() => {
    const volume = this.modelLevel()?.training_volume?.level ?? 0;
    return Math.min(100, (volume / 1) * 100);
  });
  protected readonly brainTraining = signal(false);
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
  protected readonly knowledgeNodes: BrainNode[] = [
    { id: 1, x: 26, y: 15, delay: 0 },
    { id: 2, x: 38, y: 13, delay: 180 },
    { id: 3, x: 47, y: 20, delay: 420 },
    { id: 4, x: 19, y: 27, delay: 260 },
    { id: 5, x: 30, y: 31, delay: 640 },
    { id: 6, x: 42, y: 33, delay: 120 },
    { id: 7, x: 14, y: 41, delay: 520 },
    { id: 8, x: 24, y: 44, delay: 340 },
    { id: 9, x: 35, y: 45, delay: 80 },
    { id: 10, x: 44, y: 42, delay: 720 },
    { id: 11, x: 13, y: 53, delay: 200 },
    { id: 12, x: 23, y: 58, delay: 460 },
    { id: 13, x: 33, y: 56, delay: 60 },
    { id: 14, x: 42, y: 54, delay: 620 },
    { id: 15, x: 17, y: 67, delay: 380 },
    { id: 16, x: 27, y: 71, delay: 140 },
    { id: 17, x: 38, y: 68, delay: 560 },
    { id: 18, x: 22, y: 80, delay: 240 },
    { id: 19, x: 32, y: 82, delay: 680 },
    { id: 20, x: 41, y: 78, delay: 320 },
    { id: 21, x: 74, y: 15, delay: 120 },
    { id: 22, x: 62, y: 13, delay: 300 },
    { id: 23, x: 53, y: 20, delay: 500 },
    { id: 24, x: 81, y: 27, delay: 200 },
    { id: 25, x: 70, y: 31, delay: 580 },
    { id: 26, x: 58, y: 33, delay: 100 },
    { id: 27, x: 86, y: 41, delay: 460 },
    { id: 28, x: 76, y: 44, delay: 280 },
    { id: 29, x: 65, y: 45, delay: 60 },
    { id: 30, x: 56, y: 42, delay: 660 },
    { id: 31, x: 87, y: 53, delay: 160 },
    { id: 32, x: 77, y: 58, delay: 420 },
    { id: 33, x: 67, y: 56, delay: 40 },
    { id: 34, x: 58, y: 54, delay: 600 },
    { id: 35, x: 83, y: 67, delay: 340 },
    { id: 36, x: 73, y: 71, delay: 120 },
    { id: 37, x: 62, y: 68, delay: 520 },
    { id: 38, x: 78, y: 80, delay: 220 },
    { id: 39, x: 68, y: 82, delay: 640 },
    { id: 40, x: 59, y: 78, delay: 300 },
  ];

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
    this.trainedQuestions().filter((faq) => faq.status === 'approved').slice(0, 5),
  );
  protected readonly approvedQuestionCount = computed(
    () => this.trainedQuestions().filter((faq) => faq.status === 'approved').length,
  );
  protected readonly pendingPreview = computed(() => this.pendingQuestions().slice(0, 5));
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

  /** The words it knows, loaded a hundred at a time as the list is scrolled. */
  protected readonly vocabWords = signal<string[]>([]);
  protected readonly vocabTotal = signal(0);
  protected readonly vocabLoading = signal(false);
  protected readonly vocabFinished = signal(false);
  protected readonly vocabOpen = signal(false);

  ngOnInit(): void {
    this.refresh();
    this.loadLearnerState();
    this.loadKnowledgeGraph();
    this.loadBrainState();
  }

  /** Show the words the answering model can write with, in the side panel. */
  protected toggleVocabulary(): void {
    this.vocabOpen.update((open) => !open);
    if (this.vocabOpen() && this.vocabWords().length === 0) {
      this.loadVocabularyPage();
    }
  }

  /** Bring the next hundred words. */
  protected loadVocabularyPage(): void {
    if (this.vocabLoading() || this.vocabFinished()) return;
    this.vocabLoading.set(true);
    const offset = this.vocabWords().length;
    this.api.languageModelWords(offset, 100).subscribe({
      next: (page) => {
        const seen = new Set(this.vocabWords());
        const fresh = page.words.filter((word) => !seen.has(word));
        this.vocabWords.update((words) => [...words, ...fresh]);
        this.vocabTotal.set(page.total);
        this.vocabFinished.set(!page.has_more);
        this.vocabLoading.set(false);
      },
      error: () => this.vocabLoading.set(false),
    });
  }

  /** When the list is scrolled to its end, the next hundred words arrive. */
  protected onVocabularyScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const nearEnd = element.scrollHeight - element.scrollTop - element.clientHeight < 160;
    if (nearEnd) this.loadVocabularyPage();
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
    this.api.languageModelBrain().subscribe({
      next: (state) => this.brainState.set(state),
      error: () => this.brainState.set(null),
    });
  }

  protected trainBrain(): void {
    if (this.brainTraining()) return;
    this.brainTraining.set(true);
    this.brainSentence.set(null);
    this.api.trainLanguageModelBrain().subscribe({
      next: (result) => {
        this.brainState.set(result.state);
        this.brainSentence.set(result.sentence ?? null);
        // The training goes on in the background, so the page waits for it and
        // shows what it has learned when it is done.
        if (result.training) {
          this.waitForTraining();
          return;
        }
        this.brainTraining.set(false);
      },
      error: () => this.brainTraining.set(false),
    });
  }

  /** Wait for the training in the background and show the result. */
  private waitForTraining(attempt = 0): void {
    if (attempt > 120) {
      this.brainTraining.set(false);
      this.loadBrainState();
      return;
    }
    setTimeout(() => {
      this.api.languageModelBrain().subscribe({
        next: (state) => {
          this.brainState.set(state);
          if (state.training) {
            this.waitForTraining(attempt + 1);
            return;
          }
          this.brainTraining.set(false);
        },
        error: () => this.brainTraining.set(false),
      });
    }, 3000);
  }

  protected loadLearnerState(): void {
    this.api.languageModelState().subscribe({
      next: (state) => this.learnerState.set(state),
      error: () => this.learnerState.set(null),
    });
  }

  protected loadKnowledgeGraph(): void {
    this.graphLoading.set(true);
    this.api.languageModelGraph(this.graphSubject(), 90).subscribe({
      next: (graph) => {
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
    const subjects = graph.nodes.filter((node) => node.type === 'subject');
    const lessons = graph.nodes.filter((node) => node.type !== 'subject');
    const subject = subjects.find((node) => node.id === id);
    if (subject) {
      const index = subjects.indexOf(subject);
      const step = 470 / Math.max(subjects.length - 1, 1);
      return { x: 130, y: 30 + index * step };
    }
    const index = lessons.findIndex((node) => node.id === id);
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
    this.api.listInbox().subscribe({
      next: (questions) => this.pendingQuestions.set(questions.filter((item) => !item.resolved)),
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
        const canonical = items.find((item) => item.status === 'approved') ?? items[0];
        return { canonical, variants: items.filter((item) => item.id !== canonical.id) };
      })
      .sort((a, b) => b.variants.length - a.variants.length);
  }
}
