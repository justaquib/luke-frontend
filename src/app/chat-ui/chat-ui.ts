import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DesignService } from '../core/design.service';
import { AppEngineFacts, type EngineFact } from '../shared/app-engine-facts';
import { AppRightSidebar } from '../shared/app-right-sidebar';
import { AppTopBar } from '../shared/app-top-bar';
import { ChatComposer } from './chat-composer';
import { ChatHeader } from './chat-header';
import { ChatMessages } from './chat-messages';
import { ChatSessionService } from './chat-session.service';
import { ChatSidebar } from './chat-sidebar';

@Component({
  selector: 'app-chat-ui',
  standalone: true,
  imports: [
    AppEngineFacts,
    AppRightSidebar,
    AppTopBar,
    ChatComposer,
    ChatHeader,
    ChatMessages,
    ChatSidebar,
  ],
  templateUrl: './chat-ui.html',
  styleUrl: './styles/chat-shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatUI {
  protected readonly design = inject(DesignService);
  private readonly session = inject(ChatSessionService);

  protected readonly facts = computed<readonly EngineFact[]>(() => {
    const active = this.session.active();
    const answers = active.messages.filter((message) => message.role === 'assistant');
    const paths = new Set(answers.map((message) => message.source).filter(Boolean));
    const started = new Date(active.createdAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    return [
      { label: 'Messages', value: String(active.messages.length), note: 'in this conversation' },
      {
        label: 'Answer paths',
        value: String(paths.size),
        note: paths.size === 0 ? 'no answer yet' : 'distinct sources used',
      },
      { label: 'Started', value: started },
    ];
  });
}
