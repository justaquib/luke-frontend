import { Injectable, type TemplateRef, signal } from '@angular/core';

/** What a page puts in the shared right sidebar. */
export interface RightSidebarDetails {
  /** The view that owns the details, so it can clear them when it leaves. */
  owner: string;
  title: string;
  subtitle?: string;
  template: TemplateRef<unknown>;
  /** Whether the background task list is shown under the details. */
  showTasks?: boolean;
}

/**
 * One sidebar for the whole app. Pages put details here instead of growing
 * inline panels, and the shell keeps the frame and the background tasks. The
 * info mode shows the page identity, its actions and the engine information.
 */
@Injectable({ providedIn: 'root' })
export class RightSidebarService {
  private readonly _open = signal(false);
  private readonly _expanded = signal(false);
  private readonly _details = signal<RightSidebarDetails | null>(null);
  private readonly _info = signal(false);

  readonly isOpen = this._open.asReadonly();
  readonly isExpanded = this._expanded.asReadonly();
  readonly details = this._details.asReadonly();
  readonly info = this._info.asReadonly();

  show(details: RightSidebarDetails): void {
    this._details.set(details);
    this._info.set(false);
    this._open.set(true);
  }

  /** Keep the details ready for the header toggle without opening the panel. */
  setDetails(details: RightSidebarDetails): void {
    this._details.set(details);
    this._info.set(false);
  }

  open(): void {
    if (!this._open() && !this._details()) this._info.set(true);
    this._open.set(true);
  }

  /** Show the page information instead of the page details. */
  showInfo(): void {
    this._info.set(true);
    this._open.set(true);
  }

  toggleInfo(): void {
    if (this._open() && this._info()) {
      this._open.set(false);
      return;
    }
    this.showInfo();
  }

  close(): void {
    this._open.set(false);
  }

  toggle(): void {
    if (this._open()) {
      this._open.set(false);
      return;
    }
    this._info.set(!this._details());
    this._open.set(true);
  }

  toggleExpanded(): void {
    this._expanded.update((expanded) => !expanded);
  }

  /** Clear the details only when they belong to the view that asks. */
  clearDetails(owner?: string): void {
    const current = this._details();
    if (!current) return;
    if (owner && current.owner !== owner) return;
    this._details.set(null);
    this._info.set(false);
    this._open.set(false);
  }
}
