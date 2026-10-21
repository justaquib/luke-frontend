import { Injectable, signal } from '@angular/core';

/** The small pieces of state the parts of the chat page share. */
@Injectable({ providedIn: 'root' })
export class ChatUiStore {
  readonly sidebarOpen = signal(true);

  toggleSidebar(): void {
    this.sidebarOpen.update((value) => !value);
  }
}
