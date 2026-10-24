import {
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
  computed,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  ApiService,
  FaqItem,
  PendingItem,
  MergePreview,
  MergeMatch,
  IntentSuggestions,
  FaqSuggestion,
  FaqMergePreview,
} from '../core/api.service';
import { UiService } from '../shared/ui.service';
import { AppEngineFacts, type EngineFact } from '../shared/app-engine-facts';
import { SafeUrlPipe } from '../shared/safe-url.pipe';
import { PageInfoActions } from '../shared/page-info-actions';
import { AppShell } from '../shared/app-shell';
import { AppIcon } from '../shared/app-icon';
import { RightSidebarService } from '../shared/right-sidebar.service';

type Tab = 'inbox' | 'faqs' | 'merge' | 'new' | 'documents';
type StatusFilter = 'all' | 'pending' | 'approved' | 'declined' | 'duplicate';

interface DuplicateGroup {
  key: string;
  items: FaqItem[];
}

interface IntentGroup {
  answerKey: string;
  canonical: FaqItem;
  aliases: FaqItem[];
}

/** The trainer's mark on the shared right sidebar, so it clears only its own. */
const SIDEBAR_OWNER = 'trainer';

@Component({
  selector: 'app-trainer',
  imports: [
    FormsModule,
    DatePipe,
    CommonModule,
    SafeUrlPipe,
    AppShell,
    PageInfoActions,
    AppIcon,
    AppEngineFacts,
  ],
  templateUrl: './trainer.html',
  styleUrl: './trainer.css',
})
export class Trainer implements OnInit, OnDestroy {
  private readonly api = inject(ApiService);
  private readonly ui = inject(UiService);
  private readonly route = inject(ActivatedRoute);
  private readonly sidebar = inject(RightSidebarService);

  protected readonly tab = signal<Tab>('inbox');
  protected readonly inbox = signal<PendingItem[]>([]);
  protected readonly includeResolved = signal(false);
  protected readonly faqs = signal<FaqItem[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected readonly faqSearch = signal('');
  protected readonly showDuplicatesOnly = signal(false);
  protected readonly statusFilter = signal<StatusFilter>('all');

  protected readonly editingId = signal<number | null>(null);
  protected readonly editingAnswer = signal('');

  protected readonly selectedFaqId = signal<number | null>(null);
  protected readonly selectedFaq = computed<FaqItem | null>(() => {
    const id = this.selectedFaqId();
    return id === null ? null : (this.faqById(id) ?? null);
  });
  private readonly faqDetails = viewChild.required<TemplateRef<unknown>>('faqDetails');

  protected readonly filteredFaqs = computed<FaqItem[]>(() => {
    const q = this.faqSearch().trim().toLowerCase();
    const status = this.statusFilter();
    const all = this.faqs().filter((f) => status === 'all' || f.status === status);
    if (!q && !this.showDuplicatesOnly()) return all;
    return all.filter((f) => {
      const matchesQuery =
        !q || f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q);
      const inDupGroup = !this.showDuplicatesOnly() || this.isDuplicate(f, this.faqs());
      return matchesQuery && inDupGroup;
    });
  });

  protected readonly duplicateGroups = computed<DuplicateGroup[]>(() => {
    const groups = new Map<string, FaqItem[]>();
    for (const f of this.faqs()) {
      const key = this.normalize(f.question);
      if (!key) continue;
      const list = groups.get(key) ?? [];
      list.push(f);
      groups.set(key, list);
    }
    return [...groups.entries()]
      .filter(([, items]) => items.length > 1)
      .map(([key, items]) => ({
        key,
        items: items.sort((a, b) => a.id - b.id),
      }));
  });

  protected readonly statusCounts = computed<Record<StatusFilter, number>>(() => {
    const counts: Record<StatusFilter, number> = {
      all: 0,
      pending: 0,
      approved: 0,
      declined: 0,
      duplicate: 0,
    };
    for (const f of this.faqs()) {
      counts.all++;
      counts[f.status]++;
    }
    return counts;
  });

