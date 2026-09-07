import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UiOverlay } from './shared/ui-overlay';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, UiOverlay],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = 'Assistance';
}
