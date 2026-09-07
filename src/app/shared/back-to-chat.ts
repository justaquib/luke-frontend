import { Component, inject, computed } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-back-to-chat',
  standalone: true,
  template: `
    <a
      class="back-to-chat"
      [class.has-history]="canGoBack()"
      (click)="goBack($event)"
      title="Back to chat"
      aria-label="Back to chat"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          d="M15 18l-6-6 6-6"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <span>Back to chat</span>
    </a>
  `,
  styles: [
    `
      :host {
        position: fixed;
        top: 0.7rem;
        left: 0.7rem;
        z-index: 100;
        display: block;
      }
      .back-to-chat {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.4rem 0.7rem 0.4rem 0.55rem;
        background: rgba(255, 255, 255, 0.95);
        border: 1px solid #e5e7eb;
        border-radius: 999px;
        font-size: 0.8rem;
        font-weight: 500;
        color: #4b5563;
        text-decoration: none;
        cursor: pointer;
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
        backdrop-filter: blur(6px);
        transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
      }
      .back-to-chat:hover {
        background: #eef2ff;
        color: #4f46e5;
        border-color: #c7d2fe;
      }
    `,
  ],
})
export class BackToChat {
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  protected readonly canGoBack = computed(() => true);

  goBack(event: Event) {
    event.preventDefault();
    if (window.history.length > 1 && document.referrer && document.referrer.includes(window.location.host)) {
      this.location.back();
    } else {
      this.router.navigateByUrl('/');
    }
  }
}