  protected readonly intentGroups = computed<IntentGroup[]>(() => {
    const groups = new Map<string, FaqItem[]>();
    for (const f of this.faqs()) {
      if (f.status === 'declined' || f.status === 'duplicate') continue;
      const key = (f.answer || '').trim().toLowerCase();
      if (!key) continue;
      const list = groups.get(key) ?? [];
      list.push(f);
      groups.set(key, list);
    }
    const out: IntentGroup[] = [];
    for (const [answerKey, items] of groups) {
      if (items.length < 2) continue;
      items.sort((a, b) => a.id - b.id);
      const canonical = items.find((f) => f.status === 'approved') ?? items[0];
      out.push({
        answerKey,
        canonical,
        aliases: items.filter((f) => f.id !== canonical.id),
      });
    }
    out.sort((a, b) => b.aliases.length - a.aliases.length);
    return out;
  });

  protected readonly faqIntentInfo = computed<
    Map<number, { canonicalId: number; variantCount: number; isAlias: boolean }>
  >(() => {
    const map = new Map<number, { canonicalId: number; variantCount: number; isAlias: boolean }>();
    for (const g of this.intentGroups()) {
      const variantCount = g.aliases.length + 1;
      map.set(g.canonical.id, {
        canonicalId: g.canonical.id,
        variantCount,
        isAlias: false,
      });
      for (const a of g.aliases) {
        map.set(a.id, {
          canonicalId: g.canonical.id,
          variantCount,
          isAlias: true,
        });
      }
    }
    return map;
  });

  protected readonly pendingCount = computed(() => this.inbox().filter((p) => !p.resolved).length);
  protected readonly faqCount = computed(() => this.faqs().length);
  protected readonly engineFacts = computed<readonly EngineFact[]>(() => {
    const trained = this.faqCount();
    const pending = this.pendingCount();
    return [
      { label: 'Trained answers', value: String(trained) },
      { label: 'Pending questions', value: String(pending) },
      { label: 'Corpus items', value: String(trained + pending), note: 'trained + waiting' },
    ];
  });

  intentVariantCount(f: FaqItem): number {
    return this.faqIntentInfo().get(f.id)?.variantCount ?? 0;
  }

  intentCanonicalId(f: FaqItem): number | null {
    return this.faqIntentInfo().get(f.id)?.canonicalId ?? null;
  }

  isIntentAlias(f: FaqItem): boolean {
    return !!this.faqIntentInfo().get(f.id)?.isAlias;
  }

  isIntentCanonical(f: FaqItem): boolean {
    const info = this.faqIntentInfo().get(f.id);
    return !!info && !info.isAlias;
  }

  protected newQuestion = '';
  protected newAnswer = '';
  protected answers = signal<Record<number, string>>({});

  protected readonly mergePreview = signal<Record<number, MergePreview>>({});
  protected readonly mergeSelected = signal<Record<number, Set<number>>>({});
  protected readonly mergeAnswer = signal<Record<number, string>>({});
  protected readonly merging = signal<Record<number, boolean>>({});

  protected readonly mergeQuery = signal('');
  protected readonly mergeLoading = signal(false);
  protected readonly mergeSuggestions = signal<IntentSuggestions | null>(null);
  protected readonly faqMergePreview = signal<FaqMergePreview | null>(null);
  protected readonly faqMergeSelected = signal<Set<number>>(new Set());
  protected readonly faqMergeAnswer = signal('');
  protected readonly faqMergeBusy = signal(false);
  protected readonly faqMergeTarget = signal<FaqItem | null>(null);

  protected readonly newMergeSuggestions = signal<IntentSuggestions | null>(null);
  protected readonly newMergeLoading = signal(false);

  protected readonly faqMergeSearch = signal('');
  protected readonly faqMergeExtraMatches = signal<FaqSuggestion[]>([]);

