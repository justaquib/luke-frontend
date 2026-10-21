import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { IntegrationsService } from '../core/integrations.service';
import { UiService } from '../shared/ui.service';
import { ChatService } from './chat.service';
import { ChatUiStore } from './chat-ui.store';

@Component({
  selector: 'app-chat-settings',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './chat-settings.html',
  styleUrls: [
    './styles/chat-1.css',
    './styles/chat-2.css',
    './styles/chat-3.css',
    './styles/chat-4.css',
    './styles/chat-5.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatSettings {
  protected readonly service = inject(ChatService);
  protected readonly integrations = inject(IntegrationsService);
  protected readonly ui = inject(ChatUiStore);
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(UiService);

  protected readonly isSystemAdmin = computed(() => !!this.auth.user()?.is_systemadmin);

  toggle(): void {
    this.ui.toggleSettings();
  }

  toggleWeather(on: boolean): void {
    this.integrations.setWeather(on);
    if (on && !this.integrations.location()) {
      this.requestLocation();
    }
  }

  toggleWiki(on: boolean): void {
    this.integrations.setWiki(on);
  }

  requestLocation(): void {
    void this.integrations.refreshLocation().then((location) => {
      if (location) {
        this.notifications.info('Location updated.');
      } else {
        this.notifications.info('Location not available. City name will be used.');
      }
    });
  }

  locationLabel(): string | null {
    const location = this.integrations.location();
    return location ? `${location.lat.toFixed(2)}, ${location.lon.toFixed(2)}` : null;
  }
}
