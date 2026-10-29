import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { BrowserService } from '../core/browser.service';
import { AppIcon } from './app-icon';
import { UiService } from './ui.service';

/** How long the copy button keeps showing that the code was copied. */
const COPIED_LABEL_MS = 1600;

/**
 * One fenced block from an answer, shown the way the editor shows it: the
 * language it was written in, its line count, numbered lines that keep their
 * own indentation, and one action that puts the exact code on the clipboard.
 */
@Component({
  selector: 'app-code-block',
  standalone: true,
  imports: [AppIcon],
  templateUrl: './code-block.html',
  styleUrls: ['./code-block.css', './controls.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeBlock {
  readonly code = input.required<string>();
  readonly language = input('');

  private readonly browser = inject(BrowserService);
  private readonly ui = inject(UiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly lines = computed(() => this.code().split('\n'));
  protected readonly label = computed(() => this.language() || 'code');
  protected readonly count = computed(() => {
    const total = this.lines().length;
    return total === 1 ? '1 line' : `${total} lines`;
  });
  protected readonly copied = signal(false);

  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.timer));
  }

  protected copy(event: MouseEvent): void {
    event.stopPropagation();
    this.browser.copyText(this.code()).then(
      () => this.reportCopied(),
      () => this.ui.error('Could not copy the code.'),
    );
  }

  private reportCopied(): void {
    this.copied.set(true);
    this.ui.success('Code copied.');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.copied.set(false), COPIED_LABEL_MS);
  }
}
