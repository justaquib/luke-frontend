import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AppEngineDetails } from './app-engine-details';
import { PageInfoService } from './page-info.service';

/** The info panel body: the page's own state and actions, then the engine. */
@Component({
  selector: 'app-page-info',
  standalone: true,
  imports: [NgTemplateOutlet, AppEngineDetails],
  templateUrl: './app-page-info.html',
  styleUrl: './app-page-info.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppPageInfo {
  protected readonly info = inject(PageInfoService);
}
