import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { AppIcon } from '../shared/app-icon';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [AppIcon],
  templateUrl: './onboarding.html',
  styleUrls: ['../shared/auth.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Onboarding {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected chooseTrainer(): void {
    this.auth.setRole('trainer');
    void this.router.navigate(['/dashboard/trainer']);
  }

  protected chooseChat(): void {
    this.auth.setRole('chat');
    void this.router.navigate(['/chat']);
  }
}
