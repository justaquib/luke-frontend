import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BrowserService {
  isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  readLocal(key: string): string | null {
    try {
      return this.isBrowser() ? localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  }

  writeLocal(key: string, value: string): void {
    try {
      if (this.isBrowser()) {
        localStorage.setItem(key, value);
      }
    } catch {
      // Browser storage can be unavailable; keep the in-memory state.
    }
  }

  removeLocal(key: string): void {
    try {
      if (this.isBrowser()) {
        localStorage.removeItem(key);
      }
    } catch {
      // Browser storage can be unavailable; keep the in-memory state.
    }
  }

  readSession(key: string): string | null {
    try {
      return this.isBrowser() ? sessionStorage.getItem(key) : null;
    } catch {
      return null;
    }
  }

  writeSession(key: string, value: string): void {
    try {
      if (this.isBrowser()) {
        sessionStorage.setItem(key, value);
      }
    } catch {
      // Session storage can be unavailable; keep the in-memory state.
    }
  }

  createObjectUrl(blob: Blob): string | null {
    return this.isBrowser() ? URL.createObjectURL(blob) : null;
  }

  revokeObjectUrl(url: string): void {
    if (this.isBrowser()) {
      URL.revokeObjectURL(url);
    }
  }

  downloadBlob(blob: Blob, filename: string): void {
    if (!this.isBrowser()) {
      return;
    }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  canGoBackInApp(): boolean {
    if (!this.isBrowser()) {
      return false;
    }
    const referrer = document.referrer;
    return window.history.length > 1 && !!referrer && referrer.includes(window.location.host);
  }

  async copyText(text: string): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      throw new Error('Clipboard not available.');
    }
    await navigator.clipboard.writeText(text);
  }

  requestAnimationFrame(callback: () => void): void {
    if (!this.isBrowser() || typeof window.requestAnimationFrame !== 'function') {
      callback();
      return;
    }
    window.requestAnimationFrame(callback);
  }
}
