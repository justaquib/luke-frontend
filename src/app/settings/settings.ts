import { Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { environment } from '../../environments/environment';
import { ApiService, StoreSummary } from '../core/api.service';
import { LanguageModelApiService } from '../core/api/language-model-api.service';
import { AppPrefsService } from '../core/app-prefs.service';
import { AuthService } from '../core/auth.service';
import { IntegrationsService } from '../core/integrations.service';
import { UiService } from '../shared/ui.service';

/**
 * The settings of the whole product: the connection to the backend, the
 * places to teach, the live sources, and what the store holds.
 */
@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings implements OnInit {
  private readonly api = inject(ApiService);
  private readonly languageApi = inject(LanguageModelApiService);
  private readonly auth = inject(AuthService);
  private readonly ui = inject(UiService);

  protected readonly integrations = inject(IntegrationsService);
  private readonly prefs = inject(AppPrefsService);
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly botName = this.prefs.botName;
  protected readonly backendUrl = environment.apiUrl;
  protected readonly backendStatus = signal<'unknown' | 'online' | 'offline'>('unknown');
  protected readonly store = signal<StoreSummary | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly isSystemAdmin = computed(() => !!this.auth.user()?.is_systemadmin);

  ngOnInit(): void {
    // The server has no session, so the numbers are read in the browser.
    if (!isPlatformBrowser(this.platformId)) return;
    this.checkBackend();
    this.loadStore();
  }

  protected locationLabel(): string | null {
    const location = this.integrations.location();
    return location ? `${location.lat.toFixed(2)}, ${location.lon.toFixed(2)}` : null;
  }

  protected toggleWeather(on: boolean): void {
    this.integrations.setWeather(on);
    if (on && !this.integrations.location()) {
      this.requestLocation();
    }
  }

  protected toggleWiki(on: boolean): void {
    this.integrations.setWiki(on);
  }

  protected requestLocation(): void {
    void this.integrations.refreshLocation().then((location) => {
      if (location) {
        this.ui.info('Location updated.');
      } else {
        this.ui.info('Location not available. City name will be used.');
      }
    });
  }

  protected bytes(value: number | undefined): string {
    const size = value ?? 0;
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  protected parameters(value: number | undefined): string {
    const count = value ?? 0;
    if (count < 1000) return `${count}`;
    return `${(count / 1000000).toFixed(2)}M`;
  }

  private checkBackend(): void {
    this.api.health().subscribe({
      next: () => this.backendStatus.set('online'),
      error: () => this.backendStatus.set('offline'),
    });
  }

  protected refresh(): void {
    this.loadStore();
  }

  private loadStore(): void {
    this.loading.set(true);
    this.error.set(null);
    this.languageApi.storeSummary().subscribe({
      next: (summary: StoreSummary) => {
        this.store.set(summary);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.loading.set(false);
      },
    });
  }
}
