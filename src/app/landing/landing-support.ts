import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing-support',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing-support.html',
  styleUrls: ['./landing-base.css', './landing-sections.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingSupport {
  protected readonly year = new Date().getFullYear();
}
