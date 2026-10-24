import { NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  HostListener,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  untracked,
  viewChild,
} from '@angular/core';
import { AppIcon } from './app-icon';
import { AppPageInfo } from './app-page-info';
import { BackgroundTasksService } from './background-tasks.service';
import { activeElement, focusElement, lockPageScroll } from './overlay-browser';
import { PageInfoService } from './page-info.service';
import { RightSidebarService } from './right-sidebar.service';

/**
 * The one details panel of the app. It overlays the page from the right so
 * the page keeps its layout, and it closes with the backdrop, the close
 * button or Escape. Without page details it shows the page information: the
 * page title, its description, its state and actions, and the engine facts.
 */
@Component({
  selector: 'app-right-sidebar',
  standalone: true,
  imports: [NgTemplateOutlet, AppPageInfo, AppIcon],
  templateUrl: './app-right-sidebar.html',
  styleUrls: ['./app-right-sidebar.css', './background-tasks.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppRightSidebar {
  protected readonly sidebar = inject(RightSidebarService);
  protected readonly info = inject(PageInfoService);
  protected readonly tasks = inject(BackgroundTasksService);

  /** With no page details, the panel answers with the page information. */
  protected readonly infoMode = computed(() => this.sidebar.info() || !this.sidebar.details());

  protected readonly eyebrow = computed(() =>
    this.infoMode() ? this.info.page().scope : 'Sidebar',
  );

  protected readonly title = computed(() =>
    this.infoMode()
      ? this.info.page().title
      : (this.sidebar.details()?.title ?? this.info.page().title),
  );

  protected readonly subtitle = computed(() =>
    this.infoMode() ? this.info.page().description : this.sidebar.details()?.subtitle,
  );

  protected readonly showTasks = computed(
    () =>
      this.tasks.tasks().length > 0 &&
      (this.infoMode() || this.sidebar.details()?.showTasks !== false),
  );

  private readonly platformId = inject(PLATFORM_ID);
  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('closeButton');
  private lastFocused: HTMLElement | null = null;

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;

    // Opening the panel reads the tasks and the engine state once more, so it
    // never shows a stale list; the app keeps the reading going afterwards.
    effect(() => {
      const open = this.sidebar.isOpen();
      const info = this.sidebar.info();
      const details = this.sidebar.details();
      const needsReading = info || !details || details.showTasks !== false;
      if (open && needsReading) untracked(() => this.tasks.start());
    });

    effect((onCleanup) => {
      if (!this.sidebar.isOpen()) return;
      onCleanup(lockPageScroll());
    });

    effect(() => {
      if (!this.sidebar.isOpen()) {
        focusElement(this.lastFocused);
        this.lastFocused = null;
        return;
      }
      this.lastFocused = activeElement();
      queueMicrotask(() => {
        if (this.sidebar.isOpen()) focusElement(this.closeButton()?.nativeElement);
      });
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.sidebar.isOpen()) this.sidebar.close();
  }
}
