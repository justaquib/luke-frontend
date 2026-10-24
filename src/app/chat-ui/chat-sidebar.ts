import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DesignService } from '../core/design.service';
import { AppIcon } from '../shared/app-icon';
import { ChatService } from './chat.service';
import { ChatSessionService } from './chat-session.service';

@Component({
  selector: 'app-chat-sidebar',
  standalone: true,
  imports: [AppIcon],
  templateUrl: './chat-sidebar.html',
  styleUrl: './styles/chat-sidebar.css',
  host: { '[class.rail]': '!design.sidebarOpen()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatSidebar {
  protected readonly service = inject(ChatService);
  protected readonly session = inject(ChatSessionService);
  protected readonly design = inject(DesignService);
}
