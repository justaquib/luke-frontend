import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  type OnInit,
  PLATFORM_ID,
  untracked,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { ModelSettingsService } from './core/model-settings.service';
import { AppToasts } from './shared/app-toasts';
import { BackgroundTasksService } from './shared/background-tasks.service';
import { UiOverlay } from './shared/ui-overlay';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AppToasts, UiOverlay],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  protected readonly title = 'Luke Lab';
  private readonly auth = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly tasks = inject(BackgroundTasksService);
  private readonly modelSettings = inject(ModelSettingsService);
  private readonly destroyRef = inject(DestroyRef);
  private settingsLoaded = false;

  constructor() {
    // One reader for the whole session: the primary sidebar shows a running
    // task and the details panel reads the same measured list.
    effect(() => {
      if (!isPlatformBrowser(this.platformId)) return;
      const signedIn = this.auth.isLoggedIn();
      untracked(() => {
        if (!signedIn) {
          this.settingsLoaded = false;
          this.tasks.stop();
          return;
        }
        this.tasks.start();
        if (this.settingsLoaded) return;
        this.settingsLoaded = true;
        this.modelSettings.load();
      });
    });
    this.destroyRef.onDestroy(() => this.tasks.stop());
  }

  ngOnInit(): void {
    // The session that was saved is checked once when the app starts, so it
    // is renewed while it lasts and a session that has ended is cleared with
    // a word, instead of a silent bounce to the login page.
    if (!isPlatformBrowser(this.platformId)) return;
    this.auth.restoreSession();
  }
}
