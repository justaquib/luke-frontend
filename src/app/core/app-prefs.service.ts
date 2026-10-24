import { Injectable, signal, effect } from '@angular/core';

const USER_KEY = 'assistance.username.v1';
const BOT_KEY = 'assistance.botname.v1';
const DEFAULTS = { user: 'You', bot: 'Luke' };

@Injectable({ providedIn: 'root' })
export class AppPrefsService {
  private readonly userSignal = signal<string>(this.read(USER_KEY, DEFAULTS.user));
  private readonly botSignal = signal<string>(this.read(BOT_KEY, DEFAULTS.bot));

  readonly userName = this.userSignal.asReadonly();
  readonly botName = this.botSignal.asReadonly();

  constructor() {
    if (typeof window !== 'undefined') {
      effect(() => this.write(USER_KEY, this.userSignal()));
      effect(() => this.write(BOT_KEY, this.botSignal()));
    }
  }

  setUserName(name: string) {
    const trimmed = name.trim() || DEFAULTS.user;
    this.userSignal.set(trimmed);
  }

  setBotName(name: string) {
    const trimmed = name.trim() || DEFAULTS.bot;
    this.botSignal.set(trimmed);
  }

  reset() {
    this.userSignal.set(DEFAULTS.user);
    this.botSignal.set(DEFAULTS.bot);
  }

  private read(key: string, fallback: string): string {
    try {
      if (typeof window === 'undefined') return fallback;
      return localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  }

  private write(key: string, value: string) {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(key, value);
    } catch {}
  }
}
