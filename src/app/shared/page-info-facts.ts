import { DestroyRef, Directive, inject, TemplateRef } from '@angular/core';
import { PageInfoService } from './page-info.service';

/**
 * Marks the template of a page's measured facts. The shared info panel draws
 * them above the page's controls, so a page keeps its live state out of its
 * body and the facts follow whatever the page is showing.
 */
@Directive({
  selector: 'ng-template[appPageInfoFacts]',
  standalone: true,
})
export class PageInfoFacts {
  private readonly info = inject(PageInfoService);
  private readonly template = inject<TemplateRef<unknown>>(TemplateRef);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.info.registerFacts(this.template);
    this.destroyRef.onDestroy(() => this.info.clearFacts(this.template));
  }
}
