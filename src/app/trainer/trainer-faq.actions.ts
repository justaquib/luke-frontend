import { Injectable, inject, type TemplateRef } from '@angular/core';
import { TrainerApiService } from '../core/api/trainer-api.service';
import type { FaqItem } from '../core/api/api-models';
import { RightSidebarService } from '../shared/right-sidebar.service';
import { UiService } from '../shared/ui.service';
import { TrainerDataService } from './trainer-data.service';
import { TRAINER_SIDEBAR_OWNER } from './trainer.constants';
import { TrainerStore } from './trainer.store';

/** Everything the trained-answer list and its detail panel do. */
@Injectable({ providedIn: 'root' })
export class TrainerFaqActions {
  private readonly api = inject(TrainerApiService);
  private readonly ui = inject(UiService);
  private readonly store = inject(TrainerStore);
  private readonly data = inject(TrainerDataService);
  private readonly sidebar = inject(RightSidebarService);

  openFaq(faq: FaqItem, details: TemplateRef<unknown>): void {
    if (this.store.editingId() !== faq.id) {
      this.cancelEdit();
    }
    this.store.selectedFaqId.set(faq.id);
    this.sidebar.show({
      owner: TRAINER_SIDEBAR_OWNER,
      title: 'Trained answer',
      subtitle: `Question and answer · #${faq.id}`,
      template: details,
    });
  }

  closeFaq(): void {
    this.store.selectedFaqId.set(null);
    this.cancelEdit();
    this.sidebar.clearDetails(TRAINER_SIDEBAR_OWNER);
  }

  startEdit(faq: FaqItem): void {
    this.store.editingId.set(faq.id);
    this.store.editingAnswer.set(faq.answer);
  }

  cancelEdit(): void {
    this.store.editingId.set(null);
    this.store.editingAnswer.set('');
  }

  updateEditingAnswer(value: string): void {
    this.store.editingAnswer.set(value);
  }

  saveEdit(faq: FaqItem): void {
    const answer = this.store.editingAnswer().trim();
    if (!answer) {
      this.ui.error('Answer cannot be empty.');
      return;
    }
    this.store.saving.set(true);
    this.api.updateFaq(faq.id, answer).subscribe({
      next: () => {
        this.store.saving.set(false);
        this.cancelEdit();
        this.ui.success('Answer updated.');
        this.data.refresh();
      },
      error: (error: Error) => {
        this.store.saving.set(false);
        this.ui.error(error.message);
      },
    });
  }

  approve(faq: FaqItem): void {
    this.api.setFaqStatus(faq.id, 'approved').subscribe({
      next: () => {
        this.ui.success(`Approved #${faq.id}.`);
        this.data.refresh();
      },
      error: (error: Error) => this.ui.error(error.message),
    });
  }

  decline(faq: FaqItem): void {
    this.api.setFaqStatus(faq.id, 'declined').subscribe({
      next: () => {
        this.ui.info(`Declined #${faq.id}.`);
        this.data.refresh();
      },
      error: (error: Error) => this.ui.error(error.message),
    });
  }

  markDuplicate(faq: FaqItem): void {
    this.api.setFaqStatus(faq.id, 'duplicate').subscribe({
      next: () => {
        this.ui.info(`Marked #${faq.id} as duplicate.`);
        this.data.refresh();
      },
      error: (error: Error) => this.ui.error(error.message),
    });
  }

  deleteFaq(faq: FaqItem): void {
    this.ui
      .confirmDialog({
        title: 'Delete trained answer?',
        message: `Delete the trained answer for "${faq.question}"?`,
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        danger: true,
      })
      .subscribe((ok) => {
        if (!ok) {
          return;
        }
        this.api.deleteFaq(faq.id).subscribe({
          next: () => {
            this.ui.success('Trained answer deleted.');
            this.forget([faq]);
            this.data.refresh();
          },
          error: (error: Error) => this.ui.error(error.message),
        });
      });
  }

  deleteFaqs(faqs: FaqItem[]): void {
    const labels = faqs.map((faq) => `  • ${faq.id}. ${faq.question}`).join('\n');
    this.ui
      .confirmDialog({
        title: `Delete ${faqs.length} trained answer(s)?`,
        message:
          `Delete ${faqs.length} trained answer(s)?\n${labels}\n\n` +
          `Keep the one you'd like to keep — cancel first if needed.`,
        confirmLabel: 'Delete all',
        cancelLabel: 'Cancel',
        danger: true,
      })
      .subscribe((ok) => {
        if (!ok) {
          return;
        }
        let remaining = faqs.length;
        for (const faq of faqs) {
          this.api.deleteFaq(faq.id).subscribe({
            next: () => {
              if (--remaining === 0) {
                this.ui.success(`${faqs.length} trained answers removed.`);
                this.forget(faqs);
                this.data.refresh();
              }
            },
            error: (error: Error) => this.ui.error(error.message),
          });
        }
      });
  }

  toggleDuplicates(): void {
    this.store.showDuplicatesOnly.update((value) => !value);
  }

  clearSearch(): void {
    this.store.faqSearch.set('');
    this.store.showDuplicatesOnly.set(false);
    this.store.setStatusFilter('all');
  }

  updateSearch(value: string): void {
    this.store.faqSearch.set(value);
  }

  private forget(faqs: FaqItem[]): void {
    const selected = this.store.selectedFaqId();
    if (selected !== null && faqs.some((faq) => faq.id === selected)) {
      this.closeFaq();
    }
  }
}
