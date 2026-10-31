import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  effect,
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

    effect(() => {
      const transcript = this.voice.liveTranscript();
      if (transcript && this.voice.isRecording()) {
        this.draft.set(transcript);
        const textarea = this.input();
        if (textarea) {
          textarea.nativeElement.value = transcript;
          this.fit(textarea.nativeElement);
        }
      }
    });
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

    if (value.startsWith('/') && !value.includes(' ')) {
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

  async toggleListening(): Promise<void> {
    if (this.voice.isRecording()) {
      this.voice.stopListening();
    } else {
      const text = await this.voice.listen();
      if (text) {
        this.draft.set(text);
        const textarea = this.input().nativeElement;
        textarea.value = text;
        this.fit(textarea);
        setTimeout(() => this.send(), 500);
      }
    }
  }

  onToolSelected(tool: Tool): void {
    this.slashMenuVisible.set(false);
    this.slashQuery.set('');
    const text = `/${tool.name} `;
    this.draft.set(text);
    const textarea = this.input().nativeElement;
    textarea.value = text;
    textarea.focus();
    this.fit(textarea);
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
    if (text.startsWith('/')) {
      this.executeToolFromText(text);
      return;
    }
    this.service.send(text, this.options());
    this.draft.set('');
    this.fit(this.input().nativeElement);
  }

  private executeToolFromText(text: string): void {
    const spaceIndex = text.indexOf(' ');
    const toolName = spaceIndex > 0 ? text.slice(1, spaceIndex) : text.slice(1);
    const paramText = spaceIndex > 0 ? text.slice(spaceIndex + 1).trim() : '';

    const tool = this.availableTools().find((t) => t.name === toolName);
    if (!tool) {
      this.ui.error(`Unknown tool: ${toolName}`);
      return;
    }

    const params: Record<string, unknown> = {};
    const requiredParams = tool.parameters.required || [];
    if (requiredParams.length > 0 && paramText) {
      params[requiredParams[0]] = paramText;
    }

    const request = {
      tool: toolName,
      params,
      conversation_id: this.sessions.activeId() || undefined,
      confirmed: true,
    };
    this.service.executeTool(request);
    this.draft.set('');
    const textarea = this.input().nativeElement;
    textarea.value = '';
    this.fit(textarea);
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
