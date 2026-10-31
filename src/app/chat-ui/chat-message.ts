import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { VoiceService } from '../core/voice.service';
import { AnswerReveal } from '../shared/answer-reveal';
import { AppIcon } from '../shared/app-icon';
import { ChatMessageMeta } from './chat-message-meta';
import { ChatService } from './chat.service';
import type { ChatMessage as ChatMessageModel } from './chat.types';

@Component({
  selector: 'app-chat-message',
  standalone: true,
  imports: [AnswerReveal, AppIcon, ChatMessageMeta],
  templateUrl: './chat-message.html',
  styleUrls: ['./styles/chat-message.css', './styles/chat-bubble.css', '../shared/controls.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatMessage {
  readonly message = input.required<ChatMessageModel>();
  readonly openDetails = output<ChatMessageModel>();
  readonly revealAdvanced = output<void>();

  protected readonly service = inject(ChatService);
  protected readonly voice = inject(VoiceService);

  protected canRate(): boolean {
    const message = this.message();
    return (
      message.source !== 'weather' &&
      message.source !== 'wiki' &&
      !this.service.ratedMessages()[message.id]
    );
  }

  protected formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  protected playMessage(): void {
    const messageText = this.message().text;
    const isCurrentlyPlaying = this.voice.currentlyPlayingText() === messageText;

    if (isCurrentlyPlaying && this.voice.isSpeaking()) {
      this.voice.pauseSpeaking();
    } else if (isCurrentlyPlaying && !this.voice.isSpeaking()) {
      this.voice.resumeSpeaking();
    } else {
      void this.voice.speak(messageText);
    }
  }

  protected isMessagePlaying(): boolean {
    return this.voice.currentlyPlayingText() === this.message().text && this.voice.isSpeaking();
  }

  protected isMessagePaused(): boolean {
    return this.voice.currentlyPlayingText() === this.message().text && !this.voice.isSpeaking();
  }

  protected toolSummary(): string {
    const message = this.message();
    if (message.role !== 'tool' || !message.text) return 'Tool executed';

    try {
      const output: unknown = JSON.parse(message.text);
      if (typeof output === 'object' && output !== null) {
        const obj = output as Record<string, unknown>;
        if ('launched' in obj && 'app' in obj) {
          return `App launched - ${String(obj['app'])}`;
        }
        if ('error' in obj) {
          return `Error - ${String(obj['error'])}`;
        }
      }
    } catch {
      // Not JSON, return as-is
    }
    return 'Tool executed';
  }
}
