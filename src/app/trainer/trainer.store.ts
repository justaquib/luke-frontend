import { Injectable, computed, signal } from '@angular/core';
import type {
  DocumentItem,
  FaqItem,
  FaqMergePreview,
  FaqSuggestion,
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
  TrainerStats,
  TrainerTab,
} from './trainer.types';

@Injectable({ providedIn: 'root' })
export class TrainerStore {
  readonly tab = signal<TrainerTab>('inbox');
  readonly inbox = signal<PendingItem[]>([]);
  readonly includeResolved = signal(false);
  readonly faqs = signal<FaqItem[]>([]);
  readonly stats = signal<TrainerStats | null>(null);
  readonly error = signal<string | null>(null);
  readonly saving = signal(false);

  readonly faqSearch = signal('');
  readonly showDuplicatesOnly = signal(false);
  readonly statusFilter = signal<StatusFilter>('all');

  readonly editingId = signal<number | null>(null);
  readonly editingAnswer = signal('');

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
  readonly documents = signal<DocumentItem[]>([]);
  readonly deletingSource = signal<string | null>(null);
  readonly viewingSource = signal<string | null>(null);
  readonly viewerUrl = signal<string | null>(null);

  readonly filteredFaqs = computed<FaqItem[]>(() =>
    filterFaqs(this.faqs(), this.faqSearch(), this.statusFilter(), this.showDuplicatesOnly()),
  );

  readonly duplicateGroups = computed<DuplicateGroup[]>(() => buildDuplicateGroups(this.faqs()));

  readonly statusCounts = computed<Record<StatusFilter, number>>(() => countStatuses(this.faqs()));

  readonly intentGroups = computed<IntentGroup[]>(() => buildIntentGroups(this.faqs()));

  readonly faqIntentInfo = computed<Map<number, IntentInfo>>(() =>
    buildIntentInfo(this.intentGroups()),
  );

  readonly pendingCount = computed(() => this.inbox().filter((item) => !item.resolved).length);
  readonly faqCount = computed(() => this.faqs().length);

  setTab(tab: TrainerTab): void {
    this.tab.set(tab);
    this.error.set(null);
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

  pendingById(id: number): PendingItem | undefined {
    return this.inbox().find((pending) => pending.id === id);
  }
}