  protected readonly uploading = signal(false);
  protected readonly documents = signal<
    Array<{ source: string; chunks: number; created_at?: string }>
  >([]);
  protected readonly deletingSource = signal<string | null>(null);
  protected readonly viewingSource = signal<string | null>(null);
  protected readonly viewerUrl = signal<string | null>(null);

  uploadDocument(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploading.set(true);
    this.api.uploadFile(file).subscribe({
      next: (res) => {
        this.uploading.set(false);
        this.ui.success(`Uploaded ${res.source} with ${res.chunks} chunks.`);
        this.refreshDocuments();
      },
      error: (e: Error) => {
        this.uploading.set(false);
        this.ui.error(e.message);
      },
    });
    input.value = '';
  }

  refreshDocuments() {
    this.api.listDocuments().subscribe({
      next: (rows) => this.documents.set(rows),
      error: () => this.documents.set([]),
    });
  }

  deleteDocument(source: string) {
    this.deletingSource.set(source);
    this.api.deleteDocument(source).subscribe({
      next: () => {
        this.ui.success(`Removed ${source}.`);
        this.refreshDocuments();
        this.deletingSource.set(null);
      },
      error: (e: Error) => {
        this.ui.error(e.message);
        this.deletingSource.set(null);
      },
    });
  }

