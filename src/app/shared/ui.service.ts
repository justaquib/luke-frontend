import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ConfirmRequest {
  id: number;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  danger: boolean;
  resolve: (ok: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class UiService {
  private nextId = 1;

  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  private readonly _confirm = signal<ConfirmRequest | null>(null);
  readonly confirm = this._confirm.asReadonly();

  toast(message: string, kind: ToastKind = 'info', durationMs = 3500): void {
    const id = this.nextId++;
    this._toasts.update((list) => [...list, { id, kind, message }]);
    setTimeout(() => this.dismissToast(id), durationMs);
  }

  success(message: string): void {
    this.toast(message, 'success');
  }

  error(message: string): void {
    this.toast(message, 'error');
  }

  info(message: string): void {
    this.toast(message, 'info');
  }

  dismissToast(id: number): void {
    this._toasts.update((list) => list.filter((t) => t.id !== id));
  }

  resolveConfirm(ok: boolean): void {
    const req = this._confirm();
    if (!req) return;
    this._confirm.set(null);
    req.resolve(ok);
  }

  confirmDialog(opts: {
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
  }): Observable<boolean> {
    return new Observable<boolean>((subscriber) => {
      const id = this.nextId++;
      const req: ConfirmRequest = {
        id,
        title: opts.title ?? 'Confirm',
        message: opts.message,
        confirmLabel: opts.confirmLabel ?? 'OK',
        cancelLabel: opts.cancelLabel ?? 'Cancel',
        danger: opts.danger ?? false,
        resolve: (ok) => {
          subscriber.next(ok);
          subscriber.complete();
        },
      };
      this._confirm.set(req);
    });
  }
}
