import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  TemplateRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DesignService } from '../core/design.service';
import { AppEngineFacts, type EngineFact } from '../shared/app-engine-facts';
import { AppRightSidebar } from '../shared/app-right-sidebar';
import { AppTopBar } from '../shared/app-top-bar';
import { PageInfoFacts } from '../shared/page-info-facts';
import { PageInfoService } from '../shared/page-info.service';
import { RightSidebarService } from '../shared/right-sidebar.service';
import { ChatAnswerDetails } from './chat-answer-details';
import { ChatComposer } from './chat-composer';
import { ChatMessages } from './chat-messages';
import { ChatService } from './chat.service';
import { ChatSessionService } from './chat-session.service';
import { ChatSidebar } from './chat-sidebar';
import type { ChatMessage as ChatMessageModel } from './chat.types';

const ANSWER_DETAILS_OWNER = 'chat-answer';

@Component({
  selector: 'app-chat-ui',
  standalone: true,
  imports: [
    AppEngineFacts,
    AppRightSidebar,
    AppTopBar,
    ChatAnswerDetails,
    ChatComposer,
    ChatMessages,
    ChatSidebar,
    PageInfoFacts,
  ],
  templateUrl: './chat-ui.html',
  styleUrl: './styles/chat-shell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatUI {
  protected readonly design = inject(DesignService);
  private readonly session = inject(ChatSessionService);
  private readonly service = inject(ChatService);
  private readonly info = inject(PageInfoService);
  private readonly sidebar = inject(RightSidebarService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly selectedAnswer = signal<{
    message: ChatMessageModel;
    question: string | null;
  } | null>(null);

  private readonly answerDetails = viewChild.required('answerDetails', { read: TemplateRef });

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

  constructor() {
    effect(() => {
      const title = this.session.active().title;
      this.info.setContextTitle({
        title,
        rename: (next) => this.session.renameActive(next),
      });
    });
    this.destroyRef.onDestroy(() => {
      this.service.stop();
      this.info.setContextTitle(null);
      this.sidebar.clearDetails(ANSWER_DETAILS_OWNER);
    });
  }

  protected showAnswer(message: ChatMessageModel): void {
    this.selectedAnswer.set({
      message,
      question: this.session.findUserQuestion(message.id),
    });
    this.sidebar.show({
      owner: ANSWER_DETAILS_OWNER,
      title: 'Answer details',
      subtitle: 'The question, the answer and the route the engine took.',
      template: this.answerDetails(),
    });
  }
}
