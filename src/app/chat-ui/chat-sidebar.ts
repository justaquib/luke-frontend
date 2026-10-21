import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppPrefsService } from '../core/app-prefs.service';
import { AuthService } from '../core/auth.service';
import { ChatService } from './chat.service';
import { ChatSessionService } from './chat-session.service';
import { ChatUiStore } from './chat-ui.store';

@Component({
  selector: 'app-chat-sidebar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './chat-sidebar.html',
  styleUrls: [
    './styles/chat-1.css',
    './styles/chat-2.css',
    './styles/chat-3.css',
    './styles/chat-4.css',
    './styles/chat-5.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatSidebar {
  protected readonly session = inject(ChatSessionService);
  protected readonly service = inject(ChatService);
  protected readonly prefs = inject(AppPrefsService);
  protected readonly ui = inject(ChatUiStore);
  private readonly auth = inject(AuthService);

  protected readonly isSystemAdmin = computed(() => !!this.auth.user()?.is_systemadmin);
}
