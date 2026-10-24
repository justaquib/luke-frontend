import { DestroyRef, Directive, inject, TemplateRef } from '@angular/core';
import { PageInfoService } from './page-info.service';

/**
 * Marks the template of a page's state and actions. The shared info panel
 * renders it under the page title and description, so pages no longer carry
 * their own header band.
 */
@Directive({
  selector: 'ng-template[appPageInfoActions]',
  standalone: true,
})
export class PageInfoActions {
  private readonly info = inject(PageInfoService);
  private readonly template = inject<TemplateRef<unknown>>(TemplateRef);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.info.registerActions(this.template);
    this.destroyRef.onDestroy(() => this.info.clearActions(this.template));
  }
}
