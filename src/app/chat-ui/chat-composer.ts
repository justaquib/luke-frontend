import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import type { QueryOptions } from '../core/api/chat-api.service';
import { AppPrefsService } from '../core/app-prefs.service';
import { IntegrationsService } from '../core/integrations.service';
import { VoiceService } from '../core/voice.service';
import { ToolsService, type Tool } from '../core/tools.service';
import { AppIcon } from '../shared/app-icon';
import { UiService } from '../shared/ui.service';
import { AnswerModelService } from './answer-model.service';
import { ChatService } from './chat.service';
import { ChatSessionService } from './chat-session.service';
import { SlashMenuComponent } from './slash-menu.component';

const MAX_INPUT_HEIGHT = 180;
const MIN_INPUT_HEIGHT = 26;

@Component({
  selector: 'app-chat-composer',
  standalone: true,
  imports: [AppIcon, SlashMenuComponent],
  templateUrl: './chat-composer.html',
  styleUrls: [
    './styles/chat-composer.css',
    './styles/chat-composer-menu.css',
    './styles/chat-composer-voice.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComposer {
  protected readonly service = inject(ChatService);
  protected readonly prefs = inject(AppPrefsService);
  protected readonly models = inject(AnswerModelService);
  protected readonly integrations = inject(IntegrationsService);
  protected readonly voice = inject(VoiceService);
  protected readonly toolsService = inject(ToolsService);
  protected readonly draft = signal('');
  protected readonly slashMenuVisible = signal(false);
  protected readonly slashQuery = signal('');
  protected readonly availableTools = signal<Tool[]>([]);
  private readonly sessions = inject(ChatSessionService);
  private readonly ui = inject(UiService);
  private readonly input = viewChild.required<ElementRef<HTMLTextAreaElement>>('input');

  constructor() {
    this.models.load();
    void this.voice.loadStatus();
    this.loadTools();
  }

  private loadTools(): void {
    this.toolsService.getTools().subscribe({
      next: (tools) => this.availableTools.set(tools),
      error: () => this.availableTools.set([]),
    });
  }

  onInput(element: HTMLTextAreaElement): void {
    const value = element.value;
    this.draft.set(value);
    this.fit(element);

    if (value.startsWith('/')) {
      this.slashMenuVisible.set(true);
      this.slashQuery.set(value.slice(1));
    } else {
      this.slashMenuVisible.set(false);
      this.slashQuery.set('');
    }
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

  comingSoon(feature: string): void {
    this.ui.error(`${feature} — Coming soon.`);
  }

  toggleContext(): void {
    this.integrations.setContext(!this.integrations.contextEnabled());
  }

  toggleVoice(): void {
    this.voice.toggle();
  }

  async startListening(): Promise<void> {
    const text = await this.voice.listen();
    if (text) {
      this.draft.set(text);
      const textarea = this.input().nativeElement;
      textarea.value = text;
      this.fit(textarea);
    }
  }

  stopListening(): void {
    this.voice.stopListening();
  }

  onToolSelected(tool: Tool): void {
    this.slashMenuVisible.set(false);
    this.slashQuery.set('');
    this.draft.set('');
    const textarea = this.input().nativeElement;
    textarea.value = '';
    this.fit(textarea);

    const request = {
      tool: tool.name,
      params: {},
      conversation_id: this.sessions.activeId() || undefined,
      confirmed: true,
    };
    this.service.executeTool(request);
  }

  closeSlashMenu(): void {
    this.slashMenuVisible.set(false);
    this.slashQuery.set('');
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
        web: this.integrations.webEnabled(),
      },
      location: location ? { lat: location.lat, lon: location.lon } : undefined,
      model: this.models.selectedId(),
    };
  }
}
