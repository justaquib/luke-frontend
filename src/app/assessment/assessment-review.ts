import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { AssessmentApiService } from '../core/api/assessment-api.service';
import type { AssessmentResult } from '../core/api/assessment.types';
import { AppModal } from '../shared/app-modal';
import { UiService } from '../shared/ui.service';

const DEFAULT_SCORE = 50;

/** Scores one skill's waiting rubric answers, judged by the trainer alone. */
@Component({
  selector: 'app-assessment-review',
  standalone: true,
  imports: [AppModal],
  templateUrl: './assessment-review.html',
  styleUrl: './assessment-review.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssessmentReview {
  private readonly api = inject(AssessmentApiService);
  private readonly ui = inject(UiService);

  readonly open = input(false);
  readonly skillTitle = input.required<string>();
  readonly results = input.required<readonly AssessmentResult[]>();
  readonly closed = output<void>();
  readonly saved = output<void>();

  protected readonly waiting = signal<readonly AssessmentResult[]>([]);
  protected readonly current = computed(() => this.waiting()[0] ?? null);
  protected readonly percent = signal<number | null>(DEFAULT_SCORE);
  protected readonly note = signal('');
  protected readonly saving = signal(false);

  private wasOpen = false;

  constructor() {
    effect(() => {
      const open = this.open();
      if (open && !this.wasOpen) {
        this.waiting.set(untracked(() => this.results()));
        this.reset();
      }
      this.wasOpen = open;
    });
  }

  protected setPercent(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.percent.set(Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : null);
  }

  protected setNote(event: Event): void {
    this.note.set((event.target as HTMLInputElement).value);
  }

  protected close(): void {
    if (this.saving()) return;
    this.closed.emit();
  }

  protected save(): void {
    const item = this.current();
    const percent = this.percent();
    if (!item || this.saving()) return;
    if (percent === null) {
      this.ui.error('Enter a score between 0 and 100 before saving.');
      return;
    }
    this.saving.set(true);
    this.api.review(item.id, percent / 100, this.note().trim()).subscribe({
      next: () => {
        this.saving.set(false);
        this.waiting.update((list) => list.slice(1));
        this.reset();
        this.ui.success('Rubric answer scored.');
        this.saved.emit();
        if (!this.waiting().length) this.closed.emit();
      },
      error: (error: Error) => {
        this.saving.set(false);
        this.ui.error(error.message);
      },
    });
  }

  private reset(): void {
    this.percent.set(DEFAULT_SCORE);
    this.note.set('');
  }
}
