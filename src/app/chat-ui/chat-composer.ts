import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import type { QueryOptions } from '../core/api/chat-api.service';
import { AppPrefsService } from '../core/app-prefs.service';
import { IntegrationsService } from '../core/integrations.service';
import { AppIcon } from '../shared/app-icon';
import { AnswerModelService } from './answer-model.service';
import { ChatService } from './chat.service';
import { ChatSessionService } from './chat-session.service';

const MAX_INPUT_HEIGHT = 180;
const MIN_INPUT_HEIGHT = 26;

@Component({
  selector: 'app-chat-composer',
  standalone: true,
  imports: [AppIcon],
  templateUrl: './chat-composer.html',
  styleUrls: ['./styles/chat-composer.css', './styles/chat-composer-sources.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComposer {
  protected readonly service = inject(ChatService);
  protected readonly prefs = inject(AppPrefsService);
  protected readonly models = inject(AnswerModelService);
  protected readonly integrations = inject(IntegrationsService);
  protected readonly draft = signal('');
  private readonly sessions = inject(ChatSessionService);
  private readonly input = viewChild.required<ElementRef<HTMLTextAreaElement>>('input');

  protected readonly sourcesOn = computed(() => {
    const state = this.integrations.state();
    return Number(state.weather) + Number(state.wiki);
  });
  protected readonly sourcesLabel = computed(() =>
    this.sourcesOn() ? `Sources · ${this.sourcesOn()}` : 'Sources',
  );

  constructor() {
    this.models.load();
  }

  onInput(element: HTMLTextAreaElement): void {
    this.draft.set(element.value);
    this.fit(element);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  newChat(): void {
    if (this.service.isTyping()) return;
    this.sessions.newChat();
  }

  setWeather(on: boolean): void {
    this.integrations.setWeather(on);
  }

  setWiki(on: boolean): void {
    this.integrations.setWiki(on);
  }

  send(): void {
    const text = this.draft().trim();
    if (!text || this.service.isTyping()) {
      return;
    }
    this.service.send(text, this.options());
    this.draft.set('');
    this.fit(this.input().nativeElement);
  }

  stop(): void {
    this.service.stop();
  }

  /** The box grows with the draft, up to a point, and shrinks back. */
  private fit(element: HTMLTextAreaElement): void {
    element.style.height = 'auto';
    const height = Math.min(Math.max(element.scrollHeight, MIN_INPUT_HEIGHT), MAX_INPUT_HEIGHT);
    element.style.height = `${height}px`;
    element.style.overflowY = element.scrollHeight > MAX_INPUT_HEIGHT ? 'auto' : 'hidden';
  }

  private options(): QueryOptions {
    const location = this.integrations.location();
    return {
      apps: {
        weather: this.integrations.weatherEnabled(),
        wiki: this.integrations.wikiEnabled(),
      },
      location: location ? { lat: location.lat, lon: location.lon } : undefined,
      model: this.models.selectedId(),
    };
  }
}
