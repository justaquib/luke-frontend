import { Injectable, inject } from '@angular/core';
import { TrainerApiService } from '../core/api/trainer-api.service';
import type { PendingItem } from '../core/api/api-models';
import { UiService } from '../shared/ui.service';
import { TrainerDataService } from './trainer-data.service';
import { TrainerStore } from './trainer.store';
import { omitKey } from './trainer.utils';

@Injectable({ providedIn: 'root' })
export class TrainerInboxActions {
  private readonly api = inject(TrainerApiService);
  private readonly ui = inject(UiService);
  private readonly store = inject(TrainerStore);
  private readonly data = inject(TrainerDataService);

  setAnswer(id: number, value: string): void {
    this.store.answers.update((answers) => ({ ...answers, [id]: value }));
  }

  saveAnswer(pending: PendingItem): void {
    const answer = (this.store.answers()[pending.id] ?? '').trim();
    if (!answer) {
      this.ui.error('Answer cannot be empty.');
      return;
    }
    this.store.saving.set(true);
    this.api.answerPending(pending.id, answer).subscribe({
      next: () => {
        this.store.saving.set(false);
        this.store.answers.update((answers) => omitKey(answers, pending.id));
        this.ui.success('Trained answer saved.');
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

  dismiss(pending: PendingItem): void {
    this.ui
      .confirmDialog({
        title: 'Skip this question?',
        message: `Skip and delete the pending question "${pending.question}"?\nThis removes it from the inbox.`,
        confirmLabel: 'Skip & delete',
        cancelLabel: 'Keep',
        danger: true,
      })
      .subscribe((ok) => {
        if (!ok) {
          return;
        }
        this.api.deletePending(pending.id).subscribe({
          next: () => {
            this.ui.info('Question skipped.');
            this.data.refresh();
          },
          error: (error: Error) => this.ui.error(error.message),
        });
      });
  }

  deletePending(pending: PendingItem): void {
    this.ui
      .confirmDialog({
        title: 'Delete question?',
        message: `Delete the pending question "${pending.question}"?`,
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        danger: true,
      })
      .subscribe((ok) => {
        if (!ok) {
          return;
        }
        this.api.deletePending(pending.id).subscribe({
          next: () => {
            this.ui.success('Question deleted.');
            this.data.refresh();
          },
          error: (error: Error) => this.ui.error(error.message),
        });
      });
  }

  toggleMergeRow(pending: PendingItem): void {
    if (this.store.mergePreview()[pending.id]) {
      this.removeMergeRow(pending.id);
      return;
    }
    this.api.previewMerge(pending.id).subscribe({
      next: (preview) => {
        this.store.mergePreview.update((map) => ({ ...map, [pending.id]: preview }));
        this.store.mergeSelected.update((map) => ({
          ...map,
          [pending.id]: new Set(preview.matches.map((match) => match.pending_id)),
        }));
        this.store.mergeAnswer.update((map) => ({
          ...map,
          [pending.id]: this.store.answers()[pending.id] ?? '',
        }));
      },
      error: (error: Error) => this.ui.error(error.message),
    });
  }

  toggleMergeMatch(canonicalId: number, matchId: number): void {
    this.store.mergeSelected.update((map) => {
      const set = new Set(map[canonicalId] ?? []);
      if (set.has(matchId)) {
        set.delete(matchId);
      } else {
        set.add(matchId);
      }
      return { ...map, [canonicalId]: set };
    });
  }

  updateMergeAnswer(canonicalId: number, value: string): void {
    this.store.mergeAnswer.update((map) => ({ ...map, [canonicalId]: value }));
  }

  cancelMergeRow(pending: PendingItem): void {
    this.toggleMergeRow(pending);
  }

  commitMergeRow(pending: PendingItem): void {
    const answer = (this.store.mergeAnswer()[pending.id] ?? '').trim();
    if (!answer) {
      this.ui.error('Provide an answer before merging.');
      return;
    }
    const ids = [...(this.store.mergeSelected()[pending.id] ?? [])];
    this.store.merging.update((map) => ({ ...map, [pending.id]: true }));
    this.api.mergePending(pending.id, ids, answer).subscribe({
      next: (result) => {
        this.store.merging.update((map) => ({ ...map, [pending.id]: false }));
        this.removeMergeRow(pending.id);
        this.ui.success(
          `Created ${result.created} FAQ${result.created === 1 ? '' : 's'} and resolved ${result.resolved}.`,
        );
        this.data.refresh();
      },
      error: (error: Error) => {
        this.store.merging.update((map) => ({ ...map, [pending.id]: false }));
        this.ui.error(error.message);
      },
    });
  }

  private removeMergeRow(id: number): void {
    this.store.mergePreview.update((map) => omitKey(map, id));
    this.store.mergeSelected.update((map) => omitKey(map, id));
    this.store.mergeAnswer.update((map) => omitKey(map, id));
  }
}
