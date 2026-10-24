import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { AppPrefsService } from '../core/app-prefs.service';
import { DesignService } from '../core/design.service';
import { AppIcon } from './app-icon';
import { PageInfoService } from './page-info.service';
import { RightSidebarService } from './right-sidebar.service';

/**
 * The one top panel of the frame: the brand and navigation control on the
 * left, the current page and its scope in the middle, and the page action,
 * info, settings and details controls on the right.
 */
@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [NgTemplateOutlet, RouterLink, AppIcon],
  templateUrl: './app-top-bar.html',
  styleUrls: ['./app-top-bar.css', './app-top-bar-context.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppTopBar {
  private readonly prefs = inject(AppPrefsService);
  private readonly router = inject(Router);
  protected readonly design = inject(DesignService);
  protected readonly info = inject(PageInfoService);
  protected readonly sidebar = inject(RightSidebarService);

  readonly botName = this.prefs.botName;
  readonly navControls = input('app-sidebar');

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly settingsOpen = computed(() => this.url().startsWith('/dashboard/settings'));

  protected readonly navLabel = computed(() =>
    this.design.sidebarOpen() ? 'Close the navigation' : 'Open the navigation',
  );

  protected readonly infoOpen = computed(() => this.sidebar.isOpen() && this.sidebar.info());

  protected readonly infoLabel = computed(() =>
    this.infoOpen() ? 'Close the info panel' : 'Open the info panel',
  );

  protected readonly detailsLabel = computed(() => {
    const info = this.sidebar.info() || !this.sidebar.details();
    const target = info ? 'the info panel' : 'the details panel';
    return this.sidebar.isOpen() ? `Close ${target}` : `Open ${target}`;
  });

  protected readonly titleEditing = signal(false);
  protected readonly titleDraft = signal('');
  private readonly titleInput = viewChild<ElementRef<HTMLInputElement>>('contextTitleInput');

  constructor() {
    effect(() => {
      if (!this.titleEditing()) return;
      queueMicrotask(() => {
        const element = this.titleInput()?.nativeElement;
        if (element) {
          element.focus();
          element.select();
        }
      });
    });
  }

  protected startTitleEdit(): void {
    const context = this.info.contextTitle();
    if (!context?.rename || this.titleEditing()) return;
    this.titleDraft.set(context.title);
    this.titleEditing.set(true);
  }

  protected commitTitle(): void {
    const context = this.info.contextTitle();
    if (!this.titleEditing() || !context?.rename) return;
    const next = this.titleDraft().trim();
    if (next) context.rename(next);
    this.titleEditing.set(false);
  }

  protected cancelTitle(): void {
    this.titleEditing.set(false);
  }

  protected onTitleInput(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) this.titleDraft.set(target.value);
  }

  protected onTitleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.commitTitle();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelTitle();
    }
  }
}
