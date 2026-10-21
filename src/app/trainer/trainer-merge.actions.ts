import { Injectable, inject } from '@angular/core';
import { TrainerApiService } from '../core/api/trainer-api.service';
import type { FaqItem, FaqSuggestion } from '../core/api/api-models';
import { UiService } from '../shared/ui.service';
import { TrainerDataService } from './trainer-data.service';
import { TrainerStore } from './trainer.store';

@Injectable({ providedIn: 'root' })
export class TrainerMergeActions {
  private readonly api = inject(TrainerApiService);
  private readonly ui = inject(UiService);
  private readonly store = inject(TrainerStore);
  private readonly data = inject(TrainerDataService);

  updateMergeQuery(value: string): void {
    this.store.mergeQuery.set(value);
  }

  runIntentSuggestions(): void {
    const query = this.store.mergeQuery().trim();
    if (!query) {
      this.store.mergeSuggestions.set(null);
      return;
    }
    this.store.mergeLoading.set(true);
    this.api.intentSuggestions(query).subscribe({
      next: (suggestions) => {
        this.store.mergeSuggestions.set(suggestions);
        this.store.mergeLoading.set(false);
      },
      error: (error: Error) => {
        this.store.mergeLoading.set(false);
        this.ui.error(error.message);
      },
    });
  }

  clearMergeSuggestions(): void {
    this.store.mergeSuggestions.set(null);
    this.store.faqMergePreview.set(null);
    this.store.faqMergeSelected.set(new Set());
    this.store.faqMergeAnswer.set('');
    this.store.faqMergeTarget.set(null);
    this.store.faqMergeSearch.set('');
    this.store.faqMergeExtraMatches.set([]);
  }

  pickFaqMergeTarget(faq: FaqItem): void {
    this.store.faqMergeTarget.set(faq);
    this.store.faqMergeAnswer.set(faq.answer);
    this.store.faqMergeSelected.set(new Set());
    this.store.faqMergePreview.set(null);
    this.store.faqMergeSearch.set('');
    this.store.faqMergeExtraMatches.set([]);
    this.api.faqMergePreview(faq.id).subscribe({
      next: (preview) => {
        this.store.faqMergePreview.set(preview);
        this.store.faqMergeSelected.set(new Set(preview.matches.map((match) => match.faq_id)));
      },
      error: (error: Error) => this.ui.error(error.message),
    });
  }

  toggleFaqMergeSelection(faqId: number): void {
    this.store.faqMergeSelected.update((selected) => {
      const next = new Set(selected);
      if (next.has(faqId)) {
        next.delete(faqId);
      } else {
        next.add(faqId);
      }
      return next;
    });
  }

  updateFaqMergeAnswer(value: string): void {
    this.store.faqMergeAnswer.set(value);
  }

  updateFaqMergeSearch(value: string): void {
    this.store.faqMergeSearch.set(value);
  }

  filteredFaqMergeCandidates(): FaqItem[] {
    const target = this.store.faqMergeTarget();
    const query = this.store.faqMergeSearch().trim().toLowerCase();
    if (!target) {
      return [];
    }
    const alreadySelected = this.store.faqMergeSelected();
    const alreadyShown = new Set<number>();
    const preview = this.store.faqMergePreview();
    if (preview) {
      for (const match of preview.matches) {
        alreadyShown.add(match.faq_id);
      }
    }
    let pool = this.store
      .faqs()
      .filter(
        (faq) => faq.id !== target.id && !alreadySelected.has(faq.id) && !alreadyShown.has(faq.id),
      );
    if (query) {
      pool = pool.filter(
        (faq) =>
          faq.question.toLowerCase().includes(query) || faq.answer.toLowerCase().includes(query),
      );
    }
    return pool.slice(0, 20);
  }

  addFaqMergeCandidate(faq: FaqItem): void {
    this.store.faqMergeSelected.update((selected) => {
      const next = new Set(selected);
      next.add(faq.id);
      return next;
    });
    this.store.faqMergeExtraMatches.update((list) => [
      ...list,
      {
        faq_id: faq.id,
        question: faq.question,
        answer: faq.answer,
        status: faq.status,
        distance: 0,
      },
    ]);
  }

  removeExtraMatch(faqId: number): void {
    this.store.faqMergeExtraMatches.update((list) =>
      list.filter((match) => match.faq_id !== faqId),
    );
    this.store.faqMergeSelected.update((selected) => {
      const next = new Set(selected);
      next.delete(faqId);
      return next;
    });
  }

  commitFaqMerge(): void {
    const target = this.store.faqMergeTarget();
    const ids = [...this.store.faqMergeSelected()];
    const answer = this.store.faqMergeAnswer().trim();
    if (!target) {
      return;
    }
    if (ids.length === 0 && !answer) {
      this.ui.error('Pick at least one FAQ or change the answer.');
      return;
    }
    this.store.faqMergeBusy.set(true);
    this.api
      .faqMerge(target.id, {
        faq_ids: ids,
        answer: answer && answer !== target.answer ? answer : null,
      })
      .subscribe({
        next: (result) => {
          this.store.faqMergeBusy.set(false);
          this.clearMergeSuggestions();
          this.ui.success(
            `Merged ${result.absorbed} FAQ${result.absorbed === 1 ? '' : 's'} into #${result.canonical_faq_id} (${result.recreated} alias${result.recreated === 1 ? '' : 'es'} re-added).`,
          );
          this.data.refresh();
        },
        error: (error: Error) => {
          this.store.faqMergeBusy.set(false);
          this.ui.error(error.message);
        },
      });
  }

  cancelFaqMerge(): void {
    this.clearMergeSuggestions();
  }

  extraMatches(): FaqSuggestion[] {
    return this.store.faqMergeExtraMatches();
  }
}
