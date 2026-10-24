import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { AppIcon } from '../shared/app-icon';
import { ChatMessageMeta } from './chat-message-meta';
import { ChatService } from './chat.service';
import type { ChatMessage as ChatMessageModel } from './chat.types';

@Component({
  selector: 'app-chat-message',
  standalone: true,
  imports: [AppIcon, ChatMessageMeta],
  templateUrl: './chat-message.html',
  styleUrls: ['./styles/chat-message.css', './styles/chat-bubble.css', '../shared/controls.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatMessage {
  readonly message = input.required<ChatMessageModel>();

  protected readonly service = inject(ChatService);

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
