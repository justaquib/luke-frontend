import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ChatMessageMeta } from './chat-message-meta';
import { ChatService } from './chat.service';
import { ChatSessionService } from './chat-session.service';
import type { ChatMessage as ChatMessageModel } from './chat.types';

@Component({
  selector: 'app-chat-message',
  standalone: true,
  imports: [ChatMessageMeta],
  templateUrl: './chat-message.html',
  styleUrls: ['./styles/chat-message.css', './styles/chat-bubble.css'],
  host: {
    '[class.train-on]': 'session.trainMode()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatMessage {
  readonly message = input.required<ChatMessageModel>();

  protected readonly service = inject(ChatService);
  protected readonly session = inject(ChatSessionService);

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
}
