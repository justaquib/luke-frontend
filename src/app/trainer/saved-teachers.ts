import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { TeacherInfo } from '../core/api/api-models';
import { AppIcon } from '../shared/app-icon';

/** The teachers already fine-tuned on this machine, and their measured facts. */
@Component({
  selector: 'app-saved-teachers',
  standalone: true,
  imports: [AppIcon],
  templateUrl: './saved-teachers.html',
  styleUrl: './styles/saved-teachers.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SavedTeachers {
  readonly teachers = input.required<TeacherInfo[]>();
  readonly busy = input(false);
  readonly removing = input<string | null>(null);
  readonly remove = output<TeacherInfo>();

  protected sizeMb(bytes: number): string {
    return `${Math.round(bytes / 1_048_576)} MB`;
  }

  protected trainedAt(value: string | null): string {
    return value ? new Date(value).toLocaleString() : 'not recorded';
  }
}
