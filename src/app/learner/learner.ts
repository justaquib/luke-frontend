import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  OnInit,
  PLATFORM_ID,
  TemplateRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  ApiService,
  DuplicateGroup,
  DuplicateLessonCard,
  DuplicateLessons,
  LanguageDictionaryEntry,
  LanguageModelState,
  LanguagePreviewResponse,
  LanguageTest,
  LanguageTestFinishResult,
  QueryReasoning,
} from '../core/api.service';
import { LanguageModelApiService, LessonKind } from '../core/api/language-model-api.service';
import { LearnerDetails, type LearnerDetailsModel } from './learner-details';
import { LessonEntryMode, LessonForm } from './lesson-form';
import { AppCardInfo } from '../shared/app-card-info';
import { AppIcon } from '../shared/app-icon';
import { AppShell } from '../shared/app-shell';
import { RightSidebarService } from '../shared/right-sidebar.service';
import { UiService } from '../shared/ui.service';

function canonicalLessonSubject(value: string): string {
  const normalized = value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
  const aliases: Record<string, string> = {
    body: 'Body',
    'body part': 'Body',
    'body parts': 'Body',
    animal: 'Animals',
    animals: 'Animals',
    'animal name': 'Animals',
    'animal names': 'Animals',
    fruit: 'Fruits',
    fruits: 'Fruits',
    'fruit name': 'Fruits',
    'fruit names': 'Fruits',
    vegetable: 'Vegetables',
    vegetables: 'Vegetables',
    'vegetable name': 'Vegetables',
    'vegetable names': 'Vegetables',
    language: 'Language',
    alphabet: 'Language',
    letter: 'Language',
    letters: 'Language',
    word: 'Language',
    words: 'Language',
    'letter and word': 'Language',
    'letter and words': 'Language',
    'letters and word': 'Language',
    'letters and words': 'Language',
    'letter & word': 'Language',
    'letters & words': 'Language',
  };
  return aliases[normalized] ?? value.trim().replace(/\s+/g, ' ');
}

/** The topics of a lesson, one by one. A lesson can sit under several. */
function lessonTopics(lesson: { subject?: string; subjects?: string[] }): string[] {
  const topics = (lesson.subjects ?? []).filter((topic) => topic.trim().length > 0);
  const source = topics.length ? topics : [lesson.subject ?? 'General'];
  const cleaned: string[] = [];
  for (const topic of source) {
    for (const part of topic.split(',')) {
      const name = canonicalLessonSubject(part);
      if (name && !cleaned.includes(name)) cleaned.push(name);
    }
  }
  return cleaned.length ? cleaned : ['General'];
}

interface LearnerLessonGroup {
  subject: string;
  lessons: LanguageModelState['lesson_cards'];
}

/** The lessons of one grade, filed under every topic they belong to. */
function lessonsBySubjectFor(
  state: LanguageModelState | null,
  stageId: string,
): LearnerLessonGroup[] {
  if (!state) return [];
  const groups = new Map<string, LanguageModelState['lesson_cards']>();
  for (const lesson of state.lesson_cards) {
    if ((lesson.grade_id ?? 'nursery') !== stageId) continue;
    for (const topic of lessonTopics(lesson)) {
      groups.set(topic, [...(groups.get(topic) ?? []), lesson]);
    }
  }
  return [...groups.entries()].map(([subject, lessons]) => ({ subject, lessons }));
}

interface LearnerSearchResult {
  key: string;
  kind: 'lesson' | 'starter' | 'trainer';
  badge: string;
  lessonId?: string;
  faqId?: number;
  question: string;
  answer: string;
  subject: string;
  grade: string;
  confidence: number;
  editable: boolean;
  showInGrade: boolean;
}

