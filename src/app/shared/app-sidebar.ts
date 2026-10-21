import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AppPrefsService } from '../core/app-prefs.service';
import { AuthService } from '../core/auth.service';

/**
 * The workspace navigation shared by the dashboard views. Every page that uses
 * the app shell shows the same links, the same brand and the same fold away
 * button, so the product reads as one place.
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './app-sidebar.html',
  styleUrl: './app-sidebar.css',
})
export class AppSidebar {
  private readonly prefs = inject(AppPrefsService);
  private readonly auth = inject(AuthService);

  /** Whether the sidebar shows its labels. */
  readonly open = input(true);

  /** Raised when the sidebar asks to be folded away. */
  readonly toggled = output<void>();

  protected readonly botName = this.prefs.botName;
  protected readonly isSystemAdmin = computed(() => this.auth.user()?.is_systemadmin ?? false);

  protected toggle(): void {
    this.toggled.emit();
  }
}
