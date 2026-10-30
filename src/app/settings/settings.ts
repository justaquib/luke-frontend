import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  inject,
  signal,
  type OnInit,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environment';
import { ApiService } from '../core/api.service';
import {
  AppearanceService,
  type ColorMode,
  type FontChoice,
  type TextSize,
} from '../core/appearance.service';
import { PaletteService } from '../core/palette.service';
import { IntegrationsService } from '../core/integrations.service';
import { ModelSettingsService } from '../core/model-settings.service';
import { UiService } from '../shared/ui.service';
import { AppCardInfo } from '../shared/app-card-info';
import { AppEngineFacts, type EngineFact, type FactTone } from '../shared/app-engine-facts';
import { AppShell } from '../shared/app-shell';
import { AppIcon, type IconName } from '../shared/app-icon';
import { FoundationCard } from './foundation-card';
import { ModelIdentity } from './model-identity';
import { VoiceCard } from './voice-card';
import { ToolsCardComponent } from './tools-card.component';
import { AppsCardComponent } from './apps-card.component';
import { WebSources } from './web-sources';

interface ModeChoice {
  value: ColorMode;
  label: string;
  icon: IconName;
}

interface SizeChoice {
  value: TextSize;
  label: string;
}

interface FontOption {
  value: FontChoice;
  label: string;
}

/**
 * The settings of the whole lab: the connection to the backend, the live
 * sources the assistant may fall back to, the model identity and the packages
 * the product is built with.
 */
@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    AppShell,
    AppIcon,
    AppCardInfo,
    AppEngineFacts,
    FoundationCard,
    ModelIdentity,
    VoiceCard,
    ToolsCardComponent,
    AppsCardComponent,
    WebSources,
  ],
  templateUrl: './settings.html',
  styleUrls: ['./settings.css', '../shared/controls.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Settings implements OnInit {
  private readonly api = inject(ApiService);
  private readonly ui = inject(UiService);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly integrations = inject(IntegrationsService);
  protected readonly appearance = inject(AppearanceService);
  protected readonly paletteService = inject(PaletteService);
  protected readonly modelSettings = inject(ModelSettingsService);
  protected readonly backendUrl = environment.apiUrl;
  protected readonly backendStatus = signal<'unknown' | 'online' | 'offline'>('unknown');

  protected readonly colorModes: readonly ModeChoice[] = [
    { value: 'system', label: 'System', icon: 'monitor' },
    { value: 'light', label: 'Light', icon: 'sun' },
    { value: 'dark', label: 'Dark', icon: 'moon' },
  ];
  protected readonly textSizes: readonly SizeChoice[] = [
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
  ];
  protected readonly fonts: readonly FontOption[] = [
    { value: 'sans', label: 'Sans' },
    { value: 'serif', label: 'Serif' },
    { value: 'mono', label: 'Mono' },
  ];

  protected readonly connectionLabel = computed(() => {
    switch (this.backendStatus()) {
      case 'online':
        return 'Connected';
      case 'offline':
        return 'Offline';
      case 'unknown':
        return 'Connecting…';
    }
  });

  protected readonly enabledSources = computed(
    () =>
      Number(this.integrations.weatherEnabled()) +
      Number(this.integrations.wikiEnabled()) +
      Number(this.integrations.webEnabled()),
  );

  protected readonly facts = computed<readonly EngineFact[]>(() => {
    const theme = this.paletteService.find(this.appearance.palette())?.name ?? '—';
    const size =
      this.textSizes.find((choice) => choice.value === this.appearance.textSize())?.label ?? '—';
    const font = this.fonts.find((choice) => choice.value === this.appearance.font())?.label ?? '—';
    return [
      {
        label: 'Connection',
        value: this.connectionLabel(),
        tone: this.connectionTone(),
      },
      {
        label: 'Model',
        value: this.modelSettings.name(),
        // A read that failed is not a read still in progress.
        note: this.modelSettings.level()
          ? `version ${this.modelSettings.level()}`
          : this.modelSettings.error()
            ? 'not read'
            : 'reading the model…',
      },
      {
        label: 'Live sources',
        value: `${this.enabledSources()}/3`,
        note: 'weather, Wikipedia and web',
      },
      {
        label: 'Appearance',
        value: theme,
        note: `${size} text · ${font} type`,
      },
    ];
  });

  ngOnInit(): void {
    // The server has no session, so the connection is checked in the browser.
    if (!isPlatformBrowser(this.platformId)) return;
    this.checkBackend();
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

  private checkBackend(): void {
    this.api.health().subscribe({
      next: () => this.backendStatus.set('online'),
      error: () => this.backendStatus.set('offline'),
    });
  }

  private connectionTone(): FactTone | undefined {
    switch (this.backendStatus()) {
      case 'online':
        return 'ok';
      case 'offline':
        return 'bad';
      case 'unknown':
        return undefined;
    }
  }
}