  viewDocument(source: string) {
    this.viewingSource.set(source);
    this.viewerUrl.set(null);
    this.api.viewDocument(source).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        this.viewerUrl.set(url);
      },
      error: (e: Error) => {
        this.ui.error(e.message);
        this.viewingSource.set(null);
      },
    });
  }

  downloadDocument(source: string) {
    this.api.downloadDocument(source).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = source;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (e: Error) => this.ui.error(e.message),
    });
  }

  closeViewer() {
    const url = this.viewerUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }
    this.viewerUrl.set(null);
    this.viewingSource.set(null);
  }

  ngOnInit(): void {
    this.refresh();
    this.refreshDocuments();
    this.route.queryParamMap.subscribe((params) => {
      const teach = params.get('teach');
      const answer = params.get('answer');
      if (teach) {
        this.tab.set('new');
        this.newQuestion = teach;
        this.newAnswer = answer ?? '';
      }
    });
  }

  ngOnDestroy(): void {
    this.sidebar.clearDetails(SIDEBAR_OWNER);
  }

  setTab(t: Tab) {
    this.tab.set(t);
    this.error.set(null);
    this.closeFaq();
  }

  setStatusFilter(s: StatusFilter) {
    this.statusFilter.set(s);
  }

  refresh() {
    this.api.listInbox(this.includeResolved()).subscribe({
      next: (rows) => this.inbox.set(rows),
      error: (e: Error) => this.error.set(e.message),
    });
    this.api.listFaqs().subscribe({
      next: (rows) => {
        this.faqs.set(rows);
        const selected = this.selectedFaqId();
        if (selected !== null && !rows.some((f) => f.id === selected)) this.closeFaq();
      },
      error: (e: Error) => this.error.set(e.message),
    });
  }

  setAnswer(id: number, value: string) {
    this.answers.update((m) => ({ ...m, [id]: value }));
  }

  saveAnswer(p: PendingItem) {
    const answer = (this.answers()[p.id] ?? '').trim();
    if (!answer) {
      this.ui.error('Answer cannot be empty.');
      return;
    }
    this.saving.set(true);
    this.api.answerPending(p.id, answer).subscribe({
      next: () => {
        this.saving.set(false);
        this.answers.update((m) => {
          const { [p.id]: _drop, ...rest } = m;
          return rest;
        });
        this.ui.success('Trained answer saved.');
        this.refresh();
        this.statusFilter.set('pending');
        this.tab.set('faqs');
      },
      error: (e: Error) => {
        this.saving.set(false);
        this.ui.error(e.message);
      },
    });
  }

  toggleIncludeResolved() {
    this.includeResolved.update((v) => !v);
    this.refresh();
  }

  dismiss(p: PendingItem) {
    this.ui
      .confirmDialog({
        title: 'Skip this question?',
        message: `Skip and delete the pending question "${p.question}"?\nThis removes it from the inbox.`,
        confirmLabel: 'Skip & delete',
        cancelLabel: 'Keep',
        danger: true,
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.api.deletePending(p.id).subscribe({
          next: () => {
            this.ui.info('Question skipped.');
            this.refresh();
          },
          error: (e: Error) => this.ui.error(e.message),
        });
      });
  }

  deletePending(p: PendingItem) {
    this.ui
      .confirmDialog({
        title: 'Delete question?',
        message: `Delete the pending question "${p.question}"?`,
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        danger: true,
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.api.deletePending(p.id).subscribe({
          next: () => {
            this.ui.success('Question deleted.');
            this.refresh();
          },
          error: (e: Error) => this.ui.error(e.message),
        });
      });
  }

  toggleMergeRow(p: PendingItem) {
    const current = this.mergePreview()[p.id];
    if (current) {
      this.mergePreview.update((m) => {
        const { [p.id]: _drop, ...rest } = m;
        return rest;
      });
      this.mergeSelected.update((m) => {
        const { [p.id]: _drop, ...rest } = m;
        return rest;
      });
      this.mergeAnswer.update((m) => {
        const { [p.id]: _drop, ...rest } = m;
        return rest;
      });
      return;
    }
    this.api.previewMerge(p.id).subscribe({
      next: (preview) => {
        this.mergePreview.update((m) => ({ ...m, [p.id]: preview }));
        this.mergeSelected.update((m) => ({
          ...m,
          [p.id]: new Set(preview.matches.map((mm) => mm.pending_id)),
        }));
        this.mergeAnswer.update((m) => ({
          ...m,
          [p.id]: this.answers()[p.id] ?? '',
        }));
      },
      error: (e: Error) => this.ui.error(e.message),
    });
  }

  toggleMergeMatch(canonicalId: number, matchId: number) {
    this.mergeSelected.update((m) => {
      const set = new Set(m[canonicalId] ?? []);
      if (set.has(matchId)) set.delete(matchId);
      else set.add(matchId);
      return { ...m, [canonicalId]: set };
    });
  }

  isMergeMatchSelected(canonicalId: number, matchId: number): boolean {
    return !!this.mergeSelected()[canonicalId]?.has(matchId);
  }

  updateMergeAnswer(canonicalId: number, value: string) {
    this.mergeAnswer.update((m) => ({ ...m, [canonicalId]: value }));
  }

  cancelMergeRow(p: PendingItem) {
    this.toggleMergeRow(p);
  }

  commitMergeRow(p: PendingItem) {
    const answer = (this.mergeAnswer()[p.id] ?? '').trim();
    if (!answer) {
      this.ui.error('Provide an answer before merging.');
      return;
    }
    const ids = [...(this.mergeSelected()[p.id] ?? [])];
    this.merging.update((m) => ({ ...m, [p.id]: true }));
    this.api.mergePending(p.id, ids, answer).subscribe({
      next: (res) => {
        this.merging.update((m) => ({ ...m, [p.id]: false }));
        this.mergePreview.update((m) => {
          const { [p.id]: _drop, ...rest } = m;
          return rest;
        });
        this.mergeSelected.update((m) => {
          const { [p.id]: _drop, ...rest } = m;
          return rest;
        });
        this.mergeAnswer.update((m) => {
          const { [p.id]: _drop, ...rest } = m;
          return rest;
        });
        this.ui.success(
          `Created ${res.created} FAQ${res.created === 1 ? '' : 's'} and resolved ${res.resolved}.`,
        );
        this.refresh();
      },
      error: (e: Error) => {
        this.merging.update((m) => ({ ...m, [p.id]: false }));
        this.ui.error(e.message);
      },
    });
  }

  mergeMatchesFor(p: PendingItem): MergeMatch[] {
    return this.mergePreview()[p.id]?.matches ?? [];
  }

  isMerging(p: PendingItem): boolean {
    return !!this.merging()[p.id];
  }

  mergeRowOpen(p: PendingItem): boolean {
    return !!this.mergePreview()[p.id];
  }

  updateMergeQuery(value: string) {
    this.mergeQuery.set(value);
  }

  runIntentSuggestions() {
    const q = this.mergeQuery().trim();
    if (!q) {
      this.mergeSuggestions.set(null);
      return;
    }
    this.mergeLoading.set(true);
    this.api.intentSuggestions(q).subscribe({
      next: (s) => {
        this.mergeSuggestions.set(s);
        this.mergeLoading.set(false);
      },
      error: (e: Error) => {
        this.mergeLoading.set(false);
        this.ui.error(e.message);
      },
    });
  }

  clearMergeSuggestions() {
    this.mergeSuggestions.set(null);
    this.faqMergePreview.set(null);
    this.faqMergeSelected.set(new Set());
    this.faqMergeAnswer.set('');
    this.faqMergeTarget.set(null);
    this.faqMergeSearch.set('');
    this.faqMergeExtraMatches.set([]);
  }

  pickFaqMergeTarget(f: FaqItem) {
    this.faqMergeTarget.set(f);
    this.faqMergeAnswer.set(f.answer);
    this.faqMergeSelected.set(new Set());
    this.faqMergePreview.set(null);
    this.faqMergeSearch.set('');
    this.faqMergeExtraMatches.set([]);
    this.api.faqMergePreview(f.id).subscribe({
      next: (p) => {
        this.faqMergePreview.set(p);
        this.faqMergeSelected.set(new Set(p.matches.map((m) => m.faq_id)));
      },
      error: (e: Error) => this.ui.error(e.message),
    });
  }

  toggleFaqMergeSelection(faqId: number) {
    this.faqMergeSelected.update((s) => {
      const next = new Set(s);
      if (next.has(faqId)) next.delete(faqId);
      else next.add(faqId);
      return next;
    });
  }

  isFaqMergeSelected(faqId: number): boolean {
    return this.faqMergeSelected().has(faqId);
  }

  updateFaqMergeAnswer(value: string) {
    this.faqMergeAnswer.set(value);
  }

  updateFaqMergeSearch(value: string) {
    this.faqMergeSearch.set(value);
  }

  filteredFaqMergeCandidates(): FaqItem[] {
    const target = this.faqMergeTarget();
    const q = this.faqMergeSearch().trim().toLowerCase();
    if (!target) return [];
    const alreadySelected = this.faqMergeSelected();
    const alreadyShown = new Set<number>();
    const preview = this.faqMergePreview();
    if (preview) for (const m of preview.matches) alreadyShown.add(m.faq_id);
    let pool = this.faqs().filter(
      (f) => f.id !== target.id && !alreadySelected.has(f.id) && !alreadyShown.has(f.id),
    );
    if (q) {
      pool = pool.filter(
        (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q),
      );
    }
    return pool.slice(0, 20);
  }

  addFaqMergeCandidate(f: FaqItem) {
    this.faqMergeSelected.update((s) => {
      const next = new Set(s);
      next.add(f.id);
      return next;
    });
    this.faqMergeExtraMatches.update((list) => [
      ...list,
      {
        faq_id: f.id,
        question: f.question,
        answer: f.answer,
        status: f.status,
        distance: 0,
      },
    ]);
  }

  removeExtraMatch(faqId: number) {
    this.faqMergeExtraMatches.update((list) => list.filter((m) => m.faq_id !== faqId));
    this.faqMergeSelected.update((s) => {
      const next = new Set(s);
      next.delete(faqId);
      return next;
    });
  }

  commitFaqMerge() {
    const target = this.faqMergeTarget();
    const ids = [...this.faqMergeSelected()];
    const answer = this.faqMergeAnswer().trim();
    if (!target) return;
    if (ids.length === 0 && !answer) {
      this.ui.error('Pick at least one FAQ or change the answer.');
      return;
    }
    this.faqMergeBusy.set(true);
    this.api
      .faqMerge(target.id, {
        faq_ids: ids,
        answer: answer && answer !== target.answer ? answer : null,
      })
      .subscribe({
        next: (res) => {
          this.faqMergeBusy.set(false);
          this.clearMergeSuggestions();
          this.ui.success(
            `Merged ${res.absorbed} FAQ${res.absorbed === 1 ? '' : 's'} into #${res.canonical_faq_id} (${res.recreated} alias${res.recreated === 1 ? '' : 'es'} re-added).`,
          );
          this.refresh();
        },
        error: (e: Error) => {
          this.faqMergeBusy.set(false);
          this.ui.error(e.message);
        },
      });
  }

  cancelFaqMerge() {
    this.clearMergeSuggestions();
  }

  checkNewForMerge() {
    const q = this.newQuestion.trim();
    if (!q) {
      this.ui.error('Type a question first.');
      return;
    }
    this.newMergeLoading.set(true);
    this.api.intentSuggestions(q).subscribe({
      next: (s) => {
        this.newMergeSuggestions.set(s);
        this.newMergeLoading.set(false);
      },
      error: (e: Error) => {
        this.newMergeLoading.set(false);
        this.ui.error(e.message);
      },
    });
  }

  mergeNewIntoFaq(suggestion: FaqSuggestion) {
    const question = this.newQuestion.trim();
    const answer = this.newAnswer.trim();
    if (!question || !answer) {
      this.ui.error('Both question and answer are required to merge.');
      return;
    }
    const targetId = suggestion.faq_id;
    this.saving.set(true);
    this.api.createFaq(question, answer).subscribe({
      next: (created) => {
        this.api
          .faqMerge(targetId, {
            faq_ids: [created.id],
            answer: suggestion.answer,
          })
          .subscribe({
            next: (res) => {
              this.saving.set(false);
              this.newQuestion = '';
              this.newAnswer = '';
              this.newMergeSuggestions.set(null);
              this.ui.success(
                `Folded into #${res.canonical_faq_id} — ${res.recreated} alias${res.recreated === 1 ? '' : 'es'} re-added.`,
              );
              this.refresh();
              this.setTab('faqs');
            },
            error: (e: Error) => {
              this.saving.set(false);
              this.ui.error(e.message);
            },
          });
      },
      error: (e: Error) => {
        this.saving.set(false);
        this.ui.error(e.message);
      },
    });
  }

  createFaq() {
    const q = this.newQuestion.trim();
    const a = this.newAnswer.trim();
    if (!q || !a) {
      this.ui.error('Both question and answer are required.');
      return;
    }
    this.saving.set(true);
    this.api.createFaq(q, a).subscribe({
      next: () => {
        this.saving.set(false);
        this.newQuestion = '';
        this.newAnswer = '';
        this.ui.success('New Q&A created as pending.');
        this.refresh();
        this.statusFilter.set('pending');
        this.tab.set('faqs');
      },
      error: (e: Error) => {
        this.saving.set(false);
        this.ui.error(e.message);
      },
    });
  }

  openFaq(f: FaqItem) {
    if (this.editingId() !== f.id) this.cancelEdit();
    this.selectedFaqId.set(f.id);
    this.sidebar.show({
      owner: SIDEBAR_OWNER,
      title: 'Trained answer',
      subtitle: `Question and answer · #${f.id}`,
      template: this.faqDetails(),
    });
  }

  mergeFaq(f: FaqItem) {
    this.setTab('merge');
    this.pickFaqMergeTarget(f);
  }

  closeFaq() {
    this.selectedFaqId.set(null);
    this.cancelEdit();
    this.sidebar.clearDetails(SIDEBAR_OWNER);
  }

  startEdit(f: FaqItem) {
    this.editingId.set(f.id);
    this.editingAnswer.set(f.answer);
  }

  cancelEdit() {
    this.editingId.set(null);
    this.editingAnswer.set('');
  }

  saveEdit(f: FaqItem) {
    const answer = this.editingAnswer().trim();
    if (!answer) {
      this.ui.error('Answer cannot be empty.');
      return;
    }
    this.saving.set(true);
    this.api.updateFaq(f.id, answer).subscribe({
      next: () => {
        this.saving.set(false);
        this.cancelEdit();
        this.ui.success('Answer updated.');
        this.refresh();
      },
      error: (e: Error) => {
        this.saving.set(false);
        this.ui.error(e.message);
      },
    });
  }

  approve(f: FaqItem) {
    this.api.setFaqStatus(f.id, 'approved').subscribe({
      next: () => {
        this.ui.success(`Approved #${f.id}.`);
        this.refresh();
      },
      error: (e: Error) => this.ui.error(e.message),
    });
  }

  decline(f: FaqItem) {
    this.api.setFaqStatus(f.id, 'declined').subscribe({
      next: () => {
        this.ui.info(`Declined #${f.id}.`);
        this.refresh();
      },
      error: (e: Error) => this.ui.error(e.message),
    });
  }

  markDuplicate(f: FaqItem) {
    this.api.setFaqStatus(f.id, 'duplicate').subscribe({
      next: () => {
        this.ui.info(`Marked #${f.id} as duplicate.`);
        this.refresh();
      },
      error: (e: Error) => this.ui.error(e.message),
    });
  }

  deleteFaq(f: FaqItem) {
    this.ui
      .confirmDialog({
        title: 'Delete trained answer?',
        message: `Delete the trained answer for "${f.question}"?`,
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        danger: true,
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.api.deleteFaq(f.id).subscribe({
          next: () => {
            this.ui.success('Trained answer deleted.');
            this.forgetFaqs([f]);
            this.refresh();
          },
          error: (e: Error) => this.ui.error(e.message),
        });
      });
  }

  private forgetFaqs(faqs: FaqItem[]): void {
    const selected = this.selectedFaqId();
    if (selected === null) return;
    if (faqs.some((f) => f.id === selected)) this.closeFaq();
  }

  deleteFaqs(faqs: FaqItem[]) {
    const labels = faqs.map((f) => `  • ${f.id}. ${f.question}`).join('\n');
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
        if (!ok) return;
        let remaining = faqs.length;
        for (const f of faqs) {
          this.api.deleteFaq(f.id).subscribe({
            next: () => {
              if (--remaining === 0) {
                this.ui.success(`${faqs.length} trained answers removed.`);
                this.forgetFaqs(faqs);
                this.refresh();
              }
            },
            error: (e: Error) => this.ui.error(e.message),
          });
        }
      });
  }

  toggleDuplicates() {
    this.showDuplicatesOnly.update((v) => !v);
  }

  clearSearch() {
    this.faqSearch.set('');
    this.showDuplicatesOnly.set(false);
    this.statusFilter.set('all');
  }

  trackFaq = (_: number, f: FaqItem) => f.id;
  trackGroup = (_: number, g: DuplicateGroup) => g.key;

  faqById(id: number): FaqItem | undefined {
    return this.faqs().find((f) => f.id === id);
  }

  pendingById(id: number): PendingItem | undefined {
    return this.inbox().find((p) => p.id === id);
  }

  private isDuplicate(f: FaqItem, all: FaqItem[]): boolean {
    const key = this.normalize(f.question);
    if (!key) return false;
    let count = 0;
    for (const other of all) {
      if (this.normalize(other.question) === key) count++;
      if (count > 1) return true;
    }
    return false;
  }

  private normalize(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
