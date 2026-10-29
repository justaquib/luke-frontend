import { Injectable, computed, signal } from '@angular/core';
import type { EngineFact } from '../shared/app-engine-facts';
import type {
  DocumentItem,
  FaqItem,
  FaqMergePreview,
  FaqSuggestion,
  IngestJob,
  IntentSuggestions,
  MergeMatch,
  MergePreview,
  PendingItem,
} from '../core/api/api-models';
import {
  buildDuplicateGroups,
  buildIntentGroups,
  buildIntentInfo,
  countStatuses,
  filterFaqs,
} from './trainer.utils';
import type {
  DuplicateGroup,
  IntentGroup,
  IntentInfo,
  StatusFilter,
  TrainerTab,
} from './trainer.types';

/** The trainer's screen state: the corpus, the selected row and each panel's input. */
@Injectable({ providedIn: 'root' })
export class TrainerStore {
  readonly tab = signal<TrainerTab>('inbox');
  readonly inbox = signal<PendingItem[]>([]);
  readonly faqs = signal<FaqItem[]>([]);
  /** Why the last reading of the corpus failed, or null. A failed read is not an empty corpus. */
  readonly corpusError = signal<string | null>(null);
  /** Why the last reading of the document list failed, or null. */
  readonly documentsError = signal<string | null>(null);
  readonly saving = signal(false);

  readonly faqSearch = signal('');
  readonly showDuplicatesOnly = signal(false);
  readonly statusFilter = signal<StatusFilter>('all');

  readonly editingId = signal<number | null>(null);
  readonly editingAnswer = signal('');
  readonly selectedFaqId = signal<number | null>(null);

  readonly newQuestion = signal('');
  readonly newAnswer = signal('');
  readonly answers = signal<Record<number, string>>({});

  readonly mergePreview = signal<Record<number, MergePreview>>({});
  readonly mergeSelected = signal<Record<number, Set<number>>>({});
  readonly mergeAnswer = signal<Record<number, string>>({});
  readonly merging = signal<Record<number, boolean>>({});

  readonly mergeQuery = signal('');
  readonly mergeLoading = signal(false);
  readonly mergeSuggestions = signal<IntentSuggestions | null>(null);
  readonly faqMergePreview = signal<FaqMergePreview | null>(null);
  readonly faqMergeSelected = signal<Set<number>>(new Set());
  readonly faqMergeAnswer = signal('');
  readonly faqMergeBusy = signal(false);
  readonly faqMergeTarget = signal<FaqItem | null>(null);

  readonly newMergeSuggestions = signal<IntentSuggestions | null>(null);
  readonly newMergeLoading = signal(false);

  readonly faqMergeSearch = signal('');
  readonly faqMergeExtraMatches = signal<FaqSuggestion[]>([]);

  readonly uploading = signal(false);
  readonly uploadJob = signal<IngestJob | null>(null);
  readonly documents = signal<DocumentItem[]>([]);
  readonly deletingSource = signal<string | null>(null);
  readonly viewingSource = signal<string | null>(null);
  readonly viewerUrl = signal<string | null>(null);

  readonly selectedFaq = computed<FaqItem | null>(() => {
    const id = this.selectedFaqId();
    return id === null ? null : (this.faqById(id) ?? null);
  });

  readonly filteredFaqs = computed<FaqItem[]>(() =>
    filterFaqs(this.faqs(), this.faqSearch(), this.statusFilter(), this.showDuplicatesOnly()),
  );

  readonly duplicateGroups = computed<DuplicateGroup[]>(() => buildDuplicateGroups(this.faqs()));

  readonly statusCounts = computed<Record<StatusFilter, number>>(() => countStatuses(this.faqs()));

  /** The same counts as text: a corpus that did not read has no count to show. */
  readonly statusCountText = computed<Record<StatusFilter, string>>(() => {
    const unread = this.corpusError() !== null;
    const counts = this.statusCounts();
    const show = (value: number): string => (unread ? '—' : String(value));
    return {
      all: show(counts.all),
      pending: show(counts.pending),
      approved: show(counts.approved),
      declined: show(counts.declined),
      duplicate: show(counts.duplicate),
    };
  });

  readonly intentGroups = computed<IntentGroup[]>(() => buildIntentGroups(this.faqs()));

  readonly faqIntentInfo = computed<Map<number, IntentInfo>>(() =>
    buildIntentInfo(this.intentGroups()),
  );

  readonly filtersActive = computed(
    () => !!this.faqSearch() || this.showDuplicatesOnly() || this.statusFilter() !== 'all',
  );

  readonly pendingCount = computed(() => this.inbox().length);
  readonly faqCount = computed(() => this.faqs().length);

  readonly engineFacts = computed<readonly EngineFact[]>(() => {
    // A corpus that failed to read has no count to report.
    const unread = this.corpusError() !== null;
    const trained = this.faqCount();
    const pending = this.pendingCount();
    return [
      {
        label: 'Trained answers',
        value: unread ? 'not read' : String(trained),
        tone: unread ? 'bad' : undefined,
      },
      {
        label: 'Pending questions',
        value: unread ? 'not read' : String(pending),
        tone: unread ? 'bad' : undefined,
      },
      {
        label: 'Corpus items',
        value: unread ? 'not read' : String(trained + pending),
        note: unread ? undefined : 'trained + waiting',
        tone: unread ? 'bad' : undefined,
      },
    ];
  });

  setTab(tab: TrainerTab): void {
    this.tab.set(tab);
  }

  setStatusFilter(status: StatusFilter): void {
    this.statusFilter.set(status);
  }

  intentVariantCount(faq: FaqItem): number {
    return this.faqIntentInfo().get(faq.id)?.variantCount ?? 0;
  }

  intentCanonicalId(faq: FaqItem): number | null {
    return this.faqIntentInfo().get(faq.id)?.canonicalId ?? null;
  }

  isIntentAlias(faq: FaqItem): boolean {
    return !!this.faqIntentInfo().get(faq.id)?.isAlias;
  }

  isIntentCanonical(faq: FaqItem): boolean {
    const info = this.faqIntentInfo().get(faq.id);
    return !!info && !info.isAlias;
  }

  mergeMatchesFor(pending: PendingItem): MergeMatch[] {
    return this.mergePreview()[pending.id]?.matches ?? [];
  }

  isMerging(pending: PendingItem): boolean {
    return !!this.merging()[pending.id];
  }

  mergeRowOpen(pending: PendingItem): boolean {
    return !!this.mergePreview()[pending.id];
  }

  isMergeMatchSelected(canonicalId: number, matchId: number): boolean {
    return !!this.mergeSelected()[canonicalId]?.has(matchId);
  }

  isFaqMergeSelected(faqId: number): boolean {
    return this.faqMergeSelected().has(faqId);
  }

  faqById(id: number): FaqItem | undefined {
    return this.faqs().find((faq) => faq.id === id);
  }

  canonicalFaq(faq: FaqItem): FaqItem | null {
    const id = this.intentCanonicalId(faq);
    return id === null ? null : (this.faqById(id) ?? null);
  }

  pendingById(id: number): PendingItem | undefined {
    return this.inbox().find((pending) => pending.id === id);
  }
}
