import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  type OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { UiOverlay } from './shared/ui-overlay';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, UiOverlay],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  protected readonly title = 'Assistance';
  private readonly auth = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    // The session that was saved is checked once when the app starts, so it
    // is renewed while it lasts and a session that has ended is cleared with
    // a word, instead of a silent bounce to the login page.
    if (!isPlatformBrowser(this.platformId)) return;
    this.auth.restoreSession();
  }
}
