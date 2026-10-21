import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ChatUiStore {
  readonly sidebarOpen = signal(true);
  readonly showSettings = signal(false);

  toggleSidebar(): void {
    this.sidebarOpen.update((value) => !value);
  }

  toggleSettings(): void {
    this.showSettings.update((value) => !value);
  }

  closeSettings(): void {
    this.showSettings.set(false);
  }
}
