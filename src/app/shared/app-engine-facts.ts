import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type FactTone = 'ok' | 'warn' | 'bad';

export interface EngineFact {
  label: string;
  value: string;
  note?: string;
  tone?: FactTone;
}

/** A compact row of measurements shared by every engine view. */
@Component({
  selector: 'app-engine-facts',
  standalone: true,
  templateUrl: './app-engine-facts.html',
  styleUrl: './app-engine-facts.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppEngineFacts {
  readonly facts = input.required<readonly EngineFact[]>();
  readonly label = input('Engine facts');
}
