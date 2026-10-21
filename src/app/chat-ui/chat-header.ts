import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ChatService } from './chat.service';
import { ChatSessionService } from './chat-session.service';
import { ChatUiStore } from './chat-ui.store';

@Component({
  selector: 'app-chat-header',
  standalone: true,
  templateUrl: './chat-header.html',
  styleUrls: [
    './styles/chat-1.css',
    './styles/chat-2.css',
    './styles/chat-3.css',
    './styles/chat-4.css',
    './styles/chat-5.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatHeader {
  protected readonly session = inject(ChatSessionService);
  protected readonly service = inject(ChatService);
  protected readonly ui = inject(ChatUiStore);

  protected readonly titleEditing = signal(false);
  protected readonly titleDraft = signal('');
  private readonly titleInput = viewChild<ElementRef<HTMLInputElement>>('titleInput');

  constructor() {
    effect(() => {
      if (this.titleEditing()) {
        queueMicrotask(() => {
          const element = this.titleInput()?.nativeElement;
          if (element) {
            element.focus();
            element.select();
          }
        });
      }
    });
  }

  toggleSidebar(): void {
    this.ui.toggleSidebar();
  }

  toggleTrain(): void {
    this.session.trainMode.update((value) => !value);
    if (!this.session.trainMode()) {
      this.ui.closeSettings();
    }
  }

  toggleSettings(): void {
    this.ui.toggleSettings();
  }

  startEditTitle(): void {
    if (this.titleEditing()) {
      return;
    }
    this.titleDraft.set(this.session.active().title);
    this.titleEditing.set(true);
  }

  commitTitle(): void {
    if (!this.titleEditing()) {
      return;
    }
    const next = this.titleDraft().trim() || this.session.active().title;
    this.session.renameActive(next);
    this.titleEditing.set(false);
  }

  cancelEditTitle(): void {
    this.titleEditing.set(false);
  }

  onTitleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.commitTitle();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelEditTitle();
    }
  }
}
