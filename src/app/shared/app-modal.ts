import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  effect,
  inject,
  input,
  output,
  type ElementRef,
  viewChild,
} from '@angular/core';
import { AppIcon } from './app-icon';
import { activeElement, focusElement, lockPageScroll } from './overlay-browser';

let nextModalId = 1;

/**
 * The one dialog surface of the product. It blocks the page, closes with the
 * close button, the backdrop or Escape, restores the focus it took, and lets
 * the caller project both the body and a labelled row of decisions.
 */
@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [AppIcon],
  templateUrl: './app-modal.html',
  styleUrls: ['./app-modal.css', './controls.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppModal {
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly size = input<'standard' | 'wide'>('standard');
  readonly closable = input(true);
  readonly closed = output<void>();

  protected readonly titleId = `app-modal-title-${nextModalId++}`;
  private readonly dialog = viewChild<ElementRef<HTMLElement>>('dialog');
  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');
  private lastFocused: HTMLElement | null = null;

  constructor() {
    effect(() => {
      if (!this.open()) {
        this.restoreFocus();
        return;
      }
      this.lastFocused = activeElement();
      queueMicrotask(() => {
        if (!this.open()) return;
        focusElement(this.closeButton()?.nativeElement ?? this.dialog()?.nativeElement);
      });
    });

    effect((onCleanup) => {
      if (!this.open()) return;
      onCleanup(lockPageScroll());
    });

    inject(DestroyRef).onDestroy(() => this.restoreFocus());
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open() && this.closable()) this.requestClose();
  }

  protected requestClose(): void {
    this.closed.emit();
  }

  protected onBackdrop(event: MouseEvent): void {
    if (event.target !== event.currentTarget) return;
    if (this.closable()) this.requestClose();
  }

  private restoreFocus(): void {
    focusElement(this.lastFocused);
    this.lastFocused = null;
  }
}
