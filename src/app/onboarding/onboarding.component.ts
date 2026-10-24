import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { AppIcon } from '../shared/app-icon';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [AppIcon],
  templateUrl: './onboarding.html',
  styleUrls: ['../shared/auth.css'],
})
export class Onboarding {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  chooseTrainer() {
    this.auth.setRole('trainer');
    this.router.navigate(['/dashboard/trainer']);
  }

  chooseChat() {
    this.auth.setRole('chat');
    this.router.navigate(['/chat']);
  }
}
