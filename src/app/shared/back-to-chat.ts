import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

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

  protected readonly canGoBack = computed(() => true);

  goBack(): void {
    if (
      window.history.length > 1 &&
      document.referrer &&
      document.referrer.includes(window.location.host)
    ) {
      this.location.back();
    } else {
      void this.router.navigateByUrl('/');
    }
  }
}
