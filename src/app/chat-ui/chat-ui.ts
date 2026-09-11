import { Component, signal, ElementRef, viewChild, AfterViewChecked, inject, effect, computed, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, QueryHit } from '../core/api.service';
import { AppPrefsService } from '../core/app-prefs.service';
import { AuthService } from '../core/auth.service';
import { IntegrationsService } from '../core/integrations.service';
import { UiService } from '../shared/ui.service';

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: Date;
  hits?: QueryHit[];
  source?: 'faq' | 'docs' | 'pending' | 'intent' | 'weather' | 'wiki';
  pendingId?: number;
  intent?: { matched_question?: string; distance?: number } | null;
  app?: Record<string, unknown> | null;
  disabledExternalSources?: string[] | null;
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

const STORAGE_KEY = 'assistance.sessions.v1';
const ACTIVE_KEY = 'assistance.active.v1';

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatSession[];
    return parsed.map((s) => ({
      ...s,
      messages: s.messages.map((m) => ({ ...m, timestamp: new Date(m.timestamp) })),
    }));
  } catch {
    return [];
  }
}

function saveSessions(sessions: ChatSession[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {}
}

function loadActive(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

function saveActive(id: string | null) {
  try {
    if (id === null) localStorage.removeItem(ACTIVE_KEY);
    else localStorage.setItem(ACTIVE_KEY, id);
  } catch {}
}

const TRAIN_KEY = 'assistance.trainmode.v1';

function loadTrainMode(chatId: string): boolean {
  try {
    const raw = sessionStorage.getItem(TRAIN_KEY);
    if (!raw) return false;
    const map = JSON.parse(raw) as Record<string, boolean>;
    return !!map[chatId];
  } catch {
    return false;
  }
}

function saveTrainMode(chatId: string, on: boolean) {
  try {
    const raw = sessionStorage.getItem(TRAIN_KEY);
    const map = (raw ? JSON.parse(raw) : {}) as Record<string, boolean>;
    if (on) map[chatId] = true;
    else delete map[chatId];
    sessionStorage.setItem(TRAIN_KEY, JSON.stringify(map));
  } catch {}
}

@Component({
  selector: 'app-chat-ui',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './chat-ui.html',
  styleUrl: './chat-ui.css',
})
export class ChatUI implements AfterViewChecked {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly ui = inject(UiService);
  protected readonly integrations = inject(IntegrationsService);
  protected readonly prefs = inject(AppPrefsService);

toggleWeather(on: boolean) {
  this.integrations.setWeather(on);
  if (on && !this.integrations.location()) {
    this.requestLocation();
  }
}

toggleWiki(on: boolean) {
  this.integrations.setWiki(on);
}

locationLabel(): string | null {
  const loc = this.integrations.location();
  if (!loc) return null;
  return `${loc.lat.toFixed(2)}, ${loc.lon.toFixed(2)}`;
}

async requestLocation() {
  const loc = await this.integrations.refreshLocation();
  if (loc) {
    this.ui.info('Location updated.');
  } else {
    this.ui.info('Location not available. City name will be used.');
  }
}

  protected readonly sessions = signal<ChatSession[]>(loadSessions());
  protected readonly activeId = signal<string | null>(loadActive());
  protected readonly sidebarOpen = signal(true);

  protected readonly trainMode = signal(false);
  protected readonly showSettings = signal(false);

  protected readonly isSystemAdmin = computed(() => {
    const user = this.auth.user();
    return !!user?.is_systemadmin;
  });

  protected readonly titleEditing = signal(false);
  protected readonly titleDraft = signal('');

  protected readonly draft = signal('');
  protected readonly isTyping = signal(false);
  protected readonly backendStatus = signal<'unknown' | 'online' | 'offline'>('unknown');

  protected readonly editingId = signal<number | null>(null);
  protected readonly editingText = signal('');

  protected readonly ratedMessages = signal<Record<number, boolean>>({});

  protected readonly active = computed<ChatSession>(() => {
    const id = this.activeId();
    const found = this.sessions().find((s) => s.id === id);
    if (found) return found;
    return this.createSession();
  });

  protected readonly isNearBottom = signal(true);
  protected readonly showJumpToBottom = signal(false);

  private nextId = 100;
  private readonly scrollAnchor = viewChild<ElementRef<HTMLDivElement>>('scrollAnchor');
  private readonly titleInput = viewChild<ElementRef<HTMLInputElement>>('titleInput');
  private shouldScroll = false;
  private initialScrollDone = false;
  private scrollListener?: () => void;

  constructor() {
    if (this.sessions().length === 0) {
      this.createSession();
    } else if (!this.activeId()) {
      this.activeId.set(this.sessions()[0].id);
    }
    this.checkBackend();
    effect(() => {
      saveSessions(this.sessions());
    });
    effect(() => {
      saveActive(this.activeId());
    });
    effect(() => {
      const id = this.activeId();
      if (id) saveTrainMode(id, untracked(() => this.trainMode()));
    });
    effect(() => {
      const id = this.activeId();
      if (id) this.trainMode.set(loadTrainMode(id));
    });
    effect(() => {
      if (this.titleEditing()) {
        queueMicrotask(() => {
          const el = this.titleInput()?.nativeElement;
          if (el) {
            el.focus();
            el.select();
          }
        });
      }
    });
  }

  private createSession(): ChatSession {
    const id = uid();
    const session: ChatSession = {
      id,
      title: 'New chat',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [
        {
          id: this.nextId++,
          role: 'assistant',
          text: `Hello! I am your ${this.prefs.botName()} assistant. How can I help you today?`,
          timestamp: new Date(),
        },
      ],
    };
    this.sessions.update((list) => [session, ...list]);
    this.activeId.set(id);
    return session;
  }

  ngAfterViewChecked(): void {
    const el = this.scrollAnchor()?.nativeElement;
    if (!el) return;
    if (!this.scrollListener) {
      this.scrollListener = () => this.updateScrollFlags(el);
      el.addEventListener('scroll', this.scrollListener);
    }
    if (!this.initialScrollDone && this.active().messages.length > 0) {
      this.scheduleScroll(el);
      this.initialScrollDone = true;
      this.updateScrollFlags(el);
    } else if (this.shouldScroll) {
      el.scrollTop = el.scrollHeight;
      this.shouldScroll = false;
      this.updateScrollFlags(el);
    } else if (this.isNearBottom()) {
      el.scrollTop = el.scrollHeight;
    }
  }

  jumpToBottom() {
    const el = this.scrollAnchor()?.nativeElement;
    if (!el) return;
    this.scheduleScroll(el);
    this.updateScrollFlags(el);
  }

  private scheduleScroll(el: HTMLElement) {
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      el.scrollTop = el.scrollHeight;
      return;
    }
    window.requestAnimationFrame(() => {
      const node = this.scrollAnchor()?.nativeElement;
      if (node) node.scrollTop = node.scrollHeight;
    });
  }

  private updateScrollFlags(el: HTMLElement) {
    const distance = el.scrollHeight - el.clientHeight - el.scrollTop;
    const threshold = Math.max(120, el.clientHeight * 0.4);
    this.isNearBottom.set(distance <= threshold);
    this.showJumpToBottom.set(distance > threshold);
  }

  newChat() {
    this.createSession();
    this.shouldScroll = true;
    this.initialScrollDone = false;
  }

  selectSession(id: string) {
    this.activeId.set(id);
    this.shouldScroll = true;
    this.initialScrollDone = false;
  }

  deleteSession(id: string, event: Event) {
    event.stopPropagation();
    const session = this.sessions().find((s) => s.id === id);
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
        if (!ok) return;
        this.sessions.update((list) => list.filter((s) => s.id !== id));
        if (this.activeId() === id) {
          const remaining = this.sessions();
          if (remaining.length === 0) this.createSession();
          else this.activeId.set(remaining[0].id);
        }
        this.ui.success('Chat deleted.');
      });
  }

  toggleSidebar() {
    this.sidebarOpen.update((v) => !v);
  }

  startEditTitle() {
    this.titleDraft.set(this.active().title);
    this.titleEditing.set(true);
  }

  commitTitle() {
    if (!this.titleEditing()) return;
    const next = this.titleDraft().trim() || this.active().title;
    const id = this.activeId();
    if (id) {
      this.sessions.update((list) =>
        list.map((s) => (s.id === id ? { ...s, title: next, updatedAt: Date.now() } : s)),
      );
    }
    this.titleEditing.set(false);
  }

  cancelEditTitle() {
    this.titleEditing.set(false);
  }

  startEditMessage(msg: ChatMessage) {
    this.editingId.set(msg.id);
    this.editingText.set(msg.text);
  }

  saveEditMessage(msg: ChatMessage) {
    if (this.editingId() !== msg.id) return;
    const answer = this.editingText().trim();
    if (!answer) return;

    this.isTyping.set(true);
    if (msg.source === 'pending' && msg.pendingId) {
      this.api.answerPending(msg.pendingId, answer).subscribe({
        next: () => {
          this.updateMessage(msg.id, (m) => ({ ...m, text: answer, source: 'faq', pendingId: undefined }));
          this.editingId.set(null);
          this.editingText.set('');
          this.isTyping.set(false);
          this.ui.success('Answer saved and trained.');
        },
        error: (err: Error) => {
          this.ui.error(err.message);
          this.isTyping.set(false);
        },
      });
    } else {
      const question = this.findUserQuestion(msg);
      if (!question) {
        this.ui.error('Could not find the original question.');
        this.isTyping.set(false);
        return;
      }
      this.api.createFaq(question, answer).subscribe({
        next: () => {
          this.updateMessage(msg.id, (m) => ({ ...m, text: answer, source: 'faq' }));
          this.editingId.set(null);
          this.editingText.set('');
          this.isTyping.set(false);
          this.ui.success('New Q&A created as pending.');
        },
        error: (err: Error) => {
          this.ui.error(err.message);
          this.isTyping.set(false);
        },
      });
    }
  }

  cancelEditMessage() {
    this.editingId.set(null);
    this.editingText.set('');
  }

  copyMessage(msg: ChatMessage) {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      this.ui.error('Clipboard not available.');
      return;
    }
    navigator.clipboard.writeText(msg.text).then(
      () => this.ui.success('Copied to clipboard.'),
      () => this.ui.error('Copy failed.'),
    );
  }

  likeMessage(msg: ChatMessage) {
    if (this.ratedMessages()[msg.id]) return;
    this.ratedMessages.update((map) => ({ ...map, [msg.id]: true }));
    this.sendFeedback(msg, 'like');
  }

  dislikeMessage(msg: ChatMessage) {
    if (this.ratedMessages()[msg.id]) return;
    this.ratedMessages.update((map) => ({ ...map, [msg.id]: true }));
    this.sendFeedback(msg, 'dislike');
  }

  private sendFeedback(msg: ChatMessage, rating: 'like' | 'dislike') {
    const question = this.findUserQuestion(msg) ?? '';
    this.api.sendFeedback({
      message_id: msg.id,
      question,
      answer: msg.text,
      source: msg.source ?? 'assistant',
      rating,
    }).subscribe({
      next: () => this.ui.success('Feedback recorded.'),
      error: (err: Error) => this.ui.error(err.message || 'Feedback failed.'),
    });
  }

  private findUserQuestion(msg: ChatMessage): string | null {
    const messages = this.active().messages;
    const idx = messages.findIndex((m) => m.id === msg.id);
    if (idx <= 0) return null;
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        return messages[i].text;
      }
    }
    return null;
  }

  onTitleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.commitTitle();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelEditTitle();
    }
  }

  toggleTrain() {
    this.trainMode.update((v) => !v);
    if (!this.trainMode()) this.showSettings.set(false);
  }

  toggleSettings() {
    this.showSettings.update((v) => !v);
  }

  onInputChange(value: string) {
    this.draft.set(value);
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  send() {
    const text = this.draft().trim();
    if (!text || this.isTyping()) return;

    const userMsg: ChatMessage = {
      id: this.nextId++,
      role: 'user',
      text,
      timestamp: new Date(),
    };
    this.appendMessage(userMsg);
    this.draft.set('');
    this.shouldScroll = true;
    this.askBackend(text);
  }

  formatTime(date: Date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  trackSession = (_: number, s: ChatSession) => s.id;
  trackMessage = (_: number, m: ChatMessage) => m.id;

  private askBackend(question: string) {
    this.isTyping.set(true);
    this.shouldScroll = true;
    const apps = {
      weather: this.integrations.weatherEnabled(),
      wiki: this.integrations.wikiEnabled(),
    };
    const loc = this.integrations.location();
    this.api.query(question, 4, {
      apps,
      location: loc ? { lat: loc.lat, lon: loc.lon } : undefined,
    }).subscribe({
      next: (res) => {
        const hits = res.hits ?? [];
        const text = res.answer || 'No matching information found.';
        const assistantMsg: ChatMessage = {
          id: this.nextId++,
          role: 'assistant',
          text,
          timestamp: new Date(),
          hits,
          source: res.source,
          pendingId: res.pending_id ?? undefined,
          intent: res.intent ?? null,
          app: res.app ?? null,
          disabledExternalSources: res.disabled_external_sources ?? undefined,
        };
        this.appendMessage(assistantMsg);
        this.isTyping.set(false);
        this.backendStatus.set('online');
        this.shouldScroll = true;
        this.touchTitle(question);
      },
      error: (err: Error) => {
        this.systemError(err.message);
        this.isTyping.set(false);
        this.backendStatus.set('offline');
        this.shouldScroll = true;
      },
    });
  }

  private touchTitle(question: string) {
    const id = this.activeId();
    if (!id) return;
    this.sessions.update((list) =>
      list.map((s) => {
        if (s.id !== id) return s;
        if (s.title === 'New chat' && s.messages.some((m) => m.role === 'user')) {
          return { ...s, title: question.slice(0, 40), updatedAt: Date.now() };
        }
        return { ...s, updatedAt: Date.now() };
      }),
    );
  }

  private systemError(message: string) {
    this.appendMessage({
      id: this.nextId++,
      role: 'system',
      text: message,
      timestamp: new Date(),
    });
  }

  private appendMessage(msg: ChatMessage) {
    const id = this.activeId();
    if (!id) return;
    this.sessions.update((list) =>
      list.map((s) =>
        s.id === id ? { ...s, messages: [...s.messages, msg], updatedAt: Date.now() } : s,
      ),
    );
  }

  private updateMessage(
    msgId: number,
    fn: (m: ChatMessage) => ChatMessage,
  ) {
    const id = this.activeId();
    if (!id) return;
    this.sessions.update((list) =>
      list.map((s) =>
        s.id === id
          ? {
              ...s,
              messages: s.messages.map((m) => (m.id === msgId ? fn(m) : m)),
              updatedAt: Date.now(),
            }
          : s,
      ),
    );
  }

  private checkBackend() {
    this.api.health().subscribe({
      next: () => this.backendStatus.set('online'),
      error: () => this.backendStatus.set('offline'),
    });
  }
}