@Component({
  selector: 'app-learner',
  standalone: true,
  imports: [CommonModule, FormsModule, AppShell, AppIcon, AppCardInfo, LessonForm, LearnerDetails],
  templateUrl: './learner.html',
  styleUrls: [
    './learner.css',
    './learner-navigation.css',
    './learner-forms.css',
    './learner-lessons.css',
    './learner-chat.css',
    './learner-tests.css',
    './learner-search.css',
    './learner-knowledge.css',
    './learner-overlays.css',
    './learner-drawer.css',
    '../shared/controls.css',
  ],
})
export class Learner implements OnInit {
  private readonly api = inject(ApiService);
  private readonly languageApi = inject(LanguageModelApiService);
  private readonly ui = inject(UiService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly sidebar = inject(RightSidebarService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly learnerDetails = viewChild<TemplateRef<unknown>>('learnerDetails');

  protected readonly languageModelState = signal<LanguageModelState | null>(null);
  protected readonly learnerTab = signal<
    'overview' | 'lessons' | 'tests' | 'knowledge' | 'expressions'
  >('overview');
  protected readonly languageLessonDraft = signal('');
  protected readonly selectedLessonSubject = signal('');
  protected readonly editingLearnerLessonId = signal<string | null>(null);
  protected readonly editingLearnerLessonAnswer = signal('');
  protected readonly editingLearnerLessonQuestion = signal('');
  protected readonly editingLearnerLessonSubject = signal('');
  protected readonly savingLearnerLessonId = signal<string | null>(null);
  protected readonly learnerLessonDeletePrompt = signal<{ id: string; question: string } | null>(
    null,
  );
  protected readonly deletingLearnerLessonId = signal<string | null>(null);
  protected readonly editingTrainerAnswerId = signal<number | null>(null);
  protected readonly editingTrainerAnswerDraft = signal('');
  protected readonly savingTrainerAnswerId = signal<number | null>(null);
  protected readonly trainerAnswerDeletePrompt = signal<{ id: number; question: string } | null>(
    null,
  );
  protected readonly deletingTrainerAnswerId = signal<number | null>(null);
  protected readonly lessonEntryMode = signal<LessonEntryMode>('own_words');
  protected readonly lessonSubjectDraft = signal('Language');
  protected readonly lessonQuestionDraft = signal('');
  protected readonly lessonAnswerDraft = signal('');
  protected readonly lessonTitleDraft = signal('');
  protected readonly lessonPassageDraft = signal('');
  protected readonly languageTeachingStage = signal<string>('nursery');
  protected readonly languageTest = signal<LanguageTest | null>(null);
  protected readonly languageTestQuestion = signal('');
  protected readonly languageTestResult = signal<LanguageTestFinishResult['result'] | null>(null);
  protected readonly languageTestBusy = signal(false);
  protected readonly learnerChatDraft = signal('');
  protected readonly learnerChatMessages = signal<
    Array<{
      question: string;
      answer: string;
      source: LanguagePreviewResponse['source'];
      reasoning?: QueryReasoning | null;
    }>
  >([]);
  protected readonly learnerChatBusy = signal(false);
  protected readonly learnerMatchPrompt = signal<{
    question: string;
    candidates: NonNullable<LanguagePreviewResponse['candidates']>;
  } | null>(null);
  protected readonly dictionaryWordDraft = signal('');
  protected readonly dictionaryWordEntry = signal<LanguageDictionaryEntry | null>(null);
  protected readonly dictionaryWordLoading = signal(false);
  protected readonly dictionaryWordSaving = signal(false);
  protected readonly dictionaryDefinitionIndex = signal(0);
  protected readonly languageLessonSaving = signal(false);
  protected readonly duplicateGroups = signal<DuplicateGroup[]>([]);
  protected readonly duplicateCount = signal(0);
  protected readonly totalQuestions = signal(0);
  protected readonly duplicatePanelOpen = signal(false);
  protected readonly busyDuplicateId = signal<string | null>(null);
  protected readonly duplicateEditId = signal<string | null>(null);
  protected readonly duplicateEditQuestion = signal('');
  protected readonly duplicateEditAnswer = signal('');
  protected readonly duplicateEditSubject = signal('');
  protected readonly duplicateCardIds = computed(() => {
    const ids = new Set<string>();
    for (const group of this.duplicateGroups()) {
      for (const card of group.cards.slice(1)) {
        if (card.id) ids.add(card.id);
      }
    }
    return ids;
  });
  protected readonly languageModelLoading = signal(false);
  protected readonly languageModelError = signal<string | null>(null);
  protected readonly languagePrefix = signal('');
  protected readonly languageSentenceWord = signal('');
  protected readonly generatedLanguageSentence = signal<string | null>(null);
  protected readonly sentenceWordsDraft = signal('');
  protected readonly sentenceResult = signal<string | null>(null);
  protected readonly calculationDraft = signal('');
  protected readonly calculationResult = signal<string | null>(null);
  protected readonly practiceBusy = signal(false);
  protected readonly languageGenerationLoading = signal(false);
  protected readonly selectedLanguageStage = computed(
    () =>
      this.languageModelState()?.stages.find(
        (stage: any) => stage.id === this.languageTeachingStage(),
      ) ?? null,
  );
  protected readonly lessonCardInfo = computed(() => {
    const description = this.selectedLanguageStage()?.description ?? '';
    return `${description} Add question and answer lessons, or a story, a lesson or a topic, to teach facts and concepts.`.trim();
  });
  protected readonly languageLessonsBySubject = computed(() =>
    lessonsBySubjectFor(this.languageModelState(), this.languageTeachingStage()),
  );
  protected readonly languageLessonSubjects = computed(() => {
    const suggested = (this.selectedLanguageStage()?.subjects ?? []).map(canonicalLessonSubject);
    const taught = this.languageLessonsBySubject().map((group) => group.subject);
    return [...new Set([...suggested, ...taught])];
  });
  protected readonly languageLessonTotal = computed(() =>
    this.languageLessonsBySubject().reduce((total, group) => total + group.lessons.length, 0),
  );
  protected readonly languageBrowseStage = signal('nursery');
  protected readonly browseLessonSubject = signal('');
  protected readonly knowledgeTab = signal<'search' | 'grades' | 'learned'>('search');
  protected readonly learnerLessonTotal = computed(
    () => (this.languageModelState()?.lesson_cards ?? []).length,
  );
  protected readonly sidebarSubtitle = computed(() => {
    const model = this.languageModelState() as LearnerDetailsModel | null;
    return model ? `${model.model_name} · ${model.stage}` : 'Reading the learner…';
  });
  protected readonly learnerLearnedTotals = computed(() => {
    const state = this.languageModelState();
    return {
      starterLessons: (state?.lesson_cards ?? []).filter((lesson: any) => lesson.kind !== 'trainer')
        .length,
      ownLessons: (state?.lesson_cards ?? []).filter((lesson: any) => lesson.kind === 'trainer')
        .length,
      wordCards: state?.word_cards?.length ?? 0,
      trainerAnswers: state?.trainer_answers?.length ?? 0,
      sentenceExamples: state?.example_total ?? state?.examples?.length ?? 0,
    };
  });
  protected readonly browseLessonsBySubject = computed(() =>
    lessonsBySubjectFor(this.languageModelState(), this.languageBrowseStage()),
  );
  protected readonly browseLessonCount = computed(() =>
    this.browseLessonsBySubject().reduce((total, group) => total + group.lessons.length, 0),
  );
  protected readonly activeBrowseSubject = computed(() => {
    const groups = this.browseLessonsBySubject();
    const selected = this.browseLessonSubject();
    return groups.some((group) => group.subject === selected)
      ? selected
      : (groups[0]?.subject ?? '');
  });
  protected readonly visibleBrowseGroups = computed(() => {
    const selected = this.activeBrowseSubject();
    return this.browseLessonsBySubject().filter((group) => group.subject === selected);
  });
  protected readonly learnerOwnLessons = computed(() =>
    (this.languageModelState()?.lesson_cards ?? []).filter(
      (lesson: any) => lesson.kind === 'trainer',
    ),
  );
  protected readonly learnerStarterLessons = computed(() =>
    (this.languageModelState()?.lesson_cards ?? []).filter(
      (lesson: any) => lesson.kind !== 'trainer',
    ),
  );
  protected readonly learnerStarterLessonCount = computed(
    () => this.learnerStarterLessons().length,
  );
  protected readonly learnerSearch = signal('');
  protected readonly searchEditKey = signal<string | null>(null);
  protected readonly searchEditQuestion = signal('');
  protected readonly searchEditAnswer = signal('');
  protected readonly searchEditConfidence = signal(0.5);
  protected readonly savingSearchKey = signal<string | null>(null);
  protected readonly learnerSearchResults = computed<LearnerSearchResult[]>(() => {
    const query = this.learnerSearch().trim().toLowerCase();
    if (!query) return [];
    const state = this.languageModelState();
    if (!state) return [];
    const terms = query.split(/\s+/).filter(Boolean);
    const matches = (...texts: Array<string | undefined>) => {
      const haystack = texts.filter(Boolean).join(' ').toLowerCase();
      return terms.every((term) => haystack.includes(term));
    };
    const results: LearnerSearchResult[] = [];
    for (const lesson of state.lesson_cards ?? []) {
      if (!matches(lesson.question, lesson.answer)) continue;
      const grade = lesson.grade_id ?? 'nursery';
      const subject = canonicalLessonSubject(lesson.subject ?? 'General');
      const own = lesson.kind === 'trainer' && !!lesson.id;
      results.push({
        key: `lesson:${lesson.id ?? lesson.question}`,
        kind: own ? 'lesson' : 'starter',
        badge: own ? `Your lesson · ${subject}` : `Starter · ${subject}`,
        lessonId: lesson.id,
        question: lesson.question,
        answer: lesson.answer,
        subject,
        grade,
        confidence: lesson.confidence ?? 0.5,
        editable: own,
        showInGrade: true,
      });
    }
    for (const item of state.trainer_answers ?? []) {
      if (!matches(item.question, item.answer)) continue;
      results.push({
        key: `faq:${item.id}`,
        kind: 'trainer',
        badge: 'Trainer-approved answer',
        faqId: item.id,
        question: item.question,
        answer: item.answer,
        subject: '',
        grade: '',
        confidence: item.confidence ?? 0.5,
        editable: true,
        showInGrade: false,
      });
    }
    const weight = (result: LearnerSearchResult) => {
      const question = result.question.toLowerCase();
      if (question.startsWith(query)) return 0;
      if (question.includes(query)) return 1;
      return 2;
    };
    return results.sort((a, b) => weight(a) - weight(b) || a.question.localeCompare(b.question));
  });
  protected readonly learnerSearchMatchCount = computed(() => {
    const results = this.learnerSearchResults();
    const editable = results.filter((result: any) => result.editable).length;
    return { total: results.length, editable };
  });

  refreshLanguageModel(prefix = '') {
    const firstLoad = !this.languageModelState();
    this.languageModelLoading.set(true);
    this.languageModelError.set(null);
    this.languageApi.languageModelState(prefix).subscribe({
      next: (state: any) => {
        this.setLanguageModelState(state);
        if (state.current_stage_id !== 'complete') {
          this.languageTeachingStage.set(state.current_stage_id);
          if (firstLoad) {
            this.languageBrowseStage.set(state.current_stage_id);
            this.lessonSubjectDraft.set(
              state.stages.find((stage: any) => stage.id === state.current_stage_id)?.subjects[0] ??
                'General',
            );
          }
        }
        this.languageTest.set(state.active_test);
        this.languageModelLoading.set(false);
      },
      error: (error: Error) => {
        this.languageModelError.set(error.message);
        this.languageModelLoading.set(false);
      },
    });
  }

  private setLanguageModelState(state: LanguageModelState) {
    this.languageModelState.update((current) => ({
      ...state,
      trainer_answers: state.trainer_answers ?? current?.trainer_answers ?? [],
    }));
  }

  teachLanguageModel() {
    if (this.languageLessonSaving()) return;
    const lesson = this.lessonText();
    if (!lesson.text) return;
    this.languageModelError.set(null);
    const stage = this.languageTeachingStage();
    const subject = canonicalLessonSubject(this.lessonSubjectDraft());
    // A lesson is never held back: if it repeats one the learner already has,
    // it is kept and marked as a duplicate so the trainer can decide later.
    this.saveLanguageLesson(lesson.text, stage, subject, lesson.kind, lesson.title);
  }

  /** What the trainer wrote down, and the kind of lesson it is. */
  private lessonText(): { text: string; kind: LessonKind; title: string } {
    if (this.lessonEntryMode() === 'story') {
      const passage = this.lessonPassageDraft().trim();
      return { text: passage, kind: 'story', title: this.lessonTitleDraft().trim() };
    }
    if (this.lessonEntryMode() === 'formatted') {
      return { text: this.languageLessonDraft().trim(), kind: 'qa', title: '' };
    }
    const question = this.lessonQuestionDraft().trim();
    const answer = this.lessonAnswerDraft().trim();
    if (!question || !answer) return { text: '', kind: 'qa', title: '' };
    return { text: `Q: ${question}\nA: ${answer}`, kind: 'qa', title: '' };
  }

  private saveLanguageLesson(
    lesson: string,
    stage: string,
    subject: string,
    kind: LessonKind,
    title: string,
  ) {
    this.languageLessonSaving.set(true);
    this.languageModelError.set(null);
    this.languageApi.teachLesson(lesson, stage, subject, kind, title).subscribe({
      next: (state: any) => {
        this.setLanguageModelState(state);
        this.selectedLessonSubject.set(subject);
        this.lessonSubjectDraft.set(subject);
        this.languageLessonDraft.set('');
        this.lessonQuestionDraft.set('');
        this.lessonAnswerDraft.set('');
        this.lessonTitleDraft.set('');
        this.lessonPassageDraft.set('');
        this.languageLessonSaving.set(false);
        this.loadDuplicates();
        const added = state.added_lessons ?? 0;
        this.ui.success(
          `Added ${added} lesson${added === 1 ? '' : 's'} to ${this.selectedLanguageStage()?.title ?? stage}.`,
        );
      },
      error: (error: Error) => {
        this.languageModelError.set(error.message);
        this.languageLessonSaving.set(false);
      },
    });
  }

  beginEditLearnerLesson(lesson: LanguageModelState['lesson_cards'][number]) {
    if (lesson.kind !== 'trainer' || !lesson.id) return;
    this.editingLearnerLessonId.set(lesson.id);
    this.editingLearnerLessonAnswer.set(lesson.answer);
    this.editingLearnerLessonQuestion.set(lesson.question ?? '');
    this.editingLearnerLessonSubject.set(lessonTopics(lesson).join(', '));
  }

  cancelEditLearnerLesson() {
    this.editingLearnerLessonId.set(null);
    this.editingLearnerLessonAnswer.set('');
    this.editingLearnerLessonQuestion.set('');
    this.editingLearnerLessonSubject.set('');
  }

  saveLearnerLessonAnswer(id: string) {
    const answer = this.editingLearnerLessonAnswer().trim();
    const question = this.editingLearnerLessonQuestion().trim();
    const subject = this.editingLearnerLessonSubject().trim();
    if (!answer || this.savingLearnerLessonId()) return;
    this.savingLearnerLessonId.set(id);
    this.languageApi
      .updateLanguageLessonAnswer(
        id,
        answer,
        question || undefined,
        undefined,
        subject || undefined,
      )
      .subscribe({
        next: (state: any) => {
          this.setLanguageModelState(state);
          this.cancelEditLearnerLesson();
          this.savingLearnerLessonId.set(null);
          this.ui.success('Learner answer updated.');
        },
        error: (error: Error) => {
          this.languageModelError.set(error.message);
          this.savingLearnerLessonId.set(null);
        },
      });
  }

  confirmRemoveLearnerLesson() {
    const lesson = this.learnerLessonDeletePrompt();
    if (!lesson || this.deletingLearnerLessonId()) return;
    this.deletingLearnerLessonId.set(lesson.id);
    this.languageApi.removeLanguageLesson(lesson.id).subscribe({
      next: (state: any) => {
        this.setLanguageModelState(state);
        this.learnerLessonDeletePrompt.set(null);
        this.deletingLearnerLessonId.set(null);
        if (this.editingLearnerLessonId() === lesson.id) this.cancelEditLearnerLesson();
        this.ui.success('Learner lesson removed.');
      },
      error: (error: Error) => {
        this.languageModelError.set(error.message);
        this.deletingLearnerLessonId.set(null);
      },
    });
  }

  beginEditTrainerAnswer(item: NonNullable<LanguageModelState['trainer_answers']>[number]) {
    this.editingTrainerAnswerId.set(item.id);
    this.editingTrainerAnswerDraft.set(item.answer);
  }

  cancelEditTrainerAnswer() {
    this.editingTrainerAnswerId.set(null);
    this.editingTrainerAnswerDraft.set('');
  }

  saveTrainerAnswer(id: number) {
    const answer = this.editingTrainerAnswerDraft().trim();
    if (!answer || this.savingTrainerAnswerId()) return;
    this.savingTrainerAnswerId.set(id);
    this.api.updateFaq(id, answer).subscribe({
      next: () => {
        this.cancelEditTrainerAnswer();
        this.savingTrainerAnswerId.set(null);
        this.refreshLanguageModel();
        this.ui.success('Trainer-approved answer updated.');
      },
      error: (error: Error) => {
        this.languageModelError.set(error.message);
        this.savingTrainerAnswerId.set(null);
      },
    });
  }

  confirmRemoveTrainerAnswer() {
    const item = this.trainerAnswerDeletePrompt();
    if (!item || this.deletingTrainerAnswerId()) return;
    this.deletingTrainerAnswerId.set(item.id);
    this.api.deleteFaq(item.id).subscribe({
      next: () => {
        this.trainerAnswerDeletePrompt.set(null);
        this.deletingTrainerAnswerId.set(null);
        if (this.editingTrainerAnswerId() === item.id) this.cancelEditTrainerAnswer();
        this.refreshLanguageModel();
        this.ui.success('Trainer answer removed from the approved dataset.');
      },
      error: (error: Error) => {
        this.languageModelError.set(error.message);
        this.deletingTrainerAnswerId.set(null);
      },
    });
  }

  setLearnerSearch(value: string) {
    this.learnerSearch.set(value);
    this.cancelEditSearchResult();
  }

  beginEditSearchResult(result: LearnerSearchResult) {
    this.searchEditKey.set(result.key);
    this.searchEditQuestion.set(result.question);
    this.searchEditAnswer.set(result.answer);
    this.searchEditConfidence.set(result.confidence);
  }

  cancelEditSearchResult() {
    this.searchEditKey.set(null);
    this.searchEditQuestion.set('');
    this.searchEditAnswer.set('');
    this.searchEditConfidence.set(0.5);
  }

  saveSearchResult(result: LearnerSearchResult) {
    const question = this.searchEditQuestion().trim();
    const answer = this.searchEditAnswer().trim();
    if (!question || !answer || this.savingSearchKey()) return;
    this.savingSearchKey.set(result.key);
    const confidence = Math.round(this.searchEditConfidence() * 100) / 100;
    if (result.kind === 'lesson' && result.lessonId) {
      this.languageApi
        .updateLanguageLessonAnswer(result.lessonId, answer, question, confidence)
        .subscribe({
          next: (state: any) => {
            this.setLanguageModelState(state);
            this.cancelEditSearchResult();
            this.savingSearchKey.set(null);
            this.ui.success('Lesson question and answer updated.');
          },
          error: (error: Error) => {
            this.languageModelError.set(error.message);
            this.savingSearchKey.set(null);
          },
        });
      return;
    }
    if (result.kind === 'trainer' && result.faqId !== undefined) {
      this.api.updateFaq(result.faqId, answer).subscribe({
        next: () => {
          this.cancelEditSearchResult();
          this.savingSearchKey.set(null);
          this.refreshLanguageModel();
          this.ui.success('Approved answer updated.');
        },
        error: (error: Error) => {
          this.languageModelError.set(error.message);
          this.savingSearchKey.set(null);
        },
      });
    }
  }

  removeSearchResult(result: LearnerSearchResult) {
    if (result.kind === 'lesson' && result.lessonId) {
      this.learnerLessonDeletePrompt.set({ id: result.lessonId, question: result.question });
      return;
    }
    if (result.kind === 'trainer' && result.faqId !== undefined) {
      this.trainerAnswerDeletePrompt.set({ id: result.faqId, question: result.question });
    }
  }

  focusLessonInGrade(result: LearnerSearchResult) {
    if (!this.languageModelState()) return;
    if (result.grade) this.languageBrowseStage.set(result.grade);
    if (result.subject) this.browseLessonSubject.set(result.subject);
    this.knowledgeTab.set('grades');
    this.learnerTab.set('knowledge');
  }

  askLanguageLearner() {
    const question = this.learnerChatDraft().trim();
    if (!question || this.learnerChatBusy()) return;
    this.queryLanguageLearner(question);
  }

  private queryLanguageLearner(question: string, skipTrainer = false) {
    this.learnerChatBusy.set(true);
    this.languageModelError.set(null);
    this.languageApi.previewLanguageAnswer(question, skipTrainer).subscribe({
      next: (result: any) => {
        if (result.needs_clarification && result.candidates?.length) {
          this.learnerMatchPrompt.set({ question, candidates: result.candidates });
        } else {
          this.learnerChatMessages.update((messages) =>
            [
              ...messages,
              {
                question,
                answer: result.answer,
                source: result.source,
                reasoning: result.reasoning ?? null,
              },
            ].slice(-30),
          );
        }
        this.learnerChatDraft.set('');
        this.learnerChatBusy.set(false);
      },
      error: (error: Error) => {
        this.languageModelError.set(error.message);
        this.learnerChatBusy.set(false);
      },
    });
  }

  chooseLearnerTrainerAnswer(
    candidate: NonNullable<LanguagePreviewResponse['candidates']>[number],
  ) {
    const prompt = this.learnerMatchPrompt();
    if (!prompt) return;
    this.learnerChatMessages.update((messages) =>
      [
        ...messages,
        { question: prompt.question, answer: candidate.answer, source: 'trainer' },
      ].slice(-30),
    );
    this.learnerMatchPrompt.set(null);
  }

  askLearnerWithoutTrainer() {
    const prompt = this.learnerMatchPrompt();
    if (!prompt || this.learnerChatBusy()) return;
    this.learnerMatchPrompt.set(null);
    this.queryLanguageLearner(prompt.question, true);
  }

  reviewSimilarQuestionsInTrainer() {
    this.learnerMatchPrompt.set(null);
    void this.router.navigate(['/dashboard/trainer'], { queryParams: { tab: 'merge' } });
  }

  learnerAnswerSourceLabel(source: LanguagePreviewResponse['source']): string {
    const labels: Record<string, string> = {
      assistant_profile: 'Assistant profile',
      dictionary: 'Offline dictionary',
      faq: 'Trainer-approved answer',
      learner: 'Learner curriculum',
      lesson_cards: 'Lesson knowledge',
      letters: 'Letter learning',
      not_learned: 'Not learned yet',
      number_cards: 'Number cards',
      sentence_examples: 'Learned sentence examples',
      sentence_patterns: 'Learned sentence patterns',
      taught: 'Taught lesson',
      trainer: 'Trainer-approved answer',
      word_cards: 'Learned word',
      written: 'Written from a lesson',
    };
    return labels[source] ?? 'Learner knowledge';
  }

  languageStageTitle(stageId: string): string {
    return (
      this.languageModelState()?.stages.find((stage: any) => stage.id === stageId)?.title ?? stageId
    );
  }

  isLanguageStageLocked(stageId: string, state: LanguageModelState): boolean {
    if (state.current_stage_id === 'complete') return false;
    const current = state.stages.findIndex((stage: any) => stage.id === state.current_stage_id);
    const selected = state.stages.findIndex((stage: any) => stage.id === stageId);
    return selected > current;
  }

  selectLanguageStage(stageId: string) {
    const state = this.languageModelState();
    if (state && !this.isLanguageStageLocked(stageId, state)) {
      this.languageTeachingStage.set(stageId);
      this.languageLessonDraft.set('');
      this.lessonQuestionDraft.set('');
      this.lessonAnswerDraft.set('');
      this.selectedLessonSubject.set('');
      this.lessonSubjectDraft.set(
        state.stages.find((stage: any) => stage.id === stageId)?.subjects[0] ?? 'General',
      );
    }
  }

  setLessonSubjectFilter(subject: string) {
    this.selectedLessonSubject.set(subject);
  }

  setBrowseGrade(stageId: string): void {
    this.languageBrowseStage.set(stageId);
    this.browseLessonSubject.set('');
  }

  setBrowseSubject(subject: string): void {
    this.browseLessonSubject.set(subject);
  }

  /** Open what it knows and re-read the saved material so it is never stale. */
  openKnowledge(): void {
    this.learnerTab.set('knowledge');
    this.refreshLearnerMaterial();
  }

  setKnowledgeTab(tab: 'search' | 'grades' | 'learned'): void {
    this.knowledgeTab.set(tab);
    this.refreshLearnerMaterial();
  }

  private refreshLearnerMaterial(): void {
    this.refreshLanguageModel();
    this.loadDuplicates();
  }

  startLanguageTest(kind: 'trainer' | 'mock' | 'exam' = 'trainer') {
    if (this.languageTestBusy()) return;
    this.languageTestBusy.set(true);
    this.languageModelError.set(null);
    this.languageTestResult.set(null);
    this.languageTestQuestion.set('');
    this.languageApi.startLanguageTest(this.languageTeachingStage(), kind).subscribe({
      next: (result: any) => {
        this.setLanguageModelState(result.state);
        this.languageTest.set(result.state.active_test);
        if (result.state.active_test)
          this.languageTeachingStage.set(result.state.active_test.stage);
        this.languageTestBusy.set(false);
        if (!result.state.active_test)
          this.ui.info(result.message || 'All learning stages are passed.');
      },
      error: (error: Error) => {
        this.languageModelError.set(error.message);
        this.languageTestBusy.set(false);
      },
    });
  }

  askLanguageTestQuestion() {
    const question = this.languageTestQuestion().trim();
    if (!question || !this.languageTest() || this.languageTestBusy()) return;
    this.languageTestBusy.set(true);
    this.languageModelError.set(null);
    this.languageApi.askLanguageTestQuestion(question).subscribe({
      next: (result: any) => {
        this.setLanguageModelState(result.state);
        this.languageTest.set(result.state.active_test);
        this.languageTestQuestion.set('');
        this.languageTestBusy.set(false);
      },
      error: (error: Error) => {
        this.languageModelError.set(error.message);
        this.languageTestBusy.set(false);
      },
    });
  }

  scoreLanguageTestAnswer(passed: boolean) {
    if (this.languageTestBusy()) return;
    this.languageTestBusy.set(true);
    this.languageApi.scoreLanguageTestAnswer(passed).subscribe({
      next: (result: any) => {
        this.setLanguageModelState(result.state);
        this.languageTest.set(result.state.active_test);
        this.languageTestBusy.set(false);
      },
      error: (error: Error) => {
        this.languageModelError.set(error.message);
        this.languageTestBusy.set(false);
      },
    });
  }

  finishLanguageTest(passed: boolean) {
    if (this.languageTestBusy()) return;
    this.languageTestBusy.set(true);
    this.languageApi.finishLanguageTest(passed).subscribe({
      next: (result: any) => {
        this.setLanguageModelState(result.state);
        this.languageTest.set(null);
        this.languageTestResult.set(result.result);
        this.languageTestBusy.set(false);
        if (result.result.passed && result.state.current_stage_id !== 'complete') {
          // Passing opens the next grade, so the form and the grade cards
          // follow the learner there instead of staying on the passed one.
          this.languageTeachingStage.set(result.state.current_stage_id);
          this.lessonSubjectDraft.set(
            result.state.stages.find((stage: any) => stage.id === result.state.current_stage_id)
              ?.subjects[0] ?? 'General',
          );
        }
        this.ui.info(this.testResultMessage(result.result));
      },
      error: (error: Error) => {
        this.languageModelError.set(error.message);
        this.languageTestBusy.set(false);
      },
    });
  }

  /** The kind of test, named the way the backend decides it. */
  testKindLabel(kind: string | undefined | null): string {
    if (kind === 'mock') return 'Mock test';
    if (kind === 'exam') return 'Final exam';
    return 'Trainer-led test';
  }

  /** What the measured result means, worded for the test that produced it. */
  testResultMessage(result: {
    kind?: string;
    stage: string;
    passed: boolean;
    questions_asked: number;
    answers_passed: number;
    required_pass_rate?: number | null;
  }): string {
    const stage = this.languageStageTitle(result.stage);
    const score = `You scored ${result.answers_passed} of ${result.questions_asked} answers as passed.`;
    if (result.kind === 'mock') {
      return `${stage} mock test complete. ${score} A mock is practice and never moves the grade.`;
    }
    if (result.kind === 'exam') {
      const required = Math.round((result.required_pass_rate ?? 0.8) * 100);
      return result.passed
        ? `${stage} final exam passed. ${score} The required ${required}% was met and the next grade is now open.`
        : `${stage} final exam not passed. ${score} The final exam requires ${required}%. Teach or review the material, then take it again.`;
    }
    return result.passed
      ? `${stage} passed. ${score} The next grade is now open.`
      : `${stage} needs more learning. ${score} Teach or review the material, then take the grade test again.`;
  }

  lookupDictionaryWord() {
    const word = this.dictionaryWordDraft().trim();
    if (!word || this.dictionaryWordLoading()) return;
    this.dictionaryWordLoading.set(true);
    this.languageModelError.set(null);
    this.dictionaryWordEntry.set(null);
    this.languageApi.lookupDictionaryWord(word).subscribe({
      next: (entry: any) => {
        this.dictionaryWordEntry.set(entry);
        this.dictionaryDefinitionIndex.set(0);
        this.dictionaryWordLoading.set(false);
      },
      error: (error: Error) => {
        this.languageModelError.set(error.message);
        this.dictionaryWordLoading.set(false);
      },
    });
  }

  teachDictionaryWord() {
    const entry = this.dictionaryWordEntry();
    if (!entry || this.dictionaryWordSaving()) return;
    const meaning = entry.definitions?.[this.dictionaryDefinitionIndex()];
    if (!meaning) return;
    this.dictionaryWordSaving.set(true);
    this.languageApi
      .learnDictionaryWord(entry.word, meaning, this.languageTeachingStage())
      .subscribe({
        next: (result: any) => {
          this.setLanguageModelState(result.state);
          this.dictionaryWordEntry.set(result.entry);
          this.dictionaryWordSaving.set(false);
          this.ui.success(`Learned “${result.entry.word}” from the offline dictionary.`);
        },
        error: (error: Error) => {
          this.languageModelError.set(error.message);
          this.dictionaryWordSaving.set(false);
        },
      });
  }

  checkNextWords() {
    this.refreshLanguageModel(this.languagePrefix().trim());
  }

  generateLearnedSentence() {
    if (this.languageGenerationLoading()) return;
    this.languageGenerationLoading.set(true);
    this.generatedLanguageSentence.set(null);
    const draft = this.languageSentenceWord().trim();
    const words = draft
      ? draft
          .split(/[\s,]+/)
          .map((word: any) => word.trim())
          .filter((word: any) => word.length > 0)
      : [];
    this.languageApi
      .generateLanguageSentence(words.length === 1 ? words[0] : undefined, words)
      .subscribe({
        next: (result: any) => {
          this.generatedLanguageSentence.set(
            result.sentence ??
              'The model has not learned enough sentence patterns yet. Add more lessons first.',
          );
          this.languageGenerationLoading.set(false);
        },
        error: (error: Error) => {
          this.languageModelError.set(error.message);
          this.languageGenerationLoading.set(false);
        },
      });
  }

  buildSentenceFromWords() {
    if (this.practiceBusy()) return;
    const draft = this.sentenceWordsDraft().trim();
    if (!draft) return;
    const words = draft
      .split(/[\s,]+/)
      .map((word: any) => word.trim())
      .filter((word: any) => word.length > 0);
    if (!words.length) return;
    this.practiceBusy.set(true);
    this.sentenceResult.set(null);
    this.languageApi
      .generateLanguageSentence(words.length === 1 ? words[0] : undefined, words)
      .subscribe({
        next: (result: any) => {
          this.sentenceResult.set(
            result.sentence ??
              'The learner could not build a sentence from those words yet. Try a word it has learned.',
          );
          this.practiceBusy.set(false);
        },
        error: (error: Error) => {
          this.languageModelError.set(error.message);
          this.practiceBusy.set(false);
        },
      });
  }

  runCalculation() {
    if (this.practiceBusy()) return;
    const question = this.calculationDraft().trim();
    if (!question) return;
    this.practiceBusy.set(true);
    this.calculationResult.set(null);
    this.languageApi.previewLanguageAnswer(question, true).subscribe({
      next: (result: any) => {
        this.calculationResult.set(result.answer);
        this.practiceBusy.set(false);
      },
      error: (error: Error) => {
        this.languageModelError.set(error.message);
        this.practiceBusy.set(false);
      },
    });
  }

  constructor() {
    // The summary belongs to the page's details panel, so the header toggle
    // opens it with the learner's own numbers instead of an empty frame.
    effect(() => {
      const template = this.learnerDetails();
      if (!template) return;
      this.sidebar.setDetails({
        owner: 'learner',
        title: 'Language Learner',
        subtitle: this.sidebarSubtitle(),
        template,
      });
    });
    this.destroyRef.onDestroy(() => this.sidebar.clearDetails('learner'));
  }

  ngOnInit(): void {
    // The server has no session, so the lessons are read in the browser.
    if (!isPlatformBrowser(this.platformId)) return;
    this.refreshLanguageModel();
    this.loadDuplicates();
  }

  /** Read the lessons that repeat each other. */
  protected loadDuplicates(): void {
    this.languageApi.duplicateLessons().subscribe({
      next: (summary: DuplicateLessons) => {
        this.duplicateGroups.set(summary.groups ?? []);
        this.duplicateCount.set(summary.duplicate_count ?? 0);
        this.totalQuestions.set(summary.total_questions ?? 0);
      },
      error: () => {
        this.duplicateGroups.set([]);
        this.duplicateCount.set(0);
      },
    });
  }

  /** The lessons that repeat another one. */
  protected isDuplicate(cardId: string | undefined | null): boolean {
    if (!cardId) return false;
    return this.duplicateCardIds().has(cardId);
  }

  protected openDuplicatePanel(): void {
    this.duplicatePanelOpen.set(true);
    this.loadDuplicates();
  }

  protected closeDuplicatePanel(): void {
    this.duplicatePanelOpen.set(false);
    this.cancelDuplicateEdit();
  }

  /** Keep every lesson of a group: the repeat is on purpose. */
  protected acceptBothDuplicates(group: DuplicateGroup): void {
    if (!group.key) return;
    this.busyDuplicateId.set(group.key);
    this.languageApi.acceptDuplicateLessons(group.key).subscribe({
      next: (state: any) => {
        this.setLanguageModelState(state);
        this.busyDuplicateId.set(null);
        this.loadDuplicates();
        this.ui.success(`Both lessons were kept: ${group.label.toLowerCase()} is accepted.`);
      },
      error: (error: Error) => {
        this.busyDuplicateId.set(null);
        this.ui.error(error.message);
      },
    });
  }

  /** Keep this lesson and remove the ones it repeats. */
  protected acceptDuplicate(group: DuplicateGroup, card: DuplicateLessonCard): void {
    const others = group.cards.filter((other) => other.id !== card.id);
    if (!others.length) {
      this.ui.info('There is nothing to remove: this is the only lesson in the group.');
      return;
    }
    this.busyDuplicateId.set(card.id);
    let removed = 0;
    let failed = false;
    for (const other of others) {
      this.languageApi.removeLanguageLesson(other.id).subscribe({
        next: () => {
          removed += 1;
          if (removed === others.length) {
            this.busyDuplicateId.set(null);
            this.refreshLanguageModel();
            this.loadDuplicates();
            this.ui.success(`Kept the lesson and removed ${removed} that repeated it.`);
          }
        },
        error: () => {
          failed = true;
          this.busyDuplicateId.set(null);
          this.ui.error('The lesson could not be removed.');
        },
      });
    }
    if (failed) return;
  }

  /** Remove this lesson. */
  protected removeDuplicate(card: DuplicateLessonCard): void {
    this.busyDuplicateId.set(card.id);
    this.languageApi.removeLanguageLesson(card.id).subscribe({
      next: () => {
        this.busyDuplicateId.set(null);
        this.refreshLanguageModel();
        this.loadDuplicates();
        this.ui.success('The lesson was removed.');
      },
      error: (error: Error) => {
        this.busyDuplicateId.set(null);
        this.ui.error(error.message);
      },
    });
  }

  /** Start improving the question or the answer of a lesson. */
  protected startDuplicateEdit(card: DuplicateLessonCard): void {
    this.duplicateEditId.set(card.id);
    this.duplicateEditQuestion.set(card.question);
    this.duplicateEditAnswer.set(card.answer);
    this.duplicateEditSubject.set(card.subjects?.join(', ') ?? card.subject ?? '');
  }

  protected cancelDuplicateEdit(): void {
    this.duplicateEditId.set(null);
    this.duplicateEditQuestion.set('');
    this.duplicateEditAnswer.set('');
    this.duplicateEditSubject.set('');
  }

  /** Save the improved question, answer and topic of a lesson. */
  protected saveDuplicateEdit(): void {
    const id = this.duplicateEditId();
    if (!id) return;
    const question = this.duplicateEditQuestion().trim();
    const answer = this.duplicateEditAnswer().trim();
    const subject = this.duplicateEditSubject().trim();
    if (!question || !answer) {
      this.ui.error('A lesson needs both a question and an answer.');
      return;
    }
    this.busyDuplicateId.set(id);
    this.languageApi
      .updateLanguageLessonAnswer(id, answer, question, undefined, subject || undefined)
      .subscribe({
        next: (state: any) => {
          this.setLanguageModelState(state);
          this.busyDuplicateId.set(null);
          this.cancelDuplicateEdit();
          this.loadDuplicates();
          this.ui.success('The lesson was improved.');
        },
        error: (error: Error) => {
          this.busyDuplicateId.set(null);
          this.ui.error(error.message);
        },
      });
  }
}
