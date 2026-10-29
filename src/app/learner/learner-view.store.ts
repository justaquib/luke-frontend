import { inject, Injectable, signal } from '@angular/core';
import { LearnerDuplicatesStore } from './learner-duplicates.store';
import { LearnerModelStore } from './learner-model.store';

export type LearnerTab = 'overview' | 'lessons' | 'tests' | 'knowledge' | 'expressions';
export type KnowledgeTab = 'search' | 'grades' | 'learned';

/** Which learner panel is open, and when the saved material is re-read. */
@Injectable()
export class LearnerViewStore {
  private readonly model = inject(LearnerModelStore);
  private readonly duplicates = inject(LearnerDuplicatesStore);

  readonly learnerTab = signal<LearnerTab>('overview');
  readonly knowledgeTab = signal<KnowledgeTab>('search');

  /** Open what it knows and re-read the saved material so it is never stale. */
  openKnowledge(): void {
    this.learnerTab.set('knowledge');
    this.refreshMaterial();
  }

  setKnowledgeTab(tab: KnowledgeTab): void {
    this.knowledgeTab.set(tab);
    this.refreshMaterial();
  }

  /** Move to a knowledge panel without asking for the material again. */
  showKnowledgeTab(tab: KnowledgeTab): void {
    this.knowledgeTab.set(tab);
  }

  refreshMaterial(): void {
    this.model.refresh();
    this.duplicates.load();
  }
}
