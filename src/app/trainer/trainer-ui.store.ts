import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TrainerUiStore {
  readonly sidebarOpen = signal(true);

  toggleSidebar(): void {
    this.sidebarOpen.update((value) => !value);
  }
}
