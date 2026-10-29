import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { BrowserHistoryService } from './browser-history.service';

@Component({
  selector: 'app-back-to-chat',
  standalone: true,
  templateUrl: './back-to-chat.html',
  styleUrl: './back-to-chat.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackToChat {
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly history = inject(BrowserHistoryService);

  protected canGoBack(): boolean {
    return this.history.canGoBack();
  }

  protected goBack(): void {
    if (this.history.canGoBack()) {
      this.location.back();
      return;
    }
    void this.router.navigateByUrl('/');
  }
}
