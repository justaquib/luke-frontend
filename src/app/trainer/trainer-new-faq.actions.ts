import { Injectable, inject } from '@angular/core';
import { TrainerApiService } from '../core/api/trainer-api.service';
import type { FaqSuggestion } from '../core/api/api-models';
import { UiService } from '../shared/ui.service';
import { TrainerDataService } from './trainer-data.service';
import { TrainerStore } from './trainer.store';

@Injectable({ providedIn: 'root' })
export class TrainerNewFaqActions {
  private readonly api = inject(TrainerApiService);
  private readonly ui = inject(UiService);
  private readonly store = inject(TrainerStore);
  private readonly data = inject(TrainerDataService);

  setQuestion(value: string): void {
    this.store.newQuestion.set(value);
  }

  setAnswer(value: string): void {
    this.store.newAnswer.set(value);
  }

  checkNewForMerge(): void {
    const question = this.store.newQuestion().trim();
    if (!question) {
      this.ui.error('Type a question first.');
      return;
    }
    this.store.newMergeLoading.set(true);
    this.api.intentSuggestions(question).subscribe({
      next: (suggestions) => {
        this.store.newMergeSuggestions.set(suggestions);
        this.store.newMergeLoading.set(false);
      },
      error: (error: Error) => {
        this.store.newMergeLoading.set(false);
        this.ui.error(error.message);
      },
    });
  }

  mergeNewIntoFaq(suggestion: FaqSuggestion): void {
    const question = this.store.newQuestion().trim();
    const answer = this.store.newAnswer().trim();
    if (!question || !answer) {
      this.ui.error('Both question and answer are required to merge.');
      return;
    }
    const targetId = suggestion.faq_id;
    this.store.saving.set(true);
    this.api.createFaq(question, answer).subscribe({
      next: (created) => {
        this.api
          .faqMerge(targetId, { faq_ids: [created.id], answer: suggestion.answer })
          .subscribe({
            next: (result) => {
              this.store.saving.set(false);
              this.store.newQuestion.set('');
              this.store.newAnswer.set('');
              this.store.newMergeSuggestions.set(null);
              this.ui.success(
                `Folded into #${result.canonical_faq_id} — ${result.recreated} alias${result.recreated === 1 ? '' : 'es'} re-added.`,
              );
              this.data.refresh();
              this.store.setTab('faqs');
            },
            error: (error: Error) => {
              this.store.saving.set(false);
              this.ui.error(error.message);
            },
          });
      },
      error: (error: Error) => {
        this.store.saving.set(false);
        this.ui.error(error.message);
      },
    });
  }

  createFaq(): void {
    const question = this.store.newQuestion().trim();
    const answer = this.store.newAnswer().trim();
    if (!question || !answer) {
      this.ui.error('Both question and answer are required.');
      return;
    }
    this.store.saving.set(true);
    this.api.createFaq(question, answer).subscribe({
      next: () => {
        this.store.saving.set(false);
        this.store.newQuestion.set('');
        this.store.newAnswer.set('');
        this.ui.success('New Q&A created as pending.');
        this.data.refresh();
        this.store.setStatusFilter('pending');
        this.store.setTab('faqs');
      },
      error: (error: Error) => {
        this.store.saving.set(false);
        this.ui.error(error.message);
      },
    });
  }

  dismissSuggestions(): void {
    this.store.newMergeSuggestions.set(null);
  }
}
