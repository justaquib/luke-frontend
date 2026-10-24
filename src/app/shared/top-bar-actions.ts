import { DestroyRef, Directive, inject, TemplateRef } from '@angular/core';
import { PageInfoService } from './page-info.service';

/**
 * Marks the template of a page's top-bar action. The action sits before the
 * frame controls, so a page can keep its one primary action within reach.
 */
@Directive({
  selector: 'ng-template[appTopBarActions]',
  standalone: true,
})
export class TopBarActions {
  private readonly info = inject(PageInfoService);
  private readonly template = inject<TemplateRef<unknown>>(TemplateRef);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.info.registerTopActions(this.template);
    this.destroyRef.onDestroy(() => this.info.clearTopActions(this.template));
  }
}
