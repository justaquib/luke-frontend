import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  effect,
  inject,
  type OnInit,
  type TemplateRef,
  viewChild,
} from '@angular/core';
import { AppIcon } from '../shared/app-icon';
import { AppShell } from '../shared/app-shell';
import { RightSidebarService } from '../shared/right-sidebar.service';
import { LearnerChatStore } from './learner-chat.store';
import { LearnerDeleteDialogs } from './learner-delete-dialogs';
import { LearnerDetails } from './learner-details';
import { LearnerDuplicatesDrawer } from './learner-duplicates-drawer';
import { LearnerDuplicatesStore } from './learner-duplicates.store';
import { LearnerLessonEditorStore, LearnerTrainerAnswerEditorStore } from './learner-editor.store';
import { LearnerExpressionsPanel } from './learner-expressions-panel';
import { LearnerKnowledgePanel } from './learner-knowledge-panel';
import { LearnerKnowledgeStore } from './learner-knowledge.store';
import { LearnerLessonsPanel } from './learner-lessons-panel';
import { LearnerLessonsStore } from './learner-lessons.store';
import { LearnerMatchDialog } from './learner-match-dialog';
import { LearnerModelStore } from './learner-model.store';
import { LearnerOverview } from './learner-overview';
import { LearnerPracticeStore } from './learner-practice.store';
import { LearnerSearchStore } from './learner-search.store';
import { LearnerTestsPanel } from './learner-tests-panel';
import { LearnerTestsStore } from './learner-tests.store';
import { LearnerViewStore, type KnowledgeTab } from './learner-view.store';

/** The page shell around the learner panels; the stores hold their state. */
@Component({
  selector: 'app-learner',
  standalone: true,
  imports: [
    AppShell,
    AppIcon,
    LearnerDetails,
    LearnerOverview,
    LearnerLessonsPanel,
    LearnerTestsPanel,
    LearnerKnowledgePanel,
    LearnerExpressionsPanel,
    LearnerDuplicatesDrawer,
    LearnerMatchDialog,
    LearnerDeleteDialogs,
  ],
  templateUrl: './learner.html',
  styleUrls: ['./learner.css', './learner-navigation.css', '../shared/controls.css'],
  providers: [
    LearnerModelStore,
    LearnerDuplicatesStore,
    LearnerLessonsStore,
    LearnerKnowledgeStore,
    LearnerViewStore,
    LearnerSearchStore,
    LearnerLessonEditorStore,
    LearnerTrainerAnswerEditorStore,
    LearnerTestsStore,
    LearnerPracticeStore,
    LearnerChatStore,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Learner implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly sidebar = inject(RightSidebarService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly learnerDetails = viewChild<TemplateRef<unknown>>('learnerDetails');

  protected readonly model = inject(LearnerModelStore);
  protected readonly duplicates = inject(LearnerDuplicatesStore);
  protected readonly lessons = inject(LearnerLessonsStore);
  protected readonly view = inject(LearnerViewStore);

  protected readonly languageModelState = this.model.state;
  protected readonly languageModelLoading = this.model.loading;
  protected readonly languageModelError = this.model.error;
  protected readonly learnerTab = this.view.learnerTab;
  protected readonly knowledgeTab = this.view.knowledgeTab;
  protected readonly languageLessonTotal = this.lessons.total;
  protected readonly totalQuestions = this.duplicates.totalQuestions;
  protected readonly sidebarSubtitle = this.model.sidebarSubtitle;
  protected readonly learnerLearnedTotals = this.model.learnedTotals;

  protected readonly lessonEntryMode = this.lessons.entryMode;
  protected readonly lessonSubjectDraft = this.lessons.subjectDraft;
  protected readonly lessonQuestionDraft = this.lessons.questionDraft;
  protected readonly lessonAnswerDraft = this.lessons.answerDraft;
  protected readonly lessonTitleDraft = this.lessons.titleDraft;
  protected readonly lessonPassageDraft = this.lessons.passageDraft;
  protected readonly languageLessonDraft = this.lessons.pairsDraft;

  constructor() {
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
    if (!isPlatformBrowser(this.platformId)) return;
    this.view.refreshMaterial();
  }

  protected refreshLanguageModel(prefix = ''): void {
    this.model.refresh(prefix);
  }

  teachLanguageModel(): void {
    this.lessons.teach();
  }

  protected openKnowledge(): void {
    this.view.openKnowledge();
  }

  protected setKnowledgeTab(tab: KnowledgeTab): void {
    this.view.setKnowledgeTab(tab);
  }

  protected loadDuplicates(): void {
    this.duplicates.load();
  }
}
