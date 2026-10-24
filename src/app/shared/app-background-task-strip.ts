import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BackgroundTasksService } from './background-tasks.service';

/** The running task, pinned under the navigation so a long job is never a mystery. */
@Component({
  selector: 'app-background-task-strip',
  standalone: true,
  templateUrl: './app-background-task-strip.html',
  styleUrls: ['./app-background-task-strip.css', './background-tasks.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppBackgroundTaskStrip {
  protected readonly tasks = inject(BackgroundTasksService);
}
