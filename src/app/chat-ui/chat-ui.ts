import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ChatComposer } from './chat-composer';
import { ChatHeader } from './chat-header';
import { ChatMessages } from './chat-messages';
import { ChatSessionService } from './chat-session.service';
import { ChatSidebar } from './chat-sidebar';
import { ChatUiStore } from './chat-ui.store';

/**
 * The chat page.
 *
 * The page itself is only the frame: the sidebar, the header, the messages
 * and the composer are separate parts, and the state they share lives in the
 * session service, the chat service and the store.
 */
@Component({
  selector: 'app-chat-ui',
  standalone: true,
  imports: [ChatComposer, ChatHeader, ChatMessages, ChatSidebar],
  templateUrl: './chat-ui.html',
  styleUrl: './styles/chat-shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatUI {
  protected readonly session = inject(ChatSessionService);
  protected readonly ui = inject(ChatUiStore);
}
