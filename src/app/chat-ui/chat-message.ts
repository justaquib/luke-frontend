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
    void this.voice.speak(this.message().text);
  }
}
