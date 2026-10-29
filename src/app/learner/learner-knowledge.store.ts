import { computed, inject, Injectable, signal } from '@angular/core';
import type { LanguageModelState } from '../core/api.service';
import { lessonsBySubjectFor, type LearnerLessonGroup } from './learner-lessons.model';
import { LearnerModelStore } from './learner-model.store';

/** The grade and topic the questions-by-grade browser shows. */
@Injectable()
export class LearnerKnowledgeStore {
  private readonly model = inject(LearnerModelStore);

  readonly browseStage = signal('nursery');
  readonly browseSubject = signal('');

  readonly groups = computed<LearnerLessonGroup[]>(() =>
    lessonsBySubjectFor(this.model.state(), this.browseStage()),
  );
  readonly count = computed(() =>
    this.groups().reduce((total, group) => total + group.lessons.length, 0),
  );
  readonly activeSubject = computed(() => {
    const groups = this.groups();
    const selected = this.browseSubject();
    return groups.some((group) => group.subject === selected)
      ? selected
      : (groups[0]?.subject ?? '');
  });
  readonly visibleGroups = computed(() => {
    const selected = this.activeSubject();
    return this.groups().filter((group) => group.subject === selected);
  });

  constructor() {
    const current = this.model.state();
    if (current && current.current_stage_id !== 'complete') {
      this.browseStage.set(current.current_stage_id);
    }
    this.model.onRefreshed((state: LanguageModelState, firstLoad: boolean) => {
      if (!firstLoad || state.current_stage_id === 'complete') return;
      this.browseStage.set(state.current_stage_id);
    });
  }

  setGrade(stageId: string): void {
    this.browseStage.set(stageId);
    this.browseSubject.set('');
  }

  setSubject(subject: string): void {
    this.browseSubject.set(subject);
  }

  focus(grade: string, subject: string): void {
    if (grade) this.browseStage.set(grade);
    if (subject) this.browseSubject.set(subject);
  }
}
