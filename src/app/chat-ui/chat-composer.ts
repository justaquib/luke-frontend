import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import type { QueryOptions } from '../core/api/chat-api.service';
import { AppPrefsService } from '../core/app-prefs.service';
import { IntegrationsService } from '../core/integrations.service';
import { ChatService } from './chat.service';
import { ChatSessionService } from './chat-session.service';

@Component({
  selector: 'app-chat-composer',
  standalone: true,
  templateUrl: './chat-composer.html',
  styleUrl: './styles/chat-composer.css',
  host: {
    '[class.train-on]': 'session.trainMode()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComposer {
  protected readonly service = inject(ChatService);
  protected readonly session = inject(ChatSessionService);
  protected readonly prefs = inject(AppPrefsService);
  protected readonly draft = signal('');
  private readonly integrations = inject(IntegrationsService);

  onInput(value: string): void {
    this.draft.set(value);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  send(): void {
    const text = this.draft().trim();
    if (!text || this.service.isTyping()) {
      return;
    }
    this.service.send(text, this.options());
    this.draft.set('');
  }

  private options(): QueryOptions {
    const location = this.integrations.location();
    return {
      apps: {
        weather: this.integrations.weatherEnabled(),
        wiki: this.integrations.wikiEnabled(),
      },
      location: location ? { lat: location.lat, lon: location.lon } : undefined,
    };
  }
}
