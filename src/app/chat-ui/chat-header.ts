import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppIcon } from '../shared/app-icon';
import { ChatService } from './chat.service';
import { ChatSessionService } from './chat-session.service';

@Component({
  selector: 'app-chat-header',
  standalone: true,
  imports: [AppIcon, RouterLink],
  templateUrl: './chat-header.html',
  styleUrl: './styles/chat-header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatHeader {
  protected readonly session = inject(ChatSessionService);
  protected readonly service = inject(ChatService);

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
