import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { AppPrefsService } from '../core/app-prefs.service';
import { BrowserService } from '../core/browser.service';
import { UiService } from '../shared/ui.service';
import type { ChatMessage, ChatSession } from './chat.types';

const STORAGE_KEY = 'assistance.sessions.v1';
const ACTIVE_KEY = 'assistance.active.v1';

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

@Injectable({ providedIn: 'root' })
export class ChatSessionService {
  private readonly browser = inject(BrowserService);
  private readonly ui = inject(UiService);
  private readonly prefs = inject(AppPrefsService);

  readonly sessions = signal<ChatSession[]>([]);
  readonly activeId = signal<string | null>(null);

  readonly active = computed<ChatSession>(() => {
    const id = this.activeId();
    const found = this.sessions().find((session) => session.id === id);
    if (found) {
      return found;
    }
    return this.createSession();
  });

  private nextId = 100;

  constructor() {
    this.sessions.set(this.loadSessions());
    this.activeId.set(this.browser.readLocal(ACTIVE_KEY));
    if (this.sessions().length === 0) {
      this.createSession();
    } else if (!this.activeId()) {
      this.activeId.set(this.sessions()[0].id);
    }
    effect(() => this.saveSessions(this.sessions()));
    effect(() => this.saveActive(this.activeId()));
  }

  createSession(): ChatSession {
    const id = uid();
    const session: ChatSession = {
      id,
      title: 'New chat',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    const greeting = this.greeting();
    if (greeting) {
      session.messages.push(greeting);
    }
    this.sessions.update((list) => [session, ...list]);
    this.activeId.set(id);
    return session;
  }

  newChat(): void {
    this.createSession();
  }

  selectSession(id: string): void {
    this.activeId.set(id);
  }

  deleteSession(id: string): void {
    const session = this.sessions().find((item) => item.id === id);
    const title = session?.title ?? 'this chat';
    this.ui
      .confirmDialog({
        title: 'Delete chat?',
        message: `Delete "${title}"? This cannot be undone.`,
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        danger: true,
      })
      .subscribe((ok) => {
        if (!ok) {
          return;
        }
        this.sessions.update((list) => list.filter((item) => item.id !== id));
        if (this.activeId() === id) {
          const remaining = this.sessions();
          if (remaining.length === 0) {
            this.createSession();
          } else {
            this.activeId.set(remaining[0].id);
          }
        }
        this.ui.success('Chat deleted.');
      });
  }

  renameActive(title: string): void {
    const id = this.activeId();
    if (!id || !title.trim()) {
      return;
    }
    this.sessions.update((list) =>
      list.map((session) =>
        session.id === id ? { ...session, title: title.trim(), updatedAt: Date.now() } : session,
      ),
    );
  }

  appendMessage(message: ChatMessage): void {
    const id = this.activeId();
    if (!id) {
      return;
    }
    this.sessions.update((list) =>
      list.map((session) =>
        session.id === id
          ? { ...session, messages: [...session.messages, message], updatedAt: Date.now() }
          : session,
      ),
    );
  }

  updateMessage(messageId: number, update: (message: ChatMessage) => ChatMessage): void {
    const id = this.activeId();
    if (!id) {
      return;
    }
    this.sessions.update((list) =>
      list.map((session) =>
        session.id === id
          ? {
              ...session,
              messages: session.messages.map((message) =>
                message.id === messageId ? update(message) : message,
              ),
              updatedAt: Date.now(),
            }
          : session,
      ),
    );
  }

  findUserQuestion(messageId: number): string | null {
    const messages = this.active().messages;
    const index = messages.findIndex((message) => message.id === messageId);
    if (index <= 0) {
      return null;
    }
    for (let i = index - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        return messages[i].text;
      }
    }
    return null;
  }

  nextMessageId(): number {
    return this.nextId++;
  }

  touchTitle(question: string): void {
    const id = this.activeId();
    if (!id) {
      return;
    }
    this.sessions.update((list) =>
      list.map((session) => {
        if (session.id !== id) {
          return session;
        }
        if (
          session.title === 'New chat' &&
          session.messages.some((message) => message.role === 'user')
        ) {
          return { ...session, title: question.slice(0, 40), updatedAt: Date.now() };
        }
        return { ...session, updatedAt: Date.now() };
      }),
    );
  }

  private greeting(): ChatMessage | null {
    return {
      id: this.nextMessageId(),
      role: 'assistant',
      text: `Hello! I am your ${this.prefs.botName()} assistant. How can I help you today?`,
      timestamp: new Date(),
    };
  }

  private loadSessions(): ChatSession[] {
    try {
      const raw = this.browser.readLocal(STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw) as ChatSession[];
      return parsed.map((session) => ({
        ...session,
        messages: session.messages.map((message) => ({
          ...message,
          timestamp: new Date(message.timestamp),
        })),
      }));
    } catch {
      return [];
    }
  }

  private saveSessions(sessions: ChatSession[]): void {
    this.browser.writeLocal(STORAGE_KEY, JSON.stringify(sessions));
  }

  private saveActive(id: string | null): void {
    if (id === null) {
      this.browser.removeLocal(ACTIVE_KEY);
    } else {
      this.browser.writeLocal(ACTIVE_KEY, id);
    }
  }
}
