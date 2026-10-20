import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, LanguageDictionaryEntry, LanguageLessonDuplicateReport, LanguageModelState, LanguagePreviewResponse, LanguageTest, LanguageTestFinishResult, QueryReasoning } from '../core/api.service';
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
  imports: [CommonModule, FormsModule],
  templateUrl: './learner.html',
  styleUrl: './learner.css',
})
export class Learner implements OnInit {
  private readonly api = inject(ApiService);
  private readonly ui = inject(UiService);
  private readonly router = inject(Router);

  protected readonly languageModelState = signal<LanguageModelState | null>(null);
  protected readonly learnerTab = signal<'overview' | 'lessons' | 'tests' | 'knowledge' | 'expressions'>('overview');
  protected readonly languageLessonDraft = signal('');
  protected readonly selectedLessonSubject = signal('');
  protected readonly editingLearnerLessonId = signal<string | null>(null);
  protected readonly editingLearnerLessonAnswer = signal('');
  protected readonly editingLearnerLessonQuestion = signal('');
  protected readonly editingLearnerLessonSubject = signal('');
  protected readonly savingLearnerLessonId = signal<string | null>(null);
  protected readonly learnerLessonDeletePrompt = signal<{ id: string; question: string } | null>(null);
  protected readonly deletingLearnerLessonId = signal<string | null>(null);
  protected readonly editingTrainerAnswerId = signal<number | null>(null);
  protected readonly editingTrainerAnswerDraft = signal('');
  protected readonly savingTrainerAnswerId = signal<number | null>(null);
  protected readonly trainerAnswerDeletePrompt = signal<{ id: number; question: string } | null>(null);
  protected readonly deletingTrainerAnswerId = signal<number | null>(null);
  protected readonly lessonEntryMode = signal<'own_words' | 'formatted'>('own_words');
  protected readonly lessonSubjectDraft = signal('Language');
  protected readonly lessonQuestionDraft = signal('');
  protected readonly lessonAnswerDraft = signal('');
  protected readonly languageTeachingStage = signal<string>('nursery');
  protected readonly languageTest = signal<LanguageTest | null>(null);
  protected readonly languageTestQuestion = signal('');
  protected readonly languageTestResult = signal<LanguageTestFinishResult['result'] | null>(null);
  protected readonly languageTestKind = signal<'trainer' | 'mock' | 'exam'>('trainer');
  protected readonly languageTestBusy = signal(false);
  protected readonly learnerChatDraft = signal('');
  protected readonly learnerChatMessages = signal<Array<{ question: string; answer: string; source: LanguagePreviewResponse['source']; reasoning?: QueryReasoning | null }>>([]);
  protected readonly learnerChatBusy = signal(false);
  protected readonly learnerMatchPrompt = signal<{ question: string; candidates: NonNullable<LanguagePreviewResponse['candidates']> } | null>(null);
  protected readonly dictionaryWordDraft = signal('');
  protected readonly dictionaryWordEntry = signal<LanguageDictionaryEntry | null>(null);
  protected readonly dictionaryWordLoading = signal(false);
  protected readonly dictionaryWordSaving = signal(false);
  protected readonly dictionaryDefinitionIndex = signal(0);
  protected readonly languageLessonSaving = signal(false);
  protected readonly languageLessonChecking = signal(false);
  protected readonly languageLessonWarning = signal<LanguageLessonDuplicateReport | null>(null);
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
  protected readonly selectedLanguageStage = computed(() =>
    this.languageModelState()?.stages.find((stage) => stage.id === this.languageTeachingStage()) ?? null,
  );
  protected readonly languageLessonsBySubject = computed(() => {
    const state = this.languageModelState();
    if (!state) return [];
    const groups = new Map<string, LanguageModelState['lesson_cards']>();
    for (const lesson of state.lesson_cards) {
      if ((lesson.grade_id ?? 'nursery') !== this.languageTeachingStage()) continue;
      // A lesson can belong to more than one topic, so it is filed under each.
      for (const topic of lessonTopics(lesson)) {
        groups.set(topic, [...(groups.get(topic) ?? []), lesson]);
      }
    }
    return [...groups.entries()].map(([subject, lessons]) => ({ subject, lessons }));
  });
  protected readonly languageLessonSubjects = computed(() => {
    const suggested = (this.selectedLanguageStage()?.subjects ?? []).map(canonicalLessonSubject);
    const taught = this.languageLessonsBySubject().map((group) => group.subject);
    return [...new Set([...suggested, ...taught])];
  });
  protected readonly activeLessonSubject = computed(() => {
    const groups = this.languageLessonsBySubject();
    const selected = this.selectedLessonSubject();
    return groups.some((group) => group.subject === selected)
      ? selected
      : groups[0]?.subject ?? this.languageLessonSubjects()[0] ?? '';
  });
  protected readonly visibleLessonGroups = computed(() => {
    const selected = this.activeLessonSubject();
    return this.languageLessonsBySubject().filter((group) => group.subject === selected);
  });
  protected readonly visibleLessonCount = computed(() =>
    this.visibleLessonGroups().reduce((count, group) => count + group.lessons.length, 0),
  );
  protected readonly languageLessonTotal = computed(() =>
    this.languageLessonsBySubject().reduce((total, group) => total + group.lessons.length, 0),
  );
  protected readonly learnerOwnLessons = computed(() =>
    (this.languageModelState()?.lesson_cards ?? []).filter((lesson) => lesson.kind === 'trainer'),
  );
  protected readonly learnerStarterLessons = computed(() =>
    (this.languageModelState()?.lesson_cards ?? []).filter((lesson) => lesson.kind !== 'trainer'),
  );
  protected readonly learnerStarterLessonCount = computed(() => this.learnerStarterLessons().length);
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
    const editable = results.filter((result) => result.editable).length;
    return { total: results.length, editable };
  });

  refreshLanguageModel(prefix = '') {
    const firstLoad = !this.languageModelState();
    this.languageModelLoading.set(true);
    this.languageModelError.set(null);
    this.api.languageModelState(prefix).subscribe({
      next: (state) => {
        this.setLanguageModelState(state);
        if (state.current_stage_id !== 'complete') {
          this.languageTeachingStage.set(state.current_stage_id);
          if (firstLoad) this.lessonSubjectDraft.set(state.stages.find((stage) => stage.id === state.current_stage_id)?.subjects[0] ?? 'General');
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
    if (this.languageLessonSaving() || this.languageLessonChecking()) return;
    const lesson = this.lessonText();
    if (!lesson) return;
    this.languageLessonChecking.set(true);
    this.languageModelError.set(null);
    const stage = this.languageTeachingStage();
    const subject = canonicalLessonSubject(this.lessonSubjectDraft());
    this.api.checkLanguageLessonDuplicates(lesson, stage, subject).subscribe({
      next: (report) => {
        this.languageLessonChecking.set(false);
        if (this.lessonWarningNeeded(report)) {
          this.languageLessonWarning.set(report);
          return;
        }
        this.saveLanguageLesson(lesson, stage, subject);
      },
      error: (error: Error) => {
        this.languageLessonChecking.set(false);
        this.languageModelError.set(error.message);
      },
    });
  }

  private lessonText(): string {
    if (this.lessonEntryMode() === 'formatted') return this.languageLessonDraft().trim();
    const question = this.lessonQuestionDraft().trim();
    const answer = this.lessonAnswerDraft().trim();
    if (!question || !answer) return '';
    return `Q: ${question}\nA: ${answer}`;
  }

  private lessonWarningNeeded(report: LanguageLessonDuplicateReport): boolean {
    return !!report && (
      report.exact.length > 0 ||
      report.same_question.length > 0 ||
      report.similar.length > 0 ||
      report.duplicate_words.length > 0 ||
      report.faqs.length > 0 ||
      report.intents.length > 0
    );
  }

  confirmLanguageLesson() {
    const stage = this.languageTeachingStage();
    const subject = canonicalLessonSubject(this.lessonSubjectDraft());
    const lesson = this.lessonText();
    this.languageLessonWarning.set(null);
    if (!lesson) return;
    this.saveLanguageLesson(lesson, stage, subject);
  }

  cancelLanguageLessonWarning() {
    this.languageLessonWarning.set(null);
  }

  setLessonQuestionDraft(value: string) {
    this.lessonQuestionDraft.set(value);
    this.languageLessonWarning.set(null);
  }

  setLessonAnswerDraft(value: string) {
    this.lessonAnswerDraft.set(value);
    this.languageLessonWarning.set(null);
  }

  setLanguageLessonDraft(value: string) {
    this.languageLessonDraft.set(value);
    this.languageLessonWarning.set(null);
  }

  private saveLanguageLesson(lesson: string, stage: string, subject: string) {
    this.languageLessonSaving.set(true);
    this.languageModelError.set(null);
    this.api.teachLanguageModel(lesson, stage, subject).subscribe({
      next: (state) => {
        this.setLanguageModelState(state);
        this.selectedLessonSubject.set(subject);
        this.lessonSubjectDraft.set(subject);
        this.languageLessonDraft.set('');
        this.lessonQuestionDraft.set('');
        this.lessonAnswerDraft.set('');
        this.languageLessonSaving.set(false);
        const skipped = state.skipped_duplicates?.length ?? 0;
        const added = state.added_lessons ?? 0;
        if (added === 0 && skipped > 0) {
          this.ui.info(`Skipped ${skipped} lesson${skipped === 1 ? '' : 's'} that were already taught.`);
          return;
        }
        this.ui.success(`Added ${added} lesson${added === 1 ? '' : 's'} to ${this.selectedLanguageStage()?.title ?? stage}.`);
        if (skipped > 0) {
          this.ui.info(`Skipped ${skipped} duplicate lesson${skipped === 1 ? '' : 's'} that were already taught.`);
        }
      },
      error: (error: Error) => {
        this.languageModelError.set(error.message);
        this.languageLessonSaving.set(false);
      },
    });
  }

  languageLessonCanSubmit(): boolean {
    if (this.lessonEntryMode() === 'formatted') return !!this.languageLessonDraft().trim();
    return !!this.lessonQuestionDraft().trim() && !!this.lessonAnswerDraft().trim();
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
    this.api.updateLanguageLessonAnswer(id, answer, question || undefined, undefined, subject || undefined).subscribe({
      next: (state) => {
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
    this.api.removeLanguageLesson(lesson.id).subscribe({
      next: (state) => {
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
      this.api.updateLanguageLessonAnswer(result.lessonId, answer, question, confidence).subscribe({
        next: (state) => {
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
      this.api.updateFaq(result.faqId, answer, question, confidence).subscribe({
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
    const state = this.languageModelState();
    if (!state) return;
    if (result.grade && !this.isLanguageStageLocked(result.grade, state)) {
      this.languageTeachingStage.set(result.grade);
    }
    if (result.subject) {
      this.selectedLessonSubject.set(result.subject);
      this.lessonSubjectDraft.set(result.subject);
    }
    this.learnerTab.set('lessons');
  }

  askLanguageLearner() {
    const question = this.learnerChatDraft().trim();
    if (!question || this.learnerChatBusy()) return;
    this.queryLanguageLearner(question);
  }

  private queryLanguageLearner(question: string, skipTrainer = false) {
    this.learnerChatBusy.set(true);
    this.languageModelError.set(null);
    this.api.previewLanguageAnswer(question, skipTrainer).subscribe({
      next: (result) => {
        if (result.needs_clarification && result.candidates?.length) {
          this.learnerMatchPrompt.set({ question, candidates: result.candidates });
        } else {
          this.learnerChatMessages.update((messages) => [...messages, { question, answer: result.answer, source: result.source, reasoning: result.reasoning ?? null }].slice(-30));
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

  chooseLearnerTrainerAnswer(candidate: NonNullable<LanguagePreviewResponse['candidates']>[number]) {
    const prompt = this.learnerMatchPrompt();
    if (!prompt) return;
    this.learnerChatMessages.update((messages) => [...messages, { question: prompt.question, answer: candidate.answer, source: 'trainer' }].slice(-30));
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
    void this.router.navigate(['/trainer'], { queryParams: { tab: 'merge' } });
  }

  learnerAnswerSourceLabel(source: LanguagePreviewResponse['source']): string {
    const labels: Record<string, string> = {
      letters: 'Letter learning',
      word_cards: 'Learned word',
      lesson_cards: 'Lesson knowledge',
      trainer: 'Trainer-approved answer',
      dictionary: 'Offline dictionary',
      sentence_patterns: 'Learned sentence patterns',
      sentence_examples: 'Learned sentence examples',
      not_learned: 'Not learned yet',
    };
    return labels[source] ?? 'Learner knowledge';
  }

  languageStageTitle(stageId: string): string {
    return this.languageModelState()?.stages.find((stage) => stage.id === stageId)?.title ?? stageId;
  }

  isLanguageStageLocked(stageId: string, state: LanguageModelState): boolean {
    if (state.current_stage_id === 'complete') return false;
    const current = state.stages.findIndex((stage) => stage.id === state.current_stage_id);
    const selected = state.stages.findIndex((stage) => stage.id === stageId);
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
      this.lessonSubjectDraft.set(state.stages.find((stage) => stage.id === stageId)?.subjects[0] ?? 'General');
    }
  }

  setLessonSubjectFilter(subject: string) {
    this.selectedLessonSubject.set(subject);
  }

  startLanguageTest(kind: 'trainer' | 'mock' | 'exam' = 'trainer') {
    if (this.languageTestBusy()) return;
    this.languageTestBusy.set(true);
    this.languageModelError.set(null);
    this.languageTestResult.set(null);
    this.languageTestKind.set(kind);
    this.languageTestQuestion.set('');
    this.api.startLanguageTest(this.languageTeachingStage(), kind).subscribe({
      next: (result) => {
        this.setLanguageModelState(result.state);
        this.languageTest.set(result.state.active_test);
        if (result.state.active_test) this.languageTeachingStage.set(result.state.active_test.stage);
        this.languageTestBusy.set(false);
        if (!result.state.active_test) this.ui.info(result.message || 'All learning stages are passed.');
      },
      error: (error: Error) => { this.languageModelError.set(error.message); this.languageTestBusy.set(false); },
    });
  }

  askLanguageTestQuestion() {
    const question = this.languageTestQuestion().trim();
    if (!question || !this.languageTest() || this.languageTestBusy()) return;
    this.languageTestBusy.set(true);
    this.languageModelError.set(null);
    this.api.askLanguageTestQuestion(question).subscribe({
      next: (result) => {
        this.setLanguageModelState(result.state);
        this.languageTest.set(result.state.active_test);
        this.languageTestQuestion.set('');
        this.languageTestBusy.set(false);
      },
      error: (error: Error) => { this.languageModelError.set(error.message); this.languageTestBusy.set(false); },
    });
  }

  scoreLanguageTestAnswer(passed: boolean) {
    if (this.languageTestBusy()) return;
    this.languageTestBusy.set(true);
    this.api.scoreLanguageTestAnswer(passed).subscribe({
      next: (result) => {
        this.setLanguageModelState(result.state);
        this.languageTest.set(result.state.active_test);
        this.languageTestBusy.set(false);
      },
      error: (error: Error) => { this.languageModelError.set(error.message); this.languageTestBusy.set(false); },
    });
  }

  finishLanguageTest(passed: boolean) {
    if (this.languageTestBusy()) return;
    this.languageTestBusy.set(true);
    this.api.finishLanguageTest(passed).subscribe({
      next: (result) => {
        this.setLanguageModelState(result.state);
        this.languageTest.set(null);
        this.languageTestResult.set(result.result);
        this.languageTestBusy.set(false);
        if (result.result.passed && result.result.stage === result.state.current_stage_id && result.state.current_stage_id !== 'complete') {
          this.languageTeachingStage.set(result.state.current_stage_id);
          this.lessonSubjectDraft.set(result.state.stages.find((stage) => stage.id === result.state.current_stage_id)?.subjects[0] ?? 'General');
        }
        this.ui.info(result.result.passed ? `Stage passed. ${result.state.stage} is unlocked.` : 'This stage needs more learning. It remains open for another lesson or test.');
      },
      error: (error: Error) => { this.languageModelError.set(error.message); this.languageTestBusy.set(false); },
    });
  }

  lookupDictionaryWord() {
    const word = this.dictionaryWordDraft().trim();
    if (!word || this.dictionaryWordLoading()) return;
    this.dictionaryWordLoading.set(true);
    this.languageModelError.set(null);
    this.dictionaryWordEntry.set(null);
    this.api.lookupDictionaryWord(word).subscribe({
      next: (entry) => {
        this.dictionaryWordEntry.set(entry);
        this.dictionaryDefinitionIndex.set(0);
        this.dictionaryWordLoading.set(false);
      },
      error: (error: Error) => { this.languageModelError.set(error.message); this.dictionaryWordLoading.set(false); },
    });
  }

  teachDictionaryWord() {
    const entry = this.dictionaryWordEntry();
    if (!entry || this.dictionaryWordSaving()) return;
    this.dictionaryWordSaving.set(true);
    this.api.learnDictionaryWord(entry.word, this.dictionaryDefinitionIndex(), this.languageTeachingStage()).subscribe({
      next: (result) => {
        this.setLanguageModelState(result.state);
        this.dictionaryWordEntry.set(result.entry);
        this.dictionaryWordSaving.set(false);
        this.ui.success(`Learned “${result.entry.word}” from the offline dictionary.`);
      },
      error: (error: Error) => { this.languageModelError.set(error.message); this.dictionaryWordSaving.set(false); },
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
      ? draft.split(/[\s,]+/).map((word) => word.trim()).filter((word) => word.length > 0)
      : [];
    this.api.generateLanguageSentence(words.length === 1 ? words[0] : undefined, words).subscribe({
      next: (result) => {
        this.generatedLanguageSentence.set(result.sentence ?? 'The model has not learned enough sentence patterns yet. Add more lessons first.');
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
    const words = draft.split(/[\s,]+/).map((word) => word.trim()).filter((word) => word.length > 0);
    if (!words.length) return;
    this.practiceBusy.set(true);
    this.sentenceResult.set(null);
    this.api.generateLanguageSentence(words.length === 1 ? words[0] : undefined, words).subscribe({
      next: (result) => {
        this.sentenceResult.set(result.sentence ?? 'The learner could not build a sentence from those words yet. Try a word it has learned.');
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
    this.api.previewLanguageAnswer(question, true).subscribe({
      next: (result) => {
        this.calculationResult.set(result.answer);
        this.practiceBusy.set(false);
      },
      error: (error: Error) => {
        this.languageModelError.set(error.message);
        this.practiceBusy.set(false);
      },
    });
  }

  ngOnInit(): void {
    this.refreshLanguageModel();
  }
}
