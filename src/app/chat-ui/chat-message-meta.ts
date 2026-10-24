import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { chatSourceLabel } from './chat-source-label';
import type { ChatMessage } from './chat.types';

@Component({
  selector: 'app-chat-message-meta',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './chat-message-meta.html',
  styleUrl: './styles/chat-message-meta.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatMessageMeta {
  readonly message = input.required<ChatMessage>();

  protected sourceLabel(): string | null {
    return chatSourceLabel(this.message().source);
  }

  protected hasDisabledSources(): boolean {
    return !!this.message().disabledExternalSources?.length;
  }
}
