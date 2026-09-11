import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { UiService } from '../shared/ui.service';

const ROLE_KEY = 'assistance.role.v1';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './onboarding.html',
  styleUrl: './onboarding.css',
})
export class Onboarding {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ui = inject(UiService);

  chooseTrainer() {
    this.saveRole('trainer');
    this.router.navigate(['/trainer']);
  }

  chooseChat() {
    this.saveRole('chat');
    this.router.navigate(['/chat']);
  }

  private saveRole(role: string) {
    try {
      localStorage.setItem(ROLE_KEY, role);
    } catch {}
  }
}
