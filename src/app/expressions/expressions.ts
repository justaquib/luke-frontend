import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  inject,
  signal,
  type OnInit,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  ExpressionsApiService,
  type ExpressionCategory,
  type ExpressionDraft,
  type ExpressionView,
  type TaughtExpression,
} from '../core/api/expressions-api.service';
import { AppCardInfo } from '../shared/app-card-info';
import { AppEngineFacts, type EngineFact } from '../shared/app-engine-facts';
import { AppIcon, type IconName } from '../shared/app-icon';
import { AppModal } from '../shared/app-modal';
import { AppShell } from '../shared/app-shell';
import { PageInfoActions } from '../shared/page-info-actions';
import { PageInfoFacts } from '../shared/page-info-facts';
import { UiService } from '../shared/ui.service';

const CATEGORY_ICONS: Readonly<Record<ExpressionCategory, IconName>> = {
  open: 'send',
  close: 'logout',
  pause: 'stop',
  resume: 'play',
};

const EMPTY_DRAFT: ExpressionDraft = { category: 'open', phrase: '', reply: '' };

/**
 * The four moments a trainer can give Luke words to: opening a conversation,
 * closing it, pausing it and resuming it. A taught phrase replaces the
 * built-in small talk for that exact message and joins the training material.
 */
@Component({
  selector: 'app-expressions',
  standalone: true,
  imports: [
    AppShell,
    AppIcon,
    AppCardInfo,
    AppEngineFacts,
    AppModal,
    PageInfoActions,
    PageInfoFacts,
  ],
  templateUrl: './expressions.html',
  styleUrls: ['./expressions.css', '../shared/controls.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Expressions implements OnInit {
  private readonly api = inject(ExpressionsApiService);
  private readonly ui = inject(UiService);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly view = signal<ExpressionView | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly dialogOpen = signal(false);
  protected readonly editing = signal<TaughtExpression | null>(null);
  protected readonly saving = signal(false);
  protected readonly removing = signal<string | null>(null);
  protected readonly draft = signal<ExpressionDraft>({ ...EMPTY_DRAFT });

  protected readonly categories = computed(() => this.view()?.categories ?? []);
  protected readonly limits = computed(() => this.view()?.limits ?? null);
  protected readonly total = computed(() => this.view()?.items.length ?? 0);
  protected readonly dialogTitle = computed(() =>
    this.editing() ? 'Edit expression' : 'Teach an expression',
  );

  protected readonly facts = computed<readonly EngineFact[]>(() => {
    const categories = this.categories();
    const count = (id: ExpressionCategory): number =>
      categories.find((category) => category.id === id)?.count ?? 0;
    const limit = this.limits();
    return [
      {
        label: 'Expressions',
        value: String(this.total()),
        note: limit ? `of ${limit.items} taught` : 'reading…',
      },
      { label: 'Opening', value: String(count('open')), note: 'start a conversation' },
      { label: 'Closing', value: String(count('close')), note: 'end a conversation' },
      {
        label: 'Pause / resume',
        value: `${count('pause')} / ${count('resume')}`,
        note: 'step away and come back',
      },
    ];
  });

  private readonly itemsByCategory = computed(() => {
    const groups = new Map<string, TaughtExpression[]>();
    for (const category of this.categories()) groups.set(category.id, []);
    for (const item of this.view()?.items ?? []) {
      const list = groups.get(item.category);
      if (list) {
        list.push(item);
      } else {
        groups.set(item.category, [item]);
      }
    }
    return groups;
  });

  ngOnInit(): void {
    // The server has no session, so the expressions are read in the browser.
    if (!isPlatformBrowser(this.platformId)) return;
    this.load();
  }

  protected load(): void {
    this.error.set(null);
    this.api.list().subscribe({
      next: (view) => {
        this.view.set(view);
      },
      error: (error: Error) => {
        this.view.set(null);
        this.error.set(error.message);
      },
    });
  }

  protected itemsFor(category: ExpressionCategory): readonly TaughtExpression[] {
    return this.itemsByCategory().get(category) ?? [];
  }

  protected iconFor(category: ExpressionCategory): IconName {
    return CATEGORY_ICONS[category];
  }

  protected openAdd(category: ExpressionCategory = 'open'): void {
    if (!this.view()) return;
    this.editing.set(null);
    this.draft.set({ ...EMPTY_DRAFT, category });
    this.dialogOpen.set(true);
  }

  protected openEdit(item: TaughtExpression): void {
    this.editing.set(item);
    this.draft.set({ category: item.category, phrase: item.phrase, reply: item.reply });
    this.dialogOpen.set(true);
  }

  protected closeDialog(): void {
    if (this.saving()) return;
    this.dialogOpen.set(false);
    this.editing.set(null);
    this.draft.set({ ...EMPTY_DRAFT });
  }

  protected updateDraft(field: keyof ExpressionDraft, value: string): void {
    this.draft.update((current) => ({ ...current, [field]: value }));
  }

  protected save(): void {
    if (this.saving()) return;
    const draft = this.draft();
    const phrase = draft.phrase.trim();
    const reply = draft.reply.trim();
    if (!phrase || !reply) {
      this.ui.error('Write both the phrase and the reply before saving.');
      return;
    }
    const body: ExpressionDraft = { category: draft.category, phrase, reply };
    const editing = this.editing();
    const request = editing ? this.api.update(editing.id, body) : this.api.add(body);
    this.saving.set(true);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogOpen.set(false);
        this.editing.set(null);
        this.ui.success(editing ? 'Expression updated.' : 'Expression taught.');
        this.load();
      },
      error: (error: Error) => {
        this.saving.set(false);
        this.ui.error(error.message);
      },
    });
  }

  protected remove(item: TaughtExpression): void {
    this.ui
      .confirmDialog({
        title: `Remove “${item.phrase}”?`,
        message: 'Luke stops answering this phrase with the taught reply.',
        confirmLabel: 'Remove expression',
        danger: true,
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.removing.set(item.id);
        this.api.remove(item.id).subscribe({
          next: () => {
            this.removing.set(null);
            this.ui.success('Expression removed.');
            this.load();
          },
          error: (error: Error) => {
            this.removing.set(null);
            this.ui.error(error.message);
          },
        });
      });
  }
}
