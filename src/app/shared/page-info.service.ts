import { computed, inject, Injectable, type TemplateRef, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { pageInfoForUrl } from './page-title';

/** The live context a page adds after its name, such as a chat's title. */
export interface PageContextTitle {
  title: string;
  /** When present, the top bar lets the person rename the context. */
  rename?: (title: string) => void;
}

/**
 * The page identity and controls that the frame shows. A page keeps its title,
 * description and state out of its body, registers the facts and actions the
 * info panel renders under them, and can add one action to the top bar.
 */
@Injectable({ providedIn: 'root' })
export class PageInfoService {
  private readonly router = inject(Router);
  private readonly _facts = signal<TemplateRef<unknown> | null>(null);
  private readonly _actions = signal<TemplateRef<unknown> | null>(null);
  private readonly _topActions = signal<TemplateRef<unknown> | null>(null);
  private readonly _contextTitle = signal<PageContextTitle | null>(null);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  readonly page = computed(() => pageInfoForUrl(this.url()));
  readonly facts = this._facts.asReadonly();
  readonly actions = this._actions.asReadonly();
  readonly topActions = this._topActions.asReadonly();
  readonly contextTitle = this._contextTitle.asReadonly();

  setContextTitle(context: PageContextTitle | null): void {
    this._contextTitle.set(context);
  }

  registerFacts(template: TemplateRef<unknown>): void {
    this._facts.set(template);
  }

  clearFacts(template: TemplateRef<unknown>): void {
    if (this._facts() === template) this._facts.set(null);
  }

  registerActions(template: TemplateRef<unknown>): void {
    this._actions.set(template);
  }

  clearActions(template: TemplateRef<unknown>): void {
    if (this._actions() === template) this._actions.set(null);
  }

  registerTopActions(template: TemplateRef<unknown>): void {
    this._topActions.set(template);
  }

  clearTopActions(template: TemplateRef<unknown>): void {
    if (this._topActions() === template) this._topActions.set(null);
  }
}
