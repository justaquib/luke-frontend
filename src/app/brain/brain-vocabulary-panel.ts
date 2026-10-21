import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  type OnInit,
  output,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { LanguageModelApiService } from '../core/api/language-model-api.service';

/**
 * The panel that lists every word the answering model can write with. The
 * list is long, so it is read a hundred words at a time as it is scrolled.
 */
@Component({
  selector: 'app-brain-vocabulary-panel',
  standalone: true,
  templateUrl: './brain-vocabulary-panel.html',
  styleUrl: './brain-vocabulary-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrainVocabularyPanel implements OnInit {
  private readonly api = inject(LanguageModelApiService);
  private readonly platformId = inject(PLATFORM_ID);

  /** Raised when the trainer closes the panel. */
  readonly closed = output<void>();

  protected readonly words = signal<string[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly finished = signal(false);

  ngOnInit(): void {
    // The server has no session, so the words are read in the browser.
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadPage();
  }

  /** Bring the next hundred words. */
  protected loadPage(): void {
    if (this.loading() || this.finished()) return;
    this.loading.set(true);
    const offset = this.words().length;
    this.api.languageModelWords(offset, 100).subscribe({
      next: (page) => {
        const seen = new Set(this.words());
        const fresh = page.words.filter((word) => !seen.has(word));
        this.words.update((words) => [...words, ...fresh]);
        this.total.set(page.total);
        this.finished.set(!page.has_more);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /** When the list is scrolled to its end, the next hundred words arrive. */
  protected onScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const nearEnd = element.scrollHeight - element.scrollTop - element.clientHeight < 160;
    if (nearEnd) this.loadPage();
  }
}
