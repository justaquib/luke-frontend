import { Injectable, computed, signal } from '@angular/core';

export type AppLogLevel = 'error' | 'warning';
export type AppLogFilter = 'all' | AppLogLevel;

export interface AppLogEntry {
  id: string;
  time: string;
  level: AppLogLevel;
  source: string;
  message: string;
  path?: string;
  status?: number;
}

const STORAGE_KEY = 'assistance.app-logs.v1';
const MAX_LOGS = 200;

@Injectable({ providedIn: 'root' })
export class AppLogService {
  private readonly entriesState = signal<AppLogEntry[]>(this.readStoredLogs());
  readonly entries = this.entriesState.asReadonly();
  readonly errorCount = computed(
    () => this.entriesState().filter((entry) => entry.level === 'error').length,
  );

  record(entry: Omit<AppLogEntry, 'id' | 'time'>): void {
    const next: AppLogEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      time: new Date().toISOString(),
      message: entry.message.slice(0, 1000),
      path: entry.path?.slice(0, 300),
    };
    this.entriesState.update((entries) => [next, ...entries].slice(0, MAX_LOGS));
    this.persist();
  }

  clear(): void {
    this.entriesState.set([]);
    this.persist();
  }

  reload(): void {
    this.entriesState.set(this.readStoredLogs());
  }

  private readStoredLogs(): AppLogEntry[] {
    if (typeof window === 'undefined') return [];
    try {
      const value: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
      if (!Array.isArray(value)) return [];
      return value
        .filter(
          (entry): entry is AppLogEntry =>
            !!entry &&
            typeof entry === 'object' &&
            (entry.level === 'error' || entry.level === 'warning') &&
            typeof entry.message === 'string' &&
            typeof entry.time === 'string',
        )
        .slice(0, MAX_LOGS);
    } catch {
      return [];
    }
  }

  private persist(): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entriesState()));
    } catch {
      // Keep the in-memory log available if browser storage is unavailable or full.
    }
  }
}
