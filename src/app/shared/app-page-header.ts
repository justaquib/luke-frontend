import { Component, input } from '@angular/core';

/**
 * The header band shared by the dashboard views. It carries the page label,
 * the title and the one line description, and leaves the right hand side to
 * the page for its own readout.
 */
@Component({
  selector: 'app-page-header',
  standalone: true,
  templateUrl: './app-page-header.html',
  styleUrl: './app-page-header.css',
})
export class AppPageHeader {
  /** The short label above the title. */
  readonly eyebrow = input.required<string>();

  /** The title of the page. */
  readonly title = input.required<string>();

  /** The one line that explains what the page is for. */
  readonly description = input.required<string>();
}
