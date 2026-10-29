import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { UiService } from '../shared/ui.service';
import { AppIcon } from '../shared/app-icon';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterLink, AppIcon],
  templateUrl: './login.html',
  styleUrls: ['../shared/auth.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly ui = inject(UiService);

  protected googleSignIn(): void {
    this.auth.loginWithGoogle();
  }
}
