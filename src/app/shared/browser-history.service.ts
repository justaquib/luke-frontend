import { Injectable } from '@angular/core';

/** The browser facts a component may not read directly. */
@Injectable({ providedIn: 'root' })
export class BrowserHistoryService {
  /** Whether the previous page belongs to this site. */
  canGoBack(): boolean {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return false;
    }
    if (window.history.length <= 1) {
      return false;
    }
    return document.referrer.includes(window.location.host);
  }
}
