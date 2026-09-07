import { Component, inject } from '@angular/core';
import { UiService } from './ui.service';

@Component({
  selector: 'app-ui-overlay',
  standalone: true,
  template: `
    @if (ui.confirm(); as c) {
      <div class="ui-backdrop" (click)="onBackdrop()">
        <div
          class="ui-modal"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="'ui-mt-' + c.id"
          (click)="$event.stopPropagation()"
        >
          <h2 [id]="'ui-mt-' + c.id" class="ui-modal-title">{{ c.title }}</h2>
          <p class="ui-modal-message">{{ c.message }}</p>
          <div class="ui-modal-actions">
            <button type="button" class="ui-btn ghost" (click)="cancel()">
              {{ c.cancelLabel }}
            </button>
            <button
              type="button"
              [class]="c.danger ? 'ui-btn danger' : 'ui-btn primary'"
              (click)="ok()"
              autofocus
            >
              {{ c.confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    }

    <div class="ui-toasts" aria-live="polite" aria-atomic="true">
      @for (t of ui.toasts(); track t.id) {
        <div class="ui-toast {{ t.kind }}">
          <span class="ui-toast-message">{{ t.message }}</span>
          <button
            type="button"
            class="ui-toast-close"
            (click)="ui.dismissToast(t.id)"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 1000;
      }

      .ui-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.55);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        pointer-events: auto;
        animation: ui-fade 0.15s ease-out;
      }

      .ui-modal {
        background: #1e293b;
        color: #e2e8f0;
        border: 1px solid #334155;
        border-radius: 0.75rem;
        padding: 1.25rem 1.25rem 1rem;
        max-width: 32rem;
        width: 100%;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
        animation: ui-pop 0.15s ease-out;
      }

      .ui-modal-title {
        margin: 0 0 0.5rem;
        font-size: 1.05rem;
        font-weight: 600;
        color: #f8fafc;
      }

      .ui-modal-message {
        margin: 0 0 1rem;
        color: #cbd5e1;
        line-height: 1.45;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .ui-modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
      }

      .ui-btn {
        font: inherit;
        padding: 0.5rem 0.9rem;
        border-radius: 0.5rem;
        border: 1px solid transparent;
        cursor: pointer;
        transition: background 0.15s ease, border-color 0.15s ease;
      }

      .ui-btn.ghost {
        background: transparent;
        border-color: #475569;
        color: #cbd5e1;
      }
      .ui-btn.ghost:hover {
        background: #334155;
      }

      .ui-btn.primary {
        background: #4f46e5;
        color: #fff;
      }
      .ui-btn.primary:hover {
        background: #4338ca;
      }

      .ui-btn.danger {
        background: #dc2626;
        color: #fff;
      }
      .ui-btn.danger:hover {
        background: #b91c1c;
      }

      .ui-toasts {
        position: fixed;
        right: 1rem;
        bottom: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        pointer-events: none;
      }

      .ui-toast {
        pointer-events: auto;
        min-width: 220px;
        max-width: 360px;
        padding: 0.7rem 0.9rem;
        border-radius: 0.5rem;
        background: #1e293b;
        color: #e2e8f0;
        border: 1px solid #334155;
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
        display: flex;
        align-items: center;
        gap: 0.5rem;
        animation: ui-slide-in 0.18s ease-out;
      }

      .ui-toast.success {
        border-color: #10b981;
      }
      .ui-toast.error {
        border-color: #ef4444;
      }
      .ui-toast.info {
        border-color: #6366f1;
      }

      .ui-toast-message {
        flex: 1;
        font-size: 0.9rem;
        line-height: 1.3;
        word-break: break-word;
      }

      .ui-toast-close {
        background: transparent;
        border: none;
        color: #94a3b8;
        font-size: 1.1rem;
        line-height: 1;
        cursor: pointer;
        padding: 0.1rem 0.3rem;
        border-radius: 0.25rem;
      }
      .ui-toast-close:hover {
        background: #334155;
        color: #f8fafc;
      }

      @keyframes ui-fade {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      @keyframes ui-pop {
        from {
          transform: scale(0.97);
          opacity: 0;
        }
        to {
          transform: scale(1);
          opacity: 1;
        }
      }
      @keyframes ui-slide-in {
        from {
          transform: translateY(8px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    `,
  ],
})
export class UiOverlay {
  protected readonly ui = inject(UiService);

  ok() {
    this.ui.resolveConfirm(true);
  }

  cancel() {
    this.ui.resolveConfirm(false);
  }

  onBackdrop() {
    this.cancel();
  }
}