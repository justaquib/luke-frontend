import { Component, input, output } from '@angular/core';
import { AppSidebar } from './app-sidebar';

/**
 * The page frame shared by the dashboard views. It holds the workspace
 * navigation on the left and the page content on the right, so every view
 * keeps the same shell, spacing and fold away behaviour.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [AppSidebar],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.css',
})
export class AppShell {
  /** Whether the sidebar shows its labels. */
  readonly open = input(true);

  /** Whether a side panel takes the third column of the frame. */
  readonly aside = input(false);

  /** Raised when the sidebar asks to be folded away. */
  readonly toggled = output<void>();
}
