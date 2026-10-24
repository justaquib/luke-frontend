import {
  type AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  effect,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { AppPrefsService } from '../core/app-prefs.service';
import { BrowserService } from '../core/browser.service';
import { AppIcon } from '../shared/app-icon';
import { ChatMessage } from './chat-message';
import { ChatService } from './chat.service';
import { ChatSessionService } from './chat-session.service';
import type { ChatMessage as ChatMessageModel } from './chat.types';

@Component({
  selector: 'app-chat-messages',
  standalone: true,
  imports: [AppIcon, ChatMessage],
  templateUrl: './chat-messages.html',
  styleUrls: ['./styles/chat-messages.css', './styles/chat-bubble.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatMessages implements AfterViewChecked {
  readonly openDetails = output<ChatMessageModel>();

  protected readonly session = inject(ChatSessionService);
  protected readonly service = inject(ChatService);
  protected readonly prefs = inject(AppPrefsService);
  private readonly browser = inject(BrowserService);

  protected readonly showJumpToBottom = signal(false);

  private readonly scrollAnchor = viewChild<ElementRef<HTMLDivElement>>('scrollAnchor');
  private shouldScroll = true;
  private initialScrollDone = false;
  private scrollListener?: () => void;
  private lastCount = 0;

  constructor() {
    effect(() => {
      const count = this.session.active().messages.length;
      const typing = this.service.isTyping();
      if (count !== this.lastCount || typing) {
        this.lastCount = count;
        this.shouldScroll = true;
      }
    });
  }

  ngAfterViewChecked(): void {
    const element = this.scrollAnchor()?.nativeElement;
    if (!element) {
      return;
    }
    if (!this.scrollListener) {
      this.scrollListener = () => this.updateScrollFlags(element);
      element.addEventListener('scroll', this.scrollListener);
    }
    if (!this.initialScrollDone && this.session.active().messages.length > 0) {
      this.scheduleScroll(element);
      this.initialScrollDone = true;
      this.updateScrollFlags(element);
    } else if (this.shouldScroll) {
      element.scrollTop = element.scrollHeight;
      this.shouldScroll = false;
      this.updateScrollFlags(element);
    }
  }

  jumpToBottom(): void {
    const element = this.scrollAnchor()?.nativeElement;
    if (!element) {
      return;
    }
    this.scheduleScroll(element);
    this.updateScrollFlags(element);
  }

  private scheduleScroll(element: HTMLElement): void {
    element.scrollTop = element.scrollHeight;
    this.browser.requestAnimationFrame(() => {
      const node = this.scrollAnchor()?.nativeElement;
      if (node) {
        node.scrollTop = node.scrollHeight;
      }
    });
  }

  private updateScrollFlags(element: HTMLElement): void {
    const distance = element.scrollHeight - element.clientHeight - element.scrollTop;
    const threshold = Math.max(120, element.clientHeight * 0.4);
    this.showJumpToBottom.set(distance > threshold);
  }
